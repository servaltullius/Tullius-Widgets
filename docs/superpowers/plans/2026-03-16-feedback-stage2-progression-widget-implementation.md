# Feedback Stage 2 Progression Widget Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current XP stat row with an integrated progression widget that shows level and XP progress together, while keeping standalone level-widget visibility compatible for existing users.

**Architecture:** Keep the existing widget item ids and editing model intact. Implement the redesign by rewriting `ExperienceWidget` into a compact medallion-plus-ring component, then update settings defaults and tolerant parsing so fresh installs hide the separate level widget but older saved installs preserve their previous level-widget visibility.

**Tech Stack:** React, TypeScript, existing `view/src` HUD architecture, Vitest, npm lint/build pipeline

---

**Spec reference:** `docs/superpowers/specs/2026-03-16-feedback-stage2-progression-widget-design.md`

**Implementation context:** Use `/home/kdw73/Tullius Widgets/.worktrees/stage2-progression-widget` on branch `feat/stage2-progression-widget`, which is based on `feat/stage1-display-options`.

## File Structure

### Existing files to modify

- `view/src/data/defaultSettings.ts`
- `view/src/hooks/settingsShared.ts`
- `view/src/hooks/settingsSchema.ts`
- `view/src/hooks/settingsSchema.test.ts`
- `view/src/hooks/useSettings.test.tsx`
- `view/src/components/settings/SettingsTabSections.tsx`
- `view/src/components/settings/SettingsTabSections.test.tsx`
- `view/src/i18n/translations.ts`
- `view/src/components/ExperienceWidget.tsx`
- `view/src/components/ExperienceWidget.test.tsx`
- `view/src/components/HudWidgetItems.tsx`
- `view/src/components/HudWidgetItems.test.tsx`
- `view/src/utils/hudPresentation.ts`
- `view/src/utils/hudPresentation.test.ts`

### New files to create

- None expected. Keep Stage 2 inside the existing widget files unless implementation proves impossible.

## Chunk 1: Compatibility Defaults And Settings Copy

### Task 1: Lock Stage 2 defaults and migration-safe level visibility

**Files:**
- Modify: `view/src/data/defaultSettings.ts`
- Modify: `view/src/hooks/settingsShared.ts`
- Modify: `view/src/hooks/settingsSchema.ts`
- Test: `view/src/hooks/settingsSchema.test.ts`
- Test: `view/src/hooks/useSettings.test.tsx`

- [ ] **Step 1: Write failing tests for fresh defaults and legacy migration**

Add coverage for all of the following:

- fresh Stage 2 defaults hide `player.level`
- a legacy payload from schema version `3` that omits both `playerInfo.level` and `itemLayouts['player.level']` still resolves to visible
- a legacy payload that explicitly sets `playerInfo.level: false` stays hidden
- a legacy payload that explicitly sets `itemLayouts['player.level'].visible: false` stays hidden
- serialized settings advertise the new schema version

- [ ] **Step 2: Run the targeted settings tests and confirm failure**

Run:

```bash
cd view
npm test -- settingsSchema useSettings
```

Expected: FAIL because Stage 2 defaults and migration logic do not exist yet.

- [ ] **Step 3: Change the fresh-install default and bump schema version**

Implement the minimal default/schema changes:

```ts
defaultSettings.playerInfo.level = false;
SETTINGS_SCHEMA_VERSION = 4;
```

Do not change any unrelated defaults.

- [ ] **Step 4: Add migration-safe compatibility logic in `settingsSchema.ts`**

Implementation rules:

- inspect the incoming saved payload schema version
- treat schema `< 4` as pre-Stage-2 data
- if pre-Stage-2 data omits both `playerInfo.level` and `itemLayouts['player.level'].visible`, force migrated visibility to `true`
- if both locations explicitly define visibility and conflict, prefer `itemLayouts['player.level'].visible`
- if only one location explicitly defines visibility, respect that saved value exactly
- treat missing or invalid `schemaVersion` as legacy for this migration path
- keep `itemLayouts.<itemId>.visible` as the runtime visibility authority

- [ ] **Step 5: Re-run the targeted settings tests**

Run:

```bash
cd view
npm test -- settingsSchema useSettings
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add view/src/data/defaultSettings.ts view/src/hooks/settingsShared.ts view/src/hooks/settingsSchema.ts view/src/hooks/settingsSchema.test.ts view/src/hooks/useSettings.test.tsx
git commit -m "feat: preserve legacy level visibility in stage 2"
```

### Task 2: Update settings-panel wording for the integrated progression widget

**Files:**
- Modify: `view/src/components/settings/SettingsTabSections.tsx`
- Modify: `view/src/components/settings/SettingsTabSections.test.tsx`
- Modify: `view/src/i18n/translations.ts`

- [ ] **Step 1: Write failing settings-panel tests for the new wording**

Add tests that verify:

