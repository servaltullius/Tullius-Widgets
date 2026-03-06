import type { CombatStats } from '../types/stats';
import type { RuntimeDiagnostics } from '../types/runtime';

export function createStatsPayload(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    schemaVersion: 1,
    seq: 101,
    resistances: {
      magic: 85,
      fire: 85,
      frost: 30,
      shock: 85,
      poison: 15,
      disease: 100,
    },
    defense: {
      armorRating: 712,
      damageReduction: 80,
    },
    offense: {
      rightHandDamage: 85,
      leftHandDamage: 10,
      critChance: 100,
    },
    equipped: {
      rightHand: 'Daedric Sword',
      leftHand: 'Chain Lightning',
    },
    movement: {
      speedMult: 100,
    },
    time: {
      year: 201,
      month: 7,
      day: 24,
      hour: 5,
      minute: 18,
      monthName: 'Last Seed',
      timeScale: 20,
    },
    playerInfo: {
      level: 8,
      experience: 1280.25,
      expToNextLevel: 619.75,
      nextLevelTotalXp: 1900,
      expectedLevelThreshold: 1900,
      gold: 3433,
      carryWeight: 241.71,
      maxCarryWeight: 445,
      health: 300,
      magicka: 100,
      stamina: 100,
    },
    alertData: {
      healthPct: 100,
      magickaPct: 100,
      staminaPct: 100,
      carryPct: 54,
    },
    timedEffects: [
      {
        instanceId: 102,
        sourceName: 'Talos Blessing',
        effectName: 'Fortify Shout',
        remainingSec: 1594,
        totalSec: 1800,
        isDebuff: false,
        sourceFormId: 12345,
        effectFormId: 67890,
        spellFormId: 112233,
      },
    ],
    calcMeta: {
      rawResistances: {
        magic: 91,
        fire: 120,
        frost: 30,
        shock: 91,
        poison: 15,
        disease: 100,
      },
      rawCritChance: 120,
      rawDamageReduction: 85.44,
      armorCapForMaxReduction: 666.67,
      caps: {
        elementalResist: 85,
        elementalResistMin: -100,
        diseaseResist: 100,
        diseaseResistMin: 0,
        critChance: 100,
        damageReduction: 80,
      },
      flags: {
        anyResistanceClamped: true,
        critChanceClamped: true,
        damageReductionClamped: true,
      },
    },
    isInCombat: false,
    ...overrides,
  };
}

export function createRuntimeDiagnosticsPayload(
  overrides?: Partial<RuntimeDiagnostics>,
): RuntimeDiagnostics {
  return {
    runtimeVersion: '1.6.1170',
    skseVersion: '2.2.6',
    addressLibraryPath: 'Data/SKSE/Plugins/versionlib-1-6-1170-0.bin',
    addressLibraryPresent: true,
    runtimeSupported: true,
    usesAddressLibrary: true,
    warningCode: 'none',
    ...overrides,
  };
}

export function readPlayerInfo(stats: CombatStats): CombatStats['playerInfo'] {
  return stats.playerInfo;
}
