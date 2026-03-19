# Draggable Settings Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설정창을 드래그로 옮기고 위치를 기억하게 만들어 패널 뒤에 가려진 위젯도 선택 가능하게 하고, 위젯 위치 reset이 현재 해상도 기준 기본 배치를 유지함을 테스트로 고정한다.

**Architecture:** 설정창은 헤더 드래그로만 이동하며, 위치는 `settingsPanelState`에서 `localStorage`로 저장한다. 렌더 시 실제 패널 rect를 기준으로 viewport 안으로 클램프하고, 위젯 reset은 기존 viewport-aware default placement 경로를 유지하면서 회귀 테스트만 강화한다.

**Tech Stack:** React, TypeScript, Vitest, Vite

---

## File Map

- `view/src/components/SettingsPanel.tsx`
  - 패널 드래그 상태, 헤더 drag handle, 위치 적용, resize 시 클램프를 담당한다.
- `view/src/components/settings/settingsPanelState.ts`
  - panel tab/expanded state와 함께 저장된 패널 위치 read/write, clamp helper를 담당한다.
- `view/src/constants/bridge.ts`
  - 패널 위치 저장 key를 추가한다.
- `view/src/components/SettingsPanel.test.tsx`
  - 패널 위치 복원, 드래그 이동, resize clamp를 검증한다.
- `view/src/utils/itemLayoutEditing.test.ts`
  - reset이 현재 viewport 기준 기본 배치를 사용함을 검증한다.
- `view/src/data/widgetRegistry.ts`
  - reset 시 기본 위치가 해상도별로 어색하다고 테스트/런타임에서 확인될 때만 조정한다.
- `view/src/data/widgetRegistry.test.ts`
  - 위 `widgetRegistry.ts` 조정이 생길 때만 같이 보강한다.

---

## Chunk 1: Panel Position Persistence

### Task 1: Add storage and clamp tests for panel position

**Files:**
- Modify: `view/src/components/SettingsPanel.test.tsx`
- Modify: `view/src/components/settings/settingsPanelState.ts`
- Modify: `view/src/constants/bridge.ts`

- [ ] **Step 1: Write the failing test**

`SettingsPanel.test.tsx`에 아래 케이스를 추가한다.

- 저장된 패널 위치가 있으면 다음 open 때 같은 `left/top`로 복원된다.
- 패널 rect와 viewport가 주어졌을 때 저장된 위치가 화면 밖이면 clamp 된다.
- 저장된 위치가 없으면 기존처럼 중앙 배치 스타일을 유지한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd view && npm test -- SettingsPanel`

Expected: FAIL because panel position storage/clamp helpers do not exist yet.

- [ ] **Step 3: Write minimal implementation**

`SETTINGS_PANEL_STORAGE_KEYS.position`을 추가하고, `settingsPanelState.ts`에 아래 helper를 넣는다.

- `readStoredPanelPosition()`
- `writeStoredPanelPosition()`
- `clampStoredPanelPosition()`

저장소는 `localStorage`를 사용하고, 실패 시 안전하게 무시한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd view && npm test -- SettingsPanel`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/components/SettingsPanel.test.tsx view/src/components/settings/settingsPanelState.ts view/src/constants/bridge.ts
git commit -m "feat: persist settings panel position"
```

## Chunk 2: Draggable Panel Interaction

### Task 2: Make the settings panel draggable from the header

**Files:**
- Modify: `view/src/components/SettingsPanel.tsx`
- Modify: `view/src/components/SettingsPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

`SettingsPanel.test.tsx`에 아래 상호작용 테스트를 추가한다.

- 헤더 `mousedown -> mousemove -> mouseup`으로 패널 `left/top`가 바뀐다.
- 닫기 버튼 클릭은 드래그가 아니라 `onClose`만 호출한다.
- resize 이벤트 후 패널이 viewport 안으로 재클램프된다.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd view && npm test -- SettingsPanel`

Expected: FAIL because the panel is currently fixed-centered and not draggable.

- [ ] **Step 3: Write minimal implementation**

`SettingsPanel.tsx`를 다음 방식으로 바꾼다.

- 헤더에 `data-settings-panel-drag-handle`을 둔다.
- 패널 위치 state를 `left/top | centered` 형태로 관리한다.
- 저장된 위치가 없으면 중앙 렌더를 유지한다.
- 드래그 시작 시 현재 rect를 기준으로 absolute `left/top`로 전환한다.
- drag end 시 클램프된 위치를 저장한다.
- window resize 시 현재 panel rect를 기준으로 재클램프한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd view && npm test -- SettingsPanel`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/components/SettingsPanel.tsx view/src/components/SettingsPanel.test.tsx
git commit -m "feat: allow dragging the settings panel"
```

## Chunk 3: Viewport-Aware Reset Regression

### Task 3: Lock reset behavior to current viewport defaults

**Files:**
- Modify: `view/src/utils/itemLayoutEditing.test.ts`
- Modify if needed: `view/src/data/widgetRegistry.ts`
- Modify if needed: `view/src/data/widgetRegistry.test.ts`

- [ ] **Step 1: Add the regression test**

`itemLayoutEditing.test.ts`에 아래 케이스를 추가한다.

- 같은 item을 FHD와 UHD에서 각각 reset 했을 때, 각 viewport에서 계산한 기본 `x/y`로 돌아간다.
- reset 결과는 현재 viewport 메타데이터를 유지한다.

- [ ] **Step 2: Run test to establish current behavior**

Run: `cd view && npm test -- itemLayoutEditing`

Expected:
- PASS면 현재 로직이 이미 맞으므로 regression coverage만 확보한다.
- FAIL이면 default placement 또는 registry anchor 경로가 해상도에 따라 흔들린다는 뜻이다.

- [ ] **Step 3: Tighten implementation only if the test fails**

필요할 때만 다음을 수정한다.

- `resetItemToDefaultPlacement(...)`
- `getWidgetDefaultPositions(...)`
- 관련 anchor/dimension constants

수정 범위는 reset 결과를 현재 viewport 기준 기본 위치로 돌리는 데 필요한 최소 변경만 허용한다.

- [ ] **Step 4: Re-run the targeted test**

Run: `cd view && npm test -- itemLayoutEditing widgetRegistry`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/utils/itemLayoutEditing.test.ts view/src/data/widgetRegistry.ts view/src/data/widgetRegistry.test.ts
git commit -m "test: lock widget reset positions to viewport defaults"
```

## Chunk 4: Full Verification

### Task 4: Run full regression suite

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

- [ ] **Step 2: Sync the local mod folder if runtime verification is requested**

Run:

```bash
rsync -av --delete '/home/kdw73/Tullius Widgets/.worktrees/draggable-settings-panel/dist/PrismaUI/' '/mnt/g/TAKEALOOK/mods/TulliusWidgets-v1.3.0-rc.1/PrismaUI/'
```

- [ ] **Step 3: Commit final verification if needed**

```bash
git status --short
git commit --allow-empty -m "chore: verify draggable settings panel"
```
