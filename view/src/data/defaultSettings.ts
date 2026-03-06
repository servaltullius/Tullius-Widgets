import type { GroupPosition, WidgetLayout, WidgetSettings, WidgetSize } from '../types/settings';
import { getWidgetDefaultPositions } from './widgetRegistry';

export const defaultSettings: WidgetSettings = {
  general: {
    visible: true,
    combatOnly: false,
    showOnChangeOnly: false,
    changeDisplaySeconds: 4,
    onboardingSeen: false,
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
  experience: {
    enabled: true,
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

export function getDefaultPositions(
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
  size: WidgetSize = defaultSettings.general.size,
  layouts: Record<string, WidgetLayout> = defaultSettings.layouts,
): Record<string, GroupPosition> {
  return getWidgetDefaultPositions(viewportWidth, viewportHeight, size, layouts);
}
