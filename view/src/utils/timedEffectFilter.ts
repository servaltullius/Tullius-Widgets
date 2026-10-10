import type { WidgetSettings } from '../types/settings';
import type { CombatStats, TimedEffect } from '../types/stats';

export type TimedEffectFilter = WidgetSettings['timedEffects']['filter'];
export const TIMED_EFFECT_FILTERS: readonly TimedEffectFilter[] = ['all', 'debuffs', 'buffs'];
export const TIMED_EFFECT_LONG_LIMITS: readonly number[] = [0, 10, 60];

// Which effects the player wants listed: harmful or helpful only, and optionally without long
// buffs (blessings, Well Rested) that would otherwise sit at the bottom for hours.
export function filterTimedEffects(effects: TimedEffect[], options: WidgetSettings['timedEffects']): TimedEffect[] {
  const limitSec = options.hideLongerThanMin > 0 ? options.hideLongerThanMin * 60 : 0;
  if (options.filter === 'all' && limitSec === 0) return effects;
  return effects.filter(effect => {
    if (options.filter === 'debuffs' && !effect.isDebuff) return false;
    if (options.filter === 'buffs' && effect.isDebuff) return false;
    return limitSec === 0 || effect.totalSec <= limitSec;
  });
}

// Applied once in App so the list, its presence and its change detection all agree.
export function applyTimedEffectFilter(stats: CombatStats, options: WidgetSettings['timedEffects']): CombatStats {
  const timedEffects = filterTimedEffects(stats.timedEffects, options);
  return timedEffects === stats.timedEffects ? stats : { ...stats, timedEffects };
}
