# Tullius Widgets Feedback Stage 1 Display Options Design

> Status: approved in terminal on 2026-03-16

## Goal

Reflect the first wave of modpack feedback without redesigning the experience widget yet.

This stage focuses on four concrete outcomes:

1. Make timed-effect horizontal layout actually work.
2. Add carry-weight presentation choices.
3. Add resistance presentation choices.
4. Add time-only display choices for game time and real time.

## Why This Exists

Recent user feedback identified two kinds of problems:

- options that exist but do not behave as expected
- display modes that players want but cannot currently choose

The most urgent issues are not native data collection gaps. The HUD already has the required carry-weight, resistance, timed-effect, and time payloads. The missing layer is display configuration and renderer branching in the frontend.

The experience widget redesign is intentionally deferred because it is a larger product decision that overlaps with the level widget and would force a separate visual/interaction pass.

## Approved Scope Split

Stage 1 includes:

- timed effects layout fix
- carry-weight display mode
- resistance display mode
- game time display mode
- real time display mode
- settings-panel controls for the above
- tests covering schema, settings UI, and rendering branches

Stage 2 will handle:

- experience widget redesign
- possible merge or role realignment between XP and level widgets
- new icon/ring-based XP visuals

## Non-Goals

- Reworking the native stats payload.
- Redesigning the experience widget in this change set.
- Replacing existing HUD base widgets with new component families.
- Generalizing every widget into a new presentation framework.
- Broad settings-panel refactors unrelated to the approved feedback.

## Current Constraints

The relevant frontend currently behaves as follows:

- [view/src/components/TimedEffectList.tsx](/home/kdw73/Tullius Widgets/view/src/components/TimedEffectList.tsx) hardcodes a vertical list with `flexDirection: 'column'`.
- [view/src/components/HudWidgetItems.tsx](/home/kdw73/Tullius Widgets/view/src/components/HudWidgetItems.tsx) always renders carry weight with both numeric text and meter, always renders resistance helper text with raw values when available, and always formats game/real time as date plus time.
- [view/src/components/settings/SettingsTabSections.tsx](/home/kdw73/Tullius Widgets/view/src/components/settings/SettingsTabSections.tsx) exposes visibility toggles and timed-effect max count, but not the new display choices.
- [view/src/types/settings.ts](/home/kdw73/Tullius Widgets/view/src/types/settings.ts), [view/src/data/defaultSettings.ts](/home/kdw73/Tullius Widgets/view/src/data/defaultSettings.ts), and [view/src/hooks/settingsSchema.ts](/home/kdw73/Tullius Widgets/view/src/hooks/settingsSchema.ts) do not yet define or sanitize the new enum-like options.

Because the payload already contains the necessary values, Stage 1 should stay in the settings + renderer layer.

## Approved Product Decisions

- Timed effects and carry weight get their own display options.
- Game time and real time get separate display options.
- Resistance display mode is a single shared setting for the entire resistance section.
- Existing visibility toggles remain as-is.
- Existing widget visuals should be preserved where possible; Stage 1 is about control and correctness, not a visual redesign.
- Default behavior must match current live behavior so existing users do not see surprise changes after update.

## Settings Model

Stage 1 extends the existing settings shape with a small number of focused display fields.

### New Types

```ts
type TimedEffectListLayout = 'vertical' | 'horizontal';
type CarryWeightDisplayMode = 'combined' | 'valueOnly' | 'meterOnly';
type ResistanceDisplayMode = 'effectiveOnly' | 'rawOnly' | 'both';
type TimeDisplayMode = 'dateTime' | 'timeOnly';
```

### New Settings Fields

```ts
interface WidgetSettings {
  timedEffects: {
    enabled: boolean;
    maxVisible: number;
    listLayout: TimedEffectListLayout;
  };
  resistances: {
    magic: boolean;
    fire: boolean;
    frost: boolean;
    shock: boolean;
    poison: boolean;
    disease: boolean;
    displayMode: ResistanceDisplayMode;
  };
  playerInfo: {
    level: boolean;
    gold: boolean;
    carryWeight: boolean;
    carryWeightDisplay: CarryWeightDisplayMode;
    health: boolean;
    magicka: boolean;
    stamina: boolean;
  };
  time: {
    gameDateTime: boolean;
    gameDisplay: TimeDisplayMode;
    realDateTime: boolean;
    realDisplay: TimeDisplayMode;
  };
}
```

