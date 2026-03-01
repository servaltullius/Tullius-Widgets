import { useEffect, useRef, useState } from 'react';
import type { CombatStats, GameTimeInfo, TimedEffect } from '../types/stats';
import { mockStats } from '../data/mockStats';
import { isPlainObject, readBoolean, readNumber, readText } from '../utils/normalize';
import { registerDualBridgeHandler } from '../utils/bridge';

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

function quantize2(value: number): number {
  return Math.round(value * 100) / 100;
}

function readFormId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  const id = Math.trunc(value);
  if (id <= 0) return 0;
  return Math.min(id, 0xFFFFFFFF);
}

function toHexId(value: number): string {
  return value.toString(16).toUpperCase().padStart(8, '0');
}

function sanitizeEffectText(value: string): string {
  let cleaned = '';
  for (const char of value) {
    const code = char.charCodeAt(0);
    cleaned += (code >= 0x20 && code !== 0x7F) ? char : ' ';
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

function keySafeText(value: string): string {
  return encodeURIComponent(value);
}

function readSequence(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const sequence = Math.trunc(value);
  if (sequence < 0) return null;
  return sequence;
}

function normalizeGameTime(value: unknown, fallback?: GameTimeInfo): GameTimeInfo {
  const snapshotAtMs = Date.now();
  const fallbackMonth = fallback ? Math.trunc(readNumber(fallback.month, 0, 0, 11)) : 0;
  const fallbackMonthName = fallback?.monthName || SKYRIM_MONTH_NAMES[fallbackMonth];
  const fallbackYear = fallback?.year ?? 201;
  const fallbackDay = fallback?.day ?? 1;
  const fallbackHour = fallback?.hour ?? 12;
  const fallbackMinute = fallback?.minute ?? 0;
  const fallbackTimeScale = fallback?.timeScale ?? 20;

  if (!isPlainObject(value)) {
    return {
      year: Math.trunc(readNumber(fallbackYear, 201, 1, 9999)),
      month: fallbackMonth,
      day: Math.trunc(readNumber(fallbackDay, 1, 1, 31)),
      hour: Math.trunc(readNumber(fallbackHour, 12, 0, 23)),
      minute: Math.trunc(readNumber(fallbackMinute, 0, 0, 59)),
      monthName: fallbackMonthName,
      timeScale: readNumber(fallbackTimeScale, 20, 0, 2000),
      snapshotAtMs,
    };
  }

  const month = Math.trunc(readNumber(value.month, fallbackMonth, 0, 11));
  const monthName = readText(value.monthName, SKYRIM_MONTH_NAMES[month] ?? fallbackMonthName);

  return {
    year: Math.trunc(readNumber(value.year, fallbackYear, 1, 9999)),
    month,
    day: Math.trunc(readNumber(value.day, fallbackDay, 1, 31)),
    hour: Math.trunc(readNumber(value.hour, fallbackHour, 0, 23)),
    minute: Math.trunc(readNumber(value.minute, fallbackMinute, 0, 59)),
    monthName,
    timeScale: readNumber(value.timeScale, fallbackTimeScale, 0, 2000),
    snapshotAtMs,
  };
}

function normalizeTimedEffects(value: unknown): TimedEffect[] {
  if (!Array.isArray(value)) return [];
  const occurrenceBySignature = new Map<string, number>();
  const occurrenceByStableBase = new Map<string, number>();
  const snapshotAtMs = Date.now();
  const mergedByLogicalKey = new Map<string, Omit<TimedEffect, 'stableKey' | 'snapshotAtMs'>>();

  for (let index = 0; index < value.length; index++) {
    const item = value[index];
    if (!isPlainObject(item)) continue;

    const rawSourceName = typeof item.sourceName === 'string'
      ? item.sourceName
      : typeof item.name === 'string'
        ? item.name
        : '';
    const rawEffectName = typeof item.effectName === 'string' ? item.effectName : rawSourceName;

    let sourceName = sanitizeEffectText(rawSourceName);
    let effectName = sanitizeEffectText(rawEffectName);

    const remainingSec = typeof item.remainingSec === 'number' && Number.isFinite(item.remainingSec)
      ? item.remainingSec
      : 0;
    const totalSec = typeof item.totalSec === 'number' && Number.isFinite(item.totalSec)
      ? item.totalSec
      : remainingSec;
    const isDebuff = item.isDebuff === true;
    const rawInstanceId = typeof item.instanceId === 'number' && Number.isFinite(item.instanceId)
      ? Math.trunc(item.instanceId)
      : null;
    const instanceId = rawInstanceId ?? -1;
    const sourceFormId = readFormId(item.sourceFormId);
    const effectFormId = readFormId(item.effectFormId);
    const spellFormId = readFormId(item.spellFormId);

    if (!sourceName && effectName) sourceName = effectName;
    if (!effectName && sourceName) effectName = sourceName;
    if (!sourceName && !effectName) continue;

    const roundedRemaining = Math.trunc(Math.max(0, remainingSec));
    const roundedTotal = Math.trunc(Math.max(0, totalSec));
    const safeSourceName = keySafeText(sourceName);
    const safeEffectName = keySafeText(effectName);
    const hasStrongIdentity = rawInstanceId !== null && rawInstanceId >= 0;
    const logicalKey = hasStrongIdentity
      ? `pid:${rawInstanceId}|sf:${sourceFormId}|ef:${effectFormId}|pf:${spellFormId}|d:${isDebuff ? 1 : 0}`
      : `volatile:${safeSourceName}|${safeEffectName}|${roundedTotal}|${roundedRemaining}|${isDebuff ? 1 : 0}|sf:${sourceFormId}|ef:${effectFormId}|pf:${spellFormId}|idx:${index}`;

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
      sourceFormId,
      effectFormId,
      spellFormId,
    });
  }

  const out: TimedEffect[] = [];
  for (const merged of mergedByLogicalKey.values()) {
    const signature = `${keySafeText(merged.sourceName)}|${keySafeText(merged.effectName)}|${Math.trunc(merged.totalSec)}|${merged.isDebuff ? 1 : 0}`;
    const occurrence = occurrenceBySignature.get(signature) ?? 0;
    occurrenceBySignature.set(signature, occurrence + 1);

    const stableIdentityParts: string[] = [];
    if (merged.instanceId >= 0) stableIdentityParts.push(`i:${merged.instanceId}`);
    if (merged.sourceFormId > 0) stableIdentityParts.push(`sf:${toHexId(merged.sourceFormId)}`);
    if (merged.effectFormId > 0) stableIdentityParts.push(`ef:${toHexId(merged.effectFormId)}`);
    if (merged.spellFormId > 0) stableIdentityParts.push(`pf:${toHexId(merged.spellFormId)}`);
    const stableBase = stableIdentityParts.length > 0
      ? stableIdentityParts.join('|')
      : `sig:${signature}|${occurrence}`;

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
      sourceFormId: merged.sourceFormId,
      effectFormId: merged.effectFormId,
      spellFormId: merged.spellFormId,
    });
  }

  return out;
}

