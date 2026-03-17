# Resolution-Stable Item Layouts Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 옮긴 HUD 위젯이 해상도가 바뀌어도 화면 비율상 같은 위치에 남도록 canonical item layout 저장과 복원을 viewport-aware하게 만든다.

**Architecture:** `WidgetItemLayout`에 저장 기준 viewport 메타데이터를 추가하고, canonical layout을 렌더할 때 현재 viewport에 맞게 좌표를 비율 환산한다. canonical layout을 생성하거나 `x/y`를 갱신하는 경로는 모두 현재 viewport 메타데이터를 함께 기록한다.

**Tech Stack:** React, TypeScript, Vitest, Vite

---

## Chunk 1: Schema And Resolution Logic

### Task 1: Add failing viewport-scaling tests

**Files:**
- Modify: `view/src/data/widgetItemRegistry.test.ts`
- Modify: `view/src/hooks/settingsSchema.test.ts`

- [ ] **Step 1: Write the failing test**

`itemLayouts`가 저장 viewport를 포함할 때 현재 viewport 기준으로 `x/y`가 비율 환산되는 테스트와, 새 메타데이터가 sanitize/merge 경로를 통과하는 테스트를 추가한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd view && npm test -- widgetItemRegistry settingsSchema`

Expected: FAIL because viewport metadata is not part of the schema yet.

- [ ] **Step 3: Write minimal implementation**

`WidgetItemLayout` 타입, sanitize/merge, resolution scaling 로직을 추가한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd view && npm test -- widgetItemRegistry settingsSchema`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/types/settings.ts view/src/data/widgetItemRegistry.ts view/src/data/widgetItemRegistry.test.ts view/src/hooks/settingsShared.ts view/src/hooks/settingsSchema.ts view/src/hooks/settingsSchema.test.ts
git commit -m "feat: store viewport metadata for item layouts"
```

## Chunk 2: Write Paths

### Task 2: Persist viewport metadata from editing actions

**Files:**
- Modify: `view/src/App.tsx`
- Modify: `view/src/hooks/useSettings.ts`
- Modify: `view/src/hooks/useSelectedItemLayoutActions.ts`
- Modify: `view/src/utils/itemLayoutEditing.ts`
- Modify: `view/src/App.test.tsx`
- Modify: `view/src/hooks/useSettings.test.tsx`
- Modify: `view/src/utils/itemLayoutEditing.test.ts`

- [ ] **Step 1: Write the failing test**

드래그 종료, nudge, reset, missing canonical seed가 현재 viewport를 함께 기록하는 테스트를 추가한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd view && npm test -- App useSettings itemLayoutEditing`

Expected: FAIL because these paths only update `x/y` today.

- [ ] **Step 3: Write minimal implementation**

위 경로들에서 `viewportWidth/viewportHeight`를 함께 저장하도록 바꾼다.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd view && npm test -- App useSettings itemLayoutEditing`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/App.tsx view/src/App.test.tsx view/src/hooks/useSettings.ts view/src/hooks/useSettings.test.tsx view/src/hooks/useSelectedItemLayoutActions.ts view/src/utils/itemLayoutEditing.ts view/src/utils/itemLayoutEditing.test.ts
git commit -m "fix: persist item layouts against viewport changes"
```

## Chunk 3: Full Verification

### Task 3: Run full regression suite

**Files:**
- Verify only

- [ ] **Step 1: Run full verification**

Run:

```bash
cd view
npm run lint
npm test
npm run build
```

Expected: all PASS

- [ ] **Step 2: Sync local mod folder if requested**

Run:

```bash
rsync -av --delete '/home/kdw73/Tullius Widgets/.worktrees/resolution-stable-item-layouts/dist/PrismaUI/' '/mnt/g/TAKEALOOK/mods/TulliusWidgets-v1.3.0-rc.1/PrismaUI/'
```

- [ ] **Step 3: Commit final polish**

```bash
git status --short
git commit --allow-empty -m "chore: verify resolution-stable item layouts"
```
