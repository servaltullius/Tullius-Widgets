import { describe, expect, it } from 'vitest';
import { toWidgetBounds } from '../../utils/widgetBounds';
import { keepCardClearOfBar, placeQuickEditCard, placeUnanchoredQuickEditCard, resolveEditBarEdge } from './floatingPlacement';

const viewport = { width: 1920, height: 1080 };
const card = { width: 300, height: 400 };

function rect(left: number, top: number, width: number, height: number) {
  return { left, top, right: left + width, bottom: top + height };
}

function box(left: number, top: number, width: number, height: number) {
  return toWidgetBounds({ left, top, width, height, right: left + width, bottom: top + height });
}

describe('placeQuickEditCard', () => {
  const base = { card, viewport, gap: 12, margin: 16 };

  it('puts the card to the right of the widget, top-aligned', () => {
    expect(placeQuickEditCard({ ...base, anchor: rect(100, 200, 80, 60) })).toEqual({ side: 'right', left: 192, top: 200 });
  });

  it('uses the left side when the right edge is too close', () => {
    expect(placeQuickEditCard({ ...base, anchor: rect(1700, 200, 150, 60) })).toEqual({ side: 'left', left: 1388, top: 200 });
  });

  it('falls back to below, then above, for a widget as wide as the screen', () => {
    expect(placeQuickEditCard({ ...base, anchor: rect(0, 100, 1920, 60) }).side).toBe('below');
    expect(placeQuickEditCard({ ...base, anchor: rect(0, 900, 1920, 60) }).side).toBe('above');
  });

  it('keeps the card inside the screen near the bottom edge', () => {
    const placement = placeQuickEditCard({ ...base, anchor: rect(100, 1000, 80, 60) });
    expect(placement.side).toBe('right');
    expect(placement.top).toBe(1080 - 16 - 400);
  });

  it('keeps the top-left corner visible when nothing fits', () => {
    const placement = placeQuickEditCard({ ...base, anchor: rect(0, 0, 400, 300), viewport: { width: 320, height: 240 } });
    expect(placement).toEqual({ side: 'right', left: 16, top: 16 });
  });
});

describe('resolveEditBarEdge', () => {
  const bar = { width: 800, height: 80 };

  it('stays at the top when the top band is free', () => {
    expect(resolveEditBarEdge({ widgetBounds: [box(20, 900, 300, 150)], viewport, bar })).toBe('top');
  });

  it('moves to the bottom when widgets sit in the top centre band', () => {
    expect(resolveEditBarEdge({ widgetBounds: [box(700, 10, 500, 60)], viewport, bar })).toBe('bottom');
  });

  it('ignores widgets outside the centred band', () => {
    expect(resolveEditBarEdge({ widgetBounds: [box(0, 0, 400, 80)], viewport, bar })).toBe('top');
  });

  it('stays at the top on a tie, with no widgets or with no usable size', () => {
    expect(resolveEditBarEdge({ widgetBounds: [box(900, 0, 100, 50), box(900, 1030, 100, 50)], viewport, bar })).toBe('top');
    expect(resolveEditBarEdge({ widgetBounds: [], viewport, bar })).toBe('top');
    expect(resolveEditBarEdge({ widgetBounds: [box(700, 10, 500, 60)], viewport: { width: 0, height: 0 }, bar })).toBe('top');
  });
});

describe('placeUnanchoredQuickEditCard', () => {
  it('uses the top corner away from the settings window', () => {
    expect(placeUnanchoredQuickEditCard({ card, viewport, margin: 16, windowSide: 'right' })).toEqual({ left: 16, top: 16 });
    expect(placeUnanchoredQuickEditCard({ card, viewport, margin: 16, windowSide: 'left' })).toEqual({ left: 1604, top: 16 });
    expect(placeUnanchoredQuickEditCard({ card, viewport, margin: 16, windowSide: null })).toEqual({ left: 1604, top: 16 });
  });
});

describe('keepCardClearOfBar', () => {
  const bar = { left: 580, top: 16, right: 1340, bottom: 76 };
  const base = { card, viewport, gap: 12, margin: 16, bar };

  it('moves a card that covers a top bar to just below it', () => {
    expect(keepCardClearOfBar({ ...base, edge: 'top', placement: { left: 900, top: 20 } })).toEqual({ left: 900, top: 88 });
  });

  it('moves a card that covers a bottom bar to just above it', () => {
    const bottomBar = { left: 580, top: 1004, right: 1340, bottom: 1064 };
    expect(keepCardClearOfBar({ ...base, bar: bottomBar, edge: 'bottom', placement: { left: 900, top: 700 } })).toEqual({ left: 900, top: 592 });
  });

  it('leaves a card beside the bar where it is', () => {
    expect(keepCardClearOfBar({ ...base, edge: 'top', placement: { left: 100, top: 20 } })).toEqual({ left: 100, top: 20 });
    expect(keepCardClearOfBar({ ...base, edge: 'top', placement: { left: 900, top: 300 } })).toEqual({ left: 900, top: 300 });
  });
});