function normalizeCombatStats(value: unknown, fallback: CombatStats): CombatStats {
  if (!isPlainObject(value)) {
    return fallback;
  }

  const rawResistances = isPlainObject(value.resistances) ? value.resistances : null;
  const rawDefense = isPlainObject(value.defense) ? value.defense : null;
  const rawOffense = isPlainObject(value.offense) ? value.offense : null;
  const rawEquipped = isPlainObject(value.equipped) ? value.equipped : null;
  const rawMovement = isPlainObject(value.movement) ? value.movement : null;
  const rawPlayerInfo = isPlainObject(value.playerInfo) ? value.playerInfo : null;
  const rawAlertData = isPlainObject(value.alertData) ? value.alertData : null;
  const rawCalcMeta = isPlainObject(value.calcMeta) ? value.calcMeta : null;
  const rawCalcResistances = isPlainObject(rawCalcMeta?.rawResistances) ? rawCalcMeta.rawResistances : null;
  const rawCalcCaps = isPlainObject(rawCalcMeta?.caps) ? rawCalcMeta.caps : null;
  const rawCalcFlags = isPlainObject(rawCalcMeta?.flags) ? rawCalcMeta.flags : null;
  const normalizedExperience = quantize2(readNumber(rawPlayerInfo?.experience, fallback.playerInfo.experience, 0, 999999999));
  const normalizedExpToNextLevel = quantize2(readNumber(rawPlayerInfo?.expToNextLevel, fallback.playerInfo.expToNextLevel, 0, 999999999));
  const parsedNextLevelTotalXp = quantize2(readNumber(
    rawPlayerInfo?.nextLevelTotalXp,
    fallback.playerInfo.nextLevelTotalXp,
    0,
    999999999,
  ));
  const normalizedNextLevelTotalXp = quantize2(Math.max(
    normalizedExperience + normalizedExpToNextLevel,
    parsedNextLevelTotalXp,
  ));

  return {
    resistances: {
      magic: readNumber(rawResistances?.magic, fallback.resistances.magic, -1000, 1000),
      fire: readNumber(rawResistances?.fire, fallback.resistances.fire, -1000, 1000),
      frost: readNumber(rawResistances?.frost, fallback.resistances.frost, -1000, 1000),
      shock: readNumber(rawResistances?.shock, fallback.resistances.shock, -1000, 1000),
      poison: readNumber(rawResistances?.poison, fallback.resistances.poison, -1000, 1000),
      disease: readNumber(rawResistances?.disease, fallback.resistances.disease, -1000, 1000),
    },
    defense: {
      armorRating: readNumber(rawDefense?.armorRating, fallback.defense.armorRating, -100000, 100000),
      damageReduction: readNumber(rawDefense?.damageReduction, fallback.defense.damageReduction, -1000, 1000),
    },
    offense: {
      rightHandDamage: readNumber(rawOffense?.rightHandDamage, fallback.offense.rightHandDamage, -100000, 100000),
      leftHandDamage: readNumber(rawOffense?.leftHandDamage, fallback.offense.leftHandDamage, -100000, 100000),
      critChance: readNumber(rawOffense?.critChance, fallback.offense.critChance, -1000, 1000),
    },
    equipped: {
      rightHand: readText(rawEquipped?.rightHand, fallback.equipped.rightHand, true),
      leftHand: readText(rawEquipped?.leftHand, fallback.equipped.leftHand, true),
    },
    movement: {
      speedMult: readNumber(rawMovement?.speedMult, fallback.movement.speedMult, 0, 10000),
    },
    time: value.time === undefined
      ? fallback.time
      : normalizeGameTime(value.time, fallback.time),
    playerInfo: {
      level: Math.trunc(readNumber(rawPlayerInfo?.level, fallback.playerInfo.level, 1, 9999)),
      experience: normalizedExperience,
      expToNextLevel: normalizedExpToNextLevel,
      nextLevelTotalXp: normalizedNextLevelTotalXp,
      gold: Math.trunc(readNumber(rawPlayerInfo?.gold, fallback.playerInfo.gold, 0, 999999999)),
      carryWeight: readNumber(rawPlayerInfo?.carryWeight, fallback.playerInfo.carryWeight, -100000, 100000),
      maxCarryWeight: readNumber(rawPlayerInfo?.maxCarryWeight, fallback.playerInfo.maxCarryWeight, 1, 100000),
      health: readNumber(rawPlayerInfo?.health, fallback.playerInfo.health, 0, 100000),
      magicka: readNumber(rawPlayerInfo?.magicka, fallback.playerInfo.magicka, 0, 100000),
      stamina: readNumber(rawPlayerInfo?.stamina, fallback.playerInfo.stamina, 0, 100000),
    },
    alertData: {
      healthPct: readNumber(rawAlertData?.healthPct, fallback.alertData.healthPct, 0, 1000),
      magickaPct: readNumber(rawAlertData?.magickaPct, fallback.alertData.magickaPct, 0, 1000),
      staminaPct: readNumber(rawAlertData?.staminaPct, fallback.alertData.staminaPct, 0, 1000),
      carryPct: readNumber(rawAlertData?.carryPct, fallback.alertData.carryPct, 0, 1000),
    },
    timedEffects: value.timedEffects === undefined
      ? fallback.timedEffects
      : normalizeTimedEffects(value.timedEffects),
    calcMeta: {
      rawResistances: {
        magic: readNumber(rawCalcResistances?.magic, fallback.calcMeta.rawResistances.magic, -1000, 1000),
        fire: readNumber(rawCalcResistances?.fire, fallback.calcMeta.rawResistances.fire, -1000, 1000),
        frost: readNumber(rawCalcResistances?.frost, fallback.calcMeta.rawResistances.frost, -1000, 1000),
        shock: readNumber(rawCalcResistances?.shock, fallback.calcMeta.rawResistances.shock, -1000, 1000),
        poison: readNumber(rawCalcResistances?.poison, fallback.calcMeta.rawResistances.poison, -1000, 1000),
        disease: readNumber(rawCalcResistances?.disease, fallback.calcMeta.rawResistances.disease, -1000, 1000),
      },
      rawCritChance: readNumber(rawCalcMeta?.rawCritChance, fallback.calcMeta.rawCritChance, -1000, 1000),
      rawDamageReduction: readNumber(rawCalcMeta?.rawDamageReduction, fallback.calcMeta.rawDamageReduction, -1000, 1000),
      armorCapForMaxReduction: readNumber(rawCalcMeta?.armorCapForMaxReduction, fallback.calcMeta.armorCapForMaxReduction, 0, 100000),
      caps: {
        elementalResist: readNumber(rawCalcCaps?.elementalResist, fallback.calcMeta.caps.elementalResist, 0, 1000),
        elementalResistMin: readNumber(rawCalcCaps?.elementalResistMin, fallback.calcMeta.caps.elementalResistMin, -1000, 1000),
        diseaseResist: readNumber(rawCalcCaps?.diseaseResist, fallback.calcMeta.caps.diseaseResist, 0, 1000),
        diseaseResistMin: readNumber(rawCalcCaps?.diseaseResistMin, fallback.calcMeta.caps.diseaseResistMin, -1000, 1000),
        critChance: readNumber(rawCalcCaps?.critChance, fallback.calcMeta.caps.critChance, 0, 1000),
        damageReduction: readNumber(rawCalcCaps?.damageReduction, fallback.calcMeta.caps.damageReduction, 0, 1000),
      },
      flags: {
        anyResistanceClamped: readBoolean(rawCalcFlags?.anyResistanceClamped, fallback.calcMeta.flags.anyResistanceClamped),
        critChanceClamped: readBoolean(rawCalcFlags?.critChanceClamped, fallback.calcMeta.flags.critChanceClamped),
        damageReductionClamped: readBoolean(rawCalcFlags?.damageReductionClamped, fallback.calcMeta.flags.damageReductionClamped),
      },
    },
    isInCombat: typeof value.isInCombat === 'boolean'
      ? value.isInCombat
      : fallback.isInCombat,
  };
}

