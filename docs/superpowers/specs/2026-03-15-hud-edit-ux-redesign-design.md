# Tullius Widgets HUD Edit UX Redesign

> Status: approved in terminal on 2026-03-15

## Goal

Refine the Phase 2 HUD customization experience so that direct on-HUD editing remains the primary workflow, while the settings panel becomes a lightweight companion for the currently selected widget.

## Why This Exists

The current Phase 2 implementation already supports:

- per-item HUD placement
- direct drag and resize
- snap guides
- per-item visibility

What it does not yet provide is a polished editing workflow. The user can move and resize widgets, but the surrounding UX is still shaped by the older settings-first structure.

The approved direction is:

- opening settings should still immediately enter edit mode
- the HUD should remain the main editing surface
- the settings panel should help refine the selected widget, not compete with the HUD

## Approved Product Decisions

- `settings open = edit mode active` stays unchanged
- HUD direct manipulation remains the primary interaction model
- the settings panel keeps its existing tab structure for global and category-level settings
- selecting a widget adds a quick-edit card at the top of the settings panel
- the quick-edit card is always tied to the selected widget, regardless of which tab is open
- first redesign pass includes:
  - widget name
  - show/hide
  - size slider
  - fine X/Y adjustment
  - reset position
  - lock
  - bring forward / send backward

## Non-Goals

- redesigning the entire settings information architecture in one pass
- adding per-widget color themes, typography controls, or deep styling tools
- adding multi-select, alignment toolbars, grouping, or duplication
- changing the rule that settings-open state enables edit mode
- reworking stats collection or renderer composition

## Current Constraints

Current structure after Phase 2:

- [App.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/hud-edit-ux-redesign/view/src/App.tsx) owns settings-open state and edit wiring
- [HudWidgetItems.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/hud-edit-ux-redesign/view/src/components/HudWidgetItems.tsx) renders item-based widgets
- [EditableWidgetItem.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/hud-edit-ux-redesign/view/src/components/EditableWidgetItem.tsx) owns item drag/resize behavior
- [SettingsPanel.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/hud-edit-ux-redesign/view/src/components/SettingsPanel.tsx) still assumes a mostly tab-driven workflow
- [SettingsTabSections.tsx](/home/kdw73/Tullius%20Widgets/.worktrees/hud-edit-ux-redesign/view/src/components/settings/SettingsTabSections.tsx) still focuses on category controls rather than selected-item refinement
- [settings.ts](/home/kdw73/Tullius%20Widgets/.worktrees/hud-edit-ux-redesign/view/src/types/settings.ts) defines canonical `itemLayouts`, which currently only store `visible`, `x`, `y`, and `scale`

Because of this, the redesign should improve UX without undoing the item-layout architecture that was just completed.

## UX Architecture

### 1. Editing Flow

The direct manipulation model stays intact:

1. User opens settings.
2. HUD immediately becomes editable.
3. User clicks a widget to select it.
4. User drags the widget body to move it or drags the resize handle to scale it.
5. User optionally refines the selected widget through the settings panel quick-edit card.
6. User presses `ESC` once to clear selection, then `ESC` again to close settings.

Interaction rules:

- unselected widgets remain readable and lightly interactive
- hovered widgets in edit mode show a subtle outline
- selected widgets show the strong focus frame and resize handle
- locked widgets can still be selected, but cannot be moved or resized
- guides and snapping stay enabled and should visually favor the selected item

### 2. Settings Panel Role

The settings panel becomes a companion, not the primary editor.

Its structure becomes:

- top fixed region: selected-widget quick-edit card
- main body below: existing tab structure
  - `General`
  - `Combat`
  - `Effects`
  - `Alerts`
  - `Presets`

Rules:

- if no widget is selected, the quick-edit card is hidden
- if a widget is selected, the card appears above the tabs and remains visible while switching tabs
- tabs continue to host global settings and category toggles
- the quick-edit card hosts the controls that must stay immediately accessible during direct HUD editing

This preserves familiarity while shifting moment-to-moment editing power toward the HUD.

### 3. Quick-Edit Card

The first redesign pass of the quick-edit card includes:

- localized widget name
- `show/hide`
- `size` slider
- fine `X` / `Y` adjustment
- `reset position`
- `lock`
- `bring forward`
- `send backward`

Behavior:

- widget display name is resolved from a `labelKey` carried by the item registry, not by hardcoding labels inside the panel
- all controls write directly into canonical item layout state
- values update live and should stay in sync with HUD drag/resize operations
- the card must be useful for precision adjustment, not only visibility toggling
- if the selected widget is hidden through the card, selection is preserved and the quick-edit card stays visible until selection is explicitly cleared or another widget is selected

