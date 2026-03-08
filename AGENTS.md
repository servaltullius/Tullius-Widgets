# Tullius Widgets

Skyrim SE combat-stat HUD mod.

## Build

### Frontend
```bash
cd view
npm install
npm run build
```

### Plugin (Windows MSVC)
```powershell
xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false
xmake build -y -v
```

### Plugin Build Note (WSL)
- Windows MSVC build is verified.
- If you are working from WSL/UNC, do not call `xmake` directly inside WSL for the native plugin build.
- Preferred entrypoints from WSL are:
  - `./scripts/package.sh`
  - `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w scripts/verify-runtime-windows.ps1)"`
  - `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w scripts/release-local.ps1)" -NoPublish`
- These scripts stage the native build to a Windows temp path, initialize `VsDevCmd.bat`, and run Windows `xmake` there.
- Only use direct `xmake` commands when you are already in a Windows PowerShell or Developer Command Prompt session.

### Package / Local Release
```powershell
pwsh -File .\scripts\release-local.ps1 -NoPublish
```

### Package / Local Release (WSL)
```bash
./scripts/package.sh
```

## Source Of Truth

- version: `xmake.lua`
- stats payload: `docs/stats-payload-schema.md`
- local release flow: `docs/local-release.ko.md`
