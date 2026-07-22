import { memo } from 'react';
import { iconMap } from '../assets/icons';
import { standardStatIconMap } from '../data/standardStatIcons';
import type { IconTheme } from '../types/settings';

interface StatWidgetProps {
  icon: string;
  iconColor: string;
  value: number | string;
  unit?: string;
  visible: boolean;
  iconTheme?: IconTheme;
  showIconBadge?: boolean;
  min?: number;
  cap?: number;
  format?: (v: number) => string;
  helperText?: string;
  helperTone?: 'neutral' | 'warning';
  valueTone?: 'default' | 'positive' | 'warning' | 'danger' | 'muted';
  prominence?: 'primary' | 'secondary';
  meterPct?: number;
  meterColor?: string;
  meterTrackColor?: string;
  meterTrackBorderColor?: string;
  meterHeight?: number;
  meterFillHeight?: number;
  meterEndpoint?: boolean;
  tooltip?: string;
  valueMaxWidth?: number;
  helperMaxWidth?: number;
  hideValue?: boolean;
  remountValueOnChange?: boolean;
}

const prominenceStyles = {
  primary: {
    gap: '10px',
    iconSize: 40,
    imageSize: 46,
    imageOffset: -3,
    badgeSize: 18,
    badgeIconSize: 11,
    glyphSize: 22,
    fontSize: '20px',
    helperFontSize: '11px',
    minWidth: '48px',
    maxWidth: '240px',
  },
  secondary: {
    gap: '8px',
    iconSize: 34,
    imageSize: 42,
    imageOffset: -4,
    badgeSize: 16,
    badgeIconSize: 10,
    glyphSize: 20,
    fontSize: '16px',
    helperFontSize: '10px',
    minWidth: '36px',
    maxWidth: '220px',
  },
} as const;

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16) || 0;
  const g = Number.parseInt(normalized.slice(2, 4), 16) || 0;
  const b = Number.parseInt(normalized.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function buildBadgePlateStyle(size: number, iconColor: string) {
  return {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: 'linear-gradient(180deg, rgba(24, 30, 42, 0.98) 0%, rgba(7, 9, 16, 0.98) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.72)',
    boxShadow: `0 0 0 1px ${hexToRgba(iconColor, 0.5)}, 0 3px 8px rgba(0, 0, 0, 0.58)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };
}

function buildBadgeAccentStyle(iconColor: string) {
  return {
    position: 'absolute' as const,
    inset: '2px',
    borderRadius: '50%',
    background: `radial-gradient(circle at 35% 30%, ${hexToRgba(iconColor, 0.55)} 0%, ${hexToRgba(iconColor, 0.18)} 58%, rgba(0, 0, 0, 0) 100%)`,
    opacity: 0.95,
  };
}

function buildBadgeGlyphStyle(iconColor: string) {
  return {
    position: 'relative' as const,
    filter: `drop-shadow(0 0 2px ${hexToRgba(iconColor, 0.72)}) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.95))`,
  };
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
  iconTheme = 'standard',
  showIconBadge = false,
  min,
  cap,
  format,
  helperText,
  helperTone = 'neutral',
  valueTone = 'default',
  prominence = 'primary',
  meterPct,
  meterColor,
  meterTrackColor,
  meterTrackBorderColor,
  meterHeight = 4,
  meterFillHeight,
  meterEndpoint = false,
  tooltip,
  valueMaxWidth,
  helperMaxWidth,
  hideValue = false,
  remountValueOnChange = false,
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
  const valueKey = remountValueOnChange ? `${icon}:${String(displayValue)}${unit}` : undefined;
  const textAlign = isNumeric ? 'right' : 'left';
  const showValue = !hideValue;
  const minWidth = showValue && isNumeric ? styles.minWidth : 'auto';
  const helperColor = helperTone === 'warning' ? '#ffcf7a' : '#aeb8c6';
  const normalizedMeterPct = typeof meterPct === 'number' && Number.isFinite(meterPct)
    ? clampPercent(meterPct)
    : null;
  const resolvedValueMaxWidth = valueMaxWidth ?? styles.maxWidth;
  const resolvedHelperMaxWidth = helperMaxWidth ?? styles.maxWidth;
  const resolvedMeterFillHeight = meterFillHeight ?? meterHeight;

  const iconSrc = iconTheme === 'dororong' ? iconMap[icon] : undefined;
  const BadgeIcon = standardStatIconMap[icon];
  const fallbackBadgeStyle = buildBadgePlateStyle(styles.iconSize, iconColor);
  const overlayBadgeStyle = buildBadgePlateStyle(styles.badgeSize, iconColor);
  const badgeAccentStyle = buildBadgeAccentStyle(iconColor);
  const badgeGlyphStyle = buildBadgeGlyphStyle(iconColor);

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
        filter: iconSrc ? 'none' : `drop-shadow(0 0 3px ${iconColor}66)`,
      }} data-stat-icon="true" data-icon-theme={iconTheme}>
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={icon}
            style={{
              position: 'absolute',
              left: `${styles.imageOffset}px`,
              top: `${styles.imageOffset}px`,
              width: `${styles.imageSize}px`,
              height: `${styles.imageSize}px`,
              display: 'block',
              objectFit: 'contain',
              borderRadius: '4px',
            }}
          />
        ) : BadgeIcon ? (
          <div style={{ position: 'relative', ...fallbackBadgeStyle }} data-stat-icon-fallback="true">
            <div aria-hidden="true" style={badgeAccentStyle} />
            <BadgeIcon size={styles.glyphSize} color="#ffffff" strokeWidth={2.2} style={badgeGlyphStyle} />
          </div>
        ) : null}
        {showIconBadge && iconSrc && BadgeIcon && (
          <div style={{
            position: 'absolute',
            right: '-3px',
            bottom: '-3px',
            ...overlayBadgeStyle,
          }} data-stat-icon-badge="true">
            <div aria-hidden="true" style={badgeAccentStyle} data-stat-icon-badge-accent="true" />
            <BadgeIcon size={styles.badgeIconSize} color="#ffffff" strokeWidth={2.5} style={badgeGlyphStyle} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isNumeric ? 'flex-end' : 'flex-start', flexShrink: 0, minWidth }}>
        {showValue && (
          <span
            key={valueKey}
            data-stat-value="true"
            style={{
              display: 'inline-block',
              color: valueColor,
              fontFamily: 'var(--tw-font-hud)',
              fontSize: styles.fontSize,
              fontWeight: prominence === 'primary' ? 700 : 600,
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              textAlign,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: resolvedValueMaxWidth,
              lineHeight: 1.1,
            }}
          >
            {displayValue}{unit}
          </span>
        )}
        {helperText && (
          <span style={{
            color: helperColor,
            fontFamily: 'var(--tw-font-hud)',
            fontSize: styles.helperFontSize,
            fontWeight: 600,
            textShadow: '1px 1px 2px rgba(0,0,0,0.75)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: resolvedHelperMaxWidth,
            opacity: 0.95,
            marginTop: showValue ? '1px' : '0',
          }}>
            {helperText}
          </span>
        )}
        {normalizedMeterPct !== null && (
          <div style={{
            position: 'relative',
            width: styles.maxWidth,
            maxWidth: '112px',
            height: `${meterHeight}px`,
            marginTop: helperText ? '4px' : showValue ? '6px' : '0',
            background: meterTrackColor ?? 'rgba(255,255,255,0.12)',
            borderRadius: '999px',
            border: meterTrackBorderColor ? `1px solid ${meterTrackBorderColor}` : undefined,
            overflow: meterEndpoint ? 'visible' : 'hidden',
            boxShadow: 'inset 0 0 4px rgba(0,0,0,0.35)',
          }} data-meter-track="true">
            <div style={{
              position: meterEndpoint || resolvedMeterFillHeight !== meterHeight ? 'absolute' : 'relative',
              top: meterEndpoint || resolvedMeterFillHeight !== meterHeight ? '50%' : undefined,
              left: meterEndpoint || resolvedMeterFillHeight !== meterHeight ? 0 : undefined,
              transform: meterEndpoint || resolvedMeterFillHeight !== meterHeight ? 'translateY(-50%)' : undefined,
              width: `${normalizedMeterPct}%`,
              height: `${resolvedMeterFillHeight}px`,
              borderRadius: '999px',
              background: meterColor ?? iconColor,
              boxShadow: `0 0 8px ${(meterColor ?? iconColor)}88`,
            }} data-meter-fill="true" />
            {meterEndpoint && (
              <div
                data-meter-endpoint="true"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${normalizedMeterPct}%`,
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: meterColor ?? iconColor,
                  border: '1px solid rgba(10, 14, 20, 0.92)',
                  boxShadow: `0 0 0 1px rgba(255,255,255,0.35), 0 0 8px ${(meterColor ?? iconColor)}aa`,
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
});
