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

export interface Movement {
  speedMult: number;
}

export interface CombatStats {
  resistances: Resistances;
  defense: Defense;
  offense: Offense;
  movement: Movement;
  isInCombat: boolean;
}
