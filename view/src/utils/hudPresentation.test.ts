import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../data/defaultSettings';
import { mockStats } from '../data/mockStats';
import { resolveWidgetItemLayouts } from '../hooks/useWidgetItemLayouts';
import {
  buildTrackedChangeSignature,
  getVisibleHudItemIds,
  getRuntimeWarningText,
  getSettingsSyncWarningText,
  resolveExperienceProgress,
  resolveHudVisibility,
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

    const signature = buildTrackedChangeSignature(stats, itemLayouts, 12345);

    expect(signature).toContain(`res.magic:${stats.resistances.magic}`);
    expect(signature).not.toContain(`res.disease:${stats.resistances.disease}`);
    expect(signature).not.toContain(`pi.health:${stats.playerInfo.health}`);
    expect(signature).toContain('effects:id:101:82:120:0');
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

    const before = buildTrackedChangeSignature(stats, itemLayouts, 12345);
    stats.calcMeta.rawResistances.fire = 130;
    const after = buildTrackedChangeSignature(stats, itemLayouts, 12345);

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

    const before = buildTrackedChangeSignature(stats, itemLayouts, 12345);
    stats.playerInfo.level = 43;
    const after = buildTrackedChangeSignature(stats, itemLayouts, 12345);

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
