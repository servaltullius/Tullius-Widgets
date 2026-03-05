param(
  [string]$Repo = "servaltullius/Tullius-Widgets",
  [ValidateSet("pre", "full", "draft")]
  [string]$Channel = "pre",
  [switch]$SkipLint,
  [switch]$SkipFrontendBuild,
  [switch]$SkipPluginBuild,
  [switch]$NoPublish
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDir "release-local.lib.ps1")
function Invoke-ReleaseLocal {
  param(
    [string]$Repo = "servaltullius/Tullius-Widgets",
    [ValidateSet("pre", "full", "draft")]
    [string]$Channel = "pre",
    [switch]$SkipLint,
    [switch]$SkipFrontendBuild,
    [switch]$SkipPluginBuild,
    [switch]$NoPublish
  )

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
    Write-Host "UNC worktree detected. External build commands will run through cmd pushd."
  }

  Push-Location $workRoot

  try {
    Require-Command "git"
    Require-Command "xmake"
    Require-Command "npm"

    $versionMatch = Select-String -Path "xmake.lua" -Pattern 'set_version\("([^"]+)"\)' | Select-Object -First 1
    if (-not $versionMatch) {
      throw "Unable to parse version from xmake.lua"
    }
    $version = $versionMatch.Matches[0].Groups[1].Value
    $tag = "v$version"
    $title = "Tullius Widgets v$version"
    $notePath = "docs/release-notes/$version.ko.md"
    $zipName = "TulliusWidgets-v$version.zip"

    Assert-ReleaseNote -Path $notePath

    if (-not $SkipFrontendBuild) {
      $frontendBuildRoot = $repoRoot
      $frontendViewPath = Join-Path $repoRoot "view"
      if ($usesUncWorkRoot) {
        $frontendBuildRoot = Prepare-FrontendBuildWorkspace -SourceRoot $repoRoot -WslContext $wslContext
        $stageRoots.Add($frontendBuildRoot) | Out-Null
        $frontendViewPath = Join-Path $frontendBuildRoot "view"
      }

      $frontendCommands = @("npm ci")
      if (-not $SkipLint) {
        $frontendCommands += "npm run lint"
      }
      $frontendCommands += "npm run build"
      Invoke-CmdCommands -Path $frontendViewPath -Commands $frontendCommands

      if ($usesUncWorkRoot) {
        $stagedViewDist = Join-Path $frontendBuildRoot "dist/PrismaUI/views/TulliusWidgets"
        $repoViewDist = Join-Path $repoRoot "dist/PrismaUI/views/TulliusWidgets"
        if (Test-Path $repoViewDist) {
          Remove-Item -LiteralPath $repoViewDist -Recurse -Force
        }
        New-Item -ItemType Directory -Path (Split-Path $repoViewDist -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $stagedViewDist -Destination $repoViewDist -Recurse -Force
      }
    }

    if (-not $SkipPluginBuild) {
      $pluginBuildRoot = $repoRoot
      if ($usesUncWorkRoot) {
        $pluginBuildRoot = Prepare-PluginBuildWorkspace -SourceRoot $repoRoot -WslContext $wslContext
        $stageRoots.Add($pluginBuildRoot) | Out-Null
      }

      Invoke-CmdCommands -Path $pluginBuildRoot -Commands @(
        "xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false --ccache=y",
        "xmake build -y -v"
      )

      if ($usesUncWorkRoot) {
        $stagedDllPath = Join-Path $pluginBuildRoot "build/windows/x64/release/TulliusWidgets.dll"
        $repoBuildDir = Join-Path $repoRoot "build/windows/x64/release"
        New-Item -ItemType Directory -Path $repoBuildDir -Force | Out-Null
        Copy-Item -LiteralPath $stagedDllPath -Destination (Join-Path $repoBuildDir "TulliusWidgets.dll") -Force
      }
    }

    $frontendOutputPath = "dist/PrismaUI/views/TulliusWidgets"
    $pluginDllPath = "build/windows/x64/release/TulliusWidgets.dll"

    if (-not (Test-Path (Join-Path $frontendOutputPath "index.html"))) {
      throw "Frontend output missing: dist/PrismaUI/views/TulliusWidgets/index.html"
    }
    if (-not (Test-Path $pluginDllPath)) {
      throw "Plugin DLL missing: build/windows/x64/release/TulliusWidgets.dll"
    }

    New-Item -ItemType Directory -Path "dist/SKSE/Plugins" -Force | Out-Null
    Copy-Item $pluginDllPath "dist/SKSE/Plugins/TulliusWidgets.dll" -Force

    $packageStageRoot = New-StageRoot -Prefix "TulliusWidgets-package"
    $stageRoots.Add($packageStageRoot) | Out-Null
    Initialize-ReleasePackageStage `
      -FrontendSourcePath $frontendOutputPath `
      -PluginDllPath $pluginDllPath `
      -StageRoot $packageStageRoot

    if (Test-Path $zipName) {
      Remove-Item $zipName -Force
    }
    Compress-Archive -Path (Join-Path $packageStageRoot "*") -DestinationPath $zipName
    Write-Host "Created local package: $zipName"

    if ($NoPublish) {
      Write-Host "NoPublish enabled. Skipping GitHub release publish."
      return
    }

    Invoke-GhCommand -Arguments @("release", "view", $tag, "--repo", $Repo) -WslContext $wslContext -AllowFailure *> $null
    $releaseExists = ($LASTEXITCODE -eq 0)

    if (-not $releaseExists) {
      $createArgs = @("release", "create", $tag, $zipName, "--repo", $Repo, "--title", $title, "--notes-file", $notePath)
      if ($Channel -eq "pre") {
        $createArgs += "--prerelease"
      } elseif ($Channel -eq "draft") {
        $createArgs += "--draft"
      } else {
        $createArgs += "--latest"
      }
      Invoke-GhCommand -Arguments $createArgs -WslContext $wslContext
    } else {
      Invoke-GhCommand -Arguments @("release", "upload", $tag, $zipName, "--repo", $Repo, "--clobber") -WslContext $wslContext
      $editArgs = @("release", "edit", $tag, "--repo", $Repo, "--title", $title, "--notes-file", $notePath)
      if ($Channel -eq "pre") {
        $editArgs += "--prerelease"
      } elseif ($Channel -eq "draft") {
        $editArgs += "--draft"
      } else {
        $editArgs += "--latest"
      }
      Invoke-GhCommand -Arguments $editArgs -WslContext $wslContext
    }

    Write-Host "Release sync complete: $tag"
  }
  finally {
    Pop-Location
    Remove-StageRoots -Paths $stageRoots
  }
}

if ($MyInvocation.InvocationName -ne '.') {
  Invoke-ReleaseLocal @PSBoundParameters
}
