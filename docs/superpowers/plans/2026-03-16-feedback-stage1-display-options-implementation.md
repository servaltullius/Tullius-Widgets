# Feedback Stage 1 Display Options Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the first-wave feedback fixes and display options for timed effects, carry weight, resistances, and time widgets without touching the Stage 2 experience-widget redesign.

**Architecture:** Extend the existing settings schema with a small set of display-mode enums, surface those controls in the current settings accordions, and branch existing HUD renderer props instead of building new widget systems. Keep the change frontend-only, preserve current defaults, and add focused regression tests for schema, settings UI, and renderer behavior.

**Tech Stack:** React, TypeScript, existing `view/src` HUD architecture, Vitest, npm lint/build pipeline

---

**Spec reference:** `docs/superpowers/specs/2026-03-16-feedback-stage1-display-options-design.md`

## File Structure

### Existing files to modify

- `view/src/types/settings.ts`
- `view/src/data/defaultSettings.ts`
- `view/src/hooks/settingsSchema.ts`
- `view/src/hooks/settingsSchema.test.ts`
- `view/src/components/settings/SettingsTabSections.tsx`
- `view/src/components/settings/SettingsTabSections.test.tsx`
- `view/src/i18n/translations.ts`
- `view/src/components/HudWidgetItems.tsx`
- `view/src/components/HudWidgetItems.test.tsx`
- `view/src/components/TimedEffectList.tsx`
- `view/src/components/StatWidget.tsx`
- `view/src/utils/timeWidgetShared.ts`

### New files to create

- `view/src/components/TimedEffectList.test.tsx`

## Chunk 1: Settings Model And Panel Controls

### Task 1: Add Stage 1 display-mode fields to runtime settings

**Files:**
- Modify: `view/src/types/settings.ts`
- Modify: `view/src/data/defaultSettings.ts`
- Modify: `view/src/hooks/settingsSchema.ts`
- Test: `view/src/hooks/settingsSchema.test.ts`

- [ ] **Step 1: Write failing schema tests for the new display-mode fields**

Add coverage for all of the following:

- `timedEffects.listLayout`
- `playerInfo.carryWeightDisplay`
- `resistances.displayMode`
- `time.gameDisplay`
- `time.realDisplay`

Test cases must prove:

- valid enum values are preserved
- invalid enum values fall back to defaults
- missing values from older settings payloads merge safely

- [ ] **Step 2: Run the targeted schema test command and confirm failure**

Run:

```bash
cd view
npm test -- settingsSchema
```

Expected: FAIL because the new fields are not yet typed or merged.

- [ ] **Step 3: Extend the settings types and defaults**

Add focused string-union types in `settings.ts` and wire the new fields into `WidgetSettings`.

Set default values in `defaultSettings.ts` to preserve current behavior:

```ts
timedEffects.listLayout = 'vertical';
playerInfo.carryWeightDisplay = 'combined';
resistances.displayMode = 'both';
time.gameDisplay = 'dateTime';
time.realDisplay = 'dateTime';
```

- [ ] **Step 4: Extend tolerant parsing in `settingsSchema.ts`**

Implementation rules:

- keep existing boolean-section merging intact
- add explicit enum parsing for the new fields
- preserve current behavior for older saved payloads
- do not change the current `itemLayouts.<itemId>.visible` runtime visibility flow
- do not change plugin payload expectations

- [ ] **Step 5: Re-run the targeted schema tests**

Run:

```bash
cd view
npm test -- settingsSchema
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add view/src/types/settings.ts view/src/data/defaultSettings.ts view/src/hooks/settingsSchema.ts view/src/hooks/settingsSchema.test.ts
git commit -m "feat: add stage 1 widget display settings"
```

### Task 2: Add settings-panel controls and copy for the new options

**Files:**
- Modify: `view/src/components/settings/SettingsTabSections.tsx`
- Modify: `view/src/components/settings/SettingsTabSections.test.tsx`
- Modify: `view/src/i18n/translations.ts`

- [ ] **Step 1: Write failing settings-panel tests for the new selectors**

Add tests that render the combat/effects sections expanded and verify:

- carry weight exposes a display selector
- resistances expose one shared display selector
- game time and real time each expose their own display selector only while the corresponding widget toggle is enabled
- timed effects expose a vertical/horizontal selector
- changing each selector calls `onUpdate` with the exact expected path

Use direct interaction on the rendered DOM. Do not rely on vague text-only assertions where a select control can be targeted more precisely. If needed, add stable selector hooks such as an `aria-label` or `data-testid` on `CustomSelect` instances used by this screen.

- [ ] **Step 2: Run the targeted settings-panel tests and confirm failure**

Run:

```bash
cd view
npm test -- SettingsTabSections
```

Expected: FAIL because the selectors and translation keys do not exist yet.

- [ ] **Step 3: Add translation keys for labels and option values**

Update both Korean and English catalogs in `translations.ts` for:

- carry-weight display label
- resistance display label
- time display label
- timed-effects layout label
- all select option captions used by the UI

Keep wording short and consistent with the existing settings tone.

- [ ] **Step 4: Implement the selectors in `SettingsTabSections.tsx`**

Requirements:

- keep the current accordion structure unchanged
- use `CustomSelect` for the new option controls
- place controls directly under the related toggles/section headers
- only show the game/real time display selectors while the matching widget toggle is enabled
- avoid creating a generic presentation framework in this file

- [ ] **Step 5: Re-run the targeted settings-panel tests**

Run:

```bash
cd view
npm test -- SettingsTabSections
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add view/src/components/settings/SettingsTabSections.tsx view/src/components/settings/SettingsTabSections.test.tsx view/src/i18n/translations.ts
git commit -m "feat: add stage 1 display controls to settings panel"
```

