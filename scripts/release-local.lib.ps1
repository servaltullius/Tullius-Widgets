function Require-Command {
  param([string]$Name)
  if (-not (Get-ResolvedCommand $Name)) {
    throw "Required command not found: $Name"
  }
}

function Get-ResolvedCommand {
  param([string]$Name)

  foreach ($candidate in @("$Name.cmd", "$Name.bat", "$Name.exe", $Name)) {
    $command = Get-Command $candidate -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) {
      if ($command.Path) {
        return $command.Path
      }
      return $command.Source
    }
  }

  return $null
}

function Test-CommandAvailable {
  param([string]$Name)
  return $null -ne (Get-ResolvedCommand $Name)
}

function Test-WindowsCommandAvailable {
  param([string]$Name)

  if (-not (Get-Command "cmd.exe" -ErrorAction SilentlyContinue)) {
    return $false
  }

  $bootstrapLocation = if ($env:SystemRoot -and (Test-Path $env:SystemRoot)) {
    $env:SystemRoot
  } elseif ($env:SystemDrive) {
    "$($env:SystemDrive)\"
  } else {
    "C:\"
  }

  Push-Location $bootstrapLocation
  try {
    & cmd.exe /d /s /c "where $Name >nul 2>nul"
    return $LASTEXITCODE -eq 0
  }
  finally {
    Pop-Location
  }
}

function Get-WindowsXmakeCommand {
  if (Test-WindowsCommandAvailable "xmake") {
    return "xmake"
  }

  $candidates = @()
  if ($env:ProgramFiles) {
    $candidates += (Join-Path $env:ProgramFiles "xmake\xmake.exe")
  }
  if ($env:LOCALAPPDATA) {
    $candidates += (Join-Path $env:LOCALAPPDATA "Programs\xmake\xmake.exe")
  }
  if ($env:USERPROFILE) {
    $candidates += (Join-Path $env:USERPROFILE "scoop\apps\xmake\current\xmake.exe")
    $candidates += (Join-Path $env:USERPROFILE "scoop\shims\xmake.exe")
  }
  if ($env:ProgramData) {
    $candidates += (Join-Path $env:ProgramData "chocolatey\bin\xmake.exe")
    $candidates += (Join-Path $env:ProgramData "chocolatey\lib\xmake\tools\xmake.exe")
  }

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  return $null
}

