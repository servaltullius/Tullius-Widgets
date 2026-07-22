import { useEffect, useMemo, useState } from 'react';
import type { TimedEffect } from '../types/stats';

interface TimedEffectListProps {
  effects: TimedEffect[];
  maxVisible: number;
  emptyLabel: string;
  layout?: 'vertical' | 'horizontal';
}

function formatRemainingSec(value: number): string {
  return `${Math.max(0, Math.round(value))}s`;
}

function getDisplayedRemainingSec(effect: TimedEffect, nowMs: number): number {
  const elapsedSec = Math.max(0, (nowMs - effect.snapshotAtMs) / 1000);
  return Math.max(0, effect.remainingSec - elapsedSec);
}

function getDisplayName(effect: TimedEffect): string {
  const source = effect.sourceName.trim();
  const detail = effect.effectName.trim();

  if (!source && !detail) return '';
  if (!source) return detail;
  if (!detail || detail === source) return source;
  return `${source} (${detail})`;
}

function getPrimaryLabel(effect: TimedEffect): string {
  const source = effect.sourceName.trim();
  const detail = effect.effectName.trim();
  return source || detail;
}

function getSecondaryLabel(effect: TimedEffect): string | null {
  const source = effect.sourceName.trim();
  const detail = effect.effectName.trim();
  if (!source || !detail || source === detail) return null;
  return detail;
}

function getProgressPct(effect: TimedEffect, displayedRemainingSec: number): number {
  if (effect.totalSec <= 0) return 0;
  return Math.min(100, Math.max(0, (displayedRemainingSec / effect.totalSec) * 100));
}

function isUrgentEffect(effect: TimedEffect, displayedRemainingSec: number): boolean {
  if (displayedRemainingSec <= 5) return true;
  if (effect.totalSec <= 0) return false;
  return displayedRemainingSec / effect.totalSec <= 0.15;
}

export function TimedEffectList({
  effects,
  maxVisible,
  emptyLabel,
  layout = 'vertical',
}: TimedEffectListProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  const visibleLimit = Math.max(1, maxVisible);
  const sorted = useMemo(() => {
    const active = effects
      .map(effect => ({
        effect,
        displayedRemainingSec: getDisplayedRemainingSec(effect, nowMs),
        progressPct: 0,
        urgent: false,
      }))
      .filter(item => item.displayedRemainingSec > 0.05);

    for (const item of active) {
      item.progressPct = getProgressPct(item.effect, item.displayedRemainingSec);
      item.urgent = isUrgentEffect(item.effect, item.displayedRemainingSec);
    }

    active.sort((a, b) => {
      if (a.effect.isDebuff !== b.effect.isDebuff) return a.effect.isDebuff ? -1 : 1;
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      if (a.displayedRemainingSec !== b.displayedRemainingSec) {
        return a.displayedRemainingSec - b.displayedRemainingSec;
      }
      const nameA = getDisplayName(a.effect);
      const nameB = getDisplayName(b.effect);
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return a.effect.instanceId - b.effect.instanceId;
    });

    return active;
  }, [effects, nowMs]);

  const visible = sorted.slice(0, visibleLimit);
  const hiddenCount = Math.max(0, sorted.length - visible.length);

  if (visible.length === 0) {
    return <div className="tw-effect-empty">{emptyLabel}</div>;
  }

  return (
    <div className="tw-effect-list" data-layout={layout}>
      {visible.map(({ effect, displayedRemainingSec, progressPct, urgent }) => (
        <div
          className="tw-effect-row"
          data-debuff={effect.isDebuff ? 'true' : 'false'}
          data-urgent={urgent ? 'true' : 'false'}
          key={effect.stableKey}
        >
          <div className="tw-effect-labels">
            <span className="tw-effect-primary">{getPrimaryLabel(effect)}</span>
            {getSecondaryLabel(effect) && (
              <span className="tw-effect-secondary">{getSecondaryLabel(effect)}</span>
            )}
          </div>
          <div className="tw-effect-time-copy">
            <span className="tw-effect-time">{formatRemainingSec(displayedRemainingSec)}</span>
            <span className="tw-effect-percent">{Math.round(progressPct)}%</span>
          </div>
          <div className="tw-effect-progress" aria-hidden="true">
            <div className="tw-effect-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      ))}

      {hiddenCount > 0 && (
        <div className="tw-effect-hidden-count">+{hiddenCount}</div>
      )}
    </div>
  );
}
