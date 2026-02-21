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

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
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

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$workRoot = $repoRoot
$mappedDriveName = $null

if ($workRoot.StartsWith("\\")) {
  $mappedDriveName = "TW"
  if (Get-PSDrive -Name $mappedDriveName -ErrorAction SilentlyContinue) {
    Remove-PSDrive -Name $mappedDriveName -Force
  }
  New-PSDrive -Name $mappedDriveName -PSProvider FileSystem -Root $workRoot -Scope Script | Out-Null
  $workRoot = "$mappedDriveName`:"
  Write-Host "Mapped UNC path to drive: $workRoot"
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
    Push-Location "view"
    try {
      npm ci
      if (-not $SkipLint) {
        npm run lint
      }
      npm run build
    }
    finally {
      Pop-Location
    }
  }

  if (-not $SkipPluginBuild) {
    xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false --ccache=y
    xmake build -y -v
  }

  if (-not (Test-Path "dist/PrismaUI/views/TulliusWidgets/index.html")) {
    throw "Frontend output missing: dist/PrismaUI/views/TulliusWidgets/index.html"
  }
  if (-not (Test-Path "build/windows/x64/release/TulliusWidgets.dll")) {
    throw "Plugin DLL missing: build/windows/x64/release/TulliusWidgets.dll"
  }

  New-Item -ItemType Directory -Path "dist/SKSE/Plugins" -Force | Out-Null
  Copy-Item "build/windows/x64/release/TulliusWidgets.dll" "dist/SKSE/Plugins/TulliusWidgets.dll" -Force

  Get-ChildItem -Path "dist" -Filter "*.zip" -Recurse -File -ErrorAction SilentlyContinue | Remove-Item -Force

  if (Test-Path $zipName) {
    Remove-Item $zipName -Force
  }
  Compress-Archive -Path "dist/*" -DestinationPath $zipName
  Write-Host "Created local package: $zipName"

  if ($NoPublish) {
    Write-Host "NoPublish enabled. Skipping GitHub release publish."
    return
  }

  Require-Command "gh"

  gh release view $tag --repo $Repo *> $null
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
    gh @createArgs
  } else {
    gh release upload $tag $zipName --repo $Repo --clobber
    $editArgs = @("release", "edit", $tag, "--repo", $Repo, "--title", $title, "--notes-file", $notePath)
    if ($Channel -eq "pre") {
      $editArgs += "--prerelease"
    } elseif ($Channel -eq "draft") {
      $editArgs += "--draft"
    } else {
      $editArgs += "--latest"
    }
    gh @editArgs
  }

  Write-Host "Release sync complete: $tag"
}
finally {
  Pop-Location
  if ($mappedDriveName) {
    Remove-PSDrive -Name $mappedDriveName -Force -ErrorAction SilentlyContinue
  }
}