- the experience section describes the integrated progression widget rather than only raw XP progress
- the player-info section still exposes the standalone level widget as a separate optional display
- the existing toggle paths remain unchanged:
  - `experience.progress` still updates `itemLayouts.experience.progress.visible`
  - `player.level` still updates `itemLayouts.player.level.visible`

Prefer text assertions plus exact `onUpdate` path checks.

- [ ] **Step 2: Run the targeted settings-panel tests and confirm failure**

Run:

```bash
cd view
npm test -- SettingsTabSections
```

Expected: FAIL because the Stage 2 wording is not implemented yet.

- [ ] **Step 3: Add the copy changes in `translations.ts` and wire them in the panel**

Requirements:

- keep the accordion structure unchanged
- make the experience section clearly read as the main progression widget
- keep standalone level wording scoped to the panel instead of globally renaming every `level` label in the UI
- do not introduce a new settings option just for Stage 2 visuals

- [ ] **Step 4: Re-run the targeted settings-panel tests**

Run:

```bash
cd view
npm test -- SettingsTabSections
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/components/settings/SettingsTabSections.tsx view/src/components/settings/SettingsTabSections.test.tsx view/src/i18n/translations.ts
git commit -m "feat: update progression widget settings copy"
```

## Chunk 2: Integrated Progression Widget Rendering

### Task 3: Add failing tests for the new progression widget presentation

**Files:**
- Test: `view/src/components/ExperienceWidget.test.tsx`
- Test: `view/src/components/HudWidgetItems.test.tsx`
- Test: `view/src/utils/hudPresentation.test.ts`

- [ ] **Step 1: Extend `ExperienceWidget.test.tsx` with integrated-widget assertions**

Add coverage for:

- centered level output is rendered inside the widget
- XP text remains visible
- rounded percent helper remains visible
- tooltip still contains detailed XP numbers
- progress uses a stable DOM hook for verification, such as `role="progressbar"` or a dedicated `data-testid`
- bad inputs still clamp visible progress safely

- [ ] **Step 2: Extend `HudWidgetItems.test.tsx` with item-behavior assertions**

Add coverage for:

- `experience.progress` still renders under the same item id
- `player.level` remains independently renderable when explicitly visible
- hiding `player.level` does not hide the progression widget

- [ ] **Step 3: Add failing change-tracking tests in `hudPresentation.test.ts`**

Add coverage for:

- `buildTrackedChangeSignature` includes `playerInfo.level` whenever `experience.progress` is visible
- that level tracking still works when `player.level` itself is hidden
- existing XP signature fields remain present

- [ ] **Step 4: Run the targeted widget tests and confirm failure**

Run:

```bash
cd view
npm test -- ExperienceWidget HudWidgetItems hudPresentation
```

Expected: FAIL because `ExperienceWidget` still renders as a text-first `StatWidget`.

### Task 4: Implement the compact medallion-plus-ring progression widget

**Files:**
- Modify: `view/src/components/ExperienceWidget.tsx`
- Modify: `view/src/components/HudWidgetItems.tsx`
- Modify: `view/src/utils/hudPresentation.ts`
- Test: `view/src/components/ExperienceWidget.test.tsx`
- Test: `view/src/components/HudWidgetItems.test.tsx`
- Test: `view/src/utils/hudPresentation.test.ts`

- [ ] **Step 1: Rewrite `ExperienceWidget.tsx` around a dedicated progression layout**

Implementation rules:

- compute a single clamped progress percent from `currentXp` and `totalXp`
- render a centered level medallion
- render a surrounding ring using CSS that is easy to test, such as a conic-gradient-backed progress track
- keep supporting XP text compact and secondary to the medallion
- preserve tooltip detail
- avoid pulling this widget back through `StatWidget`

- [ ] **Step 2: Keep `HudWidgetItems.tsx` focused on data handoff, not visual composition**

Pass only the resolved progression data into `ExperienceWidget` and keep:

- existing item shell behavior
- existing item ids
- existing independent rendering for `player.level`

Do not add Stage 2-only branching across unrelated widgets.

- [ ] **Step 3: Update change-tracking in `hudPresentation.ts`**

Implementation rules:

- when `experience.progress` is visible, include `playerInfo.level` in the tracked signature
- do not require `player.level` to also be visible
- preserve the existing XP signature fields so Stage 1 behavior does not regress

- [ ] **Step 4: Re-run the targeted widget tests**

Run:

```bash
cd view
npm test -- ExperienceWidget HudWidgetItems hudPresentation
```

Expected: PASS

- [ ] **Step 5: Run the full verification suite**

Run:

```bash
cd view
npm test
npm run lint
npm run build
```

Expected:

- all Vitest files PASS
- `eslint .` exits successfully
- Vite build completes successfully

- [ ] **Step 6: Commit**

```bash
git add view/src/components/ExperienceWidget.tsx view/src/components/ExperienceWidget.test.tsx view/src/components/HudWidgetItems.tsx view/src/components/HudWidgetItems.test.tsx view/src/utils/hudPresentation.ts view/src/utils/hudPresentation.test.ts
git commit -m "feat: redesign the progression widget"
```
