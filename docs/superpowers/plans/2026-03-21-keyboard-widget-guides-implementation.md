# Keyboard Widget Guides Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 선택된 HUD 위젯을 키보드로 이동할 때도 주변 위젯 정렬선을 잠깐 표시해, 마우스 드래그 없이도 간격과 열 정렬을 쉽게 맞출 수 있게 한다.

**Architecture:** 기존 `useWidgetKeyboardNudge` 훅은 방향키 입력과 `nudgeSelectedItem(...)` 호출 책임만 유지한다. `App.tsx`가 이미 가지고 있는 `computeMovePreview(...)`, `itemElementRefs`, `activeGuides` state를 재사용해 키보드 이동 후 guide만 계산하고, 짧은 타이머로 표시를 자동 해제한다.

**Tech Stack:** React, TypeScript, Vitest, Vite

---

## File Map

- `view/src/hooks/useWidgetKeyboardNudge.ts`
  - 방향키 입력 후 상위에 guide 갱신 알림을 넘길 수 있게 선택적 callback을 추가한다.
- `view/src/hooks/useWidgetKeyboardNudge.test.tsx`
  - 방향키 입력 시 nudge 호출과 함께 guide callback이 전달되는지, 폼 포커스 중에는 callback도 막히는지 검증한다.
- `view/src/App.tsx`
  - 키보드 nudge delta를 받아 current layout 기준으로 guide만 계산하고, `activeGuides`를 짧게 보여준 뒤 자동 해제한다.
- `view/src/App.integration.test.tsx`
  - 방향키 이동 시 guide line이 잠깐 표시되고, 실제 좌표는 스냅되지 않는다는 회귀를 검증한다.
- `view/src/components/WidgetEditGuides.tsx`
  - guide 렌더러는 그대로 재사용한다. 구현 중 키보드 guide 표시와 충돌이 있으면 최소 범위만 조정한다.

---

## Chunk 1: Keyboard Nudge Callback

### Task 1: Add guide callback coverage to the keyboard nudge hook

**Files:**
- Modify: `view/src/hooks/useWidgetKeyboardNudge.ts`
- Modify: `view/src/hooks/useWidgetKeyboardNudge.test.tsx`

- [ ] **Step 1: Write the failing test**

`useWidgetKeyboardNudge.test.tsx`에 아래 케이스를 추가한다.

- 방향키 입력 시 `nudgeSelectedItem(...)`와 함께 `onKeyboardNudge(deltaX, deltaY)`가 호출된다.
- `Shift+방향키`는 `10px` delta가 callback에도 그대로 전달된다.
- `input`, `select`, `textarea`, `contenteditable` 포커스 중에는 nudge와 guide callback 모두 호출되지 않는다.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd view
npm test -- useWidgetKeyboardNudge
```

Expected: FAIL because the hook does not yet expose a guide callback.

- [ ] **Step 3: Write minimal implementation**

`useWidgetKeyboardNudge.ts`를 최소 범위로 수정한다.

- 새 optional prop `onKeyboardNudge?: (deltaX: number, deltaY: number) => void`
- 방향키가 유효하게 처리된 직후 `selectedItemLayoutActions.nudgeSelectedItem(...)` 호출
- 이어서 같은 delta로 `onKeyboardNudge?.(...)` 호출
- 기존 enabled / focus guard / `preventDefault()` 동작은 유지

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd view
npm test -- useWidgetKeyboardNudge
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/hooks/useWidgetKeyboardNudge.ts view/src/hooks/useWidgetKeyboardNudge.test.tsx
git commit -m "feat: add keyboard widget guide callback"
```

## Chunk 2: App-Level Guide Lifecycle

### Task 2: Compute and expire keyboard guides in the app shell

**Files:**
- Modify: `view/src/App.tsx`
- Modify: `view/src/App.integration.test.tsx`

- [ ] **Step 1: Write the failing integration test**

`App.integration.test.tsx`에 아래 케이스를 추가한다.

