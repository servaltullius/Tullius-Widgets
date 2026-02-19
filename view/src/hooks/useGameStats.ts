import { useState, useEffect } from 'react';
import type { CombatStats } from '../types/stats';
import { mockStats } from '../data/mockStats';

const isDev = !('sendDataToSKSE' in window);

export function useGameStats(): CombatStats {
  const [stats, setStats] = useState<CombatStats>(mockStats);

  useEffect(() => {
    window.updateStats = (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString) as CombatStats;
        const normalized = parsed.alertData
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
        setStats(normalized);
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
