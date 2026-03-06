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
  valueTone?: 'default' | 'positive' | 'warning' | 'danger' | 'muted';
  prominence?: 'primary' | 'secondary';
  meterPct?: number;
  meterColor?: string;
  tooltip?: string;
  valueMaxWidth?: number;
  helperMaxWidth?: number;
}

const prominenceStyles = {
  primary: {
    gap: '10px',
    iconSize: 40,
    badgeSize: 18,
    badgeIconSize: 11,
    fontSize: '20px',
    helperFontSize: '11px',
    minWidth: '48px',
    maxWidth: '240px',
  },
  secondary: {
    gap: '8px',
    iconSize: 34,
    badgeSize: 16,
    badgeIconSize: 10,
    fontSize: '16px',
    helperFontSize: '10px',
    minWidth: '36px',
    maxWidth: '220px',
  },
} as const;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function resolveValueColor(
  valueTone: StatWidgetProps['valueTone'],
  isAtCap: boolean,
  isNegative: boolean,
): string {
  if (valueTone === 'danger') return '#ff8d8d';
  if (valueTone === 'warning') return '#ffd36a';
  if (valueTone === 'positive') return '#8cffb0';
  if (valueTone === 'muted') return '#d2d9e7';
  if (isAtCap) return '#ffd700';
  if (isNegative) return '#ff6b6b';
  return '#ffffff';
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
  valueTone = 'default',
  prominence = 'primary',
  meterPct,
  meterColor,
  tooltip,
  valueMaxWidth,
  helperMaxWidth,
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
  const styles = prominenceStyles[prominence];
  const valueColor = resolveValueColor(valueTone, isAtCap, isNegative);
  const displayValue = isNumeric
    ? (format ? format(displayNumber) : Math.round(displayNumber).toString())
    : value;
  const textAlign = isNumeric ? 'right' : 'left';
  const minWidth = isNumeric ? styles.minWidth : 'auto';
  const helperColor = helperTone === 'warning' ? '#ffcf7a' : '#aeb8c6';
  const normalizedMeterPct = typeof meterPct === 'number' && Number.isFinite(meterPct)
    ? clampPercent(meterPct)
    : null;
  const resolvedValueMaxWidth = valueMaxWidth ?? styles.maxWidth;
  const resolvedHelperMaxWidth = helperMaxWidth ?? styles.maxWidth;

  const iconSrc = iconMap[icon];
  const BadgeIcon = badgeIconMap[icon];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: styles.gap,
      padding: '2px 0',
    }} title={tooltip}>
      <div style={{
        position: 'relative',
        width: `${styles.iconSize}px`,
        height: `${styles.iconSize}px`,
        filter: `drop-shadow(0 0 3px ${iconColor}66)`,
      }}>
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={icon}
            width={styles.iconSize}
            height={styles.iconSize}
            style={{ objectFit: 'contain', borderRadius: '4px' }}
          />
        ) : BadgeIcon ? (
          <div style={{
            width: `${styles.iconSize}px`,
            height: `${styles.iconSize}px`,
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.65)',
            border: `1px solid ${iconColor}aa`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <BadgeIcon size={prominence === 'primary' ? 20 : 18} color={iconColor} strokeWidth={2.2} />
          </div>
        ) : null}
        {iconSrc && BadgeIcon && (
          <div style={{
            position: 'absolute',
            right: '-3px',
            bottom: '-3px',
            width: `${styles.badgeSize}px`,
            height: `${styles.badgeSize}px`,
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.75)',
            border: `1px solid ${iconColor}aa`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <BadgeIcon size={styles.badgeIconSize} color={iconColor} strokeWidth={2.5} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isNumeric ? 'flex-end' : 'flex-start', flexShrink: 0, minWidth }}>
        <span style={{
          display: 'inline-block',
          color: valueColor,
          fontFamily: 'sans-serif',
          fontSize: styles.fontSize,
          fontWeight: prominence === 'primary' ? 700 : 600,
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          textAlign,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: resolvedValueMaxWidth,
          lineHeight: 1.1,
        }}>
          {displayValue}{unit}
        </span>
        {helperText && (
          <span style={{
            color: helperColor,
            fontFamily: 'sans-serif',
            fontSize: styles.helperFontSize,
            fontWeight: 600,
            textShadow: '1px 1px 2px rgba(0,0,0,0.75)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: resolvedHelperMaxWidth,
            opacity: 0.95,
            marginTop: '1px',
          }}>
            {helperText}
          </span>
        )}
        {normalizedMeterPct !== null && (
          <div style={{
            width: styles.maxWidth,
            maxWidth: '112px',
            height: '4px',
            marginTop: helperText ? '4px' : '6px',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: '999px',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 4px rgba(0,0,0,0.35)',
          }}>
            <div style={{
              width: `${normalizedMeterPct}%`,
              height: '100%',
              borderRadius: '999px',
              background: meterColor ?? iconColor,
              boxShadow: `0 0 8px ${(meterColor ?? iconColor)}88`,
            }} />
          </div>
        )}
      </div>
    </div>
  );
});
