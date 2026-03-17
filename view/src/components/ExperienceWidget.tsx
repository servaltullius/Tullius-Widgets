import { memo } from 'react';
import { iconMap } from '../assets/icons';
import { t } from '../i18n/translations';
import type { Language } from '../types/settings';

interface ExperienceWidgetProps {
  currentXp: number;
  totalXp: number;
  level: number;
  visible: boolean;
  lang: Language;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function formatPercent(value: number): string {
  return `${Math.round(clampPercent(value))}%`;
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString();
}

export const ExperienceWidget = memo(function ExperienceWidget({
  currentXp,
  totalXp,
  level,
  visible,
  lang,
}: ExperienceWidgetProps) {
  if (!visible) return null;

  const safeCurrentXp = Math.max(0, Math.round(currentXp));
  const safeTotalXp = Math.max(0, Math.round(totalXp));
  const progressPct = safeTotalXp > 0 ? (safeCurrentXp / safeTotalXp) * 100 : safeCurrentXp > 0 ? 100 : 0;
  const clampedProgressPct = clampPercent(progressPct);
  const roundedProgressPct = Math.round(clampedProgressPct);
  const displayValue = `${formatInteger(safeCurrentXp)} / ${formatInteger(safeTotalXp)}`;
  const safeLevel = Math.max(1, Math.round(level));
  const helperText = formatPercent(progressPct);
  const tooltip = `${t(lang, 'experienceProgress')}: ${displayValue} XP`;
  const ringAngle = `${clampedProgressPct * 3.6}deg`;
  const experienceIconSrc = iconMap.experience;

  return (
    <div
      title={tooltip}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '2px 0',
      }}
    >
      <div
        role="progressbar"
        aria-label={t(lang, 'experienceProgress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={roundedProgressPct}
        title={tooltip}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: `conic-gradient(#5ec8ff ${ringAngle}, rgba(255,255,255,0.12) ${ringAngle})`,
          padding: '4px',
          boxShadow: '0 0 12px rgba(94, 200, 255, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, rgba(50, 56, 72, 0.96), rgba(15, 17, 24, 0.98))',
            border: '1px solid rgba(94, 200, 255, 0.3)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {experienceIconSrc ? (
            <img
              src={experienceIconSrc}
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
              style={{
                objectFit: 'contain',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))',
              }}
            />
          ) : null}
          <span
            style={{
              position: 'absolute',
              right: '-2px',
              bottom: '-2px',
              minWidth: '22px',
              height: '22px',
              padding: '0 6px',
              borderRadius: '999px',
              background: 'rgba(7, 10, 18, 0.94)',
              border: '1px solid rgba(94, 200, 255, 0.42)',
              boxShadow: '0 0 10px rgba(94, 200, 255, 0.18)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f4fbff',
              fontFamily: 'sans-serif',
              fontSize: '12px',
              fontWeight: 700,
              lineHeight: 1,
              textShadow: '0 1px 2px rgba(0,0,0,0.75)',
            }}
          >
            {safeLevel}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
        <span
          style={{
            color: '#ffffff',
            fontFamily: 'sans-serif',
            fontSize: '18px',
            fontWeight: 700,
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
          }}
        >
          {displayValue}
        </span>
        <span
          style={{
            color: '#9fc2d8',
            fontFamily: 'sans-serif',
            fontSize: '11px',
            fontWeight: 600,
            textShadow: '1px 1px 2px rgba(0,0,0,0.75)',
            opacity: 0.95,
            marginTop: '3px',
          }}
        >
          {helperText}
        </span>
      </div>
    </div>
  );
});
