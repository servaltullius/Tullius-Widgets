import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { fitEffectCards } from '../utils/effectListFit';
import { getEffectListTopLimit } from '../utils/hudPresentation';

const CARD_SELECTOR = '.tw-effect-row';
const SHELL_SELECTOR = '[data-widget-item-id]';
// Cards whose bottom edges are this close (screen px) share a line.
const SAME_LINE_PX = 1;

/**
 * The most cards a classic effect list growing up can show without reaching the compass row
 * (Infinity when there is no limit). Measured after each render, before paint.
 *
 * Only fixed facts of the list feed the count, so showing fewer cards never changes it: the
 * tallest card seen is kept, so a short card coming and going cannot flip the count; and while
 * the count itself keeps every shown card on one line, the cards a full line held when it was last
 * seen wrapping stand in for how many would fit.
 */
export function useEffectListFit(
  listRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  layout: 'vertical' | 'horizontal',
  /** Effects there are to show, before any limit. */
  count: number,
): number {
  const [fit, setFit] = useState(Number.POSITIVE_INFINITY);
  const tallestCardRef = useRef(0);
  const perLineRef = useRef<number | null>(null);

  // Measured after every render, as the quick-edit card is placed (SettingsPanel): the cards, the
  // list's place and its scale are not props. The state changes only when the count does, so the
  // extra render settles at once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!enabled) {
      // Measured afresh when it is turned on again (another direction, look or font).
      tallestCardRef.current = 0;
      perLineRef.current = null;
      return;
    }
    const list = listRef.current;
    if (!list) return;
    const cards = Array.from(list.querySelectorAll<HTMLElement>(CARD_SELECTOR));
    if (cards.length === 0) return;

    const listBox = list.getBoundingClientRect();
    const shell = list.closest<HTMLElement>(SHELL_SELECTOR) ?? list;
    const shellBox = shell.getBoundingClientRect();
    const cardBoxes = cards.map(card => card.getBoundingClientRect());
    const tallest = Math.max(...cardBoxes.map(box => box.height));
    // A hidden view lays nothing out; measure again once it is drawn.
    if (!(tallest > 0) || !(list.offsetHeight > 0)) return;
    tallestCardRef.current = Math.max(tallestCardRef.current, tallest);

    // The list may be scaled; its CSS gap is in unscaled pixels.
    const scale = listBox.height / list.offsetHeight;
    const gap = (Number.parseFloat(window.getComputedStyle(list).rowGap) || 0) * scale;
    const cardsBottom = Math.max(...cardBoxes.map(box => box.bottom));

    let perLine: number | null = 1;
    if (layout === 'horizontal') {
      const onBottomLine = cardBoxes.filter(box => Math.abs(box.bottom - cardsBottom) <= SAME_LINE_PX).length;
      if (onBottomLine < cards.length) {
        perLineRef.current = onBottomLine;
      } else if (cards.length < fit) {
        // Every card there is fits on one line.
        perLineRef.current = null;
      }
      perLine = perLineRef.current;
    }

    const next = fitEffectCards({
      cardsBottom,
      topLimit: getEffectListTopLimit(shellBox.bottom, window.innerHeight),
      frameTop: Math.max(0, listBox.top - shellBox.top),
      cardHeight: tallestCardRef.current,
      gap,
      perLine,
    }, count);
    if (next !== fit) setFit(next);
  });

  return enabled ? fit : Number.POSITIVE_INFINITY;
}