### Default Values

Defaults preserve current behavior:

- `timedEffects.listLayout = 'vertical'`
- `playerInfo.carryWeightDisplay = 'combined'`
- `resistances.displayMode = 'both'`
- `time.gameDisplay = 'dateTime'`
- `time.realDisplay = 'dateTime'`

### Compatibility Rules

- Missing fields from older saved settings are filled from defaults.
- Invalid enum values are discarded and replaced with defaults.
- Stage 1 does not change the current visibility authority. Runtime widget inclusion continues to follow the resolved `itemLayouts.<itemId>.visible` flow already used by the HUD, while the older section booleans remain compatibility/default inputs where that behavior already exists today.
- No plugin-side schema or payload changes are required in Stage 1.

## Settings Panel UX

The settings panel keeps the existing accordion/tab structure and adds focused selectors only where they are needed.

### Player Info Section

Under `carryWeight`, add one display selector:

- `숫자+바` / `Number + Meter`
- `숫자만` / `Number Only`
- `바만` / `Meter Only`

This remains a per-widget option because the feedback is specific to carry weight and should not create a broader presentation system.

### Resistances Section

Add one shared selector near the top of the resistance section:

- `실효값만` / `Effective Only`
- `원본값만` / `Raw Only`
- `둘 다` / `Both`

This remains a section-level option because the feedback asks for shorter resistance text generally, not per-element customization.

### Time Section

Keep both visibility toggles and add a display selector under each enabled time widget:

- game time: `날짜+시간` / `시간만`
- real time: `날짜+시간` / `시간만`

This is intentionally split because players may want lore-friendly full date for Skyrim time but a compact real-world clock, or the inverse.

### Timed Effects Section

Keep `enabled` and `maxVisible`, then add a layout selector:

- `세로` / `Vertical`
- `가로` / `Horizontal`

This is a per-widget option because `timedEffects.list` is rendered as a special list widget rather than a collection of itemized HUD stats.

## Renderer Behavior

Stage 1 reuses the current widget components and branches their props instead of introducing new renderer families.

### Carry Weight

[view/src/components/HudWidgetItems.tsx](/home/kdw73/Tullius Widgets/view/src/components/HudWidgetItems.tsx) should continue rendering carry weight through `StatWidget`, but vary its props:

- `combined`: preserve the current presentation exactly: current/max as the primary value, percent helper text, and the meter
- `valueOnly`: show only current/max as the primary value, with no percent helper and no meter
- `meterOnly`: show only the bar-style progress treatment, with no current/max text and no percent helper

The base tone logic and overencumbered styling stay unchanged.

If the current `StatWidget` structure cannot render a clean meter-only layout without leaving a blank value row, Stage 1 may add a minimal optional prop to suppress value text for this one branch. That extension is allowed because it supports an approved display mode and does not introduce a new widget family.

### Resistances

Resistance widgets should switch which number is treated as the primary value:

- `effectiveOnly`: use effective resistance as the primary value and hide raw helper text
- `rawOnly`: use raw resistance as the primary value and hide helper text
- `both`: use effective resistance as the primary value and show raw resistance as helper text when the two meaningfully differ

If effective and raw are identical, `both` should collapse to the same presentation as `effectiveOnly` rather than adding redundant copy.

### Time

[view/src/utils/timeWidgetShared.ts](/home/kdw73/Tullius Widgets/view/src/utils/timeWidgetShared.ts) should provide separate formatting helpers for:

- Skyrim date + time
- Skyrim time only
- real date + time
- real time only

[view/src/components/HudWidgetItems.tsx](/home/kdw73/Tullius Widgets/view/src/components/HudWidgetItems.tsx) should select the formatter based on `time.gameDisplay` and `time.realDisplay`.

