import { describe, expect, it } from 'vitest';
import { toWidgetBounds } from '../../utils/widgetBounds';
import { resolveAutoDockSide, resolveDockSide, resolveSettingsWindowRect } from './panelDock';

function box(left: number, top: number, width: number, height: number) {
  return toWidgetBounds({ left, top, width, height, right: left + width, bottom: top + height });
}

const fullHd = { width: 1920, height: 1080 };

describe('resolveSettingsWindowRect', () => {
  it('places a 940x720 window 32px from the chosen edge, vertically centred at 1080p', () => {
    expect(resolveSettingsWindowRect('left', 1, fullHd)).toEqual({ left: 32, top: 180, width: 940, height: 720 });
    expect(resolveSettingsWindowRect('right', 1, fullHd)).toEqual({ left: 948, top: 180, width: 940, height: 720 });
  });

  it('scales with the panel scale in whole pixels', () => {
    expect(resolveSettingsWindowRect('right', 1.6, { width: 3840, height: 2160 })).toEqual({ left: 2285, top: 504, width: 1504, height: 1152 });
  });

  it('keeps the edge margins on a narrow or short screen', () => {
    const rect = resolveSettingsWindowRect('right', 1, { width: 800, height: 600 });
    expect(rect).toEqual({ left: 32, top: 32, width: 736, height: 536 });
  });
});

describe('resolveAutoDockSide', () => {
  const base = { widgetBounds: [], panelScale: 1, viewport: fullHd };

  it.each([
    ['bottomLeft', 'right'],
    ['topLeft', 'right'],
    ['bottomRight', 'left'],
    ['topRight', 'left'],
  ] as const)('opens opposite a compact HUD anchored %s', (compactAnchor, expected) => {
    expect(resolveAutoDockSide({ ...base, hudStyle: 'compact', compactAnchor })).toBe(expected);
  });

  it('ignores widget boxes for the compact HUD', () => {
    expect(resolveAutoDockSide({ ...base, hudStyle: 'compact', compactAnchor: 'bottomLeft', widgetBounds: [box(1100, 200, 600, 600)] })).toBe('right');
  });

  it('opens a classic window on the left when the widgets sit where the right window would be', () => {
    expect(resolveAutoDockSide({ ...base, hudStyle: 'classic', compactAnchor: 'bottomLeft', widgetBounds: [box(1500, 300, 300, 300)] })).toBe('left');
  });

  it('compares the real window areas, not full-height strips', () => {
    // A widget at the top-right corner is above the right window; one in the left window area is covered.
    expect(resolveAutoDockSide({
      ...base,
      hudStyle: 'classic',
      compactAnchor: 'bottomLeft',
      widgetBounds: [box(1700, 10, 200, 100), box(600, 450, 150, 100)],
    })).toBe('right');
  });

  it('stays on the right when there are no widgets, a tie or no usable size', () => {
    expect(resolveAutoDockSide({ ...base, hudStyle: 'classic', compactAnchor: 'bottomLeft' })).toBe('right');
    expect(resolveAutoDockSide({
      ...base,
      hudStyle: 'classic',
      compactAnchor: 'bottomLeft',
      widgetBounds: [box(100, 400, 100, 100), box(1700, 400, 100, 100)],
    })).toBe('right');
    expect(resolveAutoDockSide({
      ...base,
      hudStyle: 'classic',
      compactAnchor: 'bottomLeft',
      widgetBounds: [box(1500, 300, 300, 300)],
      viewport: { width: 0, height: 0 },
    })).toBe('right');
  });
});

describe('resolveDockSide', () => {
  it('follows the automatic side only when the preference is auto', () => {
    expect(resolveDockSide('auto', 'left')).toBe('left');
    expect(resolveDockSide('auto', 'right')).toBe('right');
    expect(resolveDockSide('left', 'right')).toBe('left');
    expect(resolveDockSide('right', 'left')).toBe('right');
  });
});
