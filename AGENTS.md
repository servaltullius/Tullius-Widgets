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

## Workflow Notes

### Pre-commit hook
- The repo-managed hook entrypoint is `scripts/precommit.py`.
- Install or refresh it with `python3 scripts/install_hooks.py --force`.
- Do not restore the old `.vibe/brain/precommit.py` hook path in this repo. `.vibe/` is not a required runtime dependency here.
- The current pre-commit checks are intentionally lightweight:
  - staged `view/` changes: `npm run lint`
  - staged Python files: `py_compile`
  - staged PowerShell files: syntax parse only

### GitHub release publish
- `scripts/release-local.ps1` is the preferred publish entrypoint.
- Release existence checks must use the explicit result returned by `Invoke-GhCommand`; do not rely on outer-scope `$LASTEXITCODE` after helper calls.
- In WSL UNC worktrees, prefer WSL `gh` for release publish steps.
- In regular Windows paths, local `gh` is supported and should be executed without showing helper `cmd` windows.

## Source Of Truth

- version: `xmake.lua`
- stats payload: `docs/stats-payload-schema.md`
- local release flow: `docs/local-release.ko.md`
