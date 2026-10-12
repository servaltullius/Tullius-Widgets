import { useEffect, useMemo, useState } from 'react';
import {
  Battery,
  BookOpen,
  Bug,
  CircleDot,
  Droplets,
  Eye,
  EyeOff,
  Flame,
  Ghost,
  Heart,
  Hourglass,
  Orbit,
  Shield,
  ShieldOff,
  Skull,
  Snowflake,
  Sparkles,
  Waves,
  Weight,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { EffectCategory, TimedEffect } from '../types/stats';

const EFFECT_CATEGORY_ICONS: Record<EffectCategory, LucideIcon> = {
  health: Heart,
  magicka: Droplets,
  stamina: Battery,
  fire: Flame,
  frost: Snowflake,
  shock: Zap,
  magic: Sparkles,
  poison: Skull,
  disease: Bug,
  armor: Shield,
  speed: Wind,
  weight: Weight,
  water: Waves,
  invisibility: EyeOff,
  paralysis: ShieldOff,
  vision: Eye,
  cloak: Orbit,
  time: Hourglass,
  ethereal: Ghost,
  skill: BookOpen,
  other: CircleDot,
};

const EFFECT_CATEGORY_COLORS: Partial<Record<EffectCategory, string>> = {
  health: '#d87a70',
  magicka: '#7fa6dc',
  stamina: '#8fbf86',
  fire: '#e08a6c',
  frost: '#98c6dc',
  shock: '#d9c96f',
  magic: '#b9a0d6',
  poison: '#9cbf90',
  disease: '#b6ad93',
  armor: '#c9c2b3',
  skill: '#d2bb83',
};

// Magnitudes are only meaningful as a number for stat-like effects.
const MAGNITUDE_CATEGORIES = new Set<EffectCategory>([
  'health', 'magicka', 'stamina', 'fire', 'frost', 'shock', 'magic', 'poison', 'disease', 'armor', 'speed', 'weight', 'skill',
]);

interface TimedEffectListProps {
  effects: TimedEffect[];
  maxVisible: number;
  emptyLabel: string;
  layout?: 'vertical' | 'horizontal';
  variant?: 'card' | 'compact';
}

function formatCompactRemaining(value: number): string {
  const total = Math.max(0, Math.round(value));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}:${String(total % 60).padStart(2, '0')}`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
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
  variant = 'card',
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
    return <div className={variant === 'compact' ? 'tw-ceffect-empty' : 'tw-effect-empty'}>{emptyLabel}</div>;
  }

  if (variant === 'compact') {
    return (
      <div className="tw-ceffect-list" data-layout={layout}>
        {visible.map(({ effect, displayedRemainingSec, progressPct, urgent }) => (
          <div
            className="tw-ceffect-row"
            data-debuff={effect.isDebuff ? 'true' : 'false'}
            data-urgent={urgent ? 'true' : 'false'}
            key={effect.stableKey}
          >
            <span className="tw-ceffect-name">
              {(() => {
                const CategoryIcon = EFFECT_CATEGORY_ICONS[effect.category] ?? CircleDot;
                return (
                  <CategoryIcon
                    size={12}
                    strokeWidth={2.2}
                    color={effect.isDebuff ? '#e8786d' : EFFECT_CATEGORY_COLORS[effect.category] ?? '#c3bdb0'}
                    aria-hidden="true"
                    style={{ flex: 'none' }}
                  />
                );
              })()}
              <span className="tw-ceffect-label">{getPrimaryLabel(effect)}</span>
              {MAGNITUDE_CATEGORIES.has(effect.category) && Math.round(effect.magnitude) > 0 && (
                <span className="tw-ceffect-magnitude">
                  {effect.isDebuff ? '\u2212' : '+'}{Math.round(effect.magnitude)}
                </span>
              )}
            </span>
            {/* Keyed so each new value is a fresh node: Prisma UI does not repaint a text run that
                grew wider in place. */}
            <span key={formatCompactRemaining(displayedRemainingSec)} className="tw-ceffect-time">{formatCompactRemaining(displayedRemainingSec)}</span>
            <span className="tw-ceffect-track" aria-hidden="true">
              <span className="tw-ceffect-fill" style={{ width: `${progressPct}%` }} />
            </span>
          </div>
        ))}
        {hiddenCount > 0 && <div className="tw-ceffect-more">+{hiddenCount}</div>}
      </div>
    );
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
