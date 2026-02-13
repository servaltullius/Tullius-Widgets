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
    critChance: 12,
  },
  movement: {
    speedMult: 100,
  },
  isInCombat: false,
};
