#!/bin/bash
set -e

DIST_DIR="dist"
PLUGIN_NAME="TulliusWidgets"

echo "=== Building React frontend ==="
cd view && npm run build && cd ..

echo "=== Building SKSE plugin ==="
powershell.exe -Command "cd '$(wslpath -w .)'; xmake build 2>&1" || echo "WARNING: C++ build requires Windows MSVC. Skipping."

echo "=== Packaging ==="
mkdir -p "$DIST_DIR/SKSE/Plugins"
cp "build/windows/x64/release/$PLUGIN_NAME.dll" "$DIST_DIR/SKSE/Plugins/" 2>/dev/null || \
  echo "WARNING: DLL not found. Build the C++ plugin on Windows first."

echo "=== Package ready in $DIST_DIR/ ==="
echo "Copy contents of $DIST_DIR/ into Skyrim/Data/ to install."
