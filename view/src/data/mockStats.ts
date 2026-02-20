import type { CombatStats } from '../types/stats';

export const mockStats: CombatStats = {
  resistances: {
    magic: 50,
    fire: 45,
    frost: 30,
    shock: 20,
    poison: 15,
    disease: 100,
  },
  defense: {
    armorRating: 287,
    damageReduction: 55,
  },
  offense: {
    rightHandDamage: 45,
    leftHandDamage: 0,
    critChance: 15,
  },
  equipped: {
    rightHand: 'Daedric Sword',
    leftHand: 'Fireball',
  },
  movement: {
    speedMult: 100,
  },
  time: {
    year: 201,
    month: 7,
    day: 21,
    hour: 14,
    minute: 35,
    monthName: 'Last Seed',
    timeScale: 20,
    snapshotAtMs: Date.now(),
  },
  playerInfo: {
    level: 42,
    gold: 12500,
    carryWeight: 185.5,
    maxCarryWeight: 300,
    health: 320,
    magicka: 200,
    stamina: 250,
  },
  alertData: {
    healthPct: 100,
    magickaPct: 100,
    staminaPct: 100,
    carryPct: 61.8,
  },
  timedEffects: [
    { instanceId: 101, stableKey: 'id:101', snapshotAtMs: 0, sourceName: 'Oakflesh', effectName: 'Armor Bonus', remainingSec: 82, totalSec: 120, isDebuff: false },
    { instanceId: 102, stableKey: 'id:102', snapshotAtMs: 0, sourceName: 'Fortify Marksman Potion', effectName: 'Fortify Marksman', remainingSec: 34, totalSec: 45, isDebuff: false },
    { instanceId: 103, stableKey: 'id:103', snapshotAtMs: 0, sourceName: 'Shock Cloak Trap', effectName: 'Weakness to Shock', remainingSec: 11, totalSec: 30, isDebuff: true },
  ],
  isInCombat: false,
};
