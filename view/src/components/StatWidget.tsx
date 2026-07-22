import { memo, type CSSProperties } from 'react';
import { iconMap } from '../assets/icons';
import { standardStatIconMap } from '../data/standardStatIcons';
import type { IconTheme } from '../types/settings';

interface StatWidgetProps {
  icon: string;
  standardIcon?: string;
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
    iconSize: 34,
    imageSize: 42,
    imageOffset: -4,
    badgeSize: 16,
    badgeIconSize: 10,
    glyphSize: 18,
    fontSize: '18px',
    helperFontSize: '10px',
    maxWidth: 220,
  },
  secondary: {
    iconSize: 30,
    imageSize: 38,
    imageOffset: -4,
    badgeSize: 15,
    badgeIconSize: 9,
    glyphSize: 16,
    fontSize: '15px',
    helperFontSize: '9px',
    maxWidth: 200,
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

function resolveValueColor(
  valueTone: StatWidgetProps['valueTone'],
  isAtCap: boolean,
  isNegative: boolean,
): string {
  if (valueTone === 'danger') return '#d98378';
  if (valueTone === 'warning') return '#d6a65f';
  if (valueTone === 'positive') return '#a7c4ad';
  if (valueTone === 'muted') return '#b7bdc2';
  if (isAtCap) return '#d7c79a';
  if (isNegative) return '#d98378';
  return '#f2f4f5';
}

export const StatWidget = memo(function StatWidget({
  icon,
  standardIcon,
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
  const helperColor = helperTone === 'warning' ? '#d6a65f' : '#aeb5ba';
  const normalizedMeterPct = typeof meterPct === 'number' && Number.isFinite(meterPct)
    ? clampPercent(meterPct)
    : null;
  const resolvedValueMaxWidth = valueMaxWidth ?? styles.maxWidth;
  const resolvedHelperMaxWidth = helperMaxWidth ?? styles.maxWidth;
  const resolvedMeterFillHeight = meterFillHeight ?? meterHeight;
  const resolvedMeterColor = meterColor ?? iconColor;

  const iconSrc = iconTheme === 'dororong' ? iconMap[icon] : undefined;
  const standardIconKey = standardIcon ?? icon;
  const StandardIcon = standardStatIconMap[standardIconKey];
  const widgetStyle = {
    '--tw-icon-color': iconColor,
    '--tw-icon-accent': hexToRgba(iconColor, 0.88),
    '--tw-icon-border': hexToRgba(iconColor, 0.46),
    '--tw-icon-tint': hexToRgba(iconColor, 0.16),
    '--tw-icon-glow': hexToRgba(iconColor, 0.3),
    '--tw-value-color': valueColor,
    '--tw-value-size': styles.fontSize,
    '--tw-helper-color': helperColor,
    '--tw-helper-size': styles.helperFontSize,
    '--tw-meter-color': resolvedMeterColor,
  } as CSSProperties;

  return (
    <div
      className={`tw-stat-widget tw-stat-widget--${prominence} tw-stat-widget--${isNumeric ? 'numeric' : 'text'}`}
      data-stat-widget="true"
      style={widgetStyle}
      title={tooltip}
    >
      <div
        className="tw-stat-icon-frame"
        style={{ width: styles.iconSize, height: styles.iconSize }}
        data-stat-icon="true"
        data-standard-icon={standardIconKey}
        data-stat-icon-fallback={!iconSrc ? 'true' : undefined}
        data-icon-theme={iconTheme}
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={icon}
            className="tw-stat-icon-image"
            style={{
              left: styles.imageOffset,
              top: styles.imageOffset,
              width: styles.imageSize,
              height: styles.imageSize,
            }}
          />
        ) : StandardIcon ? (
          <StandardIcon size={styles.glyphSize} color="currentColor" strokeWidth={1.9} />
        ) : null}

        {showIconBadge && iconSrc && StandardIcon && (
          <div
            className="tw-stat-icon-badge"
            data-stat-icon-badge="true"
            style={{ width: styles.badgeSize, height: styles.badgeSize }}
          >
            <StandardIcon size={styles.badgeIconSize} color="currentColor" strokeWidth={2.1} />
          </div>
        )}
      </div>

      <div className="tw-stat-copy">
        {!hideValue && (
          <span
            key={valueKey}
            className="tw-stat-value"
            data-stat-value="true"
            style={{ maxWidth: resolvedValueMaxWidth }}
          >
            {displayValue}{unit}
          </span>
        )}

        {helperText && (
          <span
            className="tw-stat-helper"
            data-stat-helper="true"
            style={{ maxWidth: resolvedHelperMaxWidth, marginTop: hideValue ? 0 : undefined }}
          >
            {helperText}
          </span>
        )}

        {normalizedMeterPct !== null && (
          <div
            className="tw-stat-meter"
            data-meter-track="true"
            style={{
              height: meterHeight,
              marginTop: helperText ? 4 : hideValue ? 0 : 6,
              background: meterTrackColor,
              border: meterTrackBorderColor ? `1px solid ${meterTrackBorderColor}` : undefined,
              overflow: meterEndpoint ? 'visible' : 'hidden',
            }}
          >
            <div
              className="tw-stat-meter-fill"
              data-meter-fill="true"
              style={{
                position: meterEndpoint || resolvedMeterFillHeight !== meterHeight ? 'absolute' : 'relative',
                top: meterEndpoint || resolvedMeterFillHeight !== meterHeight ? '50%' : undefined,
                left: meterEndpoint || resolvedMeterFillHeight !== meterHeight ? 0 : undefined,
                width: `${normalizedMeterPct}%`,
                height: resolvedMeterFillHeight,
                transform: meterEndpoint || resolvedMeterFillHeight !== meterHeight ? 'translateY(-50%)' : undefined,
              }}
            />
            {meterEndpoint && (
              <div
                className="tw-stat-meter-endpoint"
                data-meter-endpoint="true"
                style={{ left: `${normalizedMeterPct}%` }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
});
