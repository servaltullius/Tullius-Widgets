# Runtime Contract Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 브리지 계약, Windows 검증/패키징 루프, 네이티브 orchestration 구조를 함께 하드닝한다.

**Architecture:** 브리지 payload는 공통 fixture와 schema drift guard로 보호하고, Windows verify/release 스크립트는 `release-local.lib.ps1`를 공통 계약 계층으로 사용한다. 네이티브는 stats dispatch/heartbeat 상태를 `main.cpp` 밖으로 분리해 bootstrap/view wiring과 실행 스케줄링 책임을 나눈다.

**Tech Stack:** React 19, TypeScript, Vitest, Node test runner, PowerShell, C++23, SKSE/CommonLibSSE-NG

---

### Task 1: Bridge contract tests and stats schema drift guard

**Files:**
- Create: `view/src/test-fixtures/bridgePayloads.ts`
- Modify: `view/src/hooks/useGameStats.test.tsx`
- Modify: `view/src/hooks/useSettingsBridge.test.tsx`
- Modify: `view/src/hooks/useGameStats.ts`

**Step 1: Write failing tests**
- 미래 `schemaVersion` stats payload를 받으면 UI가 한 번 경고하는 테스트를 추가한다.
- stats/runtime diagnostics canonical payload fixture를 도입하고 기존 테스트를 fixture 기반으로 옮긴다.

**Step 2: Run red**

Run: `cd view && npm test -- --run src/hooks/useGameStats.test.tsx src/hooks/useSettingsBridge.test.tsx`
Expected: schema drift warning test fail

**Step 3: Implement minimal code**
- stats schema warning helper를 추가하고 fixture를 테스트에 연결한다.

**Step 4: Run green**

Run: `cd view && npm test -- --run src/hooks/useGameStats.test.tsx src/hooks/useSettingsBridge.test.tsx`
Expected: PASS

### Task 2: Unify Windows verify/release helper flow

**Files:**
- Modify: `scripts/release-local.lib.ps1`
- Modify: `scripts/verify-runtime-windows.ps1`
- Modify: `scripts/release-local.ps1`
- Modify: `scripts/release-local.Tests.ps1`
- Modify: `scripts/verify-runtime-windows.contract.test.mjs`

**Step 1: Write failing contract tests**
- verify script가 lib를 dot-source하고, 중복 helper 대신 공통 helper를 쓰는지 계약 테스트를 먼저 추가한다.

**Step 2: Run red**

Run: `node --test scripts/verify-runtime-windows.contract.test.mjs`
Expected: FAIL

**Step 3: Implement helper consolidation**
- version parsing / package 인수 계산 / build artifact assert helper를 lib로 이동하고 두 스크립트에서 재사용한다.

**Step 4: Run green**

Run: `node --test scripts/verify-runtime-windows.contract.test.mjs`
Expected: PASS

### Task 3: Extract native runtime orchestration from main.cpp

**Files:**
- Create: `src/WidgetRuntime.h`
- Create: `src/WidgetRuntime.cpp`
- Modify: `src/main.cpp`
- Create: `scripts/native-orchestration.contract.test.mjs`

**Step 1: Write failing structural contract test**
- `main.cpp`가 새 runtime 모듈을 include하고 heartbeat/dispatch 구현을 직접 들고 있지 않다는 계약을 먼저 추가한다.

**Step 2: Run red**

Run: `node --test scripts/native-orchestration.contract.test.mjs`
Expected: FAIL

**Step 3: Implement minimal extraction**
- gameLoaded/dispatch/heartbeat 상태와 루프를 `WidgetRuntime`으로 이동한다.
- `main.cpp`는 interop, bootstrap callback assembly, SKSE load wiring만 남긴다.

**Step 4: Run green**

Run: `node --test scripts/native-orchestration.contract.test.mjs`
Expected: PASS

### Task 4: Full verification

**Files:**
- Modify as needed based on failures

**Step 1: Run project checks**

Run: `cd view && npm run lint`
Expected: PASS

Run: `cd view && npm test -- --run`
Expected: PASS

Run: `cd view && npm run build`
Expected: PASS

Run: `node --test scripts/verify-runtime-windows.contract.test.mjs`
Expected: PASS

Run: `node --test scripts/native-orchestration.contract.test.mjs`
Expected: PASS

**Step 2: Optional Windows-only verification**

Run: `pwsh -File .\scripts\release-local.ps1 -NoPublish`
Expected: Windows/MSVC environment에서만 PASS

Run: `pwsh -File .\scripts\verify-runtime-windows.ps1 -CreateLocalPackage`
Expected: Windows/MSVC environment에서만 PASS
