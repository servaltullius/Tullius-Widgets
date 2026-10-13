import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../data/defaultSettings';
import { mockStats } from '../data/mockStats';
import type { TimedEffect } from '../types/stats';
import { applyTimedEffectFilter, filterTimedEffects } from './timedEffectFilter';

function effect(name: string, isDebuff: boolean, totalSec: number): TimedEffect {
  return {
    instanceId: name.length,
    stableKey: name,
    snapshotAtMs: 0,
    sourceName: name,
    effectName: name,
    remainingSec: totalSec,
    totalSec,
    isDebuff,
    sourceFormId: 0,
    effectFormId: 0,
    spellFormId: 0,
    category: 'other',
    magnitude: 0,
  };
}

const EFFECTS = [effect('poison', true, 10), effect('potion', false, 60), effect('blessing', false, 8 * 3600)];

describe('timedEffectFilter', () => {
  it('keeps every effect with the default options and returns the same objects', () => {
    expect(filterTimedEffects(EFFECTS, defaultSettings.timedEffects)).toBe(EFFECTS);
    const stats = { ...mockStats, timedEffects: EFFECTS };
    expect(applyTimedEffectFilter(stats, defaultSettings.timedEffects)).toBe(stats);
  });

  it('shows only harmful or only helpful effects', () => {
    const names = (filter: 'debuffs' | 'buffs') =>
      filterTimedEffects(EFFECTS, { ...defaultSettings.timedEffects, filter }).map(item => item.sourceName);
    expect(names('debuffs')).toEqual(['poison']);
    expect(names('buffs')).toEqual(['potion', 'blessing']);
  });

  it('hides effects longer than the chosen limit', () => {
    const kept = filterTimedEffects(EFFECTS, { ...defaultSettings.timedEffects, hideLongerThanMin: 10 });
    expect(kept.map(item => item.sourceName)).toEqual(['poison', 'potion']);
  });
});
