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

Push-Location $repoRoot

try {
  Require-Command "git"

  if (-not $SkipFrontendChecks) {
    Require-Command "npm"
    Write-Host "[verify] Running frontend checks..."
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

  if (-not $SkipPluginBuild) {
    Require-Command "xmake"
    Write-Host "[verify] Building native plugin (Windows/MSVC)..."
    xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false
    xmake build
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
}
