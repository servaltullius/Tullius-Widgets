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
  isInCombat: false,
};
