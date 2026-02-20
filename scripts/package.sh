#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
PLUGIN_NAME="TulliusWidgets"
PLUGIN_DLL="${ROOT_DIR}/build/windows/x64/release/${PLUGIN_NAME}.dll"

VERSION="${1:-$(sed -nE 's/^set_version\("([^"]+)"\)/\1/p' "${ROOT_DIR}/xmake.lua" | head -n1)}"
if [[ -z "${VERSION}" ]]; then
  echo "ERROR: Failed to resolve version from xmake.lua. Pass version explicitly: scripts/package.sh <version>" >&2
  exit 1
fi
RELEASE_NOTE="${ROOT_DIR}/docs/release-notes/${VERSION}.ko.md"

ZIP_NAME="${PLUGIN_NAME}-v${VERSION}.zip"
ZIP_PATH="${ROOT_DIR}/${ZIP_NAME}"

validate_release_note() {
  if [[ ! -f "${RELEASE_NOTE}" ]]; then
    echo "ERROR: Release note missing: ${RELEASE_NOTE}" >&2
    exit 1
  fi

  local required_headers=(
    "## 변경 요약"
    "## 사용자 영향/호환성"
    "## 설치/업데이트 안내"
  )
  for header in "${required_headers[@]}"; do
    if ! grep -qF "${header}" "${RELEASE_NOTE}"; then
      echo "ERROR: Required section missing in ${RELEASE_NOTE}: ${header}" >&2
      exit 1
    fi
  done
}

build_plugin_native() {
  xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false
  xmake build -y -v
}

build_plugin_via_powershell() {
  if ! command -v powershell.exe >/dev/null 2>&1; then
    return 1
  fi

  local win_root
  win_root="$(wslpath -w "${ROOT_DIR}")"
  powershell.exe -NoProfile -Command "Set-Location '${win_root}'; xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false; xmake build -y -v"
}

is_wsl() {
  [[ -n "${WSL_DISTRO_NAME:-}" ]] || grep -qi microsoft /proc/version 2>/dev/null
}

echo "=== Validating release note ==="
validate_release_note

echo "=== Cleaning dist ==="
rm -rf "${DIST_DIR}"

echo "=== Building React frontend ==="
(cd "${ROOT_DIR}/view" && npm run build)

echo "=== Building SKSE plugin ==="
if is_wsl && command -v powershell.exe >/dev/null 2>&1; then
  build_plugin_via_powershell
elif command -v xmake >/dev/null 2>&1; then
  build_plugin_native
elif ! build_plugin_via_powershell; then
  echo "ERROR: xmake or powershell.exe not found. Build must run on Windows/MSVC or WSL with powershell.exe bridge." >&2
  exit 1
fi

if [[ ! -f "${PLUGIN_DLL}" ]]; then
  echo "ERROR: Plugin DLL missing after build: ${PLUGIN_DLL}" >&2
  exit 1
fi

if [[ ! -f "${DIST_DIR}/PrismaUI/views/${PLUGIN_NAME}/index.html" ]]; then
  echo "ERROR: Frontend build output is missing in dist/PrismaUI/views/${PLUGIN_NAME}/" >&2
  exit 1
fi

echo "=== Preparing package layout ==="
mkdir -p "${DIST_DIR}/SKSE/Plugins"
cp "${PLUGIN_DLL}" "${DIST_DIR}/SKSE/Plugins/${PLUGIN_NAME}.dll"

echo "=== Creating zip artifact: ${ZIP_NAME} ==="
rm -f "${ZIP_PATH}"
if command -v zip >/dev/null 2>&1; then
  (cd "${DIST_DIR}" && zip -r "${ZIP_PATH}" .)
elif command -v powershell.exe >/dev/null 2>&1; then
  WIN_DIST="$(wslpath -w "${DIST_DIR}")"
  WIN_ZIP="$(wslpath -w "${ZIP_PATH}")"
  powershell.exe -NoProfile -Command "if (Test-Path '${WIN_ZIP}') { Remove-Item '${WIN_ZIP}' -Force }; Compress-Archive -Path '${WIN_DIST}\\*' -DestinationPath '${WIN_ZIP}'"
else
  echo "ERROR: zip and powershell.exe are both unavailable. Cannot create zip artifact." >&2
  exit 1
fi

if [[ ! -f "${ZIP_PATH}" ]]; then
  echo "ERROR: Zip artifact was not created: ${ZIP_PATH}" >&2
  exit 1
fi

echo "=== Package ready ==="
echo "Artifact: ${ZIP_PATH}"
echo "Install by extracting into Skyrim Special Edition/Data/"