function Get-WindowsVsDevCmd {
  $candidates = @(
    "C:\Program Files\Microsoft Visual Studio\18\Community\Common7\Tools\VsDevCmd.bat",
    "C:\Program Files\Microsoft Visual Studio\17\Community\Common7\Tools\VsDevCmd.bat",
    "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat",
    "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\Common7\Tools\VsDevCmd.bat"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  return $null
}

function Convert-ToCmdArgument {
  param([string]$Value)

  return "`"$($Value.Replace('"', '""'))`""
}

function Invoke-CmdBatchScriptWithOutput {
  param(
    [string[]]$ScriptLines,
    [string]$WorkingDirectory
  )

  $commandScriptPath = Join-Path $env:TEMP ("codex-cmd-" + [guid]::NewGuid().ToString("N") + ".cmd")
  $stdoutPath = Join-Path $env:TEMP ("codex-cmd-out-" + [guid]::NewGuid().ToString("N") + ".log")
  $stderrPath = Join-Path $env:TEMP ("codex-cmd-err-" + [guid]::NewGuid().ToString("N") + ".log")
  Set-Content -Path $commandScriptPath -Value $ScriptLines -Encoding ASCII

  try {
    Push-Location $WorkingDirectory
    try {
      $process = Start-Process `
        -FilePath "cmd.exe" `
        -ArgumentList @("/d", "/c", $commandScriptPath) `
        -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden `
        -Wait `
        -PassThru `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath
    }
    finally {
      Pop-Location
    }

    $stdout = if (Test-Path $stdoutPath) {
      $content = Get-Content -Path $stdoutPath -Raw
      if ($null -eq $content) { "" } else { $content }
    } else {
      ""
    }
    $stderr = if (Test-Path $stderrPath) {
      $content = Get-Content -Path $stderrPath -Raw
      if ($null -eq $content) { "" } else { $content }
    } else {
      ""
    }
    $combinedOutput = "$stdout$stderr"
    $combinedOutput = [regex]::Replace(
      $combinedOutput,
      "(?ms)^'\\\\wsl(?:\.localhost|\$)\\.*?^UNC paths are not supported\.\s+Defaulting to Windows directory\.\r?\n?",
      ""
    )

    return @{
      Output = $combinedOutput
      ExitCode = $process.ExitCode
    }
  }
  finally {
    Remove-Item -LiteralPath $commandScriptPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $stdoutPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
  }
}

function Invoke-ProcessWithOutput {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$WorkingDirectory
  )

  $stdoutPath = Join-Path $env:TEMP ("codex-proc-out-" + [guid]::NewGuid().ToString("N") + ".log")
  $stderrPath = Join-Path $env:TEMP ("codex-proc-err-" + [guid]::NewGuid().ToString("N") + ".log")

  try {
    $process = Start-Process `
      -FilePath $FilePath `
      -ArgumentList $ArgumentList `
      -WorkingDirectory $WorkingDirectory `
      -WindowStyle Hidden `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $stdoutPath `
      -RedirectStandardError $stderrPath

    $stdout = if (Test-Path $stdoutPath) {
      $content = Get-Content -Path $stdoutPath -Raw
      if ($null -eq $content) { "" } else { $content }
    } else {
      ""
    }
    $stderr = if (Test-Path $stderrPath) {
      $content = Get-Content -Path $stderrPath -Raw
      if ($null -eq $content) { "" } else { $content }
    } else {
      ""
    }

    $combinedOutput = "$stdout$stderr"
    $combinedOutput = [regex]::Replace(
      $combinedOutput,
      "(?ms)^'\\\\wsl(?:\.localhost|\$)\\.*?^UNC paths are not supported\.\s+Defaulting to Windows directory\.\r?\n?",
      ""
    )

    return @{
      Output = $combinedOutput
      ExitCode = $process.ExitCode
    }
  }
  finally {
    Remove-Item -LiteralPath $stdoutPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
  }
}

function Invoke-WslBashCommand {
  param(
    [string]$Distro,
    [string]$BashCommand
  )

  return Invoke-CmdBatchScriptWithOutput -WorkingDirectory $env:SystemRoot -ScriptLines @(
    "@echo off",
    "wsl.exe -d `"$Distro`" bash -lc `"$BashCommand`"",
    "exit /b %errorlevel%"
  )
}

