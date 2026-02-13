import { useState, useEffect } from 'react';
import type { CombatStats } from '../types/stats';
import { mockStats } from '../data/mockStats';

const isDev = !window.hasOwnProperty('sendDataToSKSE');

export function useGameStats(): CombatStats {
  const [stats, setStats] = useState<CombatStats>(mockStats);

  useEffect(() => {
    (window as any).updateStats = (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString) as CombatStats;
        setStats(parsed);
      } catch (e) {
        console.error('Failed to parse stats JSON:', e);
      }
    };

    if (isDev) {
      console.log('[TulliusWidgets] Dev mode - using mock stats');
    }

    return () => {
      delete (window as any).updateStats;
    };
  }, []);

  return stats;
}
