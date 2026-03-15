# HUD Customization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship direct HUD resize/editing first for existing widget groups, then migrate the HUD to item-level movable/resizable widgets with compatibility for existing saved layouts.

**Architecture:** Phase 1 extends the current group-based editor by adding explicit group selection, resize handles, and persisted per-group scale. Phase 2 introduces an item registry and canonical `itemLayouts` storage, migrates legacy group layouts into item placements, and replaces fixed group rendering with individually placed widget items while keeping dynamic timed effects as one special list widget.

**Tech Stack:** React, TypeScript, existing hook/state architecture in `view/src`, Vitest, npm build pipeline

---

**Spec reference:** `docs/superpowers/specs/2026-03-15-widget-customization-design.md`

## File Structure

### Existing files to modify

- `view/src/types/settings.ts`
- `view/src/data/defaultSettings.ts`
- `view/src/hooks/settingsShared.ts`
- `view/src/hooks/settingsSchema.ts`
- `view/src/hooks/useSettings.ts`
- `view/src/App.tsx`
- `view/src/components/DraggableWidgetGroup.tsx`
- `view/src/components/HudWidgetGroups.tsx`
- `view/src/components/settings/SettingsTabSections.tsx`
- `view/src/components/TimeWidgetList.tsx`
- `view/src/hooks/useWidgetPositions.ts`
- `view/src/utils/hudPresentation.ts`
- `view/src/data/widgetRegistry.ts`
- `view/src/hooks/settingsSchema.test.ts`
- `view/src/hooks/useSettings.test.tsx`
- `view/src/hooks/useWidgetPositions.test.tsx`
- `view/src/data/widgetRegistry.test.ts`

### New files likely needed

- `view/src/components/WidgetEditGuides.tsx`
- `view/src/hooks/useGroupEditor.ts`
- `view/src/data/widgetItemRegistry.ts`
- `view/src/components/HudWidgetItems.tsx`
- `view/src/components/EditableWidgetItem.tsx`
- `view/src/hooks/useWidgetItemLayouts.ts`
- `view/src/hooks/useWidgetEditSelection.ts`
- `view/src/utils/widgetBounds.ts`
- `view/src/utils/widgetSnap.ts`
- `view/src/utils/timeWidgetShared.ts`
- `view/src/data/widgetItemRegistry.test.ts`
- `view/src/hooks/useWidgetItemLayouts.test.ts`
- `view/src/utils/widgetSnap.test.ts`

## Chunk 1: Phase 1 Group Resize Foundation

### Task 1: Persist per-group numeric scale

**Files:**
- Modify: `view/src/types/settings.ts`
- Modify: `view/src/data/defaultSettings.ts`
- Modify: `view/src/hooks/settingsShared.ts`
- Modify: `view/src/hooks/settingsSchema.ts`
- Test: `view/src/hooks/settingsSchema.test.ts`
- Test: `view/src/hooks/useSettings.test.tsx`

- [ ] **Step 1: Write failing schema tests for `groupScales`**

Add tests that prove all of the following:

- `groupScales` is optional in schema v1 payloads
- valid finite numeric values are accepted
- invalid values are ignored
- unknown groups do not break parsing

Run: `cd view && npm test -- settingsSchema`
Expected: failing assertions around missing `groupScales` support

- [ ] **Step 2: Extend `WidgetSettings` with group scale storage**

Add:

```ts
groupScales: Record<string, number>;
```

Keep the field optional at the parser boundary but normalized to `{}` in runtime state.

- [ ] **Step 3: Parse and serialize `groupScales` without changing schema version**

Rules:

- keep `SETTINGS_SCHEMA_VERSION = 1`
- accept `groupScales[groupId]` only when finite and positive
- preserve current tolerant parsing behavior

- [ ] **Step 4: Update defaults and settings tests**

Make sure default settings include:

```ts
groupScales: {}
```

Add tests proving incoming payloads round-trip through `useSettings`.

