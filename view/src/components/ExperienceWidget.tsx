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
  const tooltip = `${t(lang, 'experienceProgress')}: ${displayValue} XP`;
  const ringAngle = `${clampedProgressPct * 3.6}deg`;
  const experienceIconSrc = iconMap.experience;
  const bottomLine = `${t(lang, 'level')} ${safeLevel} · ${displayValue}`;

  return (
    <div
      title={tooltip}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
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
          width: '94px',
          height: '94px',
          borderRadius: '50%',
          background: `conic-gradient(#f6f9ff ${ringAngle}, rgba(255,255,255,0.14) ${ringAngle})`,
          padding: '6px',
          boxShadow: '0 0 16px rgba(94, 200, 255, 0.18)',
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
            background: 'radial-gradient(circle at 35% 30%, rgba(54, 58, 74, 0.98), rgba(12, 13, 19, 0.99))',
            border: '1px solid rgba(255, 255, 255, 0.24)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {experienceIconSrc ? (
            <img
              src={experienceIconSrc}
              alt=""
              aria-hidden="true"
              width={68}
              height={68}
              style={{
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}
            />
          ) : null}
        </div>
      </div>
      <span
        style={{
          color: '#ffffff',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          fontWeight: 700,
          textShadow: '1px 1px 2px rgba(0,0,0,0.82)',
          lineHeight: 1.15,
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {bottomLine}
      </span>
    </div>
  );
});
