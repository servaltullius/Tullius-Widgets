$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here "release-local.lib.ps1")

Describe "release-local helpers" {
  It "parses both wsl.localhost and wsl$ UNC paths" {
    $localhost = Get-WslContext -Path "\\wsl.localhost\Ubuntu\home\sample\workspace\Tullius Widgets"
    $legacy = Get-WslContext -Path "\\wsl$\Ubuntu\home\sample\workspace\Tullius Widgets"

    $localhost.Distro | Should Be "Ubuntu"
    $localhost.LinuxPath | Should Be "/home/sample/workspace/Tullius Widgets"
    $legacy.Distro | Should Be "Ubuntu"
    $legacy.LinuxPath | Should Be "/home/sample/workspace/Tullius Widgets"
  }

  It "ignores non-WSL UNC paths" {
    $result = Get-WslContext -Path "\\server\share\Tullius Widgets"
    $result | Should Be $null
  }

  It "resolves repo-local publish paths to absolute WSL paths" {
    $wslContext = @{
      Distro = "Ubuntu"
      LinuxPath = "/home/sample/workspace/Tullius Widgets"
    }

    (Resolve-WslRepoPath -WslContext $wslContext -Path "docs/release-notes/1.2.1-rc.3.ko.md") |
      Should Be "/home/sample/workspace/Tullius Widgets/docs/release-notes/1.2.1-rc.3.ko.md"
    (Resolve-WslRepoPath -WslContext $wslContext -Path ".\\TulliusWidgets-v1.2.1-rc.3.zip") |
      Should Be "/home/sample/workspace/Tullius Widgets/TulliusWidgets-v1.2.1-rc.3.zip"
    (Resolve-WslRepoPath -WslContext $wslContext -Path "/tmp/already-linux-path.zip") |
      Should Be "/tmp/already-linux-path.zip"
    (Resolve-WslRepoPath -Path "TulliusWidgets-v1.2.1-rc.3.zip") |
      Should Be "TulliusWidgets-v1.2.1-rc.3.zip"
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

  It "reuses an existing plugin DLL only when build stamp matches the current native revision" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $pluginPath = Join-Path $root "build\windows\x64\release\TulliusWidgets.dll"
    $xmakePath = Join-Path $root "xmake.lua"

    New-Item -ItemType Directory -Path (Join-Path $root ".git") -Force | Out-Null
    New-Item -ItemType Directory -Path (Split-Path $pluginPath -Parent) -Force | Out-Null
    Set-Content -Path $pluginPath -Value "dll" -Encoding UTF8
    Set-Content -Path $xmakePath -Value 'set_version("1.2.1-rc.3")' -Encoding UTF8

    $gitStubPath = Join-Path $root "git.cmd"
    $gitStub = @'
@echo off
set args=%*
echo %args% | findstr /C:"rev-parse --short HEAD" >nul && (echo abc1234& exit /b 0)
echo %args% | findstr /C:"rev-parse" >nul && (echo abc1234& exit /b 0)
echo %args% | findstr /C:"status" >nul && exit /b 0
exit /b 1
'@
    Set-Content -Path $gitStubPath -Value $gitStub -Encoding ASCII
    $originalPath = $env:PATH
    $env:PATH = "$root;$originalPath"

    try {
      Write-PluginBuildStamp -RepoRoot $root -PluginDllPath $pluginPath
      (Test-CanReuseExistingPluginDll -RepoRoot $root -PluginDllPath $pluginPath) | Should Be $true
    }
    finally {
      $env:PATH = $originalPath
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "does not reuse an existing plugin DLL without a matching build stamp" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $pluginPath = Join-Path $root "build\windows\x64\release\TulliusWidgets.dll"
    $xmakePath = Join-Path $root "xmake.lua"

    New-Item -ItemType Directory -Path (Join-Path $root ".git") -Force | Out-Null
    New-Item -ItemType Directory -Path (Split-Path $pluginPath -Parent) -Force | Out-Null
    Set-Content -Path $pluginPath -Value "dll" -Encoding UTF8
    Set-Content -Path $xmakePath -Value 'set_version("1.2.1-rc.3")' -Encoding UTF8

    $gitStubPath = Join-Path $root "git.cmd"
    $gitStub = @'
@echo off
set args=%*
echo %args% | findstr /C:"rev-parse --short HEAD" >nul && (echo abc1234& exit /b 0)
echo %args% | findstr /C:"rev-parse" >nul && (echo abc1234& exit /b 0)
echo %args% | findstr /C:"status" >nul && exit /b 0
exit /b 1
'@
    Set-Content -Path $gitStubPath -Value $gitStub -Encoding ASCII
    $originalPath = $env:PATH
    $env:PATH = "$root;$originalPath"

    try {
      (Test-CanReuseExistingPluginDll -RepoRoot $root -PluginDllPath $pluginPath) | Should Be $false
      Write-PluginBuildStamp -RepoRoot $root -PluginDllPath $pluginPath
      Set-Content -Path $xmakePath -Value 'set_version("1.2.1-rc.4")' -Encoding UTF8
      (Test-CanReuseExistingPluginDll -RepoRoot $root -PluginDllPath $pluginPath) | Should Be $false
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
    Set-Content -Path (Join-Path $binDir "gh.cmd") -Value "@echo off`r`necho gh-local-failed 1>&2`r`nexit /b 1`r`n" -Encoding ASCII
    $env:PATH = "$binDir;$originalPath"

    try {
      $threw = $false
      try {
        Invoke-GhCommand -Arguments @("release", "view", "v1.2.1-rc.3")
      }
      catch {
        $threw = $true
        $_.Exception.Message | Should Match "gh command failed"
        $_.Exception.Message | Should Match "gh-local-failed"
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

  It "returns local gh output and exit code without relying on LASTEXITCODE" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $binDir = Join-Path $root "bin"
    $originalPath = $env:PATH
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
    Set-Content -Path (Join-Path $binDir "gh.cmd") -Value "@echo off`r`necho gh-ok`r`nexit /b 0`r`n" -Encoding ASCII
    $env:PATH = "$binDir;$originalPath"

    try {
      $LASTEXITCODE = 123
      $result = Invoke-GhCommand -Arguments @("release", "view", "v1.2.1-rc.3")

      $result.ExitCode | Should Be 0
      $result.Output.Trim() | Should Be "gh-ok"
      $LASTEXITCODE | Should Be 123
    }
    finally {
      $env:PATH = $originalPath
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "returns a failed gh result when AllowFailure is set" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $binDir = Join-Path $root "bin"
    $originalPath = $env:PATH
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
    Set-Content -Path (Join-Path $binDir "gh.cmd") -Value "@echo off`r`necho missing release 1>&2`r`nexit /b 1`r`n" -Encoding ASCII
    $env:PATH = "$binDir;$originalPath"

    try {
      $result = Invoke-GhCommand -Arguments @("release", "view", "v1.2.1-rc.3") -AllowFailure

      $result.ExitCode | Should Be 1
      $result.Output | Should Match "missing release"
    }
    finally {
      $env:PATH = $originalPath
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "returns WSL gh output and exit code when WslContext is provided" {
    $originalGetResolvedCommand = (Get-Item function:Get-ResolvedCommand).ScriptBlock
    $originalInvokeProcessWithOutput = (Get-Item function:Invoke-ProcessWithOutput).ScriptBlock
    $script:releaseLocalTestCaptured = $null

    try {
      Set-Item -Path function:Get-ResolvedCommand -Value {
        param([string]$Name)
        if ($Name -eq "wsl") {
          return "wsl.exe"
        }
        & $originalGetResolvedCommand $Name
      }

      Set-Item -Path function:Invoke-ProcessWithOutput -Value {
        param(
          [string]$FilePath,
          [string[]]$ArgumentList,
          [string]$WorkingDirectory
        )

        $script:releaseLocalTestCaptured = @{
          FilePath = $FilePath
          ArgumentList = $ArgumentList
          WorkingDirectory = $WorkingDirectory
        }

        return @{
          Output = "gh-wsl-ok"
          ExitCode = 0
        }
      }

      $result = Invoke-GhCommand `
        -Arguments @("release", "view", "v1.2.1-rc.3") `
        -WslContext @{
          Distro = "Ubuntu"
          LinuxPath = "/home/sample/workspace/Tullius Widgets"
        }

      $result.ExitCode | Should Be 0
      $result.Output.Trim() | Should Be "gh-wsl-ok"
      $script:releaseLocalTestCaptured.FilePath | Should Be "wsl.exe"
      $script:releaseLocalTestCaptured.WorkingDirectory | Should Match "Windows"
      ($script:releaseLocalTestCaptured.ArgumentList -join " ") | Should Match "-d Ubuntu bash -lc"
      ($script:releaseLocalTestCaptured.ArgumentList -join " ") | Should Match "gh 'release' 'view' 'v1.2.1-rc.3'"
    }
    finally {
      $script:releaseLocalTestCaptured = $null
      Set-Item -Path function:Get-ResolvedCommand -Value $originalGetResolvedCommand
      Set-Item -Path function:Invoke-ProcessWithOutput -Value $originalInvokeProcessWithOutput
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

  It "stages the inline-rules CommonLib layout with res templates" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $sourceRoot = Join-Path $root "repo"
    $commonLibRoot = Join-Path $sourceRoot "lib\commonlibsse-ng"
    $stageRoot = $null

    New-Item -ItemType Directory -Path (Join-Path $sourceRoot "src") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $commonLibRoot "src") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $commonLibRoot "include") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $commonLibRoot "res") -Force | Out-Null
    Set-Content -Path (Join-Path $sourceRoot "xmake.lua") -Value 'set_version("1.2.1-rc.3")' -Encoding UTF8
    Set-Content -Path (Join-Path $commonLibRoot "xmake.lua") -Value 'rule("commonlibsse-ng.plugin")' -Encoding UTF8
    Set-Content -Path (Join-Path $commonLibRoot "res\commonlibsse-ng-plugin.cpp.in") -Value "// template" -Encoding UTF8

    try {
      $stageRoot = Prepare-PluginBuildWorkspace -SourceRoot $sourceRoot

      (Test-Path (Join-Path $stageRoot "lib\commonlibsse-ng\xmake.lua")) | Should Be $true
      (Test-Path (Join-Path $stageRoot "lib\commonlibsse-ng\xmake-rules.lua")) | Should Be $false
      (Test-Path (Join-Path $stageRoot "lib\commonlibsse-ng\res\commonlibsse-ng-plugin.cpp.in")) | Should Be $true
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

  It "stages xmake-requires.lock when the repo has one" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $sourceRoot = Join-Path $root "repo"
    $commonLibRoot = Join-Path $sourceRoot "lib\commonlibsse-ng"
    $stageRoot = $null

    New-Item -ItemType Directory -Path (Join-Path $sourceRoot "src") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $commonLibRoot "src") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $commonLibRoot "include") -Force | Out-Null
    Set-Content -Path (Join-Path $sourceRoot "xmake.lua") -Value 'set_version("1.2.1-rc.3")' -Encoding UTF8
    Set-Content -Path (Join-Path $sourceRoot "xmake-requires.lock") -Value '{ "__meta__": {} }' -Encoding UTF8
    Set-Content -Path (Join-Path $commonLibRoot "xmake.lua") -Value 'target("commonlibsse-ng")' -Encoding UTF8
    Set-Content -Path (Join-Path $commonLibRoot "xmake-rules.lua") -Value 'rule("commonlibsse-ng.plugin")' -Encoding UTF8

    try {
      $stageRoot = Prepare-PluginBuildWorkspace -SourceRoot $sourceRoot

      (Test-Path (Join-Path $stageRoot "xmake-requires.lock")) | Should Be $true
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

  It "syncs a changed xmake-requires.lock back from the stage" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $repoRoot = Join-Path $root "repo"
    $stageRoot = Join-Path $root "stage"
    New-Item -ItemType Directory -Path $repoRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

    try {
      (Sync-RequiresLockFromStage -StageRoot $stageRoot -RepoRoot $repoRoot) | Should Be $false
      (Test-Path (Join-Path $repoRoot "xmake-requires.lock")) | Should Be $false

      Set-Content -Path (Join-Path $stageRoot "xmake-requires.lock") -Value '{ "v": 1 }' -Encoding UTF8
      (Sync-RequiresLockFromStage -StageRoot $stageRoot -RepoRoot $repoRoot) | Should Be $true
      (Get-Content -LiteralPath (Join-Path $repoRoot "xmake-requires.lock") -Raw).Trim() | Should Be '{ "v": 1 }'

      (Sync-RequiresLockFromStage -StageRoot $stageRoot -RepoRoot $repoRoot) | Should Be $false
    }
    finally {
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

  It "prefixes cmd steps with call exactly once" {
    (ConvertTo-CmdCallCommand -Command "npm ci") | Should Be "call npm ci"
    (ConvertTo-CmdCallCommand -Command "call npm ci") | Should Be "call npm ci"
    (ConvertTo-CmdCallCommand -Command "CALL `"C:\VS\VsDevCmd.bat`" -arch=amd64") | Should Be "CALL `"C:\VS\VsDevCmd.bat`" -arch=amd64"
    (ConvertTo-CmdCallCommand -Command "`"C:\xmake\xmake.exe`" build") | Should Be "call `"C:\xmake\xmake.exe`" build"
  }

  It "runs every cmd step even when a step is a batch file invoked without call" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $root -Force | Out-Null
    Set-Content -Path (Join-Path $root "first.cmd") -Value @("@echo off", "echo FIRST-RAN") -Encoding ASCII
    Set-Content -Path (Join-Path $root "second.cmd") -Value @("@echo off", "echo done> second.marker") -Encoding ASCII

    try {
      Invoke-CmdCommands -Path $root -Commands @(".\first.cmd", ".\second.cmd")
      (Test-Path (Join-Path $root "second.marker")) | Should Be $true
    }
    finally {
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "stops at the failing cmd step and names it, including negative exit codes" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $root -Force | Out-Null
    Set-Content -Path (Join-Path $root "ok.cmd") -Value @("@echo off", "echo OK-STEP") -Encoding ASCII
    Set-Content -Path (Join-Path $root "fail.cmd") -Value @("@echo off", "echo LINT-ERROR-DETAIL", "exit /b -4058") -Encoding ASCII
    Set-Content -Path (Join-Path $root "after.cmd") -Value @("@echo off", "echo done> after.marker") -Encoding ASCII

    try {
      { Invoke-CmdCommands -Path $root -Commands @(".\ok.cmd", ".\fail.cmd", ".\after.cmd") } |
        Should Throw "Step 2/3 failed with exit code -4058: call .\fail.cmd"
      (Test-Path (Join-Path $root "after.marker")) | Should Be $false
    }
    finally {
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "fails when the cmd batch exits 0 before the last step completed" {
    $output = "##TW-STEP-BEGIN 0`r`n##TW-STEP-DONE 0`r`n##TW-STEP-BEGIN 1`r`nadded 300 packages`r`n##TW-STEP-DONE 1`r`n"
    $result = Resolve-CmdCommandsOutput -Output $output -Path "C:\stage\view" -Commands @("npm ci", "npm run lint") -ExitCode 0

    $result.ErrorMessage | Should Be "Command batch ended without an error code, but step 2/2 never completed: call npm run lint"
    $result.Display | Should Match "\[cmd\] \(1/2\) call npm ci"
    $result.Display | Should Match "added 300 packages"
  }

  It "fails when the cmd working directory cannot be entered" {
    $missing = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    { Invoke-CmdCommands -Path $missing -Commands @("echo never") } |
      Should Throw "Setup step failed with exit code 1: enter $missing"
  }

  It "throws when a checked native command exits non-zero" {
    { Invoke-CheckedNativeCommand -Description "fake lint" -ScriptBlock { cmd.exe /d /c "exit 3" } } |
      Should Throw "fake lint failed with exit code 3"
    { Invoke-CheckedNativeCommand -Description "fake ok" -ScriptBlock { cmd.exe /d /c "exit 0" } } |
      Should Not Throw
  }

  It "keeps the existing frontend dist when the staged build produced no output" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $repoViewDist = Join-Path $root "repo/dist/PrismaUI/views/TulliusWidgets"
    $stagedViewDist = Join-Path $root "stage/dist/PrismaUI/views/TulliusWidgets"
    New-Item -ItemType Directory -Path $repoViewDist -Force | Out-Null
    Set-Content -Path (Join-Path $repoViewDist "index.html") -Value "old" -Encoding ASCII

    try {
      { Publish-StagedFrontendDist -StagedViewDist $stagedViewDist -RepoViewDist $repoViewDist } |
        Should Throw "Staged frontend build output is missing index.html"
      (Get-Content -Path (Join-Path $repoViewDist "index.html") -Raw).Trim() | Should Be "old"
    }
    finally {
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "replaces the frontend dist with the staged build without leaving temporary copies" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $repoViewDist = Join-Path $root "repo/dist/PrismaUI/views/TulliusWidgets"
    $stagedViewDist = Join-Path $root "stage/dist/PrismaUI/views/TulliusWidgets"
    New-Item -ItemType Directory -Path $repoViewDist -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $stagedViewDist "assets") -Force | Out-Null
    Set-Content -Path (Join-Path $repoViewDist "index.html") -Value "old" -Encoding ASCII
    Set-Content -Path (Join-Path $repoViewDist "stale.js") -Value "stale" -Encoding ASCII
    Set-Content -Path (Join-Path $stagedViewDist "index.html") -Value "new" -Encoding ASCII
    Set-Content -Path (Join-Path $stagedViewDist "assets/app.js") -Value "app" -Encoding ASCII

    try {
      Publish-StagedFrontendDist -StagedViewDist $stagedViewDist -RepoViewDist $repoViewDist
      (Get-Content -Path (Join-Path $repoViewDist "index.html") -Raw).Trim() | Should Be "new"
      (Test-Path (Join-Path $repoViewDist "assets/app.js")) | Should Be $true
      (Test-Path (Join-Path $repoViewDist "stale.js")) | Should Be $false
      @(Get-ChildItem -LiteralPath (Split-Path -Parent $repoViewDist) -Force).Count | Should Be 1
    }
    finally {
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }

  It "recognizes step markers appended to output that did not end with a newline" {
    $output = "##TW-STEP-BEGIN 0`r`n##TW-STEP-DONE 0`r`n##TW-STEP-BEGIN 1`r`nbuilding 100%`r##TW-STEP-DONE 1`r`n##TW-STEP-BEGIN 2`r`nerror: broken##TW-STEP-FAIL 2 -4058`r`n"
    $result = Resolve-CmdCommandsOutput -Output $output -Path "C:\stage" -Commands @("xmake build", "npm run lint") -ExitCode -4058

    $result.ErrorMessage | Should Be "Step 2/2 failed with exit code -4058: call npm run lint"
    $result.Display | Should Match "building 100%"
    $result.Display | Should Match "\[cmd\] \(1/2\) ok"
    $result.Display | Should Match "error: broken"
    $result.Display | Should Not Match "##TW-STEP"

    $success = Resolve-CmdCommandsOutput `
      -Output "##TW-STEP-DONE 0`r`n##TW-STEP-BEGIN 1`r`nlast line without newline##TW-STEP-DONE 1`r`n" `
      -Path "C:\stage" `
      -Commands @("xmake build") `
      -ExitCode 0
    $success.ErrorMessage | Should Be $null
  }

  It "keeps the existing frontend dist and leaves no temporary copies when the swap fails" {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString("N"))
    $repoViewDist = Join-Path $root "repo/dist/PrismaUI/views/TulliusWidgets"
    $stagedViewDist = Join-Path $root "stage/dist/PrismaUI/views/TulliusWidgets"
    New-Item -ItemType Directory -Path $repoViewDist -Force | Out-Null
    New-Item -ItemType Directory -Path $stagedViewDist -Force | Out-Null
    Set-Content -Path (Join-Path $repoViewDist "index.html") -Value "old" -Encoding ASCII
    Set-Content -Path (Join-Path $stagedViewDist "index.html") -Value "new" -Encoding ASCII
    # An open handle inside the directory makes Windows refuse to move it.
    $lock = [System.IO.File]::Open(
      (Join-Path $repoViewDist "index.html"),
      [System.IO.FileMode]::Open,
      [System.IO.FileAccess]::Read,
      [System.IO.FileShare]::Read)

    try {
      { Publish-StagedFrontendDist -StagedViewDist $stagedViewDist -RepoViewDist $repoViewDist } | Should Throw
      $lock.Dispose()
      $lock = $null
      (Get-Content -Path (Join-Path $repoViewDist "index.html") -Raw).Trim() | Should Be "old"
      @(Get-ChildItem -LiteralPath (Split-Path -Parent $repoViewDist) -Force).Count | Should Be 1
    }
    finally {
      if ($lock) {
        $lock.Dispose()
      }
      if (Test-Path $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
      }
    }
  }
}
