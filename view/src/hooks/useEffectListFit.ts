import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { trimEffectCards } from '../utils/effectListFit';
import { FONTS_READY_CLASS } from '../utils/fontsReady';
import { getEffectListTopLimit } from '../utils/hudPresentation';

const CARD_SELECTOR = '.tw-effect-row';
const SHELL_SELECTOR = '[data-widget-item-id]';

/**
 * The most cards a classic effect list growing up can show without reaching the compass row
 * (Infinity: no limit). After each render, before paint, the drawn list is measured and trimmed
 * if it reaches past the row (trimEffectCards).
 *
 * Within one arrangement the count only ever shrinks, so it cannot flip back and forth. The
 * arrangement is everything a card's place depends on and the cards shown do not: where the list
 * is and its scale and padding (the shell's own style), its font and whether the bundled fonts
 * have loaded, the screen size, its layout and which effects there are, in order. When any of it
 * changes, or the list was empty, the whole list is drawn and measured again. A card growing wider
 * within one arrangement (a row list's timer text) can only trim more; the cards come back with
 * the next change of effects.
 */
export function useEffectListFit(
  listRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  layout: 'vertical' | 'horizontal',
  /** The effects there are to show, before any limit, in order (their keys). */
  effectsKey: string,
): number {
  const [fit, setFit] = useState(Number.POSITIVE_INFINITY);
  const arrangementRef = useRef('');

  // Measured after every render, as the quick-edit card is placed (SettingsPanel): the list's place
  // and size are not props. The state changes only when the count does, so the extra renders
  // settle at once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!enabled) {
      arrangementRef.current = '';
      return;
    }
    const list = listRef.current;
    if (!list) {
      // No effects: the next ones are measured from scratch.
      arrangementRef.current = '';
      return;
    }
    const shell = list.closest<HTMLElement>(SHELL_SELECTOR) ?? list;
    const font = window.getComputedStyle(list);
    const arrangement = [
      layout,
      effectsKey,
      shell.style.left,
      shell.style.top,
      shell.style.transform,
      shell.style.padding,
      font.fontFamily,
      font.fontSize,
      document.documentElement.classList.contains(FONTS_READY_CLASS),
      window.innerWidth,
      window.innerHeight,
    ].join('|');
    if (arrangement !== arrangementRef.current) {
      arrangementRef.current = arrangement;
      if (fit !== Number.POSITIVE_INFINITY) {
        // Draw every card again, then measure.
        setFit(Number.POSITIVE_INFINITY);
        return;
      }
    }

    const cards = Array.from(list.querySelectorAll<HTMLElement>(CARD_SELECTOR));
    // A hidden view lays nothing out; measure once it is drawn.
    if (cards.length === 0 || !(list.offsetHeight > 0)) return;
    const shellBox = shell.getBoundingClientRect();
    const next = trimEffectCards({
      frameTop: shellBox.top,
      framePadding: Math.max(0, list.getBoundingClientRect().top - shellBox.top),
      cardTops: cards.map(card => card.getBoundingClientRect().top),
      topLimit: getEffectListTopLimit(shellBox.bottom, window.innerHeight),
    });
    if (next < fit) setFit(next);
  });

  return enabled ? fit : Number.POSITIVE_INFINITY;
}