- [ ] **Step 5: Run the targeted tests**

Run:

```bash
cd view
npm test -- settingsSchema useSettings
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add view/src/types/settings.ts view/src/data/defaultSettings.ts view/src/hooks/settingsShared.ts view/src/hooks/settingsSchema.ts view/src/hooks/settingsSchema.test.ts view/src/hooks/useSettings.test.tsx
git commit -m "feat: persist per-group widget scale"
```

### Task 2: Implement group selection, resize, and effective scale

**Files:**
- Modify: `view/src/components/DraggableWidgetGroup.tsx`
- Modify: `view/src/App.tsx`
- Modify: `view/src/hooks/useWidgetPositions.ts`
- Create: `view/src/hooks/useGroupEditor.ts`
- Test: `view/src/hooks/useWidgetPositions.test.tsx`

- [ ] **Step 1: Write failing interaction tests for resize and selection**

Add coverage for:

- selected group id changes on click
- resize handle updates scale instead of position
- `ESC` clears selection before closing settings

Use the smallest realistic harness instead of full app integration if possible.

- [ ] **Step 2: Introduce a dedicated group editor hook**

Create `useGroupEditor.ts` with responsibilities:

- selected group state
- drag mode vs resize mode
- `ESC` selection clearing
- scale update helper

Do not bury resize state directly inside `App.tsx`.

- [ ] **Step 3: Apply Phase 1 scale composition rule**

Use:

```ts
effectiveScale = presetScale(settings.general.size) * (settings.groupScales[groupId] ?? 1)
```

Do not delete the current preset system yet.

- [ ] **Step 4: Extend `DraggableWidgetGroup` with resize handle**

Requirements:

- only selected group shows a strong selection frame and resize handle
- dragging existing body moves the group
- dragging handle changes scale proportionally
- min/max bounds should be clamped conservatively to avoid broken text layout

- [ ] **Step 5: Persist scale updates via settings**

Write updates to:

```ts
groupScales.${groupId}
```

Keep position writes unchanged.

- [ ] **Step 6: Run the targeted tests**

Run:

```bash
cd view
npm test -- useWidgetPositions
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add view/src/components/DraggableWidgetGroup.tsx view/src/App.tsx view/src/hooks/useWidgetPositions.ts view/src/hooks/useWidgetPositions.test.tsx view/src/hooks/useGroupEditor.ts
git commit -m "feat: add group selection and resize editing"
```

### Task 3: Add group-level guides and edit-mode visibility override

**Files:**
- Create: `view/src/components/WidgetEditGuides.tsx`
- Modify: `view/src/App.tsx`
- Modify: `view/src/utils/hudPresentation.ts`
- Modify: `view/src/components/settings/SettingsTabSections.tsx`
- Test: `view/src/utils/hudPresentation.test.ts`

- [ ] **Step 1: Write failing visibility tests for settings-open edit mode**

Add assertions that opening settings keeps editable groups visible even when:

- `general.visible === false`
- `combatOnly === true` while out of combat
- `showOnChangeOnly === true` with inactive change window

- [ ] **Step 2: Add edit visibility override to HUD visibility resolution**

Behavior:

- when settings are open, global visibility gates are bypassed for editable groups
- per-group boolean visibility still determines whether a group exists

- [ ] **Step 3: Render alignment guides from live drag state**

Do not mix guide DOM into `DraggableWidgetGroup`.
Render guide lines from a dedicated overlay component fed by editor state.

- [ ] **Step 4: Add settings-panel hint copy for temporary edit visibility**

Keep the wording short. The panel should explain that edit mode temporarily reveals widgets while the panel is open.

- [ ] **Step 5: Run the targeted tests**

Run:

```bash
cd view
npm test -- hudPresentation
```

Expected: PASS

- [ ] **Step 6: Run lint and build for Phase 1**

Run:

