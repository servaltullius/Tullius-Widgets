import type { WidgetSettings } from '../types/settings';

export const defaultSettings: WidgetSettings = {
  general: {
    visible: true,
    combatOnly: false,
    opacity: 70,
    size: 'medium',
    language: 'ko',
    accentColor: '',
    transparentBg: true,
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
  equipped: {
    rightHand: true,
    leftHand: true,
  },
  timedEffects: {
    enabled: true,
    maxVisible: 6,
  },
  movement: {
    speedMult: true,
  },
  time: {
    gameDateTime: true,
    realDateTime: true,
  },
  playerInfo: {
    level: true,
    gold: true,
    carryWeight: true,
    health: false,
    magicka: false,
    stamina: false,
  },
  visualAlerts: {
    enabled: true,
    lowHealth: true,
    lowHealthThreshold: 30,
    lowStamina: true,
    lowStaminaThreshold: 25,
    lowMagicka: true,
    lowMagickaThreshold: 25,
    overencumbered: true,
  },
  positions: {},
  layouts: {},
};

export function getDefaultPositions(): Record<string, { x: number; y: number }> {
  const w = window.innerWidth;
  const right = w - 260;
  return {
    playerInfo: { x: right, y: 20 },
    time: { x: 20, y: 20 },
    resistances: { x: right, y: 220 },
    defense: { x: right, y: 500 },
    offense: { x: right, y: 630 },
    equipped: { x: right, y: 760 },
    timedEffects: { x: right, y: 900 },
    movement: { x: right, y: 1030 },
  };
}