### Timed Effects

[view/src/components/TimedEffectList.tsx](/home/kdw73/Tullius Widgets/view/src/components/TimedEffectList.tsx) should accept a layout prop and switch container direction:

- `vertical`: preserve current stacked list behavior
- `horizontal`: render the same effect cards in a left-to-right flow with wrapping enabled when width is insufficient

Horizontal mode is not a new compact chip design. It remains the same card-based widget, only arranged side by side so Stage 1 stays small and low-risk.

`maxVisible`, sorting, urgency treatment, and hidden-count behavior stay unchanged. In horizontal mode, the hidden-count badge remains the last flow item after the visible cards rather than becoming an overlay or separate header.

## Error Handling And Edge Cases

- Invalid saved enum values fall back to defaults during tolerant merge.
- Carry-weight meter-only mode must not leave an empty text row above the meter.
- Time-only formatting must still update live with the shared clock.
- Timed effects horizontal mode must not break empty-state rendering or hidden-count display.

## Testing Strategy

Stage 1 must add targeted regression coverage instead of relying on manual visual checks alone.

### Settings Schema

Update [view/src/hooks/settingsSchema.test.ts](/home/kdw73/Tullius Widgets/view/src/hooks/settingsSchema.test.ts) to verify:

- valid enum fields are preserved
- invalid enum fields fall back to defaults
- missing Stage 1 fields still merge into valid settings objects

### Settings Panel

Add or update tests for [view/src/components/settings/SettingsTabSections.tsx](/home/kdw73/Tullius Widgets/view/src/components/settings/SettingsTabSections.tsx) so they verify:

- each new selector is shown in the correct accordion section
- user changes call `onUpdate` with the correct settings path

### HUD Rendering

Extend [view/src/components/HudWidgetItems.test.tsx](/home/kdw73/Tullius Widgets/view/src/components/HudWidgetItems.test.tsx) to cover:

- carry-weight display mode branches
- resistance display mode branches
- time-only vs date-time formatting branches

### Timed Effects

Add [view/src/components/TimedEffectList.test.tsx](/home/kdw73/Tullius Widgets/view/src/components/TimedEffectList.test.tsx) to verify:

- vertical layout keeps column direction
- horizontal layout switches to row direction
- hidden-count rendering still respects `maxVisible`

## Implementation Boundaries

Files expected to change during implementation:

- [view/src/types/settings.ts](/home/kdw73/Tullius Widgets/view/src/types/settings.ts)
- [view/src/data/defaultSettings.ts](/home/kdw73/Tullius Widgets/view/src/data/defaultSettings.ts)
- [view/src/hooks/settingsSchema.ts](/home/kdw73/Tullius Widgets/view/src/hooks/settingsSchema.ts)
- [view/src/components/settings/SettingsTabSections.tsx](/home/kdw73/Tullius Widgets/view/src/components/settings/SettingsTabSections.tsx)
- [view/src/components/HudWidgetItems.tsx](/home/kdw73/Tullius Widgets/view/src/components/HudWidgetItems.tsx)
- [view/src/components/TimedEffectList.tsx](/home/kdw73/Tullius Widgets/view/src/components/TimedEffectList.tsx)
- [view/src/utils/timeWidgetShared.ts](/home/kdw73/Tullius Widgets/view/src/utils/timeWidgetShared.ts)
- [view/src/i18n/translations.ts](/home/kdw73/Tullius Widgets/view/src/i18n/translations.ts)
- relevant tests in `view/src/components`, `view/src/hooks`, and `view/src/utils`

Files intentionally out of scope for Stage 1:

- experience widget renderer redesign
- native plugin stats collection
- release automation scripts

## Success Criteria

Stage 1 is successful when:

- timed effects actually change between vertical and horizontal layout
- carry weight can be shown as number only, meter only, or both
- resistance widgets can switch between effective-only, raw-only, and combined presentation
- game time and real time can each switch between date-time and time-only display
- old saved settings continue loading safely
- automated frontend tests cover the new settings and renderer branches
