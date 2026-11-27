import { describe, expect, it } from 'vitest';
import { fitEffectCards, type EffectListFitGeometry } from './effectListFit';

// Classic cards at 1080p as Chromium draws them: 42px tall with a second label, 5px apart, under
// an 8px frame; the default grow-up spot puts the cards' bottom edge at 392 (frame bottom 400).
const COLUMN: EffectListFitGeometry = {
  cardsBottom: 392,
  topLimit: 72,
  frameTop: 8,
  cardHeight: 42,
  gap: 5,
  perLine: 1,
};

function topOf(cards: number, extraLine = 0): number {
  return COLUMN.cardsBottom - cards * COLUMN.cardHeight - (cards - 1) * COLUMN.gap - extraLine - COLUMN.frameTop;
}

describe('fitEffectCards', () => {
  it('shows every card that fits below the top limit', () => {
    // (392 - 72 - 8 + 5) / 47 = 6.7: six cards fit, the default count.
    expect(fitEffectCards(COLUMN, 6)).toBe(Number.POSITIVE_INFINITY);
    expect(topOf(6)).toBeGreaterThanOrEqual(COLUMN.topLimit);
  });

  it('leaves the top line for the "+N" count when more effects than fit', () => {
    expect(fitEffectCards(COLUMN, 12)).toBe(5);
    // The "+N" line (about 17px) above five cards still stays below the limit.
    expect(topOf(5, COLUMN.gap + 17)).toBeGreaterThanOrEqual(COLUMN.topLimit);
  });

  it('gives more cards to a list placed lower and to smaller cards', () => {
    expect(fitEffectCards({ ...COLUMN, cardsBottom: 992 }, 12)).toBe(Number.POSITIVE_INFINITY);
    expect(fitEffectCards({ ...COLUMN, cardsBottom: 992 }, 30)).toBe(18);
    expect(fitEffectCards({ ...COLUMN, cardHeight: 30 }, 12)).toBe(8);
  });

  it('counts whole lines of cards when they wrap', () => {
    expect(fitEffectCards({ ...COLUMN, perLine: 3 }, 18)).toBe(Number.POSITIVE_INFINITY);
    expect(fitEffectCards({ ...COLUMN, perLine: 3 }, 19)).toBe(15);
  });

  it('shows every card while they all fit on one line, and one when not even that fits', () => {
    expect(fitEffectCards({ ...COLUMN, perLine: null }, 12)).toBe(Number.POSITIVE_INFINITY);
    expect(fitEffectCards({ ...COLUMN, perLine: null, cardsBottom: 100 }, 12)).toBe(1);
  });

  it('always keeps one card, and does not limit a list it could not measure', () => {
    expect(fitEffectCards({ ...COLUMN, cardsBottom: 100 }, 12)).toBe(1);
    expect(fitEffectCards({ ...COLUMN, cardsBottom: 140 }, 12)).toBe(1);
    expect(fitEffectCards({ ...COLUMN, cardHeight: 0 }, 12)).toBe(Number.POSITIVE_INFINITY);
    expect(fitEffectCards({ ...COLUMN, cardHeight: Number.NaN }, 12)).toBe(Number.POSITIVE_INFINITY);
  });
});
