export type WidgetPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetSettings {
  general: {
    visible: boolean;
    combatOnly: boolean;
    opacity: number;
    size: WidgetSize;
    position: WidgetPosition;
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
  movement: {
    speedMult: boolean;
  };
}
