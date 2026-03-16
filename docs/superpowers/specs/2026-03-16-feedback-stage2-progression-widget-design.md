# Tullius Widgets Feedback Stage 2 Progression Widget Design

> Status: approved in terminal on 2026-03-16

## Goal

Replace the current experience stat row with a compact progression widget that visibly combines level and XP progress, while keeping saved layouts and legacy level-widget behavior compatible for existing users.

## Why This Exists

Recent modpack feedback called out three experience-related problems:

- the experience UI overlaps conceptually with the separate level widget
- the current experience widget feels too close to a generic stat line
- the previous horizontal/vertical distinction does not create a meaningfully different XP presentation

The requested direction is closer to STB or Hero Avatar HUD style progression: an icon-centered widget with clearly visible progress around it, not another text-first row.

Stage 2 exists to solve that product problem without destabilizing saved layouts from Stage 1.

## Approved Scope

Stage 2 includes:

- redesigning `experience.progress` into an integrated progression widget
- showing the current level inside the progression widget
- replacing the current linear stat-row feel with an icon-centered progress ring treatment
- changing fresh-install defaults so the separate `player.level` widget is no longer the primary experience-facing UI
- adding compatibility logic so older saved settings do not unexpectedly lose the legacy level widget
- updating settings copy and tests for the new progression meaning

Stage 2 does not include:

- removing the `player.level` widget from the registry
- changing the native stats payload
- adding multiple progression-widget styles or theme presets
- adding a generic presentation framework for all widgets
- redesigning unrelated player-info widgets

## Current Constraints

The relevant frontend currently behaves as follows:

- [view/src/components/ExperienceWidget.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/components/ExperienceWidget.tsx) is a thin wrapper around `StatWidget` and renders XP as plain text plus helper text.
- [view/src/components/HudWidgetItems.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/components/HudWidgetItems.tsx) treats `experience.progress` and `player.level` as unrelated widget items.
- [view/src/data/widgetItemRegistry.ts](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/data/widgetItemRegistry.ts) already makes `itemLayouts.<itemId>.visible` the runtime visibility authority for both items.
- [view/src/hooks/settingsSchema.ts](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/hooks/settingsSchema.ts) merges saved settings tolerantly, but does not yet distinguish “fresh Stage 2 install” from “older install that never explicitly changed `player.level`”.
- [view/src/data/defaultSettings.ts](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/data/defaultSettings.ts) still defaults `playerInfo.level` to `true`.

These constraints mean Stage 2 should preserve the current item ids and layout storage model, then move the visual and default-behavior change into the settings/rendering layer.

## Approved Product Decisions

- `experience.progress` remains the canonical progression widget id.
- `player.level` remains available as a legacy or supplemental widget.
- The progression widget becomes the primary default UX for level + XP feedback.
- New installs should default `player.level` to hidden.
- Existing installs must keep their current `player.level` visibility unless the user explicitly changed it.
- The experience group should keep its current placement identity, but the widget itself should always render as one compact progression card rather than a layout-sensitive row.
- Stage 2 should ship exactly one approved progression presentation, not a style selector.

## Progression Widget UX

### Visual Anatomy

The redesigned `experience.progress` widget should be composed from three visual parts:

1. A central medallion that shows the current level number.
2. A surrounding ring that fills according to XP progress toward the next level.
3. Compact supporting text that shows current XP state without competing with the medallion.

The widget should read as “level progression” at a glance, even when the user does not read the numeric text.

### Content Rules

- The center badge shows `level`.
- The outer ring shows `currentXp / totalXpForNextLevel`, clamped to `0..100%`.
- The primary supporting line shows `current XP / total XP`.
- The secondary supporting line shows rounded progress percent.
- The tooltip keeps the detailed XP wording so the precise numbers remain discoverable.

The visual hierarchy must make the ring and level badge more prominent than the XP text. This is a deliberate break from the current stat-row treatment.

### Layout Behavior

The widget should render as one compact card regardless of legacy group layout orientation. In practice:

- `experience.progress` keeps the same item id and editable layout state
- the widget footprint stays compact enough that saved positions still make sense
- legacy `layouts.experience` values should no longer produce meaningfully different internal XP layouts

This resolves the feedback that the old horizontal/vertical distinction did not create a clear experience-widget difference.

## Settings And Compatibility

### Fresh-Install Defaults

Stage 2 changes the default experience-facing behavior for new installs:

- `experience.enabled = true`
- `playerInfo.level = false`

This makes the integrated progression widget the default source of level feedback.

### Compatibility Rule For Existing Installs

Simply changing the default to `false` would hide `player.level` for older users whose saved payload never explicitly stored that field. Stage 2 must prevent that regression.

Compatibility rules:

