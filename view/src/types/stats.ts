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

export interface Equipped {
  rightHand: string;
  leftHand: string;
}

export interface Movement {
  speedMult: number;
}

export interface GameTimeInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  monthName: string;
  timeScale: number;
  snapshotAtMs: number;
}

export interface PlayerInfo {
  level: number;
  experience: number;
  expToNextLevel: number;
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
