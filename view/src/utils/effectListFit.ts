// How many cards a classic effect list growing up can show before it reaches the compass row.
// Classic cards are as tall as their font makes them and as wide as their text, so the page
// measures them (useEffectListFit) and this works out the count. Every input is a fixed fact of
// the list (where it grows from, how tall a card is, how many effects there are), never how many
// cards it shows now, so showing fewer cards never changes the answer.

export interface EffectListFitGeometry {
  /** Screen y of the bottom edge of the cards, where the list grows from. */
  cardsBottom: number;
  /** Screen y the list may reach up to. */
  topLimit: number;
  /** Height of the list's frame above its cards (the card shell's padding). */
  frameTop: number;
  /** The tallest card seen. */
  cardHeight: number;
  /** Space between two lines of cards. */
  gap: number;
  /**
   * Cards on one line: 1 for a column. For rows that wrap, the count on the bottom line once it
   * is full; null while every card still fits on it, so how many would is not known yet.
   */
  perLine: number | null;
}

/**
 * The most cards to show out of `count` effects (Infinity: no limit). All of them when they fit;
 * otherwise one line fewer than fits, which leaves the top line for the "+N" count.
 */
export function fitEffectCards(geometry: EffectListFitGeometry, count: number): number {
  const pitch = geometry.cardHeight + geometry.gap;
  if (!(geometry.cardHeight > 0) || !(pitch > 0)) return Number.POSITIVE_INFINITY;
  const room = geometry.cardsBottom - geometry.topLimit - geometry.frameTop + geometry.gap;
  const lines = Math.floor(room / pitch);
  if (geometry.perLine === null) {
    // One line of cards fits: show them all, and measure the line if they wrap.
    return lines >= 1 ? Number.POSITIVE_INFINITY : 1;
  }
  const perLine = Math.max(1, geometry.perLine);
  if (count <= lines * perLine) return Number.POSITIVE_INFINITY;
  return Math.max(1, (lines - 1) * perLine);
}