export function useGameStatsState(): { stats: CombatStats; hasLiveStats: boolean } {
  const [stats, setStats] = useState<CombatStats>(mockStats);
  const [hasLiveStats, setHasLiveStats] = useState<boolean>(isDev);
  const lastAppliedSequenceRef = useRef<number | null>(null);

  useEffect(() => {
    const updateStatsHandler = (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString) as unknown;

        if (!isPlainObject(parsed) || Object.keys(parsed).length === 0) {
          setHasLiveStats(false);
          return;
        }

        const sequence = readSequence(parsed.seq);
        if (sequence !== null) {
          const lastAppliedSequence = lastAppliedSequenceRef.current;
          if (lastAppliedSequence !== null && sequence <= lastAppliedSequence) {
            return;
          }
          lastAppliedSequenceRef.current = sequence;
        }

        setStats(prev => normalizeCombatStats(parsed, prev));
        setHasLiveStats(true);
      } catch (e) {
        console.error('[TulliusWidgets] Failed to parse stats JSON:', e);
        setHasLiveStats(false);
      }
    };

    const unregisterUpdateStats = registerDualBridgeHandler('updateStats', updateStatsHandler);

    if (isDev) {
      console.log('[TulliusWidgets] Dev mode - using mock stats');
    }

    return () => {
      unregisterUpdateStats();
    };
  }, []);

  return { stats, hasLiveStats };
}

export function useGameStats(): CombatStats {
  return useGameStatsState().stats;
}
