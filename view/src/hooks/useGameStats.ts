import { useState, useEffect } from 'react';
import type { CombatStats, GameTimeInfo, TimedEffect } from '../types/stats';
import { mockStats } from '../data/mockStats';

const isDev = !('sendDataToSKSE' in window);
const SKYRIM_MONTH_NAMES = [
  'Morning Star',
  "Sun's Dawn",
  'First Seed',
  "Rain's Hand",
  'Second Seed',
  'Midyear',
  "Sun's Height",
  'Last Seed',
  'Hearthfire',
  'Frostfall',
  "Sun's Dusk",
  'Evening Star',
];

function readNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function readText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function normalizeGameTime(value: unknown): GameTimeInfo {
  const snapshotAtMs = Date.now();
  const fallbackMonth = 0;
  const fallbackMonthName = SKYRIM_MONTH_NAMES[fallbackMonth];

  if (!value || typeof value !== 'object') {
    return {
      year: 201,
      month: fallbackMonth,
      day: 1,
      hour: 12,
      minute: 0,
      monthName: fallbackMonthName,
      timeScale: 20,
      snapshotAtMs,
    };
  }

  const raw = value as Record<string, unknown>;
  const month = Math.trunc(readNumber(raw.month, fallbackMonth, 0, 11));
  const monthName = readText(raw.monthName, SKYRIM_MONTH_NAMES[month] ?? fallbackMonthName);

  return {
    year: Math.trunc(readNumber(raw.year, 201, 1, 9999)),
    month,
    day: Math.trunc(readNumber(raw.day, 1, 1, 31)),
    hour: Math.trunc(readNumber(raw.hour, 12, 0, 23)),
    minute: Math.trunc(readNumber(raw.minute, 0, 0, 59)),
    monthName,
    timeScale: readNumber(raw.timeScale, 20, 0, 2000),
    snapshotAtMs,
  };
}

function normalizeTimedEffects(value: unknown): TimedEffect[] {
  if (!Array.isArray(value)) return [];
  const occurrenceBySignature = new Map<string, number>();
  const snapshotAtMs = Date.now();

  return value.flatMap((item) => {
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
    const rawInstanceId = typeof raw.instanceId === 'number' && Number.isFinite(raw.instanceId)
      ? Math.trunc(raw.instanceId)
      : null;
    const instanceId = rawInstanceId ?? -1;

    if (!sourceName && !effectName) return [];

    const signature = `${sourceName}|${effectName}|${Math.trunc(totalSec)}|${isDebuff ? 1 : 0}`;
    const occurrence = occurrenceBySignature.get(signature) ?? 0;
    occurrenceBySignature.set(signature, occurrence + 1);
    const stableKey = rawInstanceId !== null ? `id:${rawInstanceId}` : `sig:${signature}|${occurrence}`;

    return [{
      instanceId,
      stableKey,
      snapshotAtMs,
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
          time: normalizeGameTime(withEquipped.time),
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