- bump settings schema version for Stage 2
- treat missing or invalid `schemaVersion` as pre-Stage-2 data for this migration path
- if incoming saved settings are from a pre-Stage-2 schema and they do not explicitly define either:
  - `playerInfo.level`
  - `itemLayouts['player.level'].visible`
- then preserve legacy behavior by treating the migrated value as visible
- if both fields are explicitly present and conflict, `itemLayouts['player.level'].visible` wins because canonical item visibility already has runtime priority
- if only one field is explicitly present, respect that explicit saved value exactly

This keeps old installs visually stable while still letting fresh installs start with the cleaner integrated UX.

### Settings Panel Copy

The settings panel should make the new relationship understandable:

- the experience section should describe the integrated progression widget, not only raw XP text
- the player-info section should still expose the separate level widget, but as an optional standalone display rather than the main progression readout

Stage 2 should update copy accordingly, but does not need a large settings-panel redesign.

## Component Boundaries

Stage 2 should stay focused on a few existing frontend units:

- [view/src/components/ExperienceWidget.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/components/ExperienceWidget.tsx): owns the medallion, ring, text hierarchy, and tooltip-friendly display
- [view/src/components/HudWidgetItems.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/components/HudWidgetItems.tsx): computes progression inputs and keeps `experience.progress` / `player.level` visibility independent
- [view/src/data/defaultSettings.ts](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/data/defaultSettings.ts) and [view/src/hooks/settingsSchema.ts](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/hooks/settingsSchema.ts): own fresh defaults and migration-safe compatibility behavior
- [view/src/hooks/settingsShared.ts](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/hooks/settingsShared.ts): owns the Stage 2 settings schema version bump used by serialization and migration checks
- [view/src/components/settings/SettingsTabSections.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/components/settings/SettingsTabSections.tsx) and [view/src/i18n/translations.ts](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/i18n/translations.ts): own user-facing wording for the integrated widget and legacy level toggle
- [view/src/utils/hudPresentation.ts](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/utils/hudPresentation.ts): owns `showOnChangeOnly` change-tracking inputs for progression visibility

No new generalized widget framework is needed for this stage.

## Error Handling And Edge Cases

- If `totalXpForNextLevel <= 0`, the widget should avoid divide-by-zero behavior and render `0%` safely.
- If incoming XP values overshoot the total because of payload oddities, the ring display should clamp to `100%` while keeping tooltip numbers truthful.
- Long numeric text should remain readable without pushing the medallion out of alignment.
- If both `experience.progress` and `player.level` are enabled, the standalone level widget should still render independently; Stage 2 does not forcibly deduplicate it.
- `showOnChangeOnly` behavior should continue treating visible experience output as meaningful HUD content.
- when `experience.progress` is visible, a change in `playerInfo.level` must count as a tracked HUD change even if the standalone `player.level` widget is hidden

## Testing Strategy

Stage 2 must add focused regression coverage in five areas.

### Experience Widget Rendering

Update [view/src/components/ExperienceWidget.test.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/components/ExperienceWidget.test.tsx) to verify:

- the level value is rendered in the integrated widget
- the progression ring reflects the expected percent
- XP text and percent helper are still present
- tooltip copy still exposes detailed XP values
- progress is safely clamped for bad inputs

### HUD Item Integration

Update [view/src/components/HudWidgetItems.test.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/components/HudWidgetItems.test.tsx) to verify:

- `experience.progress` still renders through the canonical item id
- `player.level` can remain independently visible when explicitly enabled
- `player.level` is not implicitly required for progression visibility

### Change-Tracking Integration

Update [view/src/utils/hudPresentation.test.ts](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/utils/hudPresentation.test.ts) to verify:

- when `experience.progress` is visible, the tracked change signature includes level changes
- that tracked signature does not depend on `player.level` also being visible
- existing XP-related signature behavior is preserved

### Settings Migration

Update [view/src/hooks/settingsSchema.test.ts](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/hooks/settingsSchema.test.ts) and [view/src/hooks/useSettings.test.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/hooks/useSettings.test.tsx) to verify:

- fresh Stage 2 defaults hide `player.level`
- older saved payloads without explicit level visibility still preserve legacy visible behavior
- explicit old payload visibility choices continue to win
- serialized settings advertise the new schema version

### Settings Panel Copy

Update [view/src/components/settings/SettingsTabSections.test.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/stage2-progression-widget/view/src/components/settings/SettingsTabSections.test.tsx) so the experience and player-info sections continue to expose the correct toggles with the updated progression-focused wording.

## Success Criteria

Stage 2 is successful when:

- the experience widget visibly reads as level progression rather than a generic stat row
- new installs no longer need the separate level widget to understand level progress
- existing installs do not unexpectedly lose the standalone level widget after update
- the implementation stays inside the existing frontend widget architecture without a new framework
