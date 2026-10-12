import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../data/defaultSettings';
import { mockStats } from '../data/mockStats';
import { resolveWidgetItemLayouts } from '../hooks/useWidgetItemLayouts';
import {
  buildItemChangeSignatures,
  buildTrackedChangeSignature,
  getVisibleHudItemIds,
  hasChangeDrivenItems,
  getRuntimeWarningText,
  getSettingsSyncWarningText,
  resolveExperienceProgress,
  resolveHudVisibility,
  buildClassicEquipDetail,
  formatThousands,
  getCompactEffectRowLimit,
} from './hudPresentation';
import type { CombatStats, PlayerInfo } from '../types/stats';
import type { WidgetSettings } from '../types/settings';

function cloneSettings(): WidgetSettings {
  return structuredClone(defaultSettings);
}

function cloneStats(): CombatStats {
  return structuredClone(mockStats);
}

describe('hudPresentation', () => {
  it('summarises charge, poison and ammo for the classic equipment cards', () => {
    const stats = structuredClone(mockStats);
    stats.equipped.rightHandKind = 'bow';
    stats.equipped.rightHandChargePct = 64.4;
    stats.equipped.rightHandPoisonCount = 3;
    stats.equipped.ammoCount = 1200;
    expect(buildClassicEquipDetail(stats, 'right', 'ko')).toBe('충전 64% · 독 3회 · 탄약 1,200');
    stats.equipped.leftHandKind = 'sword';
    stats.equipped.leftHandChargePct = null;
    stats.equipped.leftHandPoisonCount = 0;
    expect(buildClassicEquipDetail(stats, 'left', 'ko')).toBeUndefined();
  });

  it('stops the compact effect list above the resource bars', () => {
    // Default bottom-left list at y=790 on 1080p: rows down to ~983, minus one for "+N".
    expect(getCompactEffectRowLimit({ y: 790, scale: 1, viewportHeight: 1080 }, 'vertical', 1080)).toBe(7);
    expect(getCompactEffectRowLimit({ y: 790, scale: 1, viewportHeight: 1080 }, 'horizontal', 1080)).toBe(14);
    // Top-corner lists have plenty of room.
    expect(getCompactEffectRowLimit({ y: 80, scale: 1, viewportHeight: 1080 }, 'vertical', 1080)).toBeGreaterThan(12);
    // Placed inside the bar zone: use the screen edge, but always keep one row.
    expect(getCompactEffectRowLimit({ y: 1060, scale: 1, viewportHeight: 1080 }, 'vertical', 1080)).toBe(1);
    expect(getCompactEffectRowLimit(undefined, 'vertical', 1080)).toBe(Number.POSITIVE_INFINITY);
  });

  it('groups thousands like the en-US locale without calling it', () => {
    for (const value of [0, 7, 999, 1000, 8876, 12500, 1234567, -3624, 42.6]) {
      expect(formatThousands(value), String(value)).toBe(Math.round(value).toLocaleString('en-US'));
    }
  });

  it('tracks only enabled widget values in the change signature', () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    itemLayouts['resistance.disease'] = { ...itemLayouts['resistance.disease'], visible: false };
    itemLayouts['player.health'] = { ...itemLayouts['player.health'], visible: false };

    const signature = buildTrackedChangeSignature(stats, itemLayouts);

    expect(signature).toContain(`res.magic:${stats.resistances.magic}`);
    expect(signature).not.toContain(`res.disease:${stats.resistances.disease}`);
    expect(signature).not.toContain(`pi.health:${stats.playerInfo.health}`);
    expect(signature).toContain('effects:id:101:120:0');
  });

  it('ignores clock ticks and effect countdowns but tracks equipment and effect changes', () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    for (const itemId of ['time.game', 'time.real', 'timedEffects.list', 'equipped.voice']) {
      itemLayouts[itemId] = { ...itemLayouts[itemId], visible: true };
    }

    const before = buildTrackedChangeSignature(stats, itemLayouts);
    stats.time.minute = (stats.time.minute + 1) % 60;
    stats.time.hour = (stats.time.hour + 1) % 24;
    stats.timedEffects = stats.timedEffects.map(effect => ({ ...effect, remainingSec: Math.max(0, effect.remainingSec - 5) }));
    expect(buildTrackedChangeSignature(stats, itemLayouts)).toBe(before);

    stats.equipped.voice = 'Whirlwind Sprint';
    const afterVoice = buildTrackedChangeSignature(stats, itemLayouts);
    expect(afterVoice).not.toBe(before);

    stats.timedEffects = stats.timedEffects.slice(1);
    expect(buildTrackedChangeSignature(stats, itemLayouts)).not.toBe(afterVoice);
  });

  it('shows every compact widget by default and hides combat-or-change ones while exploring', () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    stats.isInCombat = false;
    const itemLayouts = resolveWidgetItemLayouts({ settings, viewportWidth: 1920, viewportHeight: 1080 });
    const presence = { hudStyle: 'compact' as const, nowMs: 10_000, lastChangeAtByItem: {}, changeWindowMs: 4000 };
    expect(getVisibleHudItemIds(itemLayouts, stats, false, presence)).toContain('resistance.fire');
    for (const itemId of Object.keys(itemLayouts).filter(id => id.startsWith('resistance.'))) {
      itemLayouts[itemId] = { ...itemLayouts[itemId], showWhen: 'combatOrChange' };
    }

    const exploring = getVisibleHudItemIds(itemLayouts, stats, false, presence);
    expect(exploring).toContain('player.gold');
    expect(exploring).toContain('equipped.rightHand');
    expect(exploring).not.toContain('resistance.fire');

    const changed = getVisibleHudItemIds(itemLayouts, stats, false, {
      ...presence,
      lastChangeAtByItem: { 'resistance.fire': 8000 },
    });
    expect(changed).toContain('resistance.fire');
    expect(changed).not.toContain('resistance.frost');

    stats.isInCombat = true;
    expect(getVisibleHudItemIds(itemLayouts, stats, false, presence)).toContain('resistance.frost');
    expect(getVisibleHudItemIds(itemLayouts, { ...stats, isInCombat: false }, true, presence)).toContain('resistance.frost');
  });

  it('keeps the classic style always visible and honors explicit per-item overrides', () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    stats.isInCombat = false;
    const itemLayouts = resolveWidgetItemLayouts({ settings, viewportWidth: 1920, viewportHeight: 1080 });
    const presence = { hudStyle: 'classic' as const, nowMs: 10_000, lastChangeAtByItem: {}, changeWindowMs: 4000 };
    expect(getVisibleHudItemIds(itemLayouts, stats, false, presence)).toContain('resistance.fire');
    expect(hasChangeDrivenItems(itemLayouts, 'classic')).toBe(false);

    expect(hasChangeDrivenItems(itemLayouts, 'compact')).toBe(false);

    itemLayouts['player.gold'] = { ...itemLayouts['player.gold'], showWhen: 'combat' };
    expect(getVisibleHudItemIds(itemLayouts, stats, false, presence)).not.toContain('player.gold');
    itemLayouts['player.carryWeight'] = { ...itemLayouts['player.carryWeight'], showWhen: 'change' };
    expect(hasChangeDrivenItems(itemLayouts, 'compact')).toBe(true);
  });

  it('builds one change signature per visible item', () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    const itemLayouts = resolveWidgetItemLayouts({ settings, viewportWidth: 1920, viewportHeight: 1080 });
    const before = buildItemChangeSignatures(stats, itemLayouts);
    stats.resistances.fire += 10;
    const after = buildItemChangeSignatures(stats, itemLayouts);
    const changed = Object.keys(after).filter(itemId => after[itemId] !== before[itemId]);
    expect(changed).toEqual(['resistance.fire']);
  });

  it('tracks raw resistance changes when the visible widget presentation includes raw values', () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    for (const itemId of Object.keys(itemLayouts)) {
      itemLayouts[itemId] = { ...itemLayouts[itemId], visible: false };
    }
    itemLayouts['resistance.fire'] = { ...itemLayouts['resistance.fire'], visible: true };

    const before = buildTrackedChangeSignature(stats, itemLayouts);
    stats.calcMeta.rawResistances.fire = 130;
    const after = buildTrackedChangeSignature(stats, itemLayouts);

    expect(before).not.toBe(after);
  });

  it('tracks level changes whenever the progression widget is visible', () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    for (const itemId of Object.keys(itemLayouts)) {
      itemLayouts[itemId] = { ...itemLayouts[itemId], visible: false };
    }

    itemLayouts['experience.progress'] = { ...itemLayouts['experience.progress'], visible: true };
    itemLayouts['player.level'] = { ...itemLayouts['player.level'], visible: false };

    const before = buildTrackedChangeSignature(stats, itemLayouts);
    stats.playerInfo.level = 43;
    const after = buildTrackedChangeSignature(stats, itemLayouts);

    expect(before).toContain('pi.level:42');
    expect(before).toContain(`xp.current:${mockStats.playerInfo.experience}`);
    expect(before).toContain(`xp.total:${mockStats.playerInfo.nextLevelTotalXp}`);
    expect(after).toContain('pi.level:43');
    expect(before).not.toBe(after);
  });

  it('treats time.game and time.real as independently visible widget items', () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    itemLayouts['time.real'] = { ...itemLayouts['time.real'], visible: false };

    const visibleItemIds = getVisibleHudItemIds(itemLayouts, stats, false);

    expect(visibleItemIds).toContain('time.game');
    expect(visibleItemIds).not.toContain('time.real');
  });

  it('keeps timed effects as one special list widget item', () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    const visibleItemIds = getVisibleHudItemIds(itemLayouts, stats, false);

    expect(visibleItemIds.filter(itemId => itemId.startsWith('timedEffects.'))).toEqual(['timedEffects.list']);
  });

  it('resets stale experience progress to the new level threshold safely', () => {
    const playerInfo: PlayerInfo = {
      ...cloneStats().playerInfo,
      experience: 1200,
      expToNextLevel: 0,
      nextLevelTotalXp: 1000,
      expectedLevelThreshold: 1300,
    };

    expect(resolveExperienceProgress(playerInfo)).toEqual({
      currentXp: 0,
      totalXpForNextLevel: 1300,
    });
  });

  it('resolves overall HUD visibility from combat and change-window rules', () => {
    const settings = cloneSettings();
    const stats = cloneStats();

    settings.general.showOnChangeOnly = true;
    settings.general.changeDisplaySeconds = 1;
    settings.general.combatOnly = true;
    stats.isInCombat = true;

    expect(resolveHudVisibility({
      visible: true,
      hasLiveStats: true,
      settings,
      stats,
      settingsOpen: false,
      nowMs: 6000,
      lastChangeAtMs: 4000,
    }).shouldShow).toBe(false);

    expect(resolveHudVisibility({
      visible: true,
      hasLiveStats: true,
      settings,
      stats,
      settingsOpen: false,
      nowMs: 4700,
      lastChangeAtMs: 4000,
    }).shouldShow).toBe(true);

    stats.isInCombat = false;
    expect(resolveHudVisibility({
      visible: true,
      hasLiveStats: true,
      settings,
      stats,
      settingsOpen: false,
      nowMs: 4700,
      lastChangeAtMs: 4000,
    }).shouldShow).toBe(false);
  });

  it('keeps editable groups visible while settings are open even if global gates would hide them', () => {
    const settings = cloneSettings();
    const stats = cloneStats();

    settings.general.visible = false;
    settings.general.combatOnly = true;
    settings.general.showOnChangeOnly = true;
    settings.general.changeDisplaySeconds = 1;
    stats.isInCombat = false;

    expect(resolveHudVisibility({
      visible: false,
      hasLiveStats: true,
      settings,
      stats,
      settingsOpen: true,
      nowMs: 6000,
      lastChangeAtMs: 4000,
    }).shouldShow).toBe(true);
  });

  it('maps runtime and settings sync warnings to translated text', () => {
    expect(getRuntimeWarningText('ko', {
      runtimeVersion: '1.5.97.0',
      skseVersion: '2.0.20.0',
      addressLibraryPath: 'C:/Games/Skyrim/Data/SKSE/Plugins/version-1-5-97-0.bin',
      addressLibraryPresent: false,
      runtimeSupported: true,
      usesAddressLibrary: true,
      warningCode: 'missing-address-library',
    })).toBe('현재 런타임용 Address Library 파일이 없습니다.');

    expect(getSettingsSyncWarningText('en', 'retrying', null)).toBe('Retrying settings save...');
    expect(getSettingsSyncWarningText('en', 'idle', false)).toBe('Failed to save settings. Check file path and permissions.');
  });
});
