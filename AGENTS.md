# Tullius Widgets Guide

## Scope
- Skyrim SE combat-stat HUD mod
- active code domains:
  - `src/` native SKSE C++ plugin
  - `view/` React/TypeScript Prisma UI

## Default Stance
- 실제 코드와 현재 증상을 먼저 본다.
- 리뷰나 조사에서 기본 우선순위는 모드 동작, 런타임 흐름, 데이터 흐름이다.
- 계약, 릴리즈, 문서, 포장 구조는 사용자가 직접 요청했거나 변경 범위에 포함될 때만 깊게 본다.

## Native Domain
- focus:
  - SKSE plugin runtime
  - event sinks
  - stats collection
  - native storage
  - Prisma UI bridge on the C++ side
- start here:
  - bootstrap and lifecycle: `src/main.cpp`
  - stats payloads: `src/StatsCollector.cpp`
  - JS bridge listeners: `src/WidgetJsListeners.cpp`
  - settings persistence: `src/NativeStorage.cpp`
  - runtime visibility/events: `src/WidgetEvents.cpp`
- review bias:
  - 먼저 실제 게임 동작과 런타임 흐름을 본다.
  - 문서/릴리즈 절차보다 hook, event, payload, storage 변화가 실제로 무엇을 바꾸는지부터 본다.
- keep:
  - 변경한 payload 필드는 `view/` 소비 코드와 맞아야 한다.
  - 기존 logger와 guard-first 스타일은 유지한다.
  - `StatsPayloadMode` 의미는 유지한다.
- verification:
  - native 런타임이나 Windows 산출물에 영향이 있으면 Windows 빌드 검증이 우선이다.
  - Windows 빌드를 못 하면 생략 이유를 분명히 남긴다.

## View Domain
- focus:
  - widget rendering
  - stats intake
  - settings state and sync UX
  - bridge handlers on the JS side
- start here:
  - app render flow: `view/src/App.tsx`
  - stats intake: `view/src/hooks/useGameStats.ts`
  - settings state: `view/src/hooks/useSettings.ts`
  - settings sync: `view/src/hooks/useSettingsSync.ts`
  - widget positioning: `view/src/hooks/useWidgetPositions.ts`
  - bridge types: `view/src/types/bridge.d.ts`
- review bias:
  - 먼저 사용자에게 보이는 동작과 상태 변화를 본다.
  - 문서 계약보다 hook 동작, 렌더 흐름, state update, bridge 수신 결과를 먼저 확인한다.
- keep:
  - native에서 오는 실제 payload는 안전하게 normalize해서 쓴다.
  - settings merge와 visibility 동작은 함부로 깨지지 않게 본다.
  - native가 만족할 수 없는 frontend-only schema drift는 만들지 않는다.
- verification:
  - frontend 변경은 가능하면 `lint`, `test`, `build`로 확인한다.

## Hard Constraints
- native와 view가 실제로 쓰는 bridge 동작은 깨지지 않아야 한다.
- legacy settings path는 유지:
  - `Data/SKSE/Plugins/TulliusWidgets.json`
- release/package 작업일 때만 ZIP layout을 유지:
  - `SKSE/Plugins/TulliusWidgets.dll`
  - `PrismaUI/views/TulliusWidgets/...`

## Source Of Truth
- plugin version:
  - `xmake.lua`
- stats payload shape:
  - `docs/stats-payload-schema.md`
- local Windows release flow:
  - `docs/local-release.ko.md`
