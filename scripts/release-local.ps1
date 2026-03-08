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
    $version = Parse-VersionFromXmake -Path "xmake.lua"
    $tag = "v$version"
    $title = "Tullius Widgets v$version"
    $notePath = "docs/release-notes/$version.ko.md"
    $zipName = "TulliusWidgets-v$version.zip"

    Assert-ReleaseNote -Path $notePath

    if (-not $SkipFrontendBuild) {
      if ($usesUncWorkRoot) {
        if (-not (Test-WindowsCommandAvailable "npm")) {
          throw "Required command not found: npm"
        }
      } else {
        Require-Command "npm"
      }

      $frontendBuildRoot = $repoRoot
      $frontendViewPath = Join-Path $repoRoot "view"
      if ($usesUncWorkRoot) {
        $frontendBuildRoot = Prepare-FrontendBuildWorkspace -SourceRoot $repoRoot -WslContext $wslContext
        $stageRoots.Add($frontendBuildRoot) | Out-Null
        $frontendViewPath = Join-Path $frontendBuildRoot "view"
      }

      $frontendCommands = @("call npm ci")
      if (-not $SkipLint) {
        $frontendCommands += "call npm run lint"
      }
      $frontendCommands += "call npm run build"
      Invoke-CmdCommands -Path $frontendViewPath -Commands $frontendCommands

      if ($usesUncWorkRoot) {
        $stagedViewDistCandidates = @(
          (Join-Path $frontendBuildRoot "dist/PrismaUI/views/TulliusWidgets"),
          (Join-Path $frontendViewPath "dist/PrismaUI/views/TulliusWidgets")
        ) | Select-Object -Unique
        $stagedViewDist = $stagedViewDistCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
        if (-not $stagedViewDist) {
          throw "Frontend build output was not found in the staged workspace."
        }
        $repoViewDist = Join-Path $repoRoot "dist/PrismaUI/views/TulliusWidgets"
        if (Test-Path $repoViewDist) {
          Remove-Item -LiteralPath $repoViewDist -Recurse -Force
        }
        New-Item -ItemType Directory -Path (Split-Path $repoViewDist -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $stagedViewDist -Destination $repoViewDist -Recurse -Force
      }
    }

    $pluginDllPath = "build/windows/x64/release/TulliusWidgets.dll"
    if (-not $SkipPluginBuild) {
      $xmakeCommand = if ($usesUncWorkRoot) {
        Get-WindowsXmakeCommand
      } else {
        if (Test-CommandAvailable "xmake") { "xmake" } else { $null }
      }
      $vsDevCmd = if ($usesUncWorkRoot) { Get-WindowsVsDevCmd } else { $null }
      $canRunXmake = $null -ne $xmakeCommand

      if (-not $canRunXmake) {
        if (Test-CanReuseExistingPluginDll -RepoRoot $repoRoot -PluginDllPath $pluginDllPath) {
          Write-Host "xmake was not found. Reusing existing plugin DLL because native sources are unchanged."
          $SkipPluginBuild = $true
        } else {
          throw "xmake was not found and the existing plugin DLL cannot be safely reused."
        }
      } elseif ($usesUncWorkRoot -and -not $vsDevCmd) {
        throw "VsDevCmd.bat was not found. Visual Studio Build Tools environment could not be initialized."
      }
    }

    if (-not $SkipPluginBuild) {
      $pluginBuildRoot = $repoRoot
      if ($usesUncWorkRoot) {
        $pluginBuildRoot = Prepare-PluginBuildWorkspace -SourceRoot $repoRoot -WslContext $wslContext
        $stageRoots.Add($pluginBuildRoot) | Out-Null
      }

      $pluginCommands = if ($usesUncWorkRoot) {
        @(
          "call `"$vsDevCmd`" -arch=amd64 -host_arch=amd64",
          "`"$xmakeCommand`" f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false --ccache=y",
          "`"$xmakeCommand`" build -y -v"
        )
      } else {
        @(
          "xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false --ccache=y",
          "xmake build -y -v"
        )
      }

      Invoke-CmdCommands -Path $pluginBuildRoot -Commands $pluginCommands

      if ($usesUncWorkRoot) {
        $stagedDllPath = Join-Path $pluginBuildRoot "build/windows/x64/release/TulliusWidgets.dll"
        $repoBuildDir = Join-Path $repoRoot "build/windows/x64/release"
        New-Item -ItemType Directory -Path $repoBuildDir -Force | Out-Null
        Copy-Item -LiteralPath $stagedDllPath -Destination (Join-Path $repoBuildDir "TulliusWidgets.dll") -Force
      }

      Write-PluginBuildStamp -RepoRoot $repoRoot -PluginDllPath $pluginDllPath
    }

    $frontendOutputPath = "dist/PrismaUI/views/TulliusWidgets"
    Assert-TulliusWidgetsBuildOutputs `
      -FrontendOutputPath $frontendOutputPath `
      -PluginDllPath $pluginDllPath

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

    $releaseViewResult = Invoke-GhCommand -Arguments @("release", "view", $tag, "--repo", $Repo) -WslContext $wslContext -AllowFailure
    $releaseExists = ($releaseViewResult.ExitCode -eq 0)

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
