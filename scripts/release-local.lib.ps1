function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Invoke-GhCommand {
  param(
    [string[]]$Arguments,
    [hashtable]$WslContext,
    [switch]$AllowFailure
  )

  if (Get-Command "gh" -ErrorAction SilentlyContinue) {
    & gh @Arguments
    if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
      throw "gh command failed with exit code ${LASTEXITCODE}: gh $($Arguments -join ' ')"
    }
    return
  }

  if (-not $WslContext) {
    throw "Required command not found: gh"
  }

  $repoLinuxPath = Escape-BashSingleQuoted ($WslContext.LinuxPath.TrimEnd('/'))
  $argText = @($Arguments | ForEach-Object {
    "'" + (Escape-BashSingleQuoted $_) + "'"
  }) -join " "
  $bashCommand = "cd '$repoLinuxPath' && gh $argText"
  & wsl.exe -d $WslContext.Distro bash -lc $bashCommand

  if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
    throw "gh command failed with exit code ${LASTEXITCODE}: gh $($Arguments -join ' ')"
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
    if ($Path.StartsWith("\\")) {
      $escapedPath = $Path.Replace('"', '""')
      & cmd.exe /d /s /c "pushd `"$escapedPath`" && $commandText"
    } else {
      $escapedPath = $Path.Replace('"', '""')
      & cmd.exe /d /s /c "cd /d `"$escapedPath`" && $commandText"
    }
  }
  finally {
    Pop-Location
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $commandText"
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
  robocopy $SourcePath $DestinationPath /MIR /SL /XD .git .xmake build dist node_modules /XF .git /NJH /NJS /NDL /NFL /NP | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "robocopy failed with exit code ${LASTEXITCODE}: $SourcePath -> $DestinationPath"
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
