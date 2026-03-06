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
```bash
xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false
xmake build
```

### Plugin Build Note (WSL)
- Windows MSVC build is verified.
- If you are working from WSL, do not run the plugin build directly from the WSL/UNC workspace path.
- Stage or copy the repo to a local Windows path such as `C:\Users\Public\tullius-native-build`, open a Visual Studio Developer Command Prompt, and run the same `xmake` commands there.

### Package / Local Release
```powershell
pwsh -File .\scripts\release-local.ps1 -NoPublish
```

## Source Of Truth

- version: `xmake.lua`
- stats payload: `docs/stats-payload-schema.md`
- local release flow: `docs/local-release.ko.md`
