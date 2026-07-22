import { memo } from 'react';
import { iconMap } from '../assets/icons';
import { t } from '../i18n/translations';
import type { IconTheme, Language } from '../types/settings';
import { getExperienceProgressPresentation } from './experiencePresentation';

interface ExperienceWidgetProps {
  currentXp: number;
  totalXp: number;
  level: number;
  visible: boolean;
  lang: Language;
  iconTheme?: IconTheme;
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
  iconTheme = 'standard',
}: ExperienceWidgetProps) {
  if (!visible) return null;

  const {
    safeCurrentXp,
    safeTotalXp,
    percent,
  } = getExperienceProgressPresentation(currentXp, totalXp);
  const currentDisplay = formatInteger(safeCurrentXp);
  const totalDisplay = formatInteger(safeTotalXp);
  const displayValue = `${currentDisplay} / ${totalDisplay}`;
  const safeLevel = Math.max(1, Math.round(level));
  const tooltip = `${t(lang, 'experienceProgress')}: ${displayValue} XP`;
  const experienceIconSrc = iconTheme === 'dororong' ? iconMap.experience : undefined;

  return (
    <div className="tw-experience-widget" title={tooltip} data-experience-widget="true">
      <div
        className="tw-experience-level-mark"
        data-experience-icon-theme={iconTheme}
        aria-label={`${t(lang, 'level')} ${safeLevel}`}
      >
        {experienceIconSrc ? (
          <img
            src={experienceIconSrc}
            alt=""
            aria-hidden="true"
            data-experience-image="true"
          />
        ) : (
          <span data-experience-level-value="true">{safeLevel}</span>
        )}
      </div>

      <div className="tw-experience-copy">
        <div className="tw-experience-meta">
          <span className="tw-experience-level-label">
            {t(lang, 'level')} {safeLevel}
          </span>
          <span className="tw-experience-value" data-experience-value="true">
            {currentDisplay}<small> / {totalDisplay}</small>
          </span>
        </div>
        <div
          className="tw-experience-track"
          role="progressbar"
          aria-label={t(lang, 'experienceProgress')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          title={tooltip}
        >
          <div
            className="tw-experience-fill"
            data-testid="experience-bar-fill"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
});
