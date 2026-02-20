import { useState, useEffect } from 'react';
import type { CombatStats, TimedEffect } from '../types/stats';
import { mockStats } from '../data/mockStats';

const isDev = !('sendDataToSKSE' in window);

function normalizeTimedEffects(value: unknown): TimedEffect[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const raw = item as Record<string, unknown>;

    const sourceName = typeof raw.sourceName === 'string'
      ? raw.sourceName
      : typeof raw.name === 'string'
        ? raw.name
        : '';
    const effectName = typeof raw.effectName === 'string' ? raw.effectName : sourceName;

    const remainingSec = typeof raw.remainingSec === 'number' && Number.isFinite(raw.remainingSec)
      ? raw.remainingSec
      : 0;
    const totalSec = typeof raw.totalSec === 'number' && Number.isFinite(raw.totalSec)
      ? raw.totalSec
      : remainingSec;
    const isDebuff = raw.isDebuff === true;
    const instanceId = typeof raw.instanceId === 'number' && Number.isFinite(raw.instanceId)
      ? raw.instanceId
      : index;

    if (!sourceName && !effectName) return [];

    return [{
      instanceId,
      sourceName,
      effectName,
      remainingSec,
      totalSec,
      isDebuff,
    }];
  });
}

export function useGameStats(): CombatStats {
  const [stats, setStats] = useState<CombatStats>(mockStats);

  useEffect(() => {
    window.updateStats = (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString) as CombatStats;
        const withAlertData = parsed.alertData
          ? parsed
          : {
              ...parsed,
              alertData: {
                healthPct: 100,
                magickaPct: 100,
                staminaPct: 100,
                carryPct: 0,
              },
            };
        const withEquipped = withAlertData.equipped
          ? withAlertData
          : {
              ...withAlertData,
              equipped: {
                rightHand: '',
                leftHand: '',
              },
            };
        const normalized = {
          ...withEquipped,
          timedEffects: normalizeTimedEffects(withEquipped.timedEffects),
        };
        setStats(normalized as CombatStats);
      } catch (e) {
        console.error('Failed to parse stats JSON:', e);
      }
    };

    if (isDev) {
      console.log('[TulliusWidgets] Dev mode - using mock stats');
    }

    return () => {
      delete window.updateStats;
    };
  }, []);

  return stats;
}
