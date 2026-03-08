param(
  [switch]$SkipFrontendChecks,
  [switch]$SkipPluginBuild,
  [switch]$CreateLocalPackage,
  [string]$ReportPath
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDir "release-local.lib.ps1")
$repoRoot = Split-Path -Parent $scriptDir
$workRoot = $repoRoot
$usesUncWorkRoot = $workRoot.StartsWith("\\")
$wslContext = $null
$stageRoots = New-Object System.Collections.Generic.List[string]

if ($usesUncWorkRoot) {
  $wslContext = Get-WslContext -Path $workRoot
  if (-not $wslContext) {
    throw "Failed to parse WSL UNC path: $workRoot"
  }
  Write-Host "[verify] UNC worktree detected. Build commands will run from staged local paths."
}

Push-Location $repoRoot

try {
  if (-not $SkipFrontendChecks) {
    if ($usesUncWorkRoot) {
      if (-not (Test-WindowsCommandAvailable "npm")) {
        throw "Required command not found: npm"
      }
    } else {
      Require-Command "npm"
    }
    Write-Host "[verify] Running frontend checks..."
    $frontendBuildRoot = $repoRoot
    $frontendViewPath = Join-Path $repoRoot "view"

    if ($usesUncWorkRoot) {
      $frontendBuildRoot = Prepare-FrontendBuildWorkspace -SourceRoot $repoRoot -WslContext $wslContext
      $stageRoots.Add($frontendBuildRoot) | Out-Null
      $frontendViewPath = Join-Path $frontendBuildRoot "view"
      Invoke-CmdCommands -Path $frontendViewPath -Commands @(
        "npm ci",
        "npm run lint",
        "npm test -- --run",
        "npm run build"
      )

      $stagedViewDist = Join-Path $frontendBuildRoot "dist/PrismaUI/views/TulliusWidgets"
      $repoViewDist = Join-Path $repoRoot "dist/PrismaUI/views/TulliusWidgets"
      if (Test-Path $repoViewDist) {
        Remove-Item -LiteralPath $repoViewDist -Recurse -Force
      }
      New-Item -ItemType Directory -Path (Split-Path $repoViewDist -Parent) -Force | Out-Null
      Copy-Item -LiteralPath $stagedViewDist -Destination $repoViewDist -Recurse -Force
    } else {
      Push-Location "view"
      try {
        npm run lint
        npm test -- --run
        npm run build
      }
      finally {
        Pop-Location
      }
    }
  }

  if (-not $SkipPluginBuild) {
    $pluginDllPath = "build/windows/x64/release/TulliusWidgets.dll"
    $xmakeCommand = if ($usesUncWorkRoot) {
      Get-WindowsXmakeCommand
    } else {
      if (Test-CommandAvailable "xmake") { "xmake" } else { $null }
    }
    $vsDevCmd = if ($usesUncWorkRoot) { Get-WindowsVsDevCmd } else { $null }
    $canRunXmake = $null -ne $xmakeCommand

    if (-not $canRunXmake) {
      if (Test-CanReuseExistingPluginDll -RepoRoot $repoRoot -PluginDllPath $pluginDllPath) {
        Write-Host "[verify] xmake was not found. Reusing existing plugin DLL because native sources are unchanged."
        $SkipPluginBuild = $true
      } else {
        throw "xmake was not found and the existing plugin DLL cannot be safely reused."
      }
    } elseif ($usesUncWorkRoot -and -not $vsDevCmd) {
      throw "VsDevCmd.bat was not found. Visual Studio Build Tools environment could not be initialized."
    }
  }

  if (-not $SkipPluginBuild) {
    Write-Host "[verify] Building native plugin (Windows/MSVC)..."
    if ($usesUncWorkRoot) {
      $pluginBuildRoot = Prepare-PluginBuildWorkspace -SourceRoot $repoRoot -WslContext $wslContext
      $stageRoots.Add($pluginBuildRoot) | Out-Null

      Invoke-CmdCommands -Path $pluginBuildRoot -Commands @(
        "call `"$vsDevCmd`" -arch=amd64 -host_arch=amd64",
        "`"$xmakeCommand`" f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false --ccache=y",
        "`"$xmakeCommand`" build -y -v"
      )

      $stagedDllPath = Join-Path $pluginBuildRoot "build/windows/x64/release/TulliusWidgets.dll"
      $repoBuildDir = Join-Path $repoRoot "build/windows/x64/release"
      New-Item -ItemType Directory -Path $repoBuildDir -Force | Out-Null
      Copy-Item -LiteralPath $stagedDllPath -Destination (Join-Path $repoBuildDir "TulliusWidgets.dll") -Force
    } else {
      xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false
      xmake build
    }

    Write-PluginBuildStamp -RepoRoot $repoRoot -PluginDllPath $pluginDllPath
  }

  Assert-TulliusWidgetsBuildOutputs
  Write-Host "[verify] Frontend output found: dist/PrismaUI/views/TulliusWidgets/index.html"
  Write-Host "[verify] Native DLL found: build/windows/x64/release/TulliusWidgets.dll"

  if ($CreateLocalPackage) {
    Write-Host "[verify] Creating local package (NoPublish)..."
    $releaseLocalArguments = Get-ReleaseLocalArgumentsForPackaging `
      -SkipFrontendChecks:$SkipFrontendChecks `
      -SkipPluginBuild:$SkipPluginBuild
    & "$scriptDir/release-local.ps1" @releaseLocalArguments
  }

  $version = Parse-VersionFromXmake -Path "xmake.lua"
  $generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

  $resolvedReportPath = $ReportPath
  if ([string]::IsNullOrWhiteSpace($resolvedReportPath)) {
    $resolvedReportPath = "docs/plans/runtime-verification-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').ko.md"
  }

  $templatePath = "docs/plans/runtime-verification-report-template.ko.md"
  if (-not (Test-Path $templatePath)) {
    throw "Report template missing: $templatePath"
  }

  $reportDir = Split-Path -Parent $resolvedReportPath
  if ($reportDir -and -not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
  }

  $gitSha = Get-ShortGitSha -RepoRoot $repoRoot
  $report = Get-Content $templatePath -Raw
  $report = $report.Replace("{{GENERATED_AT}}", $generatedAt)
  $report = $report.Replace("{{VERSION}}", $version)
  $report = $report.Replace("{{GIT_SHA}}", $gitSha)
  Set-Content -Path $resolvedReportPath -Value $report -Encoding UTF8

  Write-Host "[verify] Runtime report created: $resolvedReportPath"
  Write-Host "[next] Open report and fill RV-01..RV-06 results with evidence (logs/screenshots)."
}
finally {
  Pop-Location
  Remove-StageRoots -Paths $stageRoots
}
