// How many cards a classic effect list growing up can keep when it reaches past the compass row.
// Classic cards are as tall as their font and as wide as their text, so the page draws the list,
// measures it (useEffectListFit) and trims it with this. Growing up, a card's place depends only
// on the cards before it, so the measured places of the first cards stay true for a shorter list.

export interface DrawnEffectList {
  /** Screen y of the top of the whole list frame, "+N" line included. */
  frameTop: number;
  /** Height of the frame above the list itself (its padding). */
  framePadding: number;
  /** Screen y of the top of each card shown, most pressing first. */
  cardTops: readonly number[];
  /** Screen y the list may reach up to. */
  topLimit: number;
}

// Sub-pixel rounding in layout is not reaching past the limit.
const TOLERANCE_PX = 0.5;

/**
 * Infinity when the drawn list stays below the limit. Otherwise how many cards to keep: those
 * that stay below it, and at least one fewer than now, since the cards left out bring a "+N" line
 * of their own. The page draws again and trims again until the list fits, keeping one card at
 * least, so each step only ever shrinks the list.
 */
export function trimEffectCards(list: DrawnEffectList): number {
  if (list.frameTop >= list.topLimit - TOLERANCE_PX) return Number.POSITIVE_INFINITY;
  let fitting = 0;
  let highest = Number.POSITIVE_INFINITY;
  for (const cardTop of list.cardTops) {
    highest = Math.min(highest, cardTop);
    if (highest - list.framePadding < list.topLimit - TOLERANCE_PX) break;
    fitting += 1;
  }
  return Math.max(1, Math.min(fitting, list.cardTops.length - 1));
}
