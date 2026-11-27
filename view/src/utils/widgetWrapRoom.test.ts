import { describe, expect, it } from 'vitest';
import { wrapRoomStyle } from './widgetWrapRoom';

describe('wrapRoomStyle', () => {
  it('wraps to the room left of the right edge, divided by the scale', () => {
    expect(wrapRoomStyle(1400, 1.5)).toEqual({
      boxSizing: 'border-box',
      width: 'max-content',
      minWidth: 'min-content',
      maxWidth: 'calc((100vw - 1400px) / 1.5)',
    });
    expect(wrapRoomStyle(0, 0.7).maxWidth).toBe('calc((100vw - 0px) / 0.7)');
  });

  it('keeps a position past either edge as it is', () => {
    expect(wrapRoomStyle(-30, 1).maxWidth).toBe('calc((100vw - -30px) / 1)');
    expect(wrapRoomStyle(2400, 1).maxWidth).toBe('calc((100vw - 2400px) / 1)');
  });

  it('adds nothing for a position or scale that is not usable', () => {
    expect(wrapRoomStyle(Number.NaN, 1)).toEqual({});
    expect(wrapRoomStyle(100, 0)).toEqual({});
    expect(wrapRoomStyle(100, -1)).toEqual({});
    expect(wrapRoomStyle(100, Number.POSITIVE_INFINITY)).toEqual({});
  });
});
