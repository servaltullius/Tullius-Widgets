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

export interface PlayerInfo {
  level: number;
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
  sourceName: string;
  effectName: string;
  remainingSec: number;
  totalSec: number;
  isDebuff: boolean;
}

export interface CombatStats {
  resistances: Resistances;
  defense: Defense;
  offense: Offense;
  equipped: Equipped;
  movement: Movement;
  playerInfo: PlayerInfo;
  alertData: AlertData;
  timedEffects: TimedEffect[];
  isInCombat: boolean;
}
