import { useEffect, useMemo, useState } from 'react';
import type { TimedEffect } from '../types/stats';

interface TimedEffectListProps {
  effects: TimedEffect[];
  maxVisible: number;
  emptyLabel: string;
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

export function TimedEffectList({ effects, maxVisible, emptyLabel }: TimedEffectListProps) {
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
    return (
      <div style={{
        color: '#a0a0a0',
        fontFamily: 'sans-serif',
        fontSize: '15px',
        fontWeight: 500,
        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
        whiteSpace: 'nowrap',
      }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      minWidth: '240px',
    }}>
      {visible.map(({ effect, displayedRemainingSec, progressPct, urgent }) => (
        <div
          key={effect.stableKey}
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '7px 10px 9px',
            borderRadius: '10px',
            background: effect.isDebuff
              ? 'linear-gradient(135deg, rgba(120, 28, 28, 0.34) 0%, rgba(32, 12, 12, 0.7) 100%)'
              : 'linear-gradient(135deg, rgba(22, 92, 54, 0.26) 0%, rgba(10, 20, 16, 0.68) 100%)',
            border: effect.isDebuff
              ? '1px solid rgba(255, 123, 123, 0.26)'
              : '1px solid rgba(140, 255, 176, 0.22)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: '3px',
            width: `${progressPct}%`,
            background: urgent
              ? '#ffd36a'
              : effect.isDebuff ? '#ff8d8d' : '#8cffb0',
            boxShadow: urgent
              ? '0 0 10px rgba(255, 211, 106, 0.65)'
              : effect.isDebuff
                ? '0 0 10px rgba(255, 141, 141, 0.55)'
                : '0 0 10px rgba(140, 255, 176, 0.45)',
          }} />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{
              color: effect.isDebuff ? '#ff9a9a' : '#b7ffd0',
              fontFamily: 'sans-serif',
              fontSize: '16px',
              fontWeight: urgent ? 700 : 600,
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '210px',
            }}>
              {getPrimaryLabel(effect)}
            </span>
            {getSecondaryLabel(effect) && (
              <span style={{
                color: '#c7d0dc',
                fontFamily: 'sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                textShadow: '1px 1px 2px rgba(0,0,0,0.75)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '210px',
              }}>
                {getSecondaryLabel(effect)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '52px' }}>
            <span style={{
              color: urgent ? '#ffd36a' : '#ffffff',
              fontFamily: 'sans-serif',
              fontSize: '16px',
              fontWeight: 700,
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              textAlign: 'right',
              whiteSpace: 'nowrap',
            }}>
              {formatRemainingSec(displayedRemainingSec)}
            </span>
            <span style={{
              color: '#b8c2d0',
              fontFamily: 'sans-serif',
              fontSize: '11px',
              fontWeight: 600,
              textShadow: '1px 1px 2px rgba(0,0,0,0.75)',
              whiteSpace: 'nowrap',
            }}>
              {Math.round(progressPct)}%
            </span>
          </div>
        </div>
      ))}

      {hiddenCount > 0 && (
        <div style={{
          color: '#cfcfcf',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          textAlign: 'right',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
        }}>
          +{hiddenCount}
        </div>
      )}
    </div>
  );
}
