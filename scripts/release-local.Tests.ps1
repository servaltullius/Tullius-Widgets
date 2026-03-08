$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here "release-local.lib.ps1")

Describe "release-local helpers" {
  It "parses both wsl.localhost and wsl$ UNC paths" {
    $localhost = Get-WslContext -Path "\\wsl.localhost\Ubuntu\home\kdw73\projects\Tullius Widgets"
    $legacy = Get-WslContext -Path "\\wsl$\Ubuntu\home\kdw73\projects\Tullius Widgets"

    $localhost.Distro | Should Be "Ubuntu"
    $localhost.LinuxPath | Should Be "/home/kdw73/projects/Tullius Widgets"
    $legacy.Distro | Should Be "Ubuntu"
    $legacy.LinuxPath | Should Be "/home/kdw73/projects/Tullius Widgets"
  }

  It "ignores non-WSL UNC paths" {
    $result = Get-WslContext -Path "\\server\share\Tullius Widgets"
    $result | Should Be $null
  }

  It "parses version from xmake.lua style content" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $xmakePath = Join-Path $root "xmake.lua"
    New-Item -ItemType Directory -Path $root -Force | Out-Null
    Set-Content -Path $xmakePath -Value 'set_version("1.2.1-rc.3")' -Encoding UTF8

    try {
      (Parse-VersionFromXmake -Path $xmakePath) | Should Be "1.2.1-rc.3"
    }
    finally {
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "builds release-local packaging arguments from skipped verification phases" {
    $full = @(Get-ReleaseLocalArgumentsForPackaging)
    $skipAll = @(Get-ReleaseLocalArgumentsForPackaging -SkipFrontendChecks -SkipPluginBuild)

    ($full -join ",") | Should Be "-NoPublish,-SkipLint,-SkipFrontendBuild,-SkipPluginBuild"
    ($skipAll -join ",") | Should Be "-NoPublish"
  }

  It "reuses an existing plugin DLL when native worktree is unchanged" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $pluginPath = Join-Path $root "build\windows\x64\release\TulliusWidgets.dll"

    New-Item -ItemType Directory -Path (Join-Path $root ".git") -Force | Out-Null
    New-Item -ItemType Directory -Path (Split-Path $pluginPath -Parent) -Force | Out-Null
    Set-Content -Path $pluginPath -Value "dll" -Encoding UTF8

    $gitStubPath = Join-Path $root "git.cmd"
    Set-Content -Path $gitStubPath -Value "@echo off`r`nexit /b 0`r`n" -Encoding ASCII
    $originalPath = $env:PATH
    $env:PATH = "$root;$originalPath"

    try {
      (Test-CanReuseExistingPluginDll -RepoRoot $root -PluginDllPath $pluginPath) | Should Be $true
    }
    finally {
      $env:PATH = $originalPath
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "returns a short git sha for the current repository with safe.directory override" {
    $sha = Get-ShortGitSha -RepoRoot (Split-Path -Parent $here)
    $sha.Length | Should Be 7
  }

  It "throws when local gh returns a non-zero exit code" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $binDir = Join-Path $root "bin"
    $originalPath = $env:PATH
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
    Set-Content -Path (Join-Path $binDir "gh.cmd") -Value "@echo off`r`nexit /b 1`r`n" -Encoding ASCII
    $env:PATH = "$binDir;$originalPath"

    try {
      $threw = $false
      try {
        Invoke-GhCommand -Arguments @("release", "view", "v1.2.1-rc.3")
      }
      catch {
        $threw = $true
        $_.Exception.Message | Should Match "gh command failed"
      }

      $threw | Should Be $true
    }
    finally {
      $env:PATH = $originalPath
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "creates a clean package stage with only release layout artifacts" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $frontendSource = Join-Path $root "frontend"
    $pluginSource = Join-Path $root "build\TulliusWidgets.dll"
    $stageRoot = Join-Path $root "stage"

    New-Item -ItemType Directory -Path $frontendSource -Force | Out-Null
    New-Item -ItemType Directory -Path (Split-Path $pluginSource -Parent) -Force | Out-Null
    Set-Content -Path (Join-Path $frontendSource "index.html") -Value "frontend" -Encoding UTF8
    Set-Content -Path $pluginSource -Value "dll" -Encoding UTF8
    Set-Content -Path (Join-Path $root "stale.txt") -Value "stale" -Encoding UTF8

    try {
      Initialize-ReleasePackageStage `
        -FrontendSourcePath $frontendSource `
        -PluginDllPath $pluginSource `
        -StageRoot $stageRoot

      (Test-Path (Join-Path $stageRoot "PrismaUI\views\TulliusWidgets\index.html")) | Should Be $true
      (Test-Path (Join-Path $stageRoot "SKSE\Plugins\TulliusWidgets.dll")) | Should Be $true
      (Test-Path (Join-Path $stageRoot "stale.txt")) | Should Be $false
    }
    finally {
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "asserts required frontend and plugin build outputs" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $frontendSource = Join-Path $root "dist\PrismaUI\views\TulliusWidgets"
    $pluginSource = Join-Path $root "build\windows\x64\release\TulliusWidgets.dll"

    New-Item -ItemType Directory -Path $frontendSource -Force | Out-Null
    New-Item -ItemType Directory -Path (Split-Path $pluginSource -Parent) -Force | Out-Null
    Set-Content -Path (Join-Path $frontendSource "index.html") -Value "frontend" -Encoding UTF8
    Set-Content -Path $pluginSource -Value "dll" -Encoding UTF8

    try {
      { Assert-TulliusWidgetsBuildOutputs -FrontendOutputPath $frontendSource -PluginDllPath $pluginSource } | Should Not Throw
    }
    finally {
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "prepares a frontend build workspace from UNC source without WSL tooling" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $sourceRoot = Join-Path $root "repo"
    $viewRoot = Join-Path $sourceRoot "view"
    $stageRoot = $null

    New-Item -ItemType Directory -Path $viewRoot -Force | Out-Null
    Set-Content -Path (Join-Path $viewRoot "package.json") -Value "{}" -Encoding UTF8

    try {
      $stageRoot = Prepare-FrontendBuildWorkspace -SourceRoot $sourceRoot

      (Test-Path (Join-Path $stageRoot "view\package.json")) | Should Be $true
    }
    finally {
      if ($stageRoot -and (Test-Path $stageRoot)) {
        Remove-Item -LiteralPath $stageRoot -Recurse -Force
      }
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "prepares a plugin build workspace from local files without WSL tooling" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $sourceRoot = Join-Path $root "repo"
    $srcRoot = Join-Path $sourceRoot "src"
    $commonLibRoot = Join-Path $sourceRoot "lib\commonlibsse-ng"
    $commonLibSrcRoot = Join-Path $commonLibRoot "src"
    $commonLibIncludeRoot = Join-Path $commonLibRoot "include"
    $commonLibTestsRoot = Join-Path $commonLibRoot "tests"
    $commonLibOpenVrRoot = Join-Path $commonLibRoot "extern\openvr\headers"
    $stageRoot = $null

    New-Item -ItemType Directory -Path $srcRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $commonLibSrcRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $commonLibIncludeRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $commonLibTestsRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $commonLibOpenVrRoot -Force | Out-Null
    Set-Content -Path (Join-Path $sourceRoot ".gitmodules") -Value "[submodule]" -Encoding UTF8
    Set-Content -Path (Join-Path $sourceRoot "xmake.lua") -Value 'set_version("1.2.1-rc.3")' -Encoding UTF8
    Set-Content -Path (Join-Path $srcRoot "main.cpp") -Value "// plugin" -Encoding UTF8
    Set-Content -Path (Join-Path $commonLibRoot "xmake.lua") -Value 'target("commonlibsse-ng")' -Encoding UTF8
    Set-Content -Path (Join-Path $commonLibRoot "xmake-rules.lua") -Value 'rule("commonlibsse-ng.plugin")' -Encoding UTF8
    Set-Content -Path (Join-Path $commonLibSrcRoot "placeholder.cpp") -Value "// lib src" -Encoding UTF8
    Set-Content -Path (Join-Path $commonLibIncludeRoot "placeholder.h") -Value "// lib include" -Encoding UTF8
    Set-Content -Path (Join-Path $commonLibTestsRoot "placeholder.cpp") -Value "// test-only" -Encoding UTF8
    Set-Content -Path (Join-Path $commonLibOpenVrRoot "openvr.h") -Value "// vr-only" -Encoding UTF8

    try {
      $stageRoot = Prepare-PluginBuildWorkspace -SourceRoot $sourceRoot

      (Test-Path (Join-Path $stageRoot ".gitmodules")) | Should Be $true
      (Test-Path (Join-Path $stageRoot "xmake.lua")) | Should Be $true
      (Test-Path (Join-Path $stageRoot "src\main.cpp")) | Should Be $true
      (Test-Path (Join-Path $stageRoot "lib\commonlibsse-ng\xmake.lua")) | Should Be $true
      (Test-Path (Join-Path $stageRoot "lib\commonlibsse-ng\xmake-rules.lua")) | Should Be $true
      (Test-Path (Join-Path $stageRoot "lib\commonlibsse-ng\src\placeholder.cpp")) | Should Be $true
      (Test-Path (Join-Path $stageRoot "lib\commonlibsse-ng\include\placeholder.h")) | Should Be $true
      (Test-Path (Join-Path $stageRoot "lib\commonlibsse-ng\tests\placeholder.cpp")) | Should Be $false
      (Test-Path (Join-Path $stageRoot "lib\commonlibsse-ng\extern\openvr\headers\openvr.h")) | Should Be $false
    }
    finally {
      if ($stageRoot -and (Test-Path $stageRoot)) {
        Remove-Item -LiteralPath $stageRoot -Recurse -Force
      }
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "removes temporary stage directories" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $stageA = Join-Path $root "stage-a"
    $stageB = Join-Path $root "stage-b"
    New-Item -ItemType Directory -Path $stageA -Force | Out-Null
    New-Item -ItemType Directory -Path $stageB -Force | Out-Null

    try {
      Remove-StageRoots -Paths @($stageA, $stageB)
      (Test-Path $stageA) | Should Be $false
      (Test-Path $stageB) | Should Be $false
    }
    finally {
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }
}
