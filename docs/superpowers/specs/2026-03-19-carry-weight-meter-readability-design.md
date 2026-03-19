# Carry Weight Meter Readability Design

## Goal

Make the `바만` carry-weight mode readable without reintroducing a numeric label, so players can judge how full the carry bar is at a glance.

## Current Problem

- `바만` mode hides both the value and helper percentage.
- The remaining meter uses the same low-contrast track and fill presentation as mixed modes.
- In practice this makes the widget look like a decorative line rather than a progress indicator.

## Design

### Visual treatment

- Keep `바만` mode number-free.
- Darken the empty track so the filled portion stands out more clearly.
- Add a small endpoint marker at the current fill position to show “this is how far the bar has progressed”.
- Preserve the existing carry-tone color ramp so high carry states still read as warning/danger.

### Component boundary

- Keep the carry-weight presentation decision in [`HudWidgetItems.tsx`](/home/kdw73/Tullius%20Widgets/.worktrees/carry-weight-meter-readability/view/src/components/HudWidgetItems.tsx).
- Extend [`StatWidget.tsx`](/home/kdw73/Tullius%20Widgets/.worktrees/carry-weight-meter-readability/view/src/components/StatWidget.tsx) with optional meter presentation props so the widget can render:
  - a custom track color
  - an optional endpoint marker
- Do not add a separate carry-weight-only component.

### Expected outcome

- `숫자+바`: unchanged
- `숫자만`: unchanged
- `바만`: clearer fill amount, still compact, still number-free
