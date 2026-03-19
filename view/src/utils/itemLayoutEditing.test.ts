import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../data/defaultSettings';
import { resolveWidgetItemLayouts } from '../hooks/useWidgetItemLayouts';
import type { WidgetSettings } from '../types/settings';
import {
  bringVisibleItemForward,
  normalizeItemLayoutZIndices,
  nudgeItemLayout,
  resetItemToDefaultPlacement,
} from './itemLayoutEditing';

function cloneSettings(): WidgetSettings {
  return structuredClone(defaultSettings);
}

describe('itemLayoutEditing', () => {
  it('normalizes zIndex into contiguous order while preserving hidden item relative order', () => {
    const settings = cloneSettings();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    itemLayouts['player.level'] = { ...itemLayouts['player.level'], visible: true, zIndex: 20 };
    itemLayouts['player.gold'] = { ...itemLayouts['player.gold'], visible: false, zIndex: 7 };
    itemLayouts['player.carryWeight'] = { ...itemLayouts['player.carryWeight'], visible: false, zIndex: 11 };
    itemLayouts['time.game'] = { ...itemLayouts['time.game'], visible: true, zIndex: 30 };

    const normalized = normalizeItemLayoutZIndices(itemLayouts);

    expect(normalized['player.gold'].zIndex).toBeLessThan(normalized['player.carryWeight'].zIndex);
    expect(normalized['player.level'].zIndex).toBeLessThan(normalized['time.game'].zIndex);
    expect(new Set(Object.values(normalized).map(layout => layout.zIndex)).size).toBe(
      Object.keys(normalized).length,
    );
  });

  it('reorders only against the nearest visible item and skips hidden swap targets', () => {
    const settings = cloneSettings();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    for (const [index, itemId] of Object.keys(itemLayouts).entries()) {
      itemLayouts[itemId] = { ...itemLayouts[itemId], visible: false, zIndex: index + 100 };
    }
    itemLayouts['player.level'] = { ...itemLayouts['player.level'], visible: true, zIndex: 0 };
    itemLayouts['player.gold'] = { ...itemLayouts['player.gold'], visible: false, zIndex: 1 };
    itemLayouts['player.carryWeight'] = { ...itemLayouts['player.carryWeight'], visible: true, zIndex: 2 };

    const reordered = bringVisibleItemForward(itemLayouts, 'player.level');

    expect(reordered['player.carryWeight'].zIndex).toBe(0);
    expect(reordered['player.gold'].zIndex).toBe(1);
    expect(reordered['player.level'].zIndex).toBe(2);
  });

  it('resets only the selected item position for the current viewport', () => {
    const settings = cloneSettings();
    const baseLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1366,
      viewportHeight: 768,
    });
    const original = baseLayouts['time.real'];
    const modified = {
      ...baseLayouts,
      'time.real': {
        ...original,
        x: original.x + 240,
        y: original.y + 180,
        scale: 1.95,
        locked: true,
        zIndex: 99,
      },
    };

    const reset = resetItemToDefaultPlacement({
      itemId: 'time.real',
      itemLayouts: modified,
      settings,
      viewportWidth: 1366,
      viewportHeight: 768,
    });

    expect(reset['time.real']).toEqual({
      ...modified['time.real'],
      x: original.x,
      y: original.y,
      viewportWidth: 1366,
      viewportHeight: 768,
    });
  });

  it('nudges only x and y while preserving sibling item layout fields', () => {
    const settings = cloneSettings();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    const original = itemLayouts['player.level'];

    const nudged = nudgeItemLayout(itemLayouts, 'player.level', 3, -2, 1920, 1080);

    expect(nudged['player.level']).toEqual({
      ...original,
      x: original.x + 3,
      y: original.y - 2,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
  });

  it('resets an item to the current viewport default placement on both FHD and UHD', () => {
    const settings = cloneSettings();
    const itemId = 'player.gold';
    const fhdBaseLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    const uhdBaseLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 3840,
      viewportHeight: 2160,
    });

    const fhdModified = {
      ...fhdBaseLayouts,
      [itemId]: {
        ...fhdBaseLayouts[itemId],
        x: fhdBaseLayouts[itemId].x + 220,
        y: fhdBaseLayouts[itemId].y + 140,
        scale: 1.4,
        locked: true,
      },
    };
    const uhdModified = {
      ...uhdBaseLayouts,
      [itemId]: {
        ...uhdBaseLayouts[itemId],
        x: uhdBaseLayouts[itemId].x + 340,
        y: uhdBaseLayouts[itemId].y + 260,
        scale: 1.6,
        locked: true,
      },
    };

    const resetOnFhd = resetItemToDefaultPlacement({
      itemId,
      itemLayouts: fhdModified,
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    const resetOnUhd = resetItemToDefaultPlacement({
      itemId,
      itemLayouts: uhdModified,
      settings,
      viewportWidth: 3840,
      viewportHeight: 2160,
    });

    expect(resetOnFhd[itemId]).toEqual({
      ...fhdModified[itemId],
      x: fhdBaseLayouts[itemId].x,
      y: fhdBaseLayouts[itemId].y,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    expect(resetOnUhd[itemId]).toEqual({
      ...uhdModified[itemId],
      x: uhdBaseLayouts[itemId].x,
      y: uhdBaseLayouts[itemId].y,
      viewportWidth: 3840,
      viewportHeight: 2160,
    });
  });

  it('resets keep the same relative screen anchor across FHD and UHD', () => {
    const settings = cloneSettings();
    const itemId = 'player.gold';
    const fhdBaseLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    const uhdBaseLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 3840,
      viewportHeight: 2160,
    });

    const resetOnFhd = resetItemToDefaultPlacement({
      itemId,
      itemLayouts: {
        ...fhdBaseLayouts,
        [itemId]: {
          ...fhdBaseLayouts[itemId],
          x: fhdBaseLayouts[itemId].x + 200,
          y: fhdBaseLayouts[itemId].y + 100,
        },
      },
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    const resetOnUhd = resetItemToDefaultPlacement({
      itemId,
      itemLayouts: {
        ...uhdBaseLayouts,
        [itemId]: {
          ...uhdBaseLayouts[itemId],
          x: uhdBaseLayouts[itemId].x + 400,
          y: uhdBaseLayouts[itemId].y + 200,
        },
      },
      settings,
      viewportWidth: 3840,
      viewportHeight: 2160,
    });

    expect(resetOnFhd[itemId].x / 1920).toBeCloseTo(resetOnUhd[itemId].x / 3840, 2);
    expect(resetOnFhd[itemId].y / 1080).toBeCloseTo(resetOnUhd[itemId].y / 2160, 2);
  });
});
