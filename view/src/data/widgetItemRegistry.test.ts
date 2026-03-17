import { describe, expect, it } from 'vitest';
import { defaultSettings } from './defaultSettings';
import {
  WIDGET_ITEM_IDS,
  WIDGET_ITEM_REGISTRY,
  buildItemLayoutsFromLegacySettings,
  getWidgetItemRegistryEntry,
  resolveWidgetItemLayouts,
} from './widgetItemRegistry';

describe('widgetItemRegistry', () => {
  it('covers every stable phase 2 widget item with required metadata', () => {
    expect(WIDGET_ITEM_IDS).toEqual([
      'experience.progress',
      'player.level',
      'player.gold',
      'player.carryWeight',
      'player.health',
      'player.magicka',
      'player.stamina',
      'resistance.magic',
      'resistance.fire',
      'resistance.frost',
      'resistance.shock',
      'resistance.poison',
      'resistance.disease',
      'defense.armorRating',
      'defense.damageReduction',
      'offense.rightHandDamage',
      'offense.leftHandDamage',
      'offense.critChance',
      'equipped.rightHand',
      'equipped.leftHand',
      'time.game',
      'time.real',
      'movement.speedMult',
      'timedEffects.list',
    ]);

    for (const itemId of WIDGET_ITEM_IDS) {
      const entry = getWidgetItemRegistryEntry(itemId);
      expect(entry.id).toBe(itemId);
      expect(typeof entry.rendererKind).toBe('string');
      expect(typeof entry.legacyGroupId).toBe('string');
      expect(typeof entry.visibilityPath).toBe('string');
      expect(typeof entry.labelKey).toBe('string');
      expect(entry.labelKey.length).toBeGreaterThan(0);
      expect(entry.minScale).toBeGreaterThan(0);
      expect(entry.maxScale).toBeGreaterThan(entry.minScale);
      expect(entry.defaultPlacementHint.groupId).toBe(entry.legacyGroupId);
      expect(entry.defaultPlacementHint.order).toBeGreaterThanOrEqual(0);
    }

    expect(WIDGET_ITEM_REGISTRY['timedEffects.list']?.rendererKind).toBe('timed-effects-list');
    expect(WIDGET_ITEM_REGISTRY['experience.progress']?.labelKey).toBe('integratedProgressionWidget');
    expect(WIDGET_ITEM_REGISTRY['equipped.rightHand']?.labelKey).toBe('rightHandEquipped');
    expect(WIDGET_ITEM_REGISTRY['movement.speedMult']?.labelKey).toBe('speed');
  });

  it('seeds locked false and registry zIndex when building canonical defaults', () => {
    const itemLayouts = buildItemLayoutsFromLegacySettings(defaultSettings, 1920, 1080);

    expect(itemLayouts['player.level']).toMatchObject({
      locked: false,
      zIndex: 1,
    });
    expect(itemLayouts['time.real']).toMatchObject({
      locked: false,
      zIndex: 21,
    });
    expect(itemLayouts['timedEffects.list']).toMatchObject({
      locked: false,
      zIndex: 23,
    });
  });

  it('rescales canonical item positions and scale against their saved viewport', () => {
    const settings = structuredClone(defaultSettings);
    settings.itemLayouts = {
      'player.level': {
        visible: true,
        x: 160,
        y: 90,
        scale: 1.1,
        locked: false,
        zIndex: 1,
        viewportWidth: 1920,
        viewportHeight: 1080,
      },
    };

    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 3840,
      viewportHeight: 2160,
    });

    expect(itemLayouts['player.level']).toMatchObject({
      x: 320,
      y: 180,
      scale: 2.2,
      viewportWidth: 3840,
      viewportHeight: 2160,
    });
  });
});