- 선택된 위젯에서 방향키를 누르면 `WidgetEditGuides`가 잠깐 렌더된다.
- guide 계산은 `computeMovePreview(...)` 경로를 재사용하므로, 마우스 드래그와 같은 정렬선이 나온다.
- guide는 타이머가 지나면 자동으로 사라진다.

테스트에서는 fake timers를 사용해 guide 수명을 제어한다.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd view
npm test -- App.integration
```

Expected: FAIL because keyboard nudge does not currently create guides.

- [ ] **Step 3: Write minimal implementation**

`App.tsx`를 다음 방식으로 수정한다.

- `keyboardGuideTimeoutRef`를 추가한다.
- `handleKeyboardNudge(deltaX, deltaY)`를 만든다.
  - 현재 selected item의 canonical layout을 읽는다.
  - `rawX/rawY`에 delta를 더한다.
  - 기존 `computeMovePreview(itemId, rawX, rawY)`를 호출한다.
  - 반환값의 `guides`만 `setActiveGuides(...)`에 반영한다.
  - snapped `position`은 무시한다.
  - 기존 타이머를 clear한 뒤 새 `300ms` timeout으로 guide를 자동 해제한다.
- `useWidgetKeyboardNudge(...)`에 `onKeyboardNudge: handleKeyboardNudge`를 넘긴다.
- 선택 해제, settings close, component unmount 시 guide timeout을 정리한다.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd view
npm test -- App.integration
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/App.tsx view/src/App.integration.test.tsx
git commit -m "feat: show keyboard widget alignment guides"
```

## Chunk 3: Preserve Exact Keyboard Movement

### Task 3: Lock regression that keyboard movement never auto-snaps

**Files:**
- Modify: `view/src/App.integration.test.tsx`
- Modify if needed: `view/src/components/WidgetEditGuides.tsx`

- [ ] **Step 1: Add the regression test**

`App.integration.test.tsx`에 아래 케이스를 추가한다.

- 키보드 이동 후 실제 저장 좌표는 `1px` 또는 `10px` delta만 반영된다.
- guide가 보이더라도 snapped position으로 좌표가 바뀌지 않는다.
- 마우스 드래그 guide/preview 동작은 기존처럼 유지된다.

- [ ] **Step 2: Run targeted test to establish behavior**

Run:

```bash
cd view
npm test -- App.integration WidgetEditGuides
```

Expected: PASS if implementation correctly ignores snapped position, otherwise FAIL.

- [ ] **Step 3: Tighten implementation only if needed**

필요할 때만 다음을 조정한다.

- `handleKeyboardNudge(...)` 내부에서 layout source를 preview가 아닌 canonical layout로 강제
- `clearPreviewState()`와 keyboard guide timeout 해제 순서
- `WidgetEditGuides.tsx`의 `visible` 조건이 keyboard guide 표시와 충돌할 때만 최소 수정

자동 스냅은 절대 추가하지 않는다.

- [ ] **Step 4: Re-run the targeted tests**

Run:

```bash
cd view
npm test -- App.integration WidgetEditGuides
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/App.integration.test.tsx view/src/components/WidgetEditGuides.tsx
git commit -m "test: preserve exact keyboard nudge positions"
```

## Chunk 4: Full Verification

### Task 4: Run full frontend verification

**Files:**
- Verify only

- [ ] **Step 1: Run the full frontend verification suite**

Run:

```bash
cd view
npm run lint
npm test
npm run build
```

Expected: all PASS

- [ ] **Step 2: Sync a local mod folder only if runtime verification is requested**

Run:

```bash
rsync -av --delete '/home/kdw73/Tullius Widgets/.worktrees/keyboard-widget-guides/dist/PrismaUI/' '/mnt/g/TAKEALOOK/mods/TulliusWidgets-v1.4.0/PrismaUI/'
```

- [ ] **Step 3: Commit final verification if needed**

```bash
git status --short
git commit --allow-empty -m "chore: verify keyboard widget guides"
```
