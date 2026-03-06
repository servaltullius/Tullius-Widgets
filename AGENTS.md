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

### Package / Local Release
```powershell
pwsh -File .\scripts\release-local.ps1 -NoPublish
```

## Source Of Truth

- version: `xmake.lua`
- stats payload: `docs/stats-payload-schema.md`
- local release flow: `docs/local-release.ko.md`
