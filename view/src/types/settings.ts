export type WidgetSize = 'xsmall' | 'small' | 'medium' | 'large';
export type WidgetLayout = 'vertical' | 'horizontal';
export type TimedEffectListLayout = 'vertical' | 'horizontal';
export type CarryWeightDisplayMode = 'combined' | 'valueOnly' | 'meterOnly';
export type ResistanceDisplayMode = 'effectiveOnly' | 'rawOnly' | 'both';
export type TimeDisplayMode = 'dateTime' | 'timeOnly';
export type FontPreset = 'default' | 'readable' | 'compact' | 'classic';
export type IconTheme = 'standard' | 'dororong';
export type Language = string;

export interface GroupPosition {
  x: number;
  y: number;
}

export interface WidgetItemLayout {
  visible: boolean;
  x: number;
  y: number;
  scale: number;
  locked: boolean;
  zIndex: number;
  viewportWidth?: number;
  viewportHeight?: number;
}

export interface WidgetSettings {
  general: {
    visible: boolean;
    combatOnly: boolean;
    showOnChangeOnly: boolean;
    changeDisplaySeconds: number;
    onboardingSeen: boolean;
    opacity: number;
    size: WidgetSize;
    language: Language;
    fontPreset: FontPreset;
    iconTheme: IconTheme;
    showIconBadges: boolean;
    accentColor: string;  // '' = auto from HUD, otherwise hex color
    transparentBg: boolean;  // hide widget group background
  };
  resistances: {
    magic: boolean;
    fire: boolean;
    frost: boolean;
    shock: boolean;
    poison: boolean;
    disease: boolean;
    displayMode: ResistanceDisplayMode;
  };
  defense: {
    armorRating: boolean;
    damageReduction: boolean;
  };
  offense: {
    rightHandDamage: boolean;
    leftHandDamage: boolean;
    critChance: boolean;
  };
  equipped: {
    rightHand: boolean;
    leftHand: boolean;
    voice: boolean;
  };
  timedEffects: {
    enabled: boolean;
    maxVisible: number;
    listLayout: TimedEffectListLayout;
  };
  movement: {
    speedMult: boolean;
  };
  time: {
    gameDateTime: boolean;
    gameDisplay: TimeDisplayMode;
    realDateTime: boolean;
    realDisplay: TimeDisplayMode;
  };
  experience: {
    enabled: boolean;
  };
  playerInfo: {
    level: boolean;
    gold: boolean;
    carryWeight: boolean;
    carryWeightDisplay: CarryWeightDisplayMode;
    health: boolean;
    magicka: boolean;
    stamina: boolean;
  };
  visualAlerts: {
    enabled: boolean;
    lowHealth: boolean;
    lowHealthThreshold: number;
    lowStamina: boolean;
    lowStaminaThreshold: number;
    lowMagicka: boolean;
    lowMagickaThreshold: number;
    overencumbered: boolean;
  };
  positions: Record<string, GroupPosition>;
  layouts: Record<string, WidgetLayout>;
  groupScales: Record<string, number>;
  itemLayouts: Record<string, WidgetItemLayout>;
}

export interface UpdateSettingOptions {
  persist?: boolean;
}

export type UpdateSettingFn = (
  path: string,
  value: unknown,
  options?: UpdateSettingOptions
) => void;
