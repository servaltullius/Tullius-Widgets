import { describe, expect, it } from 'vitest';
import { defaultSettings } from './defaultSettings';
import {
  WIDGET_ITEM_IDS,
  WIDGET_ITEM_REGISTRY,
  buildItemLayoutsFromLegacySettings,
  buildNordicDefaultItemLayouts,
  getWidgetItemRegistryEntry,
  getItemShowWhenOptions,
  resolveItemShowWhen,
  resolveWidgetItemLayouts,
  sanitizeWidgetItemLayouts,
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
      'equipped.voice',
      'time.game',
      'time.real',
      'movement.speedMult',
      'timedEffects.list',
      'time.weather',
      'equipped.potion',
      'time.playtime',
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
    expect(WIDGET_ITEM_REGISTRY['equipped.voice']?.labelKey).toBe('voiceEquipped');
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
      zIndex: 22,
    });
    expect(itemLayouts['timedEffects.list']).toMatchObject({
      locked: false,
      zIndex: 24,
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

  it('keeps fallback default item layouts proportionally aligned across FHD and UHD', () => {
    const settings = structuredClone(defaultSettings);

    const fhdItemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    const uhdItemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 3840,
      viewportHeight: 2160,
    });

    expect(fhdItemLayouts['player.gold'].scale).toBeLessThan(uhdItemLayouts['player.gold'].scale);
    expect(fhdItemLayouts['player.gold'].x / 1920).toBeCloseTo(uhdItemLayouts['player.gold'].x / 3840, 2);
    expect(fhdItemLayouts['player.gold'].y / 1080).toBeCloseTo(uhdItemLayouts['player.gold'].y / 2160, 2);
  });

  it('scales compact default spacing with the legacy widget size so items never overlap', () => {
    const settings = structuredClone(defaultSettings);
    settings.general.size = 'large';
    const large = resolveWidgetItemLayouts({ settings, viewportWidth: 1920, viewportHeight: 1080 });
    const medium = resolveWidgetItemLayouts({ settings: structuredClone(defaultSettings), viewportWidth: 1920, viewportHeight: 1080 });
    const gapLarge = large['resistance.fire'].x - large['resistance.magic'].x;
    const gapMedium = medium['resistance.fire'].x - medium['resistance.magic'].x;
    expect(gapLarge / gapMedium).toBeCloseTo(large['resistance.fire'].scale / medium['resistance.fire'].scale, 2);
    expect(large['resistance.magic'].x).toBe(34);
    expect(1080 - large['experience.progress'].y).toBeCloseTo((1080 - medium['experience.progress'].y) * 1.18, 1);
  });

  it('moves the whole compact cluster to the chosen corner without changing its shape', () => {
    const base = resolveWidgetItemLayouts({ settings: structuredClone(defaultSettings), viewportWidth: 1920, viewportHeight: 1080 });
    const topRightSettings = structuredClone(defaultSettings);
    topRightSettings.general.compactAnchor = 'topRight';
    const topRight = resolveWidgetItemLayouts({ settings: topRightSettings, viewportWidth: 1920, viewportHeight: 1080 });

    const dx = topRight['experience.progress'].x - base['experience.progress'].x;
    const dy = topRight['experience.progress'].y - base['experience.progress'].y;
    expect(dx).toBeGreaterThan(900);
    expect(dy).toBeLessThan(-600);
    for (const itemId of ['resistance.fire', 'equipped.voice', 'timedEffects.list', 'player.gold']) {
      expect(topRight[itemId].x - base[itemId].x).toBeCloseTo(dx, 3);
      expect(topRight[itemId].y - base[itemId].y).toBeCloseTo(dy, 3);
    }
    expect(topRight['timedEffects.list'].x + 250).toBeLessThanOrEqual(1920);
    expect(topRight['resistance.magic'].y).toBeGreaterThanOrEqual(60);
  });

  it('never tears a classic layout apart on 16:10 screens or when visibility changes', () => {
    const classic = structuredClone(defaultSettings);
    classic.general.hudStyle = 'classic';
    const wide = resolveWidgetItemLayouts({ settings: classic, viewportWidth: 1920, viewportHeight: 1200 });
    const rowGap = wide['equipped.voice'].y - wide['equipped.rightHand'].y;
    expect(rowGap).toBeCloseTo(60 * (1200 / 1080), 2);

    const withoutPotion = structuredClone(classic);
    withoutPotion.equipped.potion = false;
    const toggled = resolveWidgetItemLayouts({ settings: withoutPotion, viewportWidth: 1024, viewportHeight: 768 });
    const original = resolveWidgetItemLayouts({ settings: classic, viewportWidth: 1024, viewportHeight: 768 });
    expect(toggled['experience.progress']).toMatchObject({ x: original['experience.progress'].x, y: original['experience.progress'].y });
  });

  it('does not move other widgets when one is dragged across the screen centre', () => {
    const before = resolveWidgetItemLayouts({ settings: structuredClone(defaultSettings), viewportWidth: 2560, viewportHeight: 1080 });
    const moved = structuredClone(defaultSettings);
    moved.itemLayouts = {
      'player.gold': { visible: true, x: 1900, y: 300, scale: 1, locked: false, zIndex: 3, viewportWidth: 2560, viewportHeight: 1080 },
    };
    const after = resolveWidgetItemLayouts({ settings: moved, viewportWidth: 2560, viewportHeight: 1080 });
    expect(after['player.gold']).toMatchObject({ x: 1900, y: 300 });
    expect(after['player.carryWeight']).toMatchObject({ x: before['player.carryWeight'].x, y: before['player.carryWeight'].y });
    expect(after['timedEffects.list'].x).toBe(before['timedEffects.list'].x);
  });

  it('keeps every compact item on screen for all corner presets and sizes', () => {
    for (const compactAnchor of ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'] as const) {
      for (const size of ['xsmall', 'small', 'medium', 'large'] as const) {
        const settings = structuredClone(defaultSettings);
        settings.general.compactAnchor = compactAnchor;
        settings.general.size = size;
        const layouts = resolveWidgetItemLayouts({ settings, viewportWidth: 1920, viewportHeight: 1080 });
        for (const [itemId, layout] of Object.entries(layouts)) {
          const width = itemId === 'timedEffects.list' ? 250 * layout.scale : 0;
          expect(layout.x, `${compactAnchor}/${size}/${itemId}`).toBeGreaterThanOrEqual(0);
          expect(layout.y, `${compactAnchor}/${size}/${itemId}`).toBeGreaterThanOrEqual(0);
          expect(layout.x + width, `${compactAnchor}/${size}/${itemId}`).toBeLessThanOrEqual(1920);
        }
      }
    }
  });

  it('keeps clusters anchored to their screen edge on ultrawide viewports', () => {
    const compact = resolveWidgetItemLayouts({ settings: structuredClone(defaultSettings), viewportWidth: 2560, viewportHeight: 1080 });
    expect(compact['experience.progress']).toMatchObject({ x: 34, y: 898, scale: 1 });
    expect(compact['resistance.fire'].x - compact['resistance.magic'].x).toBe(64);

    const classicSettings = structuredClone(defaultSettings);
    classicSettings.general.hudStyle = 'classic';
    const classic = resolveWidgetItemLayouts({ settings: classicSettings, viewportWidth: 2560, viewportHeight: 1080 });
    expect(classic['experience.progress']).toMatchObject({ x: 2170, y: 60 });

    const uhd = resolveWidgetItemLayouts({ settings: classicSettings, viewportWidth: 3840, viewportHeight: 2160 });
    expect(uhd['experience.progress']).toMatchObject({ x: 3060, y: 120, scale: 2 });
  });

  it('keeps valid per-item showWhen values and drops unknown ones', () => {
    const sanitized = sanitizeWidgetItemLayouts({
      'player.gold': { visible: true, x: 1, y: 2, scale: 1, showWhen: 'combat' },
      'player.carryWeight': { visible: true, x: 1, y: 2, scale: 1, showWhen: 'sometimes' },
    });
    expect(sanitized['player.gold'].showWhen).toBe('combat');
    expect(sanitized['player.carryWeight'].showWhen).toBeUndefined();
    expect(resolveItemShowWhen('resistance.fire', undefined, 'compact')).toBe('combatOrChange');
    expect(resolveItemShowWhen('resistance.fire', undefined, 'classic')).toBe('always');
    expect(resolveItemShowWhen('player.gold', sanitized['player.gold'], 'compact')).toBe('combat');
    const clock = { visible: true, x: 0, y: 0, scale: 1, locked: false, zIndex: 0 };
    expect(resolveItemShowWhen('time.real', { ...clock, showWhen: 'change' }, 'compact')).toBe('always');
    expect(resolveItemShowWhen('time.game', { ...clock, showWhen: 'combatOrChange' }, 'compact')).toBe('combat');
    expect(getItemShowWhenOptions('time.real')).toEqual(['always', 'combat']);
    expect(getItemShowWhenOptions('player.gold')).toHaveLength(4);
  });

  it('places fresh compact defaults as a bottom-left cluster above the resource bars', () => {
    const fhd = resolveWidgetItemLayouts({
      settings: structuredClone(defaultSettings),
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    const uhd = resolveWidgetItemLayouts({
      settings: structuredClone(defaultSettings),
      viewportWidth: 3840,
      viewportHeight: 2160,
    });

    expect(fhd['experience.progress']).toMatchObject({ x: 34, y: 898, scale: 1, visible: true });
    expect(fhd['resistance.disease'].visible).toBe(true);
    expect(fhd['equipped.voice'].visible).toBe(true);
    expect(uhd['experience.progress']).toMatchObject({ x: 68, y: 1796, scale: 2 });
    for (const layout of Object.values(fhd)) {
      expect(layout.x).toBeLessThan(960);
      expect(layout.y).toBeLessThan(975);
    }
  });

  it('uses adjacent but independent Nordic-neutral placements for fresh classic defaults', () => {
    const classicSettings = structuredClone(defaultSettings);
    classicSettings.general.hudStyle = 'classic';
    const baseline = buildNordicDefaultItemLayouts(defaultSettings);
    const fhd = resolveWidgetItemLayouts({
      settings: classicSettings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    expect(defaultSettings.general.transparentBg).toBe(false);
    expect(baseline['experience.progress']).toMatchObject({
      x: 1530,
      y: 60,
      scale: 1,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    expect(fhd['experience.progress']).toMatchObject({ x: 1530, y: 60, scale: 1 });
    expect(fhd['player.gold']).toMatchObject({ x: 1480, y: 145, scale: 1 });
    expect(fhd['player.carryWeight']).toMatchObject({ x: 1620, y: 145, scale: 1 });

    const visiblePositions = Object.values(fhd)
      .filter(layout => layout.visible)
      .map(layout => `${layout.x}:${layout.y}`);
    expect(new Set(visiblePositions).size).toBe(visiblePositions.length);
  });
});