The card should remain compact. It is not a full property inspector.

## State Model Changes

Canonical state remains `itemLayouts`, but the layout entry is extended for edit UX.

Current runtime shape:

```ts
interface WidgetItemLayout {
  visible: boolean;
  x: number;
  y: number;
  scale: number;
}
```

Target redesign shape:

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

Rules:

- `itemLayouts` remains the single source of truth
- HUD direct manipulation and quick-edit card controls both write to the same `itemLayouts` entry
- no second persistent settings model is introduced
- selection state stays separate from layout data
- migration and tolerant parsing must continue to support older Phase 2 payloads that do not yet include `locked` or `zIndex`
- when missing, new fields default to:
  - `locked: false`
  - `zIndex: current item render order index from the registry-resolved full item list`
- hidden items keep their own persisted `zIndex`
- any normalization pass applies across the full stable item set, not only the visible subset, so hidden items preserve deterministic relative order when shown again
- item registry contract is extended with `labelKey` so panel display names come from the same canonical registry used for rendering and migration

## Behavior Details

### Lock

- locked widget remains visible and selectable
- locked widget cannot start drag
- locked widget cannot start resize
- quick-edit card still allows unlock, visibility toggle, fine coordinate edits, and reset
- locked widget does not allow size slider changes
- locked widget does not allow `bring forward` or `send backward`

### Z Order

- each widget gets a numeric `zIndex`
- higher values render above lower values
- if multiple widgets overlap under the pointer, the highest `zIndex` widget wins selection
- quick-edit card exposes simple relative actions:
  - `bring forward`
  - `send backward`
- first pass uses adjacent reordering only against the currently visible HUD item set:
  - `bring forward` swaps with the nearest visible item above the current one
  - `send backward` swaps with the nearest visible item below the current one
- hidden items are not direct swap targets for these actions
- if the selected widget is currently hidden, `bring forward` and `send backward` stay disabled until the widget is shown again
- after every reorder, the full stable item set is normalized back into contiguous integer `zIndex` values while preserving:
  - the new visible-item order created by the action
  - the pre-existing relative order among hidden items
- first pass does not require arbitrary layer list editing

### Reset Position

- resets only the selected widget
- restores the item's registry default placement recomputed for the current viewport
- does not reset visibility, lock state, or all-widget layout state
- does not reset the selected widget scale
- does not reset the selected widget z-order

### Fine Position Adjustment

- uses small-step numeric controls
- default nudge step is `1px`
- intended for precision correction after drag placement
- should update the HUD live

### Size Control

- size slider range follows the selected item's registry `minScale` to `maxScale`
- default size step is `0.05`
- slider updates the HUD live
- slider is disabled while the selected widget is locked

## Panel Content Policy

The current tab sections remain, but they are reinterpreted.

- tab content remains responsible for global settings and compatibility toggles
- selected-widget quick editing does not move into the existing accordion sections
- duplicate or conflicting controls should be removed when they create ambiguity with the quick-edit card

In practice:

- quick-edit card owns per-selected-widget adjustment
- tabs own broad configuration

This avoids a panel that constantly reshapes itself while still keeping selection-aware editing accessible.

## Implementation Boundaries

First pass includes:

- quick-edit card UI
- selected-item integration in settings panel
- `locked` and `zIndex` state support
- HUD interaction updates to honor lock and render stacking
- item reset and precision controls

First pass excludes:

- visual theming per widget
- batch actions across multiple widgets
- presets for sub-layout templates
- replacing tabbed settings with a wholly new editor shell

## Testing Requirements

Add or update tests for:

- quick-edit card visibility based on selection
- quick-edit card values matching the selected item layout
- size slider and X/Y controls writing to canonical `itemLayouts`
- drag and resize honoring `locked`
- z-order changes affecting render order
- overlap selection choosing the highest `zIndex`
- reorder behavior when the selected widget is visible but some other items are hidden
- per-item reset restoring only the selected widget placement
- settings parsing and export/import tolerating missing `locked` and `zIndex`

## Risks

- adding too many controls to the quick-edit card would pull the UX back toward a settings-first workflow
- if lock state is enforced only in panel logic and not in edit interaction logic, HUD editing will feel inconsistent
- if z-order is bolted on outside `itemLayouts`, render order and persistence will drift apart

## Recommendation

Implement this as a focused UX pass on top of the existing item-layout architecture:

- keep the HUD as the main editing surface
- keep the settings panel familiar
- add a compact selected-widget quick-edit card
- extend `itemLayouts` just enough to support safer and more precise editing
