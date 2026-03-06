import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../data/defaultSettings';
import { mockStats } from '../data/mockStats';
import {
  buildTrackedChangeSignature,
  getRuntimeWarningText,
  getSettingsSyncWarningText,
  getVisibleWidgetGroups,
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

    settings.resistances.disease = false;
    settings.playerInfo.health = false;

    const signature = buildTrackedChangeSignature(stats, settings, 12345);

    expect(signature).toContain(`res.magic:${stats.resistances.magic}`);
    expect(signature).not.toContain(`res.disease:${stats.resistances.disease}`);
    expect(signature).not.toContain(`pi.health:${stats.playerInfo.health}`);
    expect(signature).toContain('effects:id:101:82:120:0');
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

  it('reports visible groups from settings and timed-effect state', () => {
    const settings = cloneSettings();
    const stats = cloneStats();

    stats.timedEffects = [];

    expect(getVisibleWidgetGroups(settings, stats, false).hasVisibleTimedEffects).toBe(false);
    expect(getVisibleWidgetGroups(settings, stats, true).hasVisibleTimedEffects).toBe(true);
    expect(getVisibleWidgetGroups(settings, stats, false).hasVisibleResistance).toBe(true);
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
