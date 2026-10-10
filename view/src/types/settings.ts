export type WidgetSize = 'xsmall' | 'small' | 'medium' | 'large';
export type WidgetLayout = 'vertical' | 'horizontal';
export type TimedEffectListLayout = 'vertical' | 'horizontal';
export type CarryWeightDisplayMode = 'combined' | 'valueOnly' | 'meterOnly';
export type ResistanceDisplayMode = 'effectiveOnly' | 'rawOnly' | 'both';
export type TimeDisplayMode = 'dateTime' | 'timeOnly';
export type FontPreset = 'default' | 'readable' | 'compact' | 'classic';
export type IconTheme = 'standard' | 'dororong';
export type HudStyle = 'compact' | 'classic';
export type CompactAnchor = 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
export type EquipNameDisplay = 'always' | 'onChange' | 'never';
export type ItemShowWhen = 'always' | 'combat' | 'change' | 'combatOrChange';
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
  /** When the item may appear; unset means the HUD style's default for this item. */
  showWhen?: ItemShowWhen;
  viewportWidth?: number;
  viewportHeight?: number;
}

export interface LayoutSlot {
  savedAt: number;
  hudStyle: HudStyle;
  compactAnchor: CompactAnchor;
  itemLayouts: Record<string, WidgetItemLayout>;
}

export const LAYOUT_SLOT_COUNT = 3;

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
    hudStyle: HudStyle;
    compactAnchor: CompactAnchor;
    /** DirectInput scan codes for the settings panel and show/hide-all hotkeys. */
    settingsHotkey: number;
    visibilityHotkey: number;
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
    potion: boolean;
    nameDisplay: EquipNameDisplay;
  };
  timedEffects: {
    enabled: boolean;
    maxVisible: number;
    listLayout: TimedEffectListLayout;
    /** all | debuffs (harmful only) | buffs (helpful only) */
    filter: 'all' | 'debuffs' | 'buffs';
    /** Hide effects whose full duration exceeds this many minutes (0: show all). */
    hideLongerThanMin: number;
  };
  movement: {
    speedMult: boolean;
  };
  time: {
    gameDateTime: boolean;
    gameDisplay: TimeDisplayMode;
    realDateTime: boolean;
    realDisplay: TimeDisplayMode;
    weather: boolean;
    playtime: boolean;
  };
  experience: {
    enabled: boolean;
    showNumbers: boolean;
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
  layoutSlots: Array<LayoutSlot | null>;
}

export interface UpdateSettingOptions {
  persist?: boolean;
}

export type UpdateSettingFn = (
  path: string,
  value: unknown,
  options?: UpdateSettingOptions
) => void;
