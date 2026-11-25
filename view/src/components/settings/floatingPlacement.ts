import type { WidgetBounds } from '../../utils/widgetBounds';

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Size {
  width: number;
  height: number;
}

export type QuickEditCardSide = 'right' | 'left' | 'below' | 'above';

export interface QuickEditCardPlacement {
  left: number;
  top: number;
  side: QuickEditCardSide;
}

interface QuickEditCardPlacementInput {
  anchor: Rect;
  card: Size;
  viewport: Size;
  /** Space between the widget and the card. */
  gap: number;
  /** Space kept free along the screen edges. */
  margin: number;
}

function clamp(value: number, min: number, max: number): number {
  // When the card is larger than the screen, keep its top-left corner visible.
  return max < min ? min : Math.min(Math.max(value, min), max);
}

// Puts the quick-edit card beside the selected widget: to its right, else its left, else below,
// else above, using the first side with room for the whole card. The card is then pulled inside
// the screen so a widget near an edge or larger than the free space still gets a visible card.
export function placeQuickEditCard({ anchor, card, viewport, gap, margin }: QuickEditCardPlacementInput): QuickEditCardPlacement {
  const minLeft = margin;
  const maxLeft = viewport.width - margin - card.width;
  const minTop = margin;
  const maxTop = viewport.height - margin - card.height;

  const candidates: Array<{ side: QuickEditCardSide; left: number; top: number; fits: boolean }> = [
    { side: 'right', left: anchor.right + gap, top: anchor.top, fits: anchor.right + gap + card.width <= viewport.width - margin },
    { side: 'left', left: anchor.left - gap - card.width, top: anchor.top, fits: anchor.left - gap - card.width >= margin },
    { side: 'below', left: anchor.left, top: anchor.bottom + gap, fits: anchor.bottom + gap + card.height <= viewport.height - margin },
    { side: 'above', left: anchor.left, top: anchor.top - gap - card.height, fits: anchor.top - gap - card.height >= margin },
  ];
  const chosen = candidates.find(candidate => candidate.fits) ?? candidates[0];
  return {
    side: chosen.side,
    left: clamp(chosen.left, minLeft, maxLeft),
    top: clamp(chosen.top, minTop, maxTop),
  };
}

interface UnanchoredCardInput {
  card: Size;
  viewport: Size;
  margin: number;
  /** The side the settings window takes, if it is on screen; the card goes to the other side. */
  windowSide: 'left' | 'right' | null;
}

// Used when the selected widget cannot be measured (it is not on screen right now): a top corner
// that the settings window does not cover.
export function placeUnanchoredQuickEditCard({ card, viewport, margin, windowSide }: UnanchoredCardInput): { left: number; top: number } {
  const left = windowSide === 'right' ? margin : viewport.width - margin - card.width;
  return { left: Math.max(margin, left), top: margin };
}

interface ClearOfBarInput {
  placement: { left: number; top: number };
  card: Size;
  /** The layout bar on screen. */
  bar: Rect;
  edge: EditBarEdge;
  viewport: Size;
  gap: number;
  margin: number;
}

// Moves the card off the layout bar so the bar's buttons stay reachable: below a top bar or above
// a bottom bar, then back inside the screen.
export function keepCardClearOfBar({ placement, card, bar, edge, viewport, gap, margin }: ClearOfBarInput): { left: number; top: number } {
  const overlapsX = placement.left < bar.right && placement.left + card.width > bar.left;
  const overlapsY = placement.top < bar.bottom && placement.top + card.height > bar.top;
  if (!overlapsX || !overlapsY) return placement;
  const top = edge === 'top' ? bar.bottom + gap : bar.top - gap - card.height;
  return { left: placement.left, top: clamp(top, margin, viewport.height - margin - card.height) };
}

export type EditBarEdge = 'top' | 'bottom';

interface EditBarEdgeInput {
  widgetBounds: readonly WidgetBounds[];
  viewport: Size;
  /** The band the bar occupies: its width (centred) and its height plus the edge margin. */
  bar: Size;
}

function overlapArea(bounds: WidgetBounds, area: Rect): number {
  const width = Math.min(bounds.right, area.right) - Math.max(bounds.left, area.left);
  const height = Math.min(bounds.bottom, area.bottom) - Math.max(bounds.top, area.top);
  return width > 0 && height > 0 ? width * height : 0;
}

// The layout bar sits at the top centre unless HUD widgets cover more of that band than of the
// same band at the bottom. Ties, an empty HUD and unusable sizes keep it at the top.
export function resolveEditBarEdge({ widgetBounds, viewport, bar }: EditBarEdgeInput): EditBarEdge {
  if (!(viewport.width > 0) || !(viewport.height > 0) || !(bar.width > 0) || !(bar.height > 0)) return 'top';
  const left = (viewport.width - bar.width) / 2;
  const right = left + bar.width;
  const topBand: Rect = { left, right, top: 0, bottom: bar.height };
  const bottomBand: Rect = { left, right, top: viewport.height - bar.height, bottom: viewport.height };
  let coveredTop = 0;
  let coveredBottom = 0;
  for (const bounds of widgetBounds) {
    coveredTop += overlapArea(bounds, topBand);
    coveredBottom += overlapArea(bounds, bottomBand);
  }
  return coveredTop > coveredBottom ? 'bottom' : 'top';
}
