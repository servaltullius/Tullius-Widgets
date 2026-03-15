# Tullius Widgets HUD Customization Design

> Status: approved in terminal on 2026-03-15

## Goal

Add two related customization capabilities to the HUD:

1. Replace coarse preset-only size changes with direct resize controls.
2. Evolve the current group-based HUD into an item-based custom layout system so players can place each visible stat widget independently.

## Why This Exists

User feedback asks for a more personal layout workflow:

- Resize widgets directly instead of picking only `small/medium/large`.
- Move `health`, `magicka`, `stamina`, `crit chance`, `game time`, `real time`, and similar values independently.
- Edit the HUD directly on screen instead of using only settings-panel form controls.

The current implementation already supports:

- group drag layout editing
- group visibility/layout toggles
- global size preset
- item visibility toggles inside each group

The missing capability is not game-data collection. The game already provides the required values. The missing layer is the UI composition and layout model.

## Approved Product Decisions

- Editing happens directly on the HUD.
- Every stable HUD stat becomes its own movable widget item.
- Each widget stores its own size.
- Layout is free-form, but the editor provides snap and alignment guides.
- Edit mode uses selective affordances:
  - only the selected widget shows the strong selection frame and resize handles
  - non-selected widgets remain readable and lightly interactive
- Delivery is phased:
  - Phase 1: enhance the existing group editor with direct resize
  - Phase 2: migrate from group layout to item layout
- `timedEffects` remains a list-style special widget instead of splitting each effect instance into separately placed items.

## Non-Goals

- Reworking native stat collection logic unless a UI need exposes a hard data gap.
- Turning dynamic buff/debuff entries into individually persisted widgets.
- Replacing the current settings panel with a full visual editor panel.
- Solving advanced layout templates, cloud sync, or profile sharing in this change set.
- Pulling `ScreenEffects` or `visualAlerts` into the movable widget-item system.

## Current Constraints

Current frontend architecture is group-oriented:

- [view/src/App.tsx](/home/kdw73/Tullius Widgets/view/src/App.tsx) resolves group props and positions.
- [view/src/components/HudWidgetGroups.tsx](/home/kdw73/Tullius Widgets/view/src/components/HudWidgetGroups.tsx) renders fixed groups such as `playerInfo`, `offense`, and `time`.
- [view/src/components/DraggableWidgetGroup.tsx](/home/kdw73/Tullius Widgets/view/src/components/DraggableWidgetGroup.tsx) supports drag only.
- [view/src/types/settings.ts](/home/kdw73/Tullius Widgets/view/src/types/settings.ts) stores `positions` and `layouts` keyed by group id plus one global `general.size`.
- [view/src/data/widgetRegistry.ts](/home/kdw73/Tullius Widgets/view/src/data/widgetRegistry.ts) computes defaults from group dimensions.

Because of this, the request is structurally larger than “add one resize slider.” It requires a new persistent layout model.

## Target Architecture

### 1. Widget Item Registry

Introduce a stable registry of individual widget items. Example ids:

- `player.level`
- `player.gold`
- `player.carryWeight`
- `player.health`
- `player.magicka`
- `player.stamina`
- `offense.rightHandDamage`
- `offense.leftHandDamage`
- `offense.critChance`
- `time.game`
- `time.real`
- `equipped.rightHand`
- `equipped.leftHand`
- `timedEffects.list`

Each registry entry defines:

- stable item id
- source data selector
- renderer type
- default size
- min/max scale bounds
- default placement group or placement hint
- migration source group id
- whether it is fixed, optional, or dynamic-list based

Stable widget inventory for Phase 2:

