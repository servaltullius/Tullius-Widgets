import {
  Flame, Snowflake, Zap, Sparkles, Skull, Bug,
  Shield, ShieldCheck, Swords, Sword, Target,
  Wind, Star, Coins, Weight, Heart, Droplets, Battery,
  type LucideIcon,
} from 'lucide-react';
import { iconMap } from '../assets/icons';

const badgeIconMap: Record<string, LucideIcon> = {
  fire: Flame,
  frost: Snowflake,
  shock: Zap,
  magic: Sparkles,
  poison: Skull,
  disease: Bug,
  armor: Shield,
  damageReduce: ShieldCheck,
  rightHand: Swords,
  leftHand: Sword,
  crit: Target,
  speed: Wind,
  level: Star,
  gold: Coins,
  weight: Weight,
  health: Heart,
  magicka: Droplets,
  stamina: Battery,
};

interface StatWidgetProps {
  icon: string;
  iconColor: string;
  value: number;
  unit?: string;
  visible: boolean;
  cap?: number;
  format?: (v: number) => string;
}

export function StatWidget({ icon, iconColor, value, unit = '', visible, cap, format }: StatWidgetProps) {
  if (!visible) return null;

  const isAtCap = cap !== undefined && value >= cap;
  const isNegative = value < 0;
  const valueColor = isAtCap ? '#ffd700' : isNegative ? '#ff4444' : '#ffffff';
  const displayValue = format ? format(value) : Math.round(value).toString();

  const iconSrc = iconMap[icon];
  const BadgeIcon = badgeIconMap[icon];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '2px 0',
    }}>
      <div style={{
        position: 'relative',
        width: '38px',
        height: '38px',
        filter: `drop-shadow(0 0 3px ${iconColor}66)`,
      }}>
        {iconSrc && (
          <img
            src={iconSrc}
            alt={icon}
            width={38}
            height={38}
            style={{ objectFit: 'contain', borderRadius: '4px' }}
          />
        )}
        {BadgeIcon && (
          <div style={{
            position: 'absolute',
            right: '-3px',
            bottom: '-3px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.75)',
            border: `1px solid ${iconColor}aa`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <BadgeIcon size={11} color={iconColor} strokeWidth={2.5} />
          </div>
        )}
      </div>
      <span style={{
        color: valueColor,
        fontFamily: 'sans-serif',
        fontSize: '18px',
        fontWeight: 600,
        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
        minWidth: '40px',
        textAlign: 'right',
      }}>
        {displayValue}{unit}
      </span>
    </div>
  );
}
