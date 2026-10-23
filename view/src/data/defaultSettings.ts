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
    language: '',
    fontPreset: 'default',
    iconTheme: 'standard',
    iconPack: '',
    hudStyle: 'compact',
    compactAnchor: 'bottomLeft',
    settingsHotkey: 0xD2,
    visibilityHotkey: 0x57,
    showIconBadges: false,
    accentColor: '',
    transparentBg: false,
  },
  resistances: {
    magic: true,
    fire: true,
    frost: true,
    shock: true,
    poison: true,
    disease: false,
    displayMode: 'both',
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
    voice: false,
    potion: false,
    nameDisplay: 'always',
  },
  timedEffects: {
    enabled: true,
    maxVisible: 6,
    listLayout: 'vertical',
    filter: 'all',
    hideLongerThanMin: 0,
  },
  movement: {
    speedMult: true,
  },
  time: {
    gameDateTime: true,
    gameDisplay: 'timeOnly',
    realDateTime: true,
    realDisplay: 'timeOnly',
    weather: false,
    playtime: false,
  },
  experience: {
    enabled: true,
    showNumbers: true,
  },
  playerInfo: {
    level: false,
    gold: true,
    carryWeight: true,
    carryWeightDisplay: 'combined',
    health: false,
    magicka: false,
    stamina: false,
  },
  positions: {},
  layouts: {},
  groupScales: {},
  itemLayouts: {},
  layoutSlots: [null, null, null],
};

export function getDefaultPositions(
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
  size: WidgetSize = defaultSettings.general.size,
  layouts: Record<string, WidgetLayout> = defaultSettings.layouts,
): Record<string, GroupPosition> {
  return getWidgetDefaultPositions(viewportWidth, viewportHeight, size, layouts);
}
