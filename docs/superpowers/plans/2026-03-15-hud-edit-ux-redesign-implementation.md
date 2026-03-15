# HUD Edit UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Phase 2 HUD customization so the HUD remains the main editing surface and the settings panel becomes a selected-widget quick-edit companion.

**Architecture:** Extend canonical `itemLayouts` with edit-safety and layering fields, then wire HUD rendering and editing to honor that state. Add a compact selected-widget quick-edit card above the existing tabbed settings panel, keeping global settings in the tabs and precision selected-item controls in the card.

**Tech Stack:** React, TypeScript, existing `view/src` hook/state architecture, Vitest, npm frontend toolchain

---

**Spec reference:** `docs/superpowers/specs/2026-03-15-hud-edit-ux-redesign-design.md`

## Chunk 1: Canonical State And HUD Semantics

### Task 1: Extend canonical item layout schema for quick-edit UX

**Files:**
- Modify: `view/src/types/settings.ts`
- Modify: `view/src/data/defaultSettings.ts`
- Modify: `view/src/data/widgetItemRegistry.ts`
- Modify: `view/src/hooks/settingsSchema.ts`
- Modify: `view/src/hooks/settingsShared.ts`
- Modify: `view/src/hooks/useSettings.ts`
- Test: `view/src/hooks/settingsSchema.test.ts`
- Test: `view/src/hooks/useSettings.test.tsx`
- Test: `view/src/data/widgetItemRegistry.test.ts`

- [ ] **Step 1: Write failing tests for `locked`, `zIndex`, and `labelKey` support**

Cover:

- tolerant parsing of old payloads missing `locked` and `zIndex`
- default fallback values `locked: false`
- deterministic `zIndex` seeding from registry order
- item registry exposing a stable `labelKey`
- saved payloads preserve `locked` and `zIndex` after canonical updates

Run:

```bash
cd view
npm test -- settingsSchema useSettings widgetItemRegistry
```

Expected: FAIL on missing field support and registry contract

- [ ] **Step 2: Extend `WidgetItemLayout` and registry contracts**

Update runtime types to:

```ts
interface WidgetItemLayout {
  visible: boolean;
  x: number;
  y: number;
  scale: number;
  locked: boolean;
  zIndex: number;
}
```

Also add `labelKey` to each widget item registry entry.

- [ ] **Step 3: Add tolerant parsing and default seeding**

Rules:

- old saved payloads without `locked` or `zIndex` remain valid
- missing `locked` becomes `false`
- missing `zIndex` becomes the registry-derived order index
- new default item layouts include both fields

- [ ] **Step 4: Keep visibility write-through compatible**

Confirm canonical path updates still preserve sibling layout fields:

- `useSettings` rewrites legacy visibility paths into canonical `itemLayouts.<itemId>.visible`
- `settingsShared.ts` path updates do not drop `locked` or `zIndex` when only `visible` changes

- [ ] **Step 5: Run targeted tests**

Run:

```bash
cd view
npm test -- settingsSchema useSettings widgetItemRegistry
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add view/src/types/settings.ts view/src/data/defaultSettings.ts view/src/data/widgetItemRegistry.ts view/src/hooks/settingsSchema.ts view/src/hooks/settingsShared.ts view/src/hooks/useSettings.ts view/src/hooks/settingsSchema.test.ts view/src/hooks/useSettings.test.tsx view/src/data/widgetItemRegistry.test.ts
git commit -m "feat: add item layout lock and order schema"
```

### Task 2: Honor lock, render order, and reset behavior in HUD editing

**Files:**
- Create: `view/src/utils/itemLayoutEditing.ts`
- Create: `view/src/utils/itemLayoutEditing.test.ts`
- Modify: `view/src/components/EditableWidgetItem.tsx`
- Create: `view/src/components/EditableWidgetItem.test.tsx`
- Modify: `view/src/components/HudWidgetItems.tsx`
- Modify: `view/src/components/HudWidgetItems.test.tsx`
- Modify: `view/src/App.tsx`
- Create: `view/src/App.test.tsx`
- Modify: `view/src/hooks/useWidgetItemLayouts.ts`
- Modify: `view/src/data/widgetItemRegistry.ts`