## Chunk 2: HUD Rendering And Verification

### Task 3: Implement carry-weight, resistance, and time display branches

**Files:**
- Modify: `view/src/components/HudWidgetItems.tsx`
- Modify: `view/src/components/HudWidgetItems.test.tsx`
- Modify: `view/src/utils/timeWidgetShared.ts`
- Modify: `view/src/components/StatWidget.tsx`

- [ ] **Step 1: Write failing renderer tests in `HudWidgetItems.test.tsx`**

Add coverage for:

- carry weight `combined`, `valueOnly`, and `meterOnly`
- resistance `effectiveOnly`, `rawOnly`, and `both`
- resistance `both` suppressing helper text when raw and effective are the same
- game time `dateTime` vs `timeOnly`
- real time `dateTime` vs `timeOnly`

Prefer DOM assertions that match what the player sees:

- helper text present vs absent
- correct primary numeric text
- correct date-containing vs time-only text
- meter bar present vs absent
- time-only text continuing to follow the shared clock when `Date.now()` advances

- [ ] **Step 2: Run the targeted HUD renderer tests and confirm failure**

Run:

```bash
cd view
npm test -- HudWidgetItems
```

Expected: FAIL because the renderer still hardcodes the old presentation.

- [ ] **Step 3: Add time-only format helpers**

In `timeWidgetShared.ts`, add focused helpers for:

- Skyrim date + time
- Skyrim time only
- real date + time
- real time only

Do not duplicate clock state logic. Reuse the existing shared clock and only split formatter responsibilities.

- [ ] **Step 4: Implement renderer branching in `HudWidgetItems.tsx`**

Implementation rules:

- carry weight:
  - `combined` keeps current/max primary text, percent helper, and meter
  - `valueOnly` keeps only current/max primary text
  - `meterOnly` keeps only the meter without value/helper text
- resistances: branch the primary value and helper text by display mode
- time widgets: select the correct formatter per widget
- preserve existing tones, caps, ordering, and item-shell behavior

- [ ] **Step 5: Add the minimal `StatWidget` support required for clean meter-only carry weight**

Add one small optional prop to suppress value text so `meterOnly` can render without a blank value row. Do not redesign `StatWidget`.

- [ ] **Step 6: Re-run the targeted HUD renderer tests**

Run:

```bash
cd view
npm test -- HudWidgetItems
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add view/src/components/HudWidgetItems.tsx view/src/components/HudWidgetItems.test.tsx view/src/utils/timeWidgetShared.ts view/src/components/StatWidget.tsx
git commit -m "feat: add stage 1 hud display modes"
```

### Task 4: Make timed-effect layout honor the saved direction

**Files:**
- Modify: `view/src/components/TimedEffectList.tsx`
- Create: `view/src/components/TimedEffectList.test.tsx`
- Modify: `view/src/components/HudWidgetItems.tsx`

- [ ] **Step 1: Write failing `TimedEffectList` tests for vertical and horizontal layout**

Cover:

- `vertical` keeps column direction
- `horizontal` switches to row direction with wrapping enabled
- `maxVisible` still limits visible cards
- hidden-count rendering still appears when entries overflow
- hidden-count remains the last flow item after the visible cards in horizontal mode
- empty-state rendering still works

- [ ] **Step 2: Run the targeted timed-effect tests and confirm failure**

Run:

```bash
cd view
npm test -- TimedEffectList
```

Expected: FAIL because the component still hardcodes vertical layout.

- [ ] **Step 3: Add a layout prop to `TimedEffectList.tsx`**

Requirements:

- default to `vertical` for safety
- horizontal mode should use a row flow with wrapping enabled
- keep the hidden-count badge as the last flow item after visible cards
- only change container direction and any spacing needed for the horizontal card stack
- do not redesign sorting, urgency, or card content

- [ ] **Step 4: Pass the saved layout through `HudWidgetItems.tsx`**

Read `settings.timedEffects.listLayout` and pass it to `TimedEffectList`.

- [ ] **Step 5: Re-run the targeted timed-effect tests**

Run:

```bash
cd view
npm test -- TimedEffectList
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add view/src/components/TimedEffectList.tsx view/src/components/TimedEffectList.test.tsx view/src/components/HudWidgetItems.tsx
git commit -m "fix: honor timed effect layout direction"
```

### Task 5: Run full verification and prepare the branch for execution handoff

**Files:**
- Review: `view/src/types/settings.ts`
- Review: `view/src/data/defaultSettings.ts`
- Review: `view/src/hooks/settingsSchema.ts`
- Review: `view/src/components/settings/SettingsTabSections.tsx`
- Review: `view/src/components/HudWidgetItems.tsx`
- Review: `view/src/components/TimedEffectList.tsx`
- Review: relevant updated tests

- [ ] **Step 1: Run the full frontend test suite**

Run:

```bash
cd view
npm test
```

Expected: PASS

- [ ] **Step 2: Run lint**

Run:

```bash
cd view
npm run lint
```

Expected: PASS

- [ ] **Step 3: Run production build**

Run:

```bash
cd view
npm run build
```

Expected: PASS

- [ ] **Step 4: Review the diff against the spec**

Check all of the following before handoff:

- defaults still match pre-change behavior
- no experience-widget redesign slipped into scope
- new translation keys are used and spelled consistently
- timed effects, carry weight, resistances, and time widgets all have automated coverage

- [ ] **Step 5: Commit any final cleanup if verification required code changes**

If verification exposed a small follow-up fix:

```bash
git add <updated-files>
git commit -m "chore: finalize stage 1 display option polish"
```

If no cleanup changes were needed, explicitly note that no final verification commit was necessary.
