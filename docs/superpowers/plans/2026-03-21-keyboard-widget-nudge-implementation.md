# Keyboard Widget Nudge Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 선택된 HUD 위젯을 방향키와 `Shift+방향키`로 미세 이동할 수 있게 만들어, 마우스 드래그 후 정밀 배치 보정을 지원한다.

**Architecture:** 선택 상태와 해제는 기존 `useWidgetEditSelection`이 유지하고, 새 `useWidgetKeyboardNudge` 훅이 방향키 입력을 `SelectedItemLayoutActions.nudgeSelectedItem(...)`로 연결한다. 폼 컨트롤 포커스 중에는 키보드 이동을 차단해 설정창 조작과 충돌하지 않게 한다.

**Tech Stack:** React, TypeScript, Vitest, Vite

---

## File Map

- `view/src/hooks/useWidgetKeyboardNudge.ts`
  - 선택된 위젯과 액션 객체를 받아 방향키 입력을 처리하는 새 훅.
- `view/src/hooks/useWidgetKeyboardNudge.test.tsx`
  - 방향키 이동, `Shift` 가속 이동, 포커스 충돌 차단을 검증하는 새 테스트.
- `view/src/App.tsx`
  - 새 훅을 연결하고, 선택 상태/액션을 키보드 이동에 전달한다.
- `view/src/App.test.tsx`
  - app 수준에서 `nudgeSelectedItem(...)`와 선택 조건이 제대로 연결되는지 보강한다.
- `view/src/hooks/useWidgetEditSelection.ts`
  - 기존 `Escape` 선택 해제 로직을 유지한다. 구현 중 충돌이 있으면 최소 범위에서만 수정한다.
- `view/src/components/settings/SelectedWidgetQuickEditCard.tsx`
  - 필요 시 방향키 힌트 문구를 넣을 수 있지만, 이번 범위에서는 기본적으로 수정하지 않는다.

---

## Chunk 1: Keyboard Nudge Hook

### Task 1: Add a failing test for keyboard nudge behavior

**Files:**
- Create: `view/src/hooks/useWidgetKeyboardNudge.test.tsx`
- Reference: `view/src/hooks/useWidgetEditSelection.test.tsx`

- [ ] **Step 1: Write the failing test**

`useWidgetKeyboardNudge.test.tsx`에 아래 케이스를 추가한다.

- 선택된 item과 액션이 있을 때 `ArrowRight`가 `nudgeSelectedItem(1, 0)`을 호출한다.
- `Shift+ArrowDown`이 `nudgeSelectedItem(0, 10)`을 호출한다.
- 선택이 없으면 아무 것도 호출하지 않는다.
- `input`, `select`, `textarea`, `contenteditable` 포커스 중에는 호출하지 않는다.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd view
npm test -- useWidgetKeyboardNudge
```

Expected: FAIL because the hook does not exist yet.

- [ ] **Step 3: Write minimal implementation**

`view/src/hooks/useWidgetKeyboardNudge.ts`를 만든다.

- 인자:
  - `enabled`
  - `selectedItemId`
  - `selectedItemLayoutActions`
- 동작:
  - `window`의 `keydown`를 capture 단계로 등록
  - 방향키만 처리
  - `Shift`가 눌리면 delta를 `10`, 아니면 `1`
  - active element가 폼 계열이면 즉시 return
  - 조건을 만족하면 `preventDefault`, `stopPropagation` 후 `nudgeSelectedItem(...)` 호출

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
git commit -m "feat: add keyboard widget nudge hook"
```

## Chunk 2: App Integration

### Task 2: Connect keyboard nudge to selected widget actions

**Files:**
- Modify: `view/src/App.tsx`
- Modify: `view/src/App.test.tsx`

- [ ] **Step 1: Write the failing integration test**

`App.test.tsx` 또는 새 integration test에 아래 케이스를 추가한다.

- 선택된 item이 있을 때 방향키 입력으로 canonical `itemLayouts` 경로가 갱신된다.
- `Shift+방향키`는 10px 이동으로 반영된다.
- 선택이 없으면 update가 일어나지 않는다.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd view
npm test -- App
```

Expected: FAIL because the app does not yet wire keyboard events to the selected item actions.

- [ ] **Step 3: Write minimal implementation**

`App.tsx`에서:

- `selectedItemId`
- `selectedItemLayoutActions`
- `settingsOpen`

을 새 `useWidgetKeyboardNudge(...)` 훅에 넘긴다.

enabled 조건은 아래처럼 제한한다.

- `settingsOpen === true`
- `selectedItemId !== null`
- `selectedItemLayoutActions` 존재

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd view
npm test -- App
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/App.tsx view/src/App.test.tsx
git commit -m "feat: wire keyboard nudges into widget editing"
```

## Chunk 3: Regression Safety

### Task 3: Protect existing selection and form-control behavior

**Files:**
- Modify if needed: `view/src/hooks/useWidgetEditSelection.ts`
- Modify: `view/src/hooks/useWidgetEditSelection.test.tsx`
- Modify if needed: `view/src/components/settings/SelectedWidgetQuickEditCard.tsx`

- [ ] **Step 1: Add regression coverage**

기존 선택 훅 테스트에 아래 케이스를 추가하거나 보강한다.

- `Escape`는 계속 선택 해제만 수행한다.
- 방향키 처리 추가 후에도 기존 `Escape` 동작은 변하지 않는다.
- quick edit 카드의 slider/select 포커스 중에는 방향키가 위젯 이동으로 소비되지 않는다.

- [ ] **Step 2: Run targeted tests**

Run:

```bash
cd view
npm test -- useWidgetEditSelection SelectedWidgetQuickEditCard
```

Expected: FAIL only if the new keyboard path interferes with existing selection behavior.

- [ ] **Step 3: Tighten implementation only if needed**

필요할 때만 다음을 조정한다.

- `useWidgetEditSelection.ts`의 keydown capture 순서
- `useWidgetKeyboardNudge.ts`의 active element guard
- `SelectedWidgetQuickEditCard.tsx`의 포커스 가능 요소 속성

수정은 기존 선택/폼 동작을 유지하는 최소 범위만 허용한다.

- [ ] **Step 4: Re-run targeted tests**

Run:

```bash
cd view
npm test -- useWidgetEditSelection SelectedWidgetQuickEditCard
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/hooks/useWidgetEditSelection.ts view/src/hooks/useWidgetEditSelection.test.tsx view/src/components/settings/SelectedWidgetQuickEditCard.tsx
git commit -m "test: preserve widget selection and form focus behavior"
```

## Chunk 4: Full Verification

### Task 4: Run full verification

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
rsync -av --delete '/home/kdw73/Tullius Widgets/.worktrees/keyboard-widget-nudge/dist/PrismaUI/' '/mnt/g/TAKEALOOK/mods/TulliusWidgets-v1.4.0/PrismaUI/'
```

- [ ] **Step 3: Commit final verification if needed**

```bash
git status --short
git commit --allow-empty -m "chore: verify keyboard widget nudge"
```
