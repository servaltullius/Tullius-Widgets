import { describe, expect, it } from 'vitest';
import { defaultSettings, getDefaultPositions } from '../data/defaultSettings';
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
      'player.level': { visible: true, x: 120, y: 240, scale: 1.5 },
      'time.real': { visible: false, x: 700, y: 60, scale: 1.1 },
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
    });
    expect(resolved['time.real']).toEqual({
      visible: false,
      x: 700,
      y: 60,
      scale: 1.1,
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

    const resolved = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    expect(resolved['player.level']).toMatchObject({
      visible: true,
      x: 100,
      y: 200,
      scale: 1.625,
    });
    expect(resolved['player.gold']).toMatchObject({
      visible: false,
      x: 100,
      scale: 1.625,
    });
    expect(resolved['player.gold'].y).toBeGreaterThan(resolved['player.level'].y);
    expect(resolved['offense.rightHandDamage']).toMatchObject({
      visible: true,
      x: 500,
      y: 300,
      scale: 1.3,
    });
    expect(resolved['offense.leftHandDamage'].x).toBeGreaterThan(resolved['offense.rightHandDamage'].x);
  });

  it('rebuilds deterministic defaults when both item and legacy layout data are unusable', () => {
    const settings = cloneSettings();
    const defaultGroupPositions = getDefaultPositions(1920, 1080, settings.general.size, settings.layouts);

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

    expect(Object.keys(first)).toEqual(WIDGET_ITEM_IDS);
    expect(second).toEqual(first);
    expect(first['player.level']).toMatchObject({
      visible: true,
      x: defaultGroupPositions.playerInfo.x,
      y: defaultGroupPositions.playerInfo.y,
      scale: 1.3,
    });
    expect(first['time.game'].x).toBe(defaultGroupPositions.time.x);
    expect(first['time.real'].y).toBeGreaterThanOrEqual(first['time.game'].y);
  });
});
