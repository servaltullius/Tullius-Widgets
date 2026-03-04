import { memo } from 'react';
import {
  Flame, Snowflake, Zap, Sparkles, Skull, Bug,
  Shield, ShieldCheck, Swords, Sword, Target,
  Wind, Star, Coins, Weight, Heart, Droplets, Battery,
  CalendarDays, Clock3,
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
  gameTime: CalendarDays,
  realTime: Clock3,
};

interface StatWidgetProps {
  icon: string;
  iconColor: string;
  value: number | string;
  unit?: string;
  visible: boolean;
  min?: number;
  cap?: number;
  format?: (v: number) => string;
  helperText?: string;
  helperTone?: 'neutral' | 'warning';
  tooltip?: string;
}

export const StatWidget = memo(function StatWidget({
  icon,
  iconColor,
  value,
  unit = '',
  visible,
  min,
  cap,
  format,
  helperText,
  helperTone = 'neutral',
  tooltip,
}: StatWidgetProps) {
  if (!visible) return null;

  const isNumeric = typeof value === 'number';
  let displayNumber = isNumeric ? value : 0;
  if (isNumeric) {
    if (min !== undefined) displayNumber = Math.max(displayNumber, min);
    if (cap !== undefined) displayNumber = Math.min(displayNumber, cap);
  }

  const isAtCap = isNumeric && cap !== undefined && value >= cap;
  const isNegative = isNumeric && displayNumber < 0;
  const valueColor = isAtCap ? '#ffd700' : isNegative ? '#ff4444' : '#ffffff';
  const displayValue = isNumeric
    ? (format ? format(displayNumber) : Math.round(displayNumber).toString())
    : value;
  const textAlign = isNumeric ? 'right' : 'left';
  const minWidth = isNumeric ? '40px' : '140px';
  const helperColor = helperTone === 'warning' ? '#ffcf7a' : '#aeb8c6';

  const iconSrc = iconMap[icon];
  const BadgeIcon = badgeIconMap[icon];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '2px 0',
    }} title={tooltip}>
      <div style={{
        position: 'relative',
        width: '38px',
        height: '38px',
        filter: `drop-shadow(0 0 3px ${iconColor}66)`,
      }}>
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={icon}
            width={38}
            height={38}
            style={{ objectFit: 'contain', borderRadius: '4px' }}
          />
        ) : BadgeIcon ? (
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.65)',
            border: `1px solid ${iconColor}aa`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <BadgeIcon size={20} color={iconColor} strokeWidth={2.2} />
          </div>
        ) : null}
        {iconSrc && BadgeIcon && (
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isNumeric ? 'flex-end' : 'flex-start', minWidth }}>
        <span style={{
          display: 'block',
          color: valueColor,
          fontFamily: 'sans-serif',
          fontSize: '18px',
          fontWeight: 600,
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          textAlign,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '220px',
          lineHeight: 1.1,
        }}>
          {displayValue}{unit}
        </span>
        {helperText && (
          <span style={{
            color: helperColor,
            fontFamily: 'sans-serif',
            fontSize: '11px',
            fontWeight: 600,
            textShadow: '1px 1px 2px rgba(0,0,0,0.75)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '220px',
            opacity: 0.95,
            marginTop: '1px',
          }}>
            {helperText}
          </span>
        )}
      </div>
    </div>
  );
});
