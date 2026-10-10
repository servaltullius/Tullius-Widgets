export interface Resistances {
  magic: number;
  fire: number;
  frost: number;
  shock: number;
  poison: number;
  disease: number;
}

export interface Defense {
  armorRating: number;
  damageReduction: number;
}

export interface Offense {
  rightHandDamage: number;
  leftHandDamage: number;
  critChance: number;
}

export type EquippedVoiceType = 'empty' | 'shout' | 'power';

export const EQUIPPED_ITEM_KINDS = [
  'empty', 'unarmed', 'sword', 'dagger', 'waraxe', 'mace', 'greatsword', 'battleaxe', 'warhammer',
  'bow', 'crossbow', 'staff', 'spell', 'destruction', 'restoration', 'alteration', 'illusion',
  'conjuration', 'shield', 'torch', 'other',
] as const;

export type EquippedItemKind = typeof EQUIPPED_ITEM_KINDS[number];

export interface Equipped {
  rightHand: string;
  leftHand: string;
  rightHandKind: EquippedItemKind;
  leftHandKind: EquippedItemKind;
  /** Enchantment charge in percent, or null when the hand item is not enchanted. */
  rightHandChargePct: number | null;
  leftHandChargePct: number | null;
  ammoName: string;
  /** Equipped arrows/bolts in the inventory, or null when no ammo is equipped. */
  ammoCount: number | null;
  /** Seconds until the selected shout can be used again. */
  voiceCooldownSec: number;
  voice: string;
  voiceType: EquippedVoiceType;
}

export interface Movement {
  speedMult: number;
}

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'snow' | 'indoor' | 'unknown';

export interface GameTimeInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  monthName: string;
  timeScale: number;
  weather: WeatherKind;
  snapshotAtMs: number;
}

export interface PlayerInfo {
  level: number;
  experience: number;
  expToNextLevel: number;
  nextLevelTotalXp: number;
  expectedLevelThreshold: number;
  gold: number;
  carryWeight: number;
  maxCarryWeight: number;
  health: number;
  magicka: number;
  stamina: number;
}

export interface AlertData {
  healthPct: number;
  magickaPct: number;
  staminaPct: number;
  carryPct: number;
}

export interface TimedEffect {
  instanceId: number;
  stableKey: string;
  snapshotAtMs: number;
  sourceName: string;
  effectName: string;
  remainingSec: number;
  totalSec: number;
  isDebuff: boolean;
  sourceFormId: number;
  effectFormId: number;
  spellFormId: number;
}

export interface CalculationCaps {
  elementalResist: number;
  elementalResistMin: number;
  diseaseResist: number;
  diseaseResistMin: number;
  critChance: number;
  damageReduction: number;
}

export interface CalculationFlags {
  anyResistanceClamped: boolean;
  critChanceClamped: boolean;
  damageReductionClamped: boolean;
}

export interface CalculationMeta {
  rawResistances: Resistances;
  rawCritChance: number;
  rawDamageReduction: number;
  armorCapForMaxReduction: number;
  caps: CalculationCaps;
  flags: CalculationFlags;
}

export interface CombatStats {
  resistances: Resistances;
  defense: Defense;
  offense: Offense;
  equipped: Equipped;
  movement: Movement;
  time: GameTimeInfo;
  playerInfo: PlayerInfo;
  alertData: AlertData;
  timedEffects: TimedEffect[];
  calcMeta: CalculationMeta;
  isInCombat: boolean;
}
