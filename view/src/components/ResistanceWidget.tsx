import { memo, type CSSProperties } from 'react';
import { iconMap } from '../assets/icons';
import { standardStatIconMap } from '../data/standardStatIcons';
import type { IconTheme } from '../types/settings';

interface ResistanceWidgetProps {
  icon: string;
  iconColor: string;
  label?: string;
  value: number | string;
  unit?: string;
  visible: boolean;
  iconTheme?: IconTheme;
  min?: number;
  cap?: number;
  format?: (value: number) => string;
  secondaryValue?: number | string;
  secondaryUnit?: string;
  secondaryLabel?: string;
  secondaryTone?: 'neutral' | 'warning';
  tooltip?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16) || 0;
  const g = Number.parseInt(normalized.slice(2, 4), 16) || 0;
  const b = Number.parseInt(normalized.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function resolveValueColor(isAtCap: boolean, isNegative: boolean): string {
  if (isAtCap) return '#d7c79a';
  if (isNegative) return '#d98378';
  return '#f2f4f5';
}

function formatDisplayValue(
  value: number | string,
  unit: string,
  min?: number,
  cap?: number,
  format?: (value: number) => string,
): string {
  if (typeof value !== 'number') {
    return `${value}${unit}`;
  }

  let displayValue = value;
  if (min !== undefined) displayValue = Math.max(displayValue, min);
  if (cap !== undefined) displayValue = Math.min(displayValue, cap);
  return `${format ? format(displayValue) : Math.round(displayValue).toString()}${unit}`;
}

export const ResistanceWidget = memo(function ResistanceWidget({
  icon,
  iconColor,
  label,
  value,
  unit = '',
  visible,
  iconTheme = 'standard',
  min,
  cap,
  format,
  secondaryValue,
  secondaryUnit = '',
  secondaryLabel,
  secondaryTone = 'neutral',
  tooltip,
}: ResistanceWidgetProps) {
  if (!visible) return null;

  const iconSrc = iconTheme === 'dororong' ? iconMap[icon] : undefined;
  const StandardIcon = standardStatIconMap[icon];
  const primaryDisplayValue = formatDisplayValue(value, unit, min, cap, format);
  const secondaryDisplayValue = secondaryValue === undefined
    ? null
    : formatDisplayValue(secondaryValue, secondaryUnit, undefined, undefined, format);
  const isAtCap = typeof value === 'number' && cap !== undefined && value >= cap;
  const isNegative = typeof value === 'number' && value < 0;
  const secondaryColor = secondaryTone === 'warning' ? '#d6a65f' : '#7f888f';
  const widgetStyle = {
    '--tw-icon-color': iconColor,
    '--tw-icon-accent': hexToRgba(iconColor, 0.88),
    '--tw-icon-border': hexToRgba(iconColor, 0.46),
    '--tw-icon-tint': hexToRgba(iconColor, 0.16),
    '--tw-icon-glow': hexToRgba(iconColor, 0.3),
    '--tw-value-color': resolveValueColor(isAtCap, isNegative),
    '--tw-secondary-color': secondaryColor,
  } as CSSProperties;

  return (
    <div
      className="tw-resistance-widget"
      data-resistance-widget="true"
      style={widgetStyle}
      title={tooltip}
    >
      <div
        className="tw-resistance-icon-frame"
        data-resistance-icon="true"
        data-standard-icon={icon}
        data-resistance-icon-fallback={!iconSrc ? 'true' : undefined}
        data-icon-theme={iconTheme}
        style={{ width: 30, height: 30 }}
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={icon}
            className="tw-resistance-icon-image"
            style={{ left: -4, top: -4, width: 38, height: 38 }}
          />
        ) : StandardIcon ? (
          <StandardIcon size={16} color="currentColor" strokeWidth={1.9} />
        ) : null}
      </div>

      <div className="tw-resistance-copy">
        {label && (
          <span className="tw-resistance-label" data-resistance-label="true">
            {label}
          </span>
        )}
        <div className="tw-resistance-values">
          <span className="tw-resistance-primary" data-resistance-primary="true">
            {primaryDisplayValue}
          </span>
          {secondaryDisplayValue && (
            <span className="tw-resistance-secondary" data-resistance-secondary="true">
              {secondaryLabel ? `${secondaryLabel} ` : ''}{secondaryDisplayValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
