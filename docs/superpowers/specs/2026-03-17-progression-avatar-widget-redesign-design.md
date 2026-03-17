# Tullius Widgets Progression Avatar Widget Redesign

> Status: approved in terminal on 2026-03-17

## Goal

Refine the integrated progression widget so it reads as a Dororong-centered avatar badge with an XP ring, while keeping the existing widget id, layout editing model, and standalone level widget behavior intact.

## Why This Exists

The current Stage 2 progression widget fixed the old text-row problem, but it still does not match the strongest feedback direction:

- the widget still reads partly like a stat line because the XP text sits beside the medallion
- the center is visually split between the Dororong icon and a small level badge
- the level/XP relationship is less immediate than the reference style the feedback pointed to

The approved direction is closer to “large avatar medallion first, growth information second.” The Dororong icon should own the center, the outer ring should communicate XP progress, and the level plus XP numbers should live together in one compact line underneath.

## Approved Scope

This redesign includes:

- changing `experience.progress` into a vertically stacked avatar-style progression widget
- removing the central level badge from the medallion
- making the Dororong icon the only central visual inside the medallion
- keeping the XP ring as the main progress affordance around the icon
- moving level and XP text into a single bottom line such as `레벨 2 · 56 / 125`
- removing the default percent helper line from the visible widget layout
- keeping tooltip detail available for precise XP inspection
- updating focused widget tests to lock the new visual contract

This redesign does not include:

- adding a new widget style selector or theme setting
- changing native payload fields or settings schema behavior
- removing the standalone `player.level` widget
- redesigning unrelated player-info or resistance widgets

## Current Constraints

The current frontend already has Stage 2 behavior in place:

- `view/src/components/ExperienceWidget.tsx` renders a ring-based medallion, but the layout is still horizontal and uses a bottom-right level badge.
- `view/src/components/HudWidgetItems.tsx` already treats `experience.progress` as the canonical progression widget item id.
- Stage 2 compatibility logic for the separate `player.level` widget already exists and should remain untouched unless this redesign proves a regression.
- Saved layout editing, dragging, resizing, visibility, and resolution-stable positioning are already tied to the existing `experience.progress` item id.

These constraints mean the redesign should stay inside the existing widget surface area and avoid reopening the previous settings migration work.

## Approved Product Decisions

- `experience.progress` remains the canonical progression widget id.
- The widget keeps its current draggable/resizable/editable behavior.
- The central medallion shows only the Dororong experience icon.
- The level number moves out of the medallion and into the bottom text line.
- The bottom text line becomes the primary numeric readout: `레벨 {level} · {currentXp} / {totalXp}`.
- The ring remains the only visible progress meter in the default widget body.
- The separate `player.level` widget remains optional and independent.
- The redesign ships as the only integrated progression presentation; there is no alternate style toggle.

## Progression Widget UX

### Visual Anatomy

The redesigned `experience.progress` widget should be composed from three parts:

1. A large circular medallion whose center is occupied only by the Dororong icon.
2. A surrounding XP ring that fills based on progress toward the next level.
3. A single bottom text line that combines level and XP values.

The widget should read from top to bottom:

- avatar identity first
- progress ring second
- exact numbers last

### Content Rules

- The medallion center shows no numeric badge.
- The bottom text line shows `레벨 {level} · {currentXp} / {totalXp}`.
- The widget body should not show a second visible percent helper line.
- The tooltip still exposes detailed XP wording so the user can inspect exact values without crowding the main layout.
- If the icon asset is missing, the widget may fall back to a plain ring shell plus the bottom text, but should not invent a new placeholder badge design.

### Layout Behavior

The widget should render as one compact vertical block rather than a horizontal stat row:

- the medallion sits above the text line
- the text line is centered under the medallion
- the footprint stays compact enough that existing saved positions remain reasonable
- the widget should still scale cleanly through the existing resize handle system

The result should feel closer to the feedback image than the current Stage 2 layout, while still fitting naturally among the rest of the HUD.

## Component Boundaries

This redesign should stay focused on the existing frontend widget files:

- `view/src/components/ExperienceWidget.tsx`
  - owns the ring, medallion, icon sizing, and bottom-line text hierarchy
- `view/src/components/ExperienceWidget.test.tsx`
  - owns the visual contract for the redesigned widget
- `view/src/components/HudWidgetItems.tsx`
  - should remain a thin data handoff layer for `experience.progress`
- `view/src/components/HudWidgetItems.test.tsx`
  - should confirm the canonical item id behavior is unchanged

No new generalized presentation framework is needed for this redesign.

## Error Handling And Edge Cases

- If `totalXp <= 0`, the widget must avoid divide-by-zero behavior and render a safe `0%` or clamped completed ring state consistent with current Stage 2 behavior.
- If `currentXp > totalXp`, the ring should clamp visually to `100%` while the bottom text and tooltip keep truthful numbers.
- Long numbers must remain readable on the bottom line without forcing the medallion into a side-by-side layout.
- The widget must continue returning `null` when it is not visible.
- The redesign must not accidentally reintroduce a dependency on the separate `player.level` widget for progression visibility.

## Testing Strategy

The redesign needs focused regression coverage in three areas.

### Experience Widget Rendering

Update `view/src/components/ExperienceWidget.test.tsx` to verify:

- the Dororong icon still renders inside the medallion
- the central level badge is gone
- the progress ring still exposes a stable verification hook such as `role="progressbar"`
- the visible text matches the bottom-line structure: level plus XP on one line
- the old visible percent helper line is gone
- bad inputs still clamp visible progress safely

### HUD Item Integration

Update `view/src/components/HudWidgetItems.test.tsx` to verify:

- `experience.progress` still renders through the same canonical item id
- the redesign does not require `player.level` to be visible
- existing integrated progression visibility behavior remains intact

### Optional Settings Smoke Coverage

If current tests already touch progression-related labels or panel expectations, update only the minimum assertions needed so the new widget wording and behavior remain coherent. Do not widen scope into new settings features.

## Success Criteria

This redesign is successful when:

- the widget reads as a Dororong-centered avatar badge instead of a compact stat row
- the ring is the obvious XP progress indicator
- the level is still visible, but no longer competes with the icon inside the medallion
- the bottom text line communicates level plus XP cleanly in one glance
- the existing widget id, layout behavior, and standalone level-widget compatibility remain stable
