export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetLayout = 'vertical' | 'horizontal';
export type Language = 'ko' | 'en';

export interface GroupPosition {
  x: number;
  y: number;
}

export interface WidgetSettings {
  general: {
    visible: boolean;
    combatOnly: boolean;
    opacity: number;
    size: WidgetSize;
    language: Language;
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
  };
  movement: {
    speedMult: boolean;
  };
  playerInfo: {
    level: boolean;
    gold: boolean;
    carryWeight: boolean;
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
}

export interface UpdateSettingOptions {
  persist?: boolean;
}

export type UpdateSettingFn = (
  path: string,
  value: unknown,
  options?: UpdateSettingOptions
) => void;
