import { memo } from 'react';
import { StatWidget } from './StatWidget';
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
  const safeCurrentXp = Math.max(0, Math.round(currentXp));
  const safeTotalXp = Math.max(safeCurrentXp, Math.round(totalXp));
  const progressPct = safeTotalXp > 0 ? (safeCurrentXp / safeTotalXp) * 100 : 0;
  const displayValue = `${formatInteger(safeCurrentXp)} / ${formatInteger(safeTotalXp)}`;
  const helperText = `${t(lang, 'level')} ${Math.max(1, Math.round(level))} · ${formatPercent(progressPct)}`;
  const tooltip = `${t(lang, 'experienceProgress')}: ${displayValue} XP`;

  return (
    <StatWidget
      icon="experience"
      iconColor="#5ec8ff"
      value={displayValue}
      visible={visible}
      helperText={helperText}
      helperTone="neutral"
      tooltip={tooltip}
      valueMaxWidth={320}
      helperMaxWidth={320}
    />
  );
});
