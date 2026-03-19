import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../data/defaultSettings';
import { WIDGET_ITEM_IDS } from '../data/widgetItemRegistry';
import type { WidgetSettings } from '../types/settings';
import { resolveWidgetItemLayouts } from './useWidgetItemLayouts';

function cloneSettings(): WidgetSettings {
  return structuredClone(defaultSettings);
}

describe('useWidgetItemLayouts', () => {
  it('preserves valid schema v2 item layouts as the canonical layout state', () => {
    const settings = cloneSettings();
    settings.itemLayouts = {
      'player.level': { visible: true, x: 120, y: 240, scale: 1.5, locked: true, zIndex: 31 },
      'time.real': { visible: false, x: 700, y: 60, scale: 1.1, locked: false, zIndex: 4 },
    };

    const resolved = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    expect(resolved['player.level']).toEqual({
      visible: true,
      x: 120,
      y: 240,
      scale: 1.5,
      locked: true,
      zIndex: 31,
    });
    expect(resolved['time.real']).toEqual({
      visible: false,
      x: 700,
      y: 60,
      scale: 1.1,
      locked: false,
      zIndex: 4,
    });
  });

  it('reruns legacy migration when item layouts are missing but group layout data exists', () => {
    const settings = cloneSettings();
    settings.general.size = 'medium';
    settings.positions = {
      playerInfo: { x: 100, y: 200 },
      offense: { x: 500, y: 300 },
    };
    settings.layouts = {
      playerInfo: 'vertical',
      offense: 'horizontal',
    };
    settings.groupScales = {
      playerInfo: 1.25,
    };
    settings.playerInfo.gold = false;

    const resolvedFhd = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    const resolvedUhd = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 3840,
      viewportHeight: 2160,
    });

    expect(resolvedFhd['player.level'].visible).toBe(false);
    expect(resolvedFhd['player.gold'].visible).toBe(false);
    expect(resolvedFhd['player.gold'].y).toBeGreaterThan(resolvedFhd['player.level'].y);
    expect(resolvedFhd['offense.rightHandDamage'].visible).toBe(true);
    expect(resolvedFhd['offense.leftHandDamage'].x).toBeGreaterThan(resolvedFhd['offense.rightHandDamage'].x);
    expect(resolvedFhd['player.level'].scale).toBeLessThan(resolvedUhd['player.level'].scale);
    expect(resolvedFhd['player.level'].x / 1920).toBeCloseTo(resolvedUhd['player.level'].x / 3840, 2);
    expect(resolvedFhd['player.level'].y / 1080).toBeCloseTo(resolvedUhd['player.level'].y / 2160, 2);
    expect(resolvedFhd['offense.rightHandDamage'].x / 1920).toBeCloseTo(
      resolvedUhd['offense.rightHandDamage'].x / 3840,
      2,
    );
  });

  it('rebuilds deterministic defaults when both item and legacy layout data are unusable', () => {
    const settings = cloneSettings();

    const first = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    const second = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    const uhd = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 3840,
      viewportHeight: 2160,
    });

    expect(Object.keys(first)).toEqual(WIDGET_ITEM_IDS);
    expect(second).toEqual(first);
    expect(first['player.level'].visible).toBe(false);
    expect(first['player.level'].scale).toBeLessThan(uhd['player.level'].scale);
    expect(first['player.level'].x / 1920).toBeCloseTo(uhd['player.level'].x / 3840, 2);
    expect(first['player.level'].y / 1080).toBeCloseTo(uhd['player.level'].y / 2160, 2);
    expect(first['time.game'].x / 1920).toBeCloseTo(uhd['time.game'].x / 3840, 2);
    expect(first['time.real'].y).toBeGreaterThanOrEqual(first['time.game'].y);
  });
});
