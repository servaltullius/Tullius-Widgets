import type { CSSProperties } from 'react';

/**
 * The width rules for a widget's shell, which is fixed at `left: x` and scaled by a transform.
 *
 * The browser lays the shell out before the transform, so on its own the shell wraps its content
 * to the room between x and the right edge of the screen, at its unscaled size: scaled up near
 * that edge it then runs off the screen, and scaled down it wraps sooner than it needs to. Wrapping
 * to that room divided by the scale makes the scaled shell fit the room it has.
 *
 * The shell keeps the size of its content when that fits (`max-content`) and never gets narrower
 * than its content can wrap to (`min-content`), as the browser's own sizing of a fixed box does.
 * The room counts the shell's padding and border too (`border-box`).
 */
export function wrapRoomStyle(x: number, scale: number): CSSProperties {
  if (!Number.isFinite(x) || !Number.isFinite(scale) || scale <= 0) return {};
  return {
    boxSizing: 'border-box',
    width: 'max-content',
    minWidth: 'min-content',
    maxWidth: `calc((100vw - ${x}px) / ${scale})`,
  };
}