```bash
cd view
npm run lint
npm run build
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add view/src/components/WidgetEditGuides.tsx view/src/App.tsx view/src/utils/hudPresentation.ts view/src/utils/hudPresentation.test.ts view/src/components/settings/SettingsTabSections.tsx
git commit -m "feat: add group edit guides and visibility override"
```

## Chunk 2: Phase 2 Item Layout Migration

### Task 4: Introduce item registry and canonical `itemLayouts` schema

**Files:**
- Create: `view/src/data/widgetItemRegistry.ts`
- Modify: `view/src/types/settings.ts`
- Modify: `view/src/data/defaultSettings.ts`
- Modify: `view/src/hooks/settingsShared.ts`
- Modify: `view/src/hooks/settingsSchema.ts`
- Create: `view/src/data/widgetItemRegistry.test.ts`
- Create: `view/src/hooks/useWidgetItemLayouts.test.ts`

- [ ] **Step 1: Write failing tests for schema v2 item-layout parsing**

Cover:

- `schemaVersion: 2` payload with `itemLayouts`
- legacy payload without `itemLayouts`
- rerun migration when `itemLayouts` is missing but legacy fields exist
- deterministic default rebuild when both legacy and item data are unusable

- [ ] **Step 2: Create the item registry**

Registry entries must cover every stable item listed in the spec:

- experience progress
- all player info values
- all resistances
- defense values
- offense values
- equipped values
- time game/real
- movement speed
- `timedEffects.list`

Each entry should include:

- item id
- renderer kind
- legacy group id
- visibility key
- min scale
- max scale
- default placement hint

- [ ] **Step 3: Add canonical item-layout types**

Replace the plan-level pseudo-shape with concrete runtime types in `settings.ts`.
Keep legacy fields readable during migration support, but make `itemLayouts` the canonical Phase 2 layout field.

- [ ] **Step 4: Bump settings schema version to 2**

Update serialization and tolerant parsing rules.
Do not remove legacy parsing.

- [ ] **Step 5: Add migration helpers**

Create helpers that:

- read `positions[groupId]`
- read `layouts[groupId]`
- read effective legacy scale from `general.size` + `groupScales`
- expand each legacy group into initial item placements

- [ ] **Step 6: Run the targeted tests**

Run:

```bash
cd view
npm test -- widgetItemRegistry useWidgetItemLayouts settingsSchema
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add view/src/data/widgetItemRegistry.ts view/src/data/widgetItemRegistry.test.ts view/src/types/settings.ts view/src/data/defaultSettings.ts view/src/hooks/settingsShared.ts view/src/hooks/settingsSchema.ts view/src/hooks/useWidgetItemLayouts.test.ts
git commit -m "feat: add canonical item layout schema"
```

### Task 5: Split widget rendering from fixed groups into item-based composition

**Files:**
- Create: `view/src/components/HudWidgetItems.tsx`
- Create: `view/src/utils/timeWidgetShared.ts`
- Modify: `view/src/components/TimeWidgetList.tsx`
- Modify: `view/src/App.tsx`
- Modify: `view/src/utils/hudPresentation.ts`

- [ ] **Step 1: Write failing tests for split time widgets and item visibility**

Cover:

- `time.game` renders independently from `time.real`
- hidden item layouts do not contribute to tracked change signatures
- timed effects still behave as one special list widget

- [ ] **Step 2: Extract shared time formatting and clock source**

Move formatter/ticker logic from `TimeWidgetList` into `timeWidgetShared.ts`.
Avoid one timer per split widget instance.

- [ ] **Step 3: Implement an item-based HUD renderer**

`HudWidgetItems.tsx` should:

- iterate registry items
- select data from `stats`
- choose the correct renderer
- skip hidden items
- keep `timedEffects.list` as one list widget

- [ ] **Step 4: Switch app composition behind a controlled Phase 2 path**

Replace direct group rendering with item rendering once migration state is available.
Do not leave two competing runtime sources of truth.