- [ ] **Step 1: Write failing tests for lock and z-order semantics**

Cover:

- locked widget blocks drag and resize
- locked widget remains selectable and still shows selected styling
- overlapping widgets prefer highest `zIndex` for selection
- visible-item reorder changes render order
- visible-item reorder does not swap against hidden items
- full-set normalization preserves hidden-item relative order
- per-item reset restores registry default placement for current viewport only

Run:

```bash
cd view
npm test -- App HudWidgetItems EditableWidgetItem itemLayoutEditing
```

Expected: FAIL on missing helpers and interaction guards

- [ ] **Step 2: Introduce focused layout-editing helpers**

Create `itemLayoutEditing.ts` for:

- contiguous `zIndex` normalization
- visible-item `bring forward` / `send backward`
- per-item reset to registry default placement for current viewport
- tiny helpers for fine X/Y nudging if that logic would otherwise bloat `App.tsx`

Do not bury reorder math inside React components.

- [ ] **Step 3: Make HUD rendering respect z-order**

Update item rendering so:

- higher `zIndex` renders later / above lower entries
- hidden items keep persisted `zIndex`
- overlap hit-testing naturally follows the sorted render order

- [ ] **Step 4: Make item editing respect lock**

Update `EditableWidgetItem` so:

- locked items remain selectable
- drag start is blocked
- resize start is blocked
- selected styling still appears

- [ ] **Step 5: Add reset/reorder helpers to app-level edit wiring**

`App.tsx` should expose stable callbacks for:

- reset selected item position
- nudge selected item by small pixel steps
- bring selected visible item forward
- send selected visible item backward

Keep these callbacks writing only canonical `itemLayouts`.
If `App.tsx` starts accumulating too much edit-action logic in this step, extract a focused hook instead of leaving another large controller block inside the component.

- [ ] **Step 6: Run targeted tests**

Run:

```bash
cd view
npm test -- App HudWidgetItems EditableWidgetItem itemLayoutEditing
```

Expected: PASS

- [ ] **Step 7: Run lint and build for Chunk 1**

Run:

```bash
cd view
npm run lint
npm run build
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add view/src/utils/itemLayoutEditing.ts view/src/utils/itemLayoutEditing.test.ts view/src/components/EditableWidgetItem.tsx view/src/components/EditableWidgetItem.test.tsx view/src/components/HudWidgetItems.tsx view/src/components/HudWidgetItems.test.tsx view/src/App.tsx view/src/hooks/useWidgetItemLayouts.ts view/src/data/widgetItemRegistry.ts
git commit -m "feat: honor item lock and z order in HUD editing"
```

## Chunk 2: Selected-Widget Companion Panel

### Task 3: Add the selected-widget quick-edit card shell

**Files:**
- Create: `view/src/components/settings/SelectedWidgetQuickEditCard.tsx`
- Create: `view/src/components/settings/SelectedWidgetQuickEditCard.test.tsx`
- Create: `view/src/components/SettingsPanel.test.tsx`
- Modify: `view/src/components/SettingsPanel.tsx`
- Modify: `view/src/i18n/translations.ts`
- Modify: `view/src/i18n/translations.test.ts`

- [ ] **Step 1: Write failing tests for selected-widget card visibility**

Cover:

- card is hidden when no widget is selected
- card appears above the tab body when a widget is selected
- card title uses the registry `labelKey`
- card remains mounted while switching tabs

Run:

```bash
cd view
npm test -- SettingsPanel SelectedWidgetQuickEditCard translations
```

Expected: FAIL because the quick-edit card does not exist yet

- [ ] **Step 2: Create a dedicated quick-edit card component**

The component should stay focused on presentation and emit callbacks for:

- show/hide
- size
- X/Y nudge
- reset
- lock
- bring forward / send backward

Do not make `SettingsPanel.tsx` directly own all card layout markup.

