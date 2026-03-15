import { describe, expect, it } from 'vitest';
import {
  WIDGET_ITEM_IDS,
  WIDGET_ITEM_REGISTRY,
  getWidgetItemRegistryEntry,
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
      expect(entry.minScale).toBeGreaterThan(0);
      expect(entry.maxScale).toBeGreaterThan(entry.minScale);
      expect(entry.defaultPlacementHint.groupId).toBe(entry.legacyGroupId);
      expect(entry.defaultPlacementHint.order).toBeGreaterThanOrEqual(0);
    }

    expect(WIDGET_ITEM_REGISTRY['timedEffects.list']?.rendererKind).toBe('timed-effects-list');
  });
});
