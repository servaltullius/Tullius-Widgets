# Resistance Vertical Widget Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 저항력 HUD를 `숫자 위 / 아이콘 아래` 구조의 세로형 카드로 바꿔 가로 점유 폭을 줄인다.

**Architecture:** 저항력 6종만 전용 렌더러를 사용하고, 나머지 HUD 위젯은 기존 `StatWidget` 경로를 유지한다. `HudWidgetItems`는 표시 모드에 따라 저항력 전용 프레젠테이션 데이터를 계산하고, 전용 컴포넌트가 그 데이터를 세로형 카드로 출력한다.

**Tech Stack:** React, TypeScript, Vitest, Vite

---

## Chunk 1: Resistance Renderer

### Task 1: Add failing renderer tests

**Files:**
- Modify: `view/src/components/HudWidgetItems.test.tsx`
- Create: `view/src/components/ResistanceWidget.test.tsx`

- [ ] **Step 1: Write the failing test**

저항력 카드가 세로형 렌더러를 사용하고, `both` 모드일 때 메인 수치와 보조 수치가 세로로 쌓이는 기대를 테스트에 추가한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd view && npm test -- HudWidgetItems ResistanceWidget`

Expected: FAIL because the resistance renderer does not exist yet.

- [ ] **Step 3: Write minimal implementation**

`ResistanceWidget`를 추가하고, `HudWidgetItems`의 저항력 6종이 이 컴포넌트를 사용하도록 바꾼다.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd view && npm test -- HudWidgetItems ResistanceWidget`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/components/HudWidgetItems.tsx view/src/components/HudWidgetItems.test.tsx view/src/components/ResistanceWidget.tsx view/src/components/ResistanceWidget.test.tsx
git commit -m "feat: render resistances in vertical cards"
```

## Chunk 2: Regression Verification

### Task 2: Verify display modes and build safety

**Files:**
- Modify: `view/src/components/HudWidgetItems.test.tsx`

- [ ] **Step 1: Write the failing regression test**

`effectiveOnly`, `rawOnly`, `both`가 저항력 세로형 카드에서도 기대한 수치/보조수치를 유지하는 테스트를 보강한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd view && npm test -- HudWidgetItems`

Expected: FAIL if the new renderer drops one of the display-mode behaviors.

- [ ] **Step 3: Write minimal implementation**

보조 수치, cap, 툴팁, 색상 처리의 누락이 있으면 `HudWidgetItems` 또는 `ResistanceWidget`에서 최소 수정으로 맞춘다.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd view && npm test -- HudWidgetItems`

Expected: PASS

- [ ] **Step 5: Run full verification**

Run:

```bash
cd view
npm run lint
npm test
npm run build
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add view/src/components/HudWidgetItems.tsx view/src/components/HudWidgetItems.test.tsx view/src/components/ResistanceWidget.tsx view/src/components/ResistanceWidget.test.tsx
git commit -m "test: cover vertical resistance presentation"
```
