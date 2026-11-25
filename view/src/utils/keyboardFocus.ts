// Clicking or wheeling a HUD widget does not move the keyboard focus (its mousedown is cancelled so
// the drag does not select text), so the panel control used last would keep the arrow keys: a
// segmented choice would flip, a slider would change the wrong widget. Acting on a widget lets go
// of that focus, as a click elsewhere would, so the arrows move the widget.
export function releaseKeyboardFocus(): void {
  const active = typeof document === 'undefined' ? null : document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) active.blur();
}