- [ ] **Step 5: Run targeted tests**

Run:

```bash
cd view
npm test -- hudPresentation
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add view/src/components/HudWidgetItems.tsx view/src/utils/timeWidgetShared.ts view/src/components/TimeWidgetList.tsx view/src/App.tsx view/src/utils/hudPresentation.ts
git commit -m "feat: render HUD from widget item registry"
```

### Task 6: Build item-level edit layer and snapping from measured bounds

**Files:**
- Create: `view/src/components/EditableWidgetItem.tsx`
- Create: `view/src/hooks/useWidgetEditSelection.ts`
- Create: `view/src/utils/widgetBounds.ts`
- Create: `view/src/utils/widgetSnap.ts`
- Create: `view/src/utils/widgetSnap.test.ts`
- Modify: `view/src/App.tsx`

- [ ] **Step 1: Write failing tests for item snapping from measured bounds**

Cover:

- edge alignment
- centerline alignment
- grid fallback
- overlap-allowed behavior
- active-item resize clamping

- [ ] **Step 2: Introduce selection state for item editing**

Move selection logic off the group path and into item editing state.
The edit layer must own `ESC` priority before settings close.

- [ ] **Step 3: Measure live widget bounds through wrapper refs**

Create a bounds utility that records scaled `DOMRect` values from wrapper refs.
Do not push measurement responsibility into `StatWidget` or other presentation components.

- [ ] **Step 4: Replace top-left-only snapping with bounds-aware snapping**

Use measured bounds to compute:

- left/right edge snaps
- center snaps
- guide line segments

- [ ] **Step 5: Run targeted tests**

Run:

```bash
cd view
npm test -- widgetSnap
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add view/src/components/EditableWidgetItem.tsx view/src/hooks/useWidgetEditSelection.ts view/src/utils/widgetBounds.ts view/src/utils/widgetSnap.ts view/src/utils/widgetSnap.test.ts view/src/App.tsx
git commit -m "feat: add item-level bounds-aware widget editing"
```

### Task 7: Remove stale group controls and finish compatibility wiring

**Files:**
- Modify: `view/src/components/settings/SettingsTabSections.tsx`
- Modify: `view/src/hooks/useSettings.ts`
- Modify: `view/src/hooks/useSettings.test.tsx`
- Modify: `view/src/components/settings/PresetSection.tsx`

- [ ] **Step 1: Write failing tests for Phase 2 settings-panel behavior**

Cover:

- `general.size` no longer drives live rendering
- legacy visibility toggles write through to `itemLayouts`
- group layout selectors are removed
- preset export/import round-trips `itemLayouts`

- [ ] **Step 2: Remove or hide stale Phase 1-only controls**

In Phase 2:

- remove group layout selectors
- remove visible global size control
- keep compatibility visibility toggles until the panel is redesigned

- [ ] **Step 3: Update preset export/import to treat `itemLayouts` as canonical**

Do not export stale canonical layout data from legacy group fields.

- [ ] **Step 4: Run targeted tests**

Run:

```bash
cd view
npm test -- useSettings
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
git add view/src/components/settings/SettingsTabSections.tsx view/src/hooks/useSettings.ts view/src/hooks/useSettings.test.tsx view/src/components/settings/PresetSection.tsx
git commit -m "feat: finish item layout settings compatibility"
```

## Validation Notes

- If any migration test needs realistic fixtures, capture current real-world settings payloads before changing the schema.
- Do not change native C++ settings storage limits unless actual serialized payload size proves to be a problem.
- If Phase 2 is split across multiple PRs, keep schema migration and item renderer introduction in the same PR to avoid half-migrated runtime states.

## Rollback Notes

- Phase 1 rollback is low risk because it only adds tolerant fields on schema v1.
- Phase 2 rollback is behavior-safe but layout-lossy if users save settings with an older build after upgrading to schema v2.
- If a release candidate shows migration issues, ship a parser hotfix before changing the item registry again.