| Legacy group | Item id | Renderer | Visibility source today | Migration note |
|---|---|---|---|---|
| `experience` | `experience.progress` | `ExperienceWidget` | `experience.enabled` | Standalone item |
| `playerInfo` | `player.level` | `StatWidget` | `playerInfo.level` | Split from player info group |
| `playerInfo` | `player.gold` | `StatWidget` | `playerInfo.gold` | Split from player info group |
| `playerInfo` | `player.carryWeight` | `StatWidget` | `playerInfo.carryWeight` | Split from player info group |
| `playerInfo` | `player.health` | `StatWidget` | `playerInfo.health` | Split from player info group |
| `playerInfo` | `player.magicka` | `StatWidget` | `playerInfo.magicka` | Split from player info group |
| `playerInfo` | `player.stamina` | `StatWidget` | `playerInfo.stamina` | Split from player info group |
| `resistances` | `resistance.magic` | `StatWidget` | `resistances.magic` | Split from resistances group |
| `resistances` | `resistance.fire` | `StatWidget` | `resistances.fire` | Split from resistances group |
| `resistances` | `resistance.frost` | `StatWidget` | `resistances.frost` | Split from resistances group |
| `resistances` | `resistance.shock` | `StatWidget` | `resistances.shock` | Split from resistances group |
| `resistances` | `resistance.poison` | `StatWidget` | `resistances.poison` | Split from resistances group |
| `resistances` | `resistance.disease` | `StatWidget` | `resistances.disease` | Split from resistances group |
| `defense` | `defense.armorRating` | `StatWidget` | `defense.armorRating` | Split from defense group |
| `defense` | `defense.damageReduction` | `StatWidget` | `defense.damageReduction` | Split from defense group |
| `offense` | `offense.rightHandDamage` | `StatWidget` | `offense.rightHandDamage` | Split from offense group |
| `offense` | `offense.leftHandDamage` | `StatWidget` | `offense.leftHandDamage` | Split from offense group |
| `offense` | `offense.critChance` | `StatWidget` | `offense.critChance` | Split from offense group |
| `equipped` | `equipped.rightHand` | `StatWidget` | `equipped.rightHand` | Split from equipped group |
| `equipped` | `equipped.leftHand` | `StatWidget` | `equipped.leftHand` | Split from equipped group |
| `time` | `time.game` | `StatWidget` via shared split-time formatter | `time.gameDateTime` | Extract from `TimeWidgetList` |
| `time` | `time.real` | `StatWidget` via shared split-time formatter | `time.realDateTime` | Extract from `TimeWidgetList` |
| `movement` | `movement.speedMult` | `StatWidget` | `movement.speedMult` | Standalone item |
| `timedEffects` | `timedEffects.list` | `TimedEffectList` | `timedEffects.enabled` | Remains list-style special widget |

### 2. Item Layout State

Move persistent layout state from group-only records to item-level records.

Target shape:

```ts
interface WidgetItemLayout {
  visible: boolean;
  x: number;
  y: number;
  scale: number;
}
```

Stored shape direction:

```ts
interface WidgetSettingsVNext {
  itemLayouts: Record<string, WidgetItemLayout>;
}
```

Notes:

- `scale` is numeric per item, not a preset enum.
- canonical Phase 2 layout data is `itemLayouts` only.
- legacy top-level fields such as `positions`, `layouts`, `groupScales`, and old visibility sections may still appear in saved payloads during the compatibility window, but they are tolerated compatibility fields rather than canonical v-next layout state.

### 2a. Source Of Truth Contract

The source of truth changes by phase:

- Phase 1:
  - layout authority stays with existing group records
  - `positions[groupId]` and `layouts[groupId]` remain authoritative
  - new direct resize adds `groupScales[groupId]` as the persisted numeric scale field
  - live group scale is computed as `presetScale(general.size) * (groupScales[groupId] ?? 1)`
  - Phase 1 reset keeps the current `general.size` preset and resets `groupScales[groupId]` values back to `1`
- Phase 2:
  - `itemLayouts[itemId]` becomes the only authoritative store for stable-widget position, visibility, and scale
  - legacy layout records (`positions`, `layouts`, group-scale data) are migration inputs only and are not rewritten after a successful Phase 2 save
  - `general.size` stops affecting live widget rendering and becomes migration/default-generation input only

Settings-panel behavior during Phase 2:

- existing section toggles remain visible for one compatibility window
- those controls become adapters over `itemLayouts[itemId].visible`
- writing a toggle updates only `itemLayouts`
- legacy booleans may still be mirrored into the serialized payload for one release window to keep downgrade behavior predictable, but they are no longer authoritative
- group layout selectors (`layouts.*`) are removed from the settings panel in Phase 2 because they no longer map to authoritative runtime state
- `general.size` is removed from the visible settings panel in Phase 2 to avoid conflicting with per-item scale

Phase 2 settings-panel control policy:

