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

export function TimedEffectList({ effects, maxVisible, emptyLabel }: TimedEffectListProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  const visibleLimit = Math.max(1, maxVisible);
  const sorted = useMemo(() => {
    const active = effects
      .map(effect => ({
        effect,
        displayedRemainingSec: getDisplayedRemainingSec(effect, nowMs),
      }))
      .filter(item => item.displayedRemainingSec > 0.05);

    active.sort((a, b) => {
      if (a.displayedRemainingSec !== b.displayedRemainingSec) {
        return a.displayedRemainingSec - b.displayedRemainingSec;
      }
      if (a.effect.isDebuff !== b.effect.isDebuff) return a.effect.isDebuff ? -1 : 1;
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
      gap: '4px',
      minWidth: '220px',
    }}>
      {visible.map(({ effect, displayedRemainingSec }) => (
        <div
          key={effect.stableKey}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '1px 0',
          }}
        >
          <span style={{
            color: effect.isDebuff ? '#ff7b7b' : '#8cffb0',
            fontFamily: 'sans-serif',
            fontSize: '17px',
            fontWeight: 600,
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '250px',
          }}>
            {getDisplayName(effect)}
          </span>
          <span style={{
            color: '#ffffff',
            fontFamily: 'sans-serif',
            fontSize: '16px',
            fontWeight: 700,
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            minWidth: '46px',
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}>
            {formatRemainingSec(displayedRemainingSec)}
          </span>
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
