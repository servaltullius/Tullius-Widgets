# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-24 09:18:07 KST
**Commit:** 61d6835
**Branch:** master

## OVERVIEW
Skyrim SE combat-stat HUD widget mod. Two active code domains: native SKSE C++ plugin (`src/`) and React/TypeScript Prisma UI view (`view/`).

## STRUCTURE
```
Tullius Widgets/
|- src/           # SKSE plugin runtime, game hooks, C++ bridge source
|- view/          # React UI, bridge handlers, settings/runtime rendering
|- docs/          # Release notes, payload schema, plans, screenshots
|- scripts/       # Packaging/release/vibe automation
|- dist/          # Release layout target (must keep compatibility)
`- xmake.lua      # Plugin version + build source of truth
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Plugin startup, game event wiring | `src/main.cpp` | SKSE entrypoint + heartbeat + Prisma view lifecycle |
| Stats payload shape and limits | `src/StatsCollector.cpp`, `docs/stats-payload-schema.md` | Keep JSON keys backward compatible |
| JS bridge contracts | `src/WidgetJsListeners.cpp`, `view/src/types/bridge.d.ts`, `view/src/hooks/useSettings.ts`, `view/src/hooks/useGameStats.ts` | `updateStats`/`updateSettings` compatibility is critical |
| Frontend render/layout behavior | `view/src/App.tsx`, `view/src/components/`, `view/src/hooks/` | Drag/snap and widget visibility behavior |
| Release packaging policy | `scripts/release-local.ps1`, `scripts/package.sh`, `docs/local-release.ko.md` | Windows build required for plugin DLL |

## AGENTS HIERARCHY
- `src/AGENTS.md`: Native plugin conventions, boundaries, and verification.
- `view/AGENTS.md`: Frontend conventions, bridge handling, and tests.
- No dedicated `docs/` or `scripts/` AGENTS in this pass (covered sufficiently at root + low complexity).

## CODE MAP
| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| `SKSEPlugin_Load` | entrypoint | `src/main.cpp` | high | Plugin bootstrap and SKSE listener registration |
| `SKSEMessageHandler` | function | `src/main.cpp` | high | DataLoaded/NewGame/PostLoad dispatch into widget bootstrap |
| `StartHeartbeat` | function | `src/main.cpp` | medium | Throttled stats sync when no game events fire |
| `StatsCollector::CollectStatsJson` | function | `src/StatsCollector.cpp` | high | Runtime stats serialization consumed by UI |
| `useGameStats` | hook | `view/src/hooks/useGameStats.ts` | high | Receives native `updateStats` payload |
| `useSettings` | hook | `view/src/hooks/useSettings.ts` | high | Receives/persists settings and bridge handlers |

## CONVENTIONS
- Keep changes localized; prefer existing patterns over introducing framework/style churn.
- C++ uses C++23 + SKSE logger (`logger::info/error/critical`) and guard-first runtime handling.
- Frontend uses ESLint + Vitest conventions from `view/` scripts; no separate env/db setup.
- Version source of truth is `xmake.lua` `set_version("...")`; release tag/title must match.

## ANTI-PATTERNS (THIS PROJECT)
- Breaking JS bridge compatibility (`updateStats`, `updateSettings`, and related bridge handlers).
- Altering release ZIP root layout (`SKSE/Plugins/...` + `PrismaUI/views/TulliusWidgets/...`).
- Changing legacy config path (`Data/SKSE/Plugins/TulliusWidgets.json`).
- Shipping release notes without Korean language and required sections.
- Using non-SKSE logging paths for plugin runtime diagnostics.

## UNIQUE STYLES
- Runtime data is event-driven plus heartbeat fallback to avoid stale UI during quiet gameplay windows.
- Settings merge strategy prioritizes backward-compatible defaults over strict schema rejection.
- Display cap is intentional for critical hit chance only (0–100 clamp). Resistances are uncapped (raw actor values).

## COMMANDS
```bash
# Frontend
cd view && npm install
cd view && npm run dev
cd view && npm run lint
cd view && npm test
cd view && npm run build

# Plugin (Windows/MSVC)
xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false && xmake build

# Local release (Windows)
pwsh -File .\scripts\release-local.ps1 -NoPublish
```

## NOTES
- No `.env` workflow in current repo.
- C++ plugin build is Windows/MSVC-only; WSL/Linux path supports frontend and packaging steps only.
- Required release note path: `docs/release-notes/<version>.ko.md` with sections `변경 요약`, `사용자 영향/호환성`, `설치/업데이트 안내`.