| Control | Phase 2 policy |
|---|---|
| `general.size` | hidden, migration/default-generation input only |
| `layouts[groupId]` selectors | removed from UI |
| visibility toggles | retained temporarily as adapters over `itemLayouts[itemId].visible` |
| reset layout button | retained, now rebuilds `itemLayouts` defaults |
| preset export/import | continues, but payload now includes `itemLayouts` as the canonical layout data |

Reset behavior during Phase 2:

- “reset layout” rebuilds `itemLayouts` from current defaults
- it does not restore legacy `positions/layouts`

### 3. Renderer Composition

Keep existing presentation components where possible:

- `StatWidget` stays the base renderer for most scalar items.
- `ExperienceWidget` remains a dedicated renderer.
- `time.game` and `time.real` are rendered as individual `StatWidget` instances backed by a shared split-time formatting helper and shared clock/update source extracted from `TimeWidgetList`.
- `TimedEffectList` remains a dedicated list widget rendered as one special item.

The important change is composition:

- today: `group -> list of hardcoded child widgets`
- target: `item registry -> renderer map -> individually placed widgets`

### 4. Edit Layer

Replace “drag any group while settings are open” with a proper edit interaction layer.

Edit target by phase:

- Phase 1: the selectable/resizable target is still the group frame
- Phase 2: the selectable/resizable target becomes the individual widget item

Shared interaction rules:

- click widget to select
- selected widget shows strong highlight and resize handle
- drag moves widget
- corner handle resizes widget
- alignment guides appear while dragging/resizing
- nearby edges snap when useful
- overlap is allowed
- ESC clears current selection

This preserves readability and matches the approved “A” interaction direction.

## UX Specification

### Edit Mode Entry

Edit mode continues to be gated by settings-open state for the first delivery to avoid inventing another mode toggle too early.

Expected user flow:

1. Open settings.
2. Hover HUD widgets.
3. Click a widget to select it.
4. Drag to move or drag the resize handle to scale it.
5. Close settings to leave edit mode.

Visibility override during edit mode:

- while settings are open, edit mode temporarily bypasses global HUD visibility gates from `general.visible`, `combatOnly`, and `showOnChangeOnly`
- this ensures editable widgets remain present even when the normal gameplay HUD would be hidden
- per-item visibility still controls whether a widget is part of the active editable set
- the settings panel should explicitly communicate that edit mode temporarily reveals editable widgets while the panel is open

Keyboard priority:

- first `ESC`: clear selected widget if one is selected
- second `ESC`, or `ESC` with no selection: close settings and leave edit mode
- the edit layer intercepts `ESC` before the existing global settings-close path so selection clear always wins first

This preserves the current “ESC closes settings” expectation without making selection handling ambiguous.

### Visual States

- Default widget: normal HUD appearance
- Hovered widget in edit mode: subtle outline
- Selected widget: strong outline, resize handle, optional label
- Active drag/resize: alignment guides + snap hints

### Resize Behavior

- Resize is proportional and stored as a numeric scale factor.
- Initial implementation uses constrained uniform scaling, not free width/height distortion.
- This keeps current visual components intact and avoids text/meter breakage.

### Snap Behavior

- Free movement is primary.
- Snap is assistive, not mandatory.
- Support:
  - edge alignment
  - centerline alignment
  - grid fallback when no stronger neighbor alignment is near

Bounds measurement ownership:

- the edit-layer wrapper owns live widget bounds measurement
- each rendered widget item registers a root element ref with the edit layer
- the edit layer reads scaled `DOMRect` bounds for the active item and nearby items
- snapping and guide rendering use those measured bounds, not only top-left coordinates
- presentation renderers such as `StatWidget`, `ExperienceWidget`, and `TimedEffectList` stay layout-engine agnostic

### Overlap Policy

- Overlap is allowed.
- The system should help avoid accidental collisions but not block deliberate dense layouts.

## Migration Strategy

### Phase 1: Group Resize Upgrade

Goal: deliver direct size control quickly with limited risk.

Changes:

- extend `DraggableWidgetGroup` with resize support
- store per-group numeric scale
- preserve current group ids and group rendering
- add visual selection affordances and guide lines

Outcome:

- users can directly resize groups now
- implementation groundwork for selection, handles, and snap visuals is reusable in phase 2