- [ ] **Step 3: Integrate the card into `SettingsPanel`**

Update `SettingsPanel` so:

- card renders above tabs
- card is driven by `selectedItemId`
- card is independent from the active tab

- [ ] **Step 4: Add the new localized strings**

Add only the strings needed for the quick-edit card and avoid renaming unrelated translation keys in the same pass.

- [ ] **Step 5: Run targeted tests**

Run:

```bash
cd view
npm test -- SettingsPanel SelectedWidgetQuickEditCard translations
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add view/src/components/settings/SelectedWidgetQuickEditCard.tsx view/src/components/settings/SelectedWidgetQuickEditCard.test.tsx view/src/components/SettingsPanel.tsx view/src/components/SettingsPanel.test.tsx view/src/i18n/translations.ts view/src/i18n/translations.test.ts
git commit -m "feat: add selected widget quick edit card"
```

### Task 4: Wire quick-edit actions to canonical item layouts and finish verification

**Files:**
- Modify: `view/src/components/SettingsPanel.tsx`
- Modify: `view/src/components/settings/SelectedWidgetQuickEditCard.tsx`
- Modify: `view/src/App.tsx`
- Modify: `view/src/components/HudWidgetItems.tsx`
- Modify: `view/src/hooks/useSettings.test.tsx`
- Modify: `view/src/components/SettingsPanel.test.tsx`
- Modify: `view/src/components/HudWidgetItems.test.tsx`
- Modify: `view/src/hooks/settingsSchema.test.ts`

- [ ] **Step 1: Write failing integration tests for card actions**

Cover:

- hide keeps selection/card alive while HUD item disappears
- hide then show restores the same selected widget through the same card
- size slider writes canonical scale and updates the HUD live
- lock toggle writes canonical `itemLayouts.<itemId>.locked`
- locked selected widget disables size and reorder controls
- reorder buttons are disabled for hidden selected widgets
- X/Y nudges update the live HUD layout
- reset affects only the selected widget

Run:

```bash
cd view
npm test -- App SettingsPanel HudWidgetItems useSettings settingsSchema
```

Expected: FAIL on incomplete card-to-state wiring

- [ ] **Step 2: Connect quick-edit callbacks in `App.tsx`**

Pass the selected layout entry and mutation callbacks into `SettingsPanel`.

Keep the source of truth in `App.tsx` + `updateSetting` rather than creating panel-local persistent state.

- [ ] **Step 3: Enforce the approved hidden-selected behavior**

When the selected widget is hidden through the card:

- keep `selectedItemId`
- keep the quick-edit card visible
- hide the HUD widget itself
- disable reorder buttons until the widget is shown again

- [ ] **Step 4: Run targeted tests**

Run:

```bash
cd view
npm test -- App SettingsPanel HudWidgetItems useSettings settingsSchema
```

Expected: PASS

- [ ] **Step 5: Run full frontend verification**

Run:

```bash
cd view
npm run lint
npm test
npm run build
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add view/src/components/SettingsPanel.tsx view/src/components/settings/SelectedWidgetQuickEditCard.tsx view/src/App.tsx view/src/components/HudWidgetItems.tsx view/src/hooks/useSettings.test.tsx view/src/components/SettingsPanel.test.tsx view/src/components/HudWidgetItems.test.tsx view/src/hooks/settingsSchema.test.ts
git commit -m "feat: wire quick edit controls to item layouts"
```

## Validation Notes

- Keep new layout fields optional at the parser boundary until a save rewrites them canonically.
- Do not let hidden-item reorder operations silently no-op through hidden swap targets; the spec explicitly requires visible-item-relative reorder.
- Avoid turning `SettingsPanel.tsx` into another large controller. If the quick-edit card starts accumulating logic, move that logic into focused helpers or props in the same pass.

## Rollback Notes

- Rolling back schema support after users save `locked` and `zIndex` is behavior-safe only if tolerant parsing ignores unknown fields.
- Rolling back the quick-edit card is UI-safe as long as the canonical layout state remains backwards tolerant.
