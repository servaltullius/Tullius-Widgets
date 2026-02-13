import type { WidgetSettings } from '../types/settings';

export const defaultSettings: WidgetSettings = {
  general: {
    visible: true,
    combatOnly: false,
    opacity: 85,
    size: 'medium',
    position: 'bottom-right',
  },
  resistances: {
    magic: true,
    fire: true,
    frost: true,
    shock: true,
    poison: true,
    disease: false,
  },
  defense: {
    armorRating: true,
    damageReduction: true,
  },
  offense: {
    rightHandDamage: true,
    leftHandDamage: true,
    critChance: true,
  },
  movement: {
    speedMult: true,
  },
};