### Phase 2: Item Layout Migration

Goal: convert stable stats from groups to items without destroying existing user layouts.

Migration rules:

- read old `positions[groupId]`
- read old global/group size data
- read old `layouts[groupId]` so vertical/horizontal orientation affects migrated child packing order and spacing
- expand each legacy group into default item placements inside that group’s bounding area
- carry old visibility toggles into item-level `visible`
- preserve old layout data temporarily for migration fallback and downgrade detection, not for reset restoration

Examples:

- `playerInfo` position becomes the anchor for `player.level`, `player.gold`, `player.carryWeight`, `player.health`, `player.magicka`, `player.stamina`
- `time` position becomes the anchor for `time.game` and `time.real`
- `offense` position becomes the anchor for `offense.rightHandDamage`, `offense.leftHandDamage`, `offense.critChance`
- `resistances` position becomes the anchor for all six resistance items
- `defense` position becomes the anchor for `defense.armorRating` and `defense.damageReduction`
- `equipped` position becomes the anchor for `equipped.rightHand` and `equipped.leftHand`
- `movement` position becomes the anchor for `movement.speedMult`
- `experience` position becomes the anchor for `experience.progress`

Legacy layout retention policy:

- keep reading legacy layout fields while migration support exists
- after a successful Phase 2 save, new builds stop updating legacy `positions/layouts`
- if `itemLayouts` is absent but legacy fields are present, rerun migration
- if both are absent or invalid, regenerate deterministic defaults

### Dynamic Widget Exception

`timedEffects` is intentionally not expanded into separately persisted effect items because:

- entries appear and disappear at runtime
- instance identity changes
- saved layouts for volatile effect instances would be unstable and confusing

Instead, persist `timedEffects.list` as one movable/resizable widget.

## Error Handling and Recovery

- If migration fails, fall back to deterministic defaults rather than partial corrupt state.
- Keep reset tools so users can clear item positions and rebuild from defaults.
- Tolerant parsing remains required for older settings payloads.
- New fields must not break older builds that ignore unknown keys.

Schema compatibility contract:

- current settings schema version is `1`
- Phase 1 can remain on schema `1` if it adds only tolerant optional fields
- Phase 2 bumps settings schema to `2`
- `rev` continues to increment on every successful settings write

Downgrade behavior:

- downgrading from Phase 2 to an older build is explicitly layout-lossy
- old builds may ignore or drop `itemLayouts`
- when the user upgrades again, the new build checks for `itemLayouts`
  - if present: use it
  - if missing but legacy fields exist: rerun migration
  - if neither is usable: rebuild defaults

This makes rollback safe from a crash perspective, but not guaranteed to preserve fine-grained custom layout edits across old-build saves.

## Testing Strategy

Add or extend tests for:

- settings migration from current schema to item-layout schema
- item default placement logic
- drag snapping and resize calculations
- selection state transitions
- `time.game` and `time.real` split rendering
- visibility resolution after itemization
- reset behavior and legacy fallback behavior
- schema v2 preset export/import round-trip
- `ESC` selection-clear versus settings-close behavior

Expected verification stack:

1. `npm run lint`
2. `npm test` or existing Vitest suite for affected view logic
3. `npm run build`

## Risks

### Highest Risk

- legacy user layouts becoming scrambled after migration

Mitigation:

- deterministic migration
- test fixtures from real legacy settings payloads
- reset fallback

### Medium Risk

- item explosion making edit mode visually noisy

Mitigation:

- only selected widget gets full affordances
- optional lock support
- hover state remains subtle

### Medium Risk

- text truncation or meter layout breakage under arbitrary scaling

Mitigation:

- use proportional scale first
- avoid independent width/height resizing
- keep per-widget min/max scale bounds

## Release Plan

### Release 1

- group selection frame
- group resize handle
- per-group numeric scale persistence
- group-level alignment guides and improved edit visuals
- edit workflow remains group-based in this release

### Release 2

- item registry
- item layout persistence
- item rendering layer
- legacy-to-item migration
- item-level visibility/layout reset tooling

## Recommended Follow-Up

If Phase 2 lands cleanly, the next logical enhancements are:

- widget lock toggle
- optional alignment/distribution helper actions
- preset export/import updated for item layouts
