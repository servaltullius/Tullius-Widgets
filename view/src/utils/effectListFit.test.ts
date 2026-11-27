import { describe, expect, it } from 'vitest';
import { trimEffectCards, type DrawnEffectList } from './effectListFit';

// A classic column growing up at 1080p as Chromium draws it: cards 42px tall and 5px apart, the
// lowest one's bottom at 393 under a 7px frame (frame bottom 400).
function column(cards: number, extraTop = 0): DrawnEffectList {
  const cardTops = Array.from({ length: cards }, (_, index) => 393 - 42 - index * 47);
  return {
    frameTop: Math.min(...cardTops) - extraTop - 7,
    framePadding: 7,
    cardTops,
    topLimit: 72,
  };
}

describe('trimEffectCards', () => {
  it('leaves a list alone while it stays below the limit', () => {
    expect(trimEffectCards(column(6))).toBe(Number.POSITIVE_INFINITY);
    // The "+N" line (gap and about 15px) above six cards still fits.
    expect(trimEffectCards(column(6, 20))).toBe(Number.POSITIVE_INFINITY);
  });

  it('keeps the cards that stay below the limit when the list reaches past it', () => {
    // Card tops 351, 304, ... 116, 69: six stay below 72 with the frame.
    expect(trimEffectCards(column(12))).toBe(6);
  });

  it('gives up one more card when only the "+N" line reaches past the limit', () => {
    const list = column(6, 60);
    expect(list.frameTop).toBeLessThan(72);
    expect(trimEffectCards(list)).toBe(5);
  });

  it('judges each card by the highest card up to it, so a row of cards counts as one line', () => {
    // Two cards a line, the second line reaching past the limit.
    const list: DrawnEffectList = { frameTop: 50, framePadding: 7, cardTops: [200, 200, 57, 57], topLimit: 72 };
    expect(trimEffectCards(list)).toBe(2);
  });

  it('always keeps one card', () => {
    const list: DrawnEffectList = { frameTop: 20, framePadding: 7, cardTops: [40, 0], topLimit: 72 };
    expect(trimEffectCards(list)).toBe(1);
    expect(trimEffectCards({ ...list, cardTops: [40] })).toBe(1);
  });

  it('does not count sub-pixel rounding as reaching past the limit', () => {
    expect(trimEffectCards({ frameTop: 71.7, framePadding: 7, cardTops: [78.7], topLimit: 72 })).toBe(Number.POSITIVE_INFINITY);
  });
});
