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

function sanitizeEffectText(value: string): string {
  let cleaned = '';
  for (const char of value) {
    const code = char.charCodeAt(0);
    cleaned += (code >= 0x20 && code !== 0x7F) ? char : ' ';
  }
  return cleaned.replace(/\s+/g, ' ').trim();
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
  const occurrenceByStableBase = new Map<string, number>();
  const snapshotAtMs = Date.now();
  const mergedByLogicalKey = new Map<string, Omit<TimedEffect, 'stableKey' | 'snapshotAtMs'>>();

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;

    const rawSourceName = typeof raw.sourceName === 'string'
      ? raw.sourceName
      : typeof raw.name === 'string'
        ? raw.name
        : '';
    const rawEffectName = typeof raw.effectName === 'string' ? raw.effectName : rawSourceName;

    let sourceName = sanitizeEffectText(rawSourceName);
    let effectName = sanitizeEffectText(rawEffectName);

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

    if (!sourceName && effectName) sourceName = effectName;
    if (!effectName && sourceName) effectName = sourceName;
    if (!sourceName && !effectName) continue;

    const roundedRemaining = Math.trunc(Math.max(0, remainingSec));
    const roundedTotal = Math.trunc(Math.max(0, totalSec));
    const logicalKey = rawInstanceId !== null
      ? `id:${rawInstanceId}|${sourceName}|${effectName}|${isDebuff ? 1 : 0}`
      : `sig:${sourceName}|${effectName}|${roundedTotal}|${isDebuff ? 1 : 0}`;

    const existing = mergedByLogicalKey.get(logicalKey);
    if (existing) {
      existing.remainingSec = Math.max(existing.remainingSec, roundedRemaining);
      existing.totalSec = Math.max(existing.totalSec, roundedTotal);
      continue;
    }

    mergedByLogicalKey.set(logicalKey, {
      instanceId,
      sourceName,
      effectName,
      remainingSec: roundedRemaining,
      totalSec: roundedTotal,
      isDebuff,
    });
  }

  const out: TimedEffect[] = [];
  for (const merged of mergedByLogicalKey.values()) {
    const signature = `${merged.sourceName}|${merged.effectName}|${Math.trunc(merged.totalSec)}|${merged.isDebuff ? 1 : 0}`;
    const occurrence = occurrenceBySignature.get(signature) ?? 0;
    occurrenceBySignature.set(signature, occurrence + 1);
    const stableBase = merged.instanceId >= 0 ? `id:${merged.instanceId}` : `sig:${signature}|${occurrence}`;
    const stableOccurrence = occurrenceByStableBase.get(stableBase) ?? 0;
    occurrenceByStableBase.set(stableBase, stableOccurrence + 1);
    const stableKey = stableOccurrence === 0
      ? stableBase
      : `${stableBase}|dup:${stableOccurrence}`;

    out.push({
      instanceId: merged.instanceId,
      stableKey,
      snapshotAtMs,
      sourceName: merged.sourceName,
      effectName: merged.effectName,
      remainingSec: merged.remainingSec,
      totalSec: merged.totalSec,
      isDebuff: merged.isDebuff,
    });
  }

  return out;
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