function Invoke-GhCommand {
  param(
    [string[]]$Arguments,
    [hashtable]$WslContext,
    [switch]$AllowFailure
  )

  if ($WslContext) {
    $repoLinuxPath = Escape-BashSingleQuoted ($WslContext.LinuxPath.TrimEnd('/'))
    $argText = @($Arguments | ForEach-Object {
      "'" + (Escape-BashSingleQuoted $_) + "'"
    }) -join " "
    $bashCommand = "cd '$repoLinuxPath' && gh $argText"
    $result = Invoke-WslBashCommand -Distro $WslContext.Distro -BashCommand $bashCommand

    if (-not $AllowFailure -and $result.ExitCode -ne 0) {
      throw "gh command failed with exit code $($result.ExitCode): gh $($Arguments -join ' ')"
    }
    return $result
  }

  $ghCommand = Get-ResolvedCommand "gh"
  if ($ghCommand) {
    $result = Invoke-ProcessWithOutput `
      -FilePath $ghCommand `
      -ArgumentList $Arguments `
      -WorkingDirectory ((Get-Location).Path)
    if (-not $AllowFailure -and $result.ExitCode -ne 0) {
      throw "gh command failed with exit code $($result.ExitCode): gh $($Arguments -join ' ')"
    }
    return $result
  }

  if (-not $WslContext) {
    throw "Required command not found: gh"
  }
}

function Assert-ReleaseNote {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    throw "Release note missing: $Path"
  }
  $content = Get-Content $Path -Raw
  foreach ($required in @("## 변경 요약", "## 사용자 영향/호환성", "## 설치/업데이트 안내")) {
    if ($content -notmatch [regex]::Escape($required)) {
      throw "Release note section missing: $required"
    }
  }
}

function Parse-VersionFromXmake {
  param([string]$Path)

  $match = Select-String -Path $Path -Pattern 'set_version\("([^"]+)"\)' | Select-Object -First 1
  if (-not $match) {
    throw "Unable to parse version from $Path"
  }

  return $match.Matches[0].Groups[1].Value
}

function Get-ReleaseLocalArgumentsForPackaging {
  param(
    [switch]$SkipFrontendChecks,
    [switch]$SkipPluginBuild
  )

  $arguments = @("-NoPublish")
  if (-not $SkipFrontendChecks) {
    $arguments += "-SkipLint"
    $arguments += "-SkipFrontendBuild"
  }
  if (-not $SkipPluginBuild) {
    $arguments += "-SkipPluginBuild"
  }

  return $arguments
}

function Get-ShortGitSha {
  param([string]$RepoRoot = (Get-Location).Path)

  $result = Invoke-GitInRepo -RepoRoot $RepoRoot -Arguments @("rev-parse", "--short", "HEAD")
  if ($result.ExitCode -ne 0) {
    throw "git rev-parse failed for $RepoRoot : $($result.Output)"
  }

  return $result.Output.Trim()
}

function Resolve-PluginBuildPaths {
  param(
    [string]$RepoRoot = (Get-Location).Path,
    [string]$PluginDllPath = "build/windows/x64/release/TulliusWidgets.dll"
  )

  $resolvedRepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
  $resolvedPluginDllPath = if ([System.IO.Path]::IsPathRooted($PluginDllPath)) {
    [System.IO.Path]::GetFullPath($PluginDllPath)
  } else {
    Join-Path $resolvedRepoRoot $PluginDllPath
  }

  return @{
    RepoRoot = $resolvedRepoRoot
    PluginDllPath = $resolvedPluginDllPath
    StampPath = "$resolvedPluginDllPath.build.json"
  }
}

function Write-PluginBuildStamp {
  param(
    [string]$RepoRoot = (Get-Location).Path,
    [string]$PluginDllPath = "build/windows/x64/release/TulliusWidgets.dll"
  )

  $paths = Resolve-PluginBuildPaths -RepoRoot $RepoRoot -PluginDllPath $PluginDllPath
  $version = Parse-VersionFromXmake -Path (Join-Path $paths.RepoRoot "xmake.lua")
  $gitSha = Get-ShortGitSha -RepoRoot $paths.RepoRoot
  $stampDir = Split-Path -Parent $paths.StampPath
  if ($stampDir) {
    New-Item -ItemType Directory -Path $stampDir -Force | Out-Null
  }

  $stamp = [ordered]@{
    version = $version
    gitSha = $gitSha
  }
  $stamp | ConvertTo-Json -Compress | Set-Content -Path $paths.StampPath -Encoding UTF8
}

function Read-PluginBuildStamp {
  param(
    [string]$RepoRoot = (Get-Location).Path,
    [string]$PluginDllPath = "build/windows/x64/release/TulliusWidgets.dll"
  )

  $paths = Resolve-PluginBuildPaths -RepoRoot $RepoRoot -PluginDllPath $PluginDllPath
  if (-not (Test-Path $paths.StampPath)) {
    return $null
  }

  try {
    return Get-Content -Path $paths.StampPath -Raw | ConvertFrom-Json
  }
  catch {
    return $null
  }
}

function Test-HasNativeWorktreeChanges {
  param([string]$RepoRoot = (Get-Location).Path)

  $result = Invoke-GitInRepo -RepoRoot $RepoRoot -Arguments @(
    "status",
    "--short",
    "--untracked-files=all",
    "--",
    "src",
    "xmake.lua",
    "lib/commonlibsse-ng"
  )
  if ($result.ExitCode -ne 0) {
    throw "git status failed for $RepoRoot : $($result.Output)"
  }

  return -not [string]::IsNullOrWhiteSpace($result.Output.Trim())
}

function Test-CanReuseExistingPluginDll {
  param(
    [string]$RepoRoot = (Get-Location).Path,
    [string]$PluginDllPath = "build/windows/x64/release/TulliusWidgets.dll"
  )

  $paths = Resolve-PluginBuildPaths -RepoRoot $RepoRoot -PluginDllPath $PluginDllPath

  if (-not (Test-Path $paths.PluginDllPath)) {
    return $false
  }

  $stamp = Read-PluginBuildStamp -RepoRoot $paths.RepoRoot -PluginDllPath $paths.PluginDllPath
  if (-not $stamp) {
    return $false
  }

  $currentVersion = Parse-VersionFromXmake -Path (Join-Path $paths.RepoRoot "xmake.lua")
  $currentGitSha = Get-ShortGitSha -RepoRoot $paths.RepoRoot
  if ("$($stamp.version)" -ne $currentVersion -or "$($stamp.gitSha)" -ne $currentGitSha) {
    return $false
  }

  return -not (Test-HasNativeWorktreeChanges -RepoRoot $paths.RepoRoot)
}

function Invoke-CmdBatchScript {
  param(
    [string[]]$ScriptLines,
    [string]$WorkingDirectory
  )

  $result = Invoke-CmdBatchScriptWithOutput -ScriptLines $ScriptLines -WorkingDirectory $WorkingDirectory
  if ($result.Output) {
    Write-Host -NoNewline $result.Output
  }
  return $result.ExitCode
}

function Invoke-CmdCommands {
  param(
    [string]$Path,
    [string[]]$Commands
  )

  $filteredCommands = @($Commands | Where-Object { $_ })
  if ($filteredCommands.Count -eq 0) {
    return
  }

  $commandText = $filteredCommands -join " && "
  $bootstrapLocation = if ($env:SystemRoot -and (Test-Path $env:SystemRoot)) {
    $env:SystemRoot
  } elseif ($env:SystemDrive) {
    "$($env:SystemDrive)\"
  } else {
    "C:\"
  }

  Push-Location $bootstrapLocation
  try {
    $scriptLines = [System.Collections.Generic.List[string]]::new()
    $scriptLines.Add("@echo off")
    $scriptLines.Add("setlocal")

    $exitCode = 0

    if ($Path.StartsWith("\\")) {
      $scriptLines.Add("pushd `"$Path`"")
    } else {
      $scriptLines.Add("cd /d `"$Path`"")
    }
    $scriptLines.Add("if errorlevel 1 exit /b %errorlevel%")

    foreach ($command in $filteredCommands) {
      $scriptLines.Add($command)
      $scriptLines.Add("if errorlevel 1 exit /b %errorlevel%")
    }

    $scriptLines.Add("endlocal")
    $exitCode = Invoke-CmdBatchScript -ScriptLines $scriptLines -WorkingDirectory $bootstrapLocation
  }
  finally {
    Pop-Location
  }

  if ($exitCode -ne 0) {
    throw "Command failed with exit code ${exitCode}: $commandText"
  }
}

function Get-WslContext {
  param([string]$Path)

  if ($Path -notmatch '^\\\\wsl(?:\.localhost|\$)\\([^\\]+)\\(.*)$') {
    return $null
  }

  return @{
    Distro = $matches[1]
    LinuxPath = "/" + (($matches[2] -replace '\\', '/').TrimStart('/'))
  }
}

function Invoke-GitInRepo {
  param(
    [string]$RepoRoot = (Get-Location).Path,
    [string[]]$Arguments
  )

  $resolvedRepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)

  $gitCommand = Get-ResolvedCommand "git"
  if ($gitCommand) {
    $gitArguments = @("-c", "safe.directory=$resolvedRepoRoot", "-C", $resolvedRepoRoot) + $Arguments
    $commandLine = (Convert-ToCmdArgument $gitCommand) + " " + (($gitArguments | ForEach-Object { Convert-ToCmdArgument $_ }) -join " ")
    return Invoke-CmdBatchScriptWithOutput `
      -WorkingDirectory $resolvedRepoRoot `
      -ScriptLines @("@echo off", "setlocal", $commandLine, "exit /b %errorlevel%")
  }

  $wslContext = Get-WslContext -Path $resolvedRepoRoot
  if (-not $wslContext) {
    throw "Required command not found: git"
  }

  $repoLinuxPath = Escape-BashSingleQuoted ($wslContext.LinuxPath.TrimEnd('/'))
  $argText = @($Arguments | ForEach-Object {
    "'" + (Escape-BashSingleQuoted $_) + "'"
  }) -join " "
  $bashCommand = "cd '$repoLinuxPath' && git -c 'safe.directory=$repoLinuxPath' -C '$repoLinuxPath' $argText"
  return Invoke-WslBashCommand -Distro $wslContext.Distro -BashCommand $bashCommand
}

function Escape-BashSingleQuoted {
  param([string]$Value)

  return $Value.Replace("'", "'""'""'")
}

function New-StageRoot {
  param(
    [string]$Prefix
  )

  $stageRoot = Join-Path $env:TEMP ("$Prefix-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null
  return $stageRoot
}

function Copy-FileToStage {
  param(
    [string]$SourceRoot,
    [string]$StageRoot,
    [string]$RelativePath
  )

  $sourcePath = Join-Path $SourceRoot $RelativePath
  if (-not (Test-Path $sourcePath)) {
    throw "Required path missing from worktree: $RelativePath"
  }

  $destinationPath = Join-Path $StageRoot $RelativePath
  $destinationDir = Split-Path -Parent $destinationPath
  if ($destinationDir) {
    New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
  }

  Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
}

function Copy-DirectorySnapshot {
  param(
    [string]$SourcePath,
    [string]$DestinationPath
  )

  if (-not (Test-Path $SourcePath)) {
    throw "Directory source missing: $SourcePath"
  }

  New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
  $bootstrapLocation = if ($env:SystemRoot -and (Test-Path $env:SystemRoot)) {
    $env:SystemRoot
  } elseif ($env:SystemDrive) {
    "$($env:SystemDrive)\"
  } else {
    "C:\"
  }

  $robocopyPath = if ($env:SystemRoot) {
    Join-Path $env:SystemRoot "System32\robocopy.exe"
  } else {
    "robocopy.exe"
  }

  $robocopyCommand = "`"$robocopyPath`" `"$SourcePath`" `"$DestinationPath`" /MIR /SL /XD .git .xmake build dist node_modules /XF .git /NJH /NJS /NDL /NFL /NP"
  $exitCode = Invoke-CmdBatchScript `
    -WorkingDirectory $bootstrapLocation `
    -ScriptLines @(
      "@echo off",
      "setlocal",
      $robocopyCommand,
      "exit /b %errorlevel%"
    )

  if ($exitCode -gt 7) {
    throw "robocopy failed with exit code ${exitCode}: $SourcePath -> $DestinationPath"
  }
}

function Copy-CommonLibSseNgReleaseSubset {
  param(
    [string]$SourceRoot,
    [string]$StageRoot
  )

  $commonLibRoot = Join-Path $SourceRoot "lib\commonlibsse-ng"
  foreach ($relativeFile in @(
    "lib\commonlibsse-ng\xmake.lua",
    "lib\commonlibsse-ng\xmake-rules.lua"
  )) {
    Copy-FileToStage -SourceRoot $SourceRoot -StageRoot $StageRoot -RelativePath $relativeFile
  }

  foreach ($relativeDirectory in @(
    "lib\commonlibsse-ng\include",
    "lib\commonlibsse-ng\src"
  )) {
    Copy-DirectorySnapshot `
      -SourcePath (Join-Path $SourceRoot $relativeDirectory) `
      -DestinationPath (Join-Path $StageRoot $relativeDirectory)
  }

  if (-not (Test-Path (Join-Path $commonLibRoot "xmake.lua"))) {
    throw "Required path missing from worktree: lib\\commonlibsse-ng\\xmake.lua"
  }
}

function Prepare-PluginBuildWorkspace {
  param(
    [string]$SourceRoot,
    [hashtable]$WslContext
  )

  $stageRoot = New-StageRoot -Prefix "TulliusWidgets-plugin-build"
  if (Test-Path (Join-Path $SourceRoot ".gitmodules")) {
    Copy-FileToStage -SourceRoot $SourceRoot -StageRoot $stageRoot -RelativePath ".gitmodules"
  }
  Copy-FileToStage -SourceRoot $SourceRoot -StageRoot $stageRoot -RelativePath "xmake.lua"
  Copy-DirectorySnapshot `
    -SourcePath (Join-Path $SourceRoot "src") `
    -DestinationPath (Join-Path $stageRoot "src")
  Copy-CommonLibSseNgReleaseSubset -SourceRoot $SourceRoot -StageRoot $stageRoot

  return $stageRoot
}

function Prepare-FrontendBuildWorkspace {
  param(
    [string]$SourceRoot,
    [hashtable]$WslContext
  )

  $stageRoot = New-StageRoot -Prefix "TulliusWidgets-frontend-build"
  Copy-DirectorySnapshot `
    -SourcePath (Join-Path $SourceRoot "view") `
    -DestinationPath (Join-Path $stageRoot "view")

  return $stageRoot
}

function Initialize-ReleasePackageStage {
  param(
    [string]$FrontendSourcePath,
    [string]$PluginDllPath,
    [string]$StageRoot
  )

  if (-not (Test-Path $FrontendSourcePath)) {
    throw "Frontend source missing: $FrontendSourcePath"
  }
  if (-not (Test-Path $PluginDllPath)) {
    throw "Plugin DLL missing: $PluginDllPath"
  }

  $stageViewParent = Join-Path $StageRoot "PrismaUI/views"
  $stagePluginDir = Join-Path $StageRoot "SKSE/Plugins"
  New-Item -ItemType Directory -Path $stageViewParent -Force | Out-Null
  New-Item -ItemType Directory -Path $stagePluginDir -Force | Out-Null

  Copy-Item -LiteralPath $FrontendSourcePath -Destination (Join-Path $stageViewParent "TulliusWidgets") -Recurse -Force
  Copy-Item -LiteralPath $PluginDllPath -Destination (Join-Path $stagePluginDir "TulliusWidgets.dll") -Force
}

function Assert-TulliusWidgetsBuildOutputs {
  param(
    [string]$FrontendOutputPath = "dist/PrismaUI/views/TulliusWidgets",
    [string]$PluginDllPath = "build/windows/x64/release/TulliusWidgets.dll"
  )

  if (-not (Test-Path (Join-Path $FrontendOutputPath "index.html"))) {
    throw "Frontend output missing: $FrontendOutputPath/index.html"
  }
  if (-not (Test-Path $PluginDllPath)) {
    throw "Plugin DLL missing: $PluginDllPath"
  }
}

function Remove-StageRoots {
  param(
    [string[]]$Paths
  )

  foreach ($path in @($Paths | Where-Object { $_ })) {
    if (Test-Path $path) {
      Remove-Item -LiteralPath $path -Recurse -Force
    }
  }
}
