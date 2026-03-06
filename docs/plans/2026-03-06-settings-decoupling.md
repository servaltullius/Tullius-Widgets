# Settings Decoupling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `useSettings`를 저장 동기화와 bridge wiring 책임에서 분리해 읽기/테스트/후속 변경 비용을 낮춘다.

**Architecture:** `useSettings`는 public hook facade로 남기고, 저장 debounce/retry는 `useSettingsSync`, native bridge effect는 `useSettingsBridge`로 뺀다. public behavior는 유지하고 회귀 테스트로 보호한다.

**Tech Stack:** React hooks, TypeScript, Vitest, jsdom

---

### Task 1: Add red tests for extracted responsibilities

**Files:**
- Modify: `view/src/hooks/useSettings.test.tsx`
- Create: `view/src/hooks/useSettingsSync.test.ts`

**Step 1: Write the failing test**
- `useSettingsSync`의 retry/reset 규칙을 직접 검증하는 focused test를 추가한다.

**Step 2: Run test to verify it fails**

Run: `cd view && npm test`
Expected: 새 테스트가 import/구현 부재로 실패

**Step 3: Write minimal implementation**
- extraction target이 될 helper/hook contract를 만든다.

**Step 4: Run test to verify it passes**

Run: `cd view && npm test`
Expected: 새 테스트 포함 green

### Task 2: Extract settings sync hook

**Files:**
- Create: `view/src/hooks/useSettingsSync.ts`
- Modify: `view/src/hooks/useSettings.ts`
- Test: `view/src/hooks/useSettingsSync.test.ts`

**Step 1: Move debounce/retry logic**
- `dispatchSettingsJson`, `notifySettingsChanged`, sync result handler, same-value retry 관련 ref/state를 분리한다.

**Step 2: Keep `useSettings` API stable**
- `updateSetting`과 incoming settings 적용 경로가 새 sync hook을 사용하도록 연결한다.

**Step 3: Run tests**

Run: `cd view && npm test`
Expected: `useSettings` 회귀와 새 sync test green

### Task 3: Extract bridge registration hook

**Files:**
- Create: `view/src/hooks/useSettingsBridge.ts`
- Modify: `view/src/hooks/useSettings.ts`
- Modify: `view/src/hooks/useSettings.test.tsx`

**Step 1: Move bridge effect**
- handler registration/unregister와 `window.onSettingsSyncResult` wiring을 새 hook으로 이동한다.

**Step 2: Preserve contracts**
- `window.updateSettings`, `window.TulliusWidgetsBridge.v1.*`, import/sync callbacks 동작을 유지한다.

**Step 3: Run tests**

Run: `cd view && npm test`
Expected: bridge-related regression tests green

### Task 4: Refactor cleanup and verification

**Files:**
- Modify: `view/src/hooks/useSettings.ts`
- Modify: `view/src/hooks/useSettingsSync.ts`
- Modify: `view/src/hooks/useSettingsBridge.ts`

**Step 1: Reduce hook body noise**
- parameter names, local helper names, cleanup sequencing을 읽기 좋게 정리한다.

**Step 2: Run verification**

Run: `cd view && npm run lint`
Expected: PASS

Run: `cd view && npm test`
Expected: PASS

Plan complete and saved to `docs/plans/2026-03-06-settings-decoupling.md`. 이 세션에서는 승인된 방향대로 옵션 1에 해당하는 현재 세션 구현 경로로 바로 이어간다.
