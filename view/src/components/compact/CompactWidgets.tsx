import { memo, useEffect, useRef, useState } from 'react';
import {
  Axe,
  BowArrow,
  Crosshair,
  Flame,
  Hammer,
  Hand,
  HandFist,
  HeartPulse,
  Shield,
  Sparkles,
  Sword,
  Swords,
  Wand,
  WandSparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { standardStatIconMap } from '../../data/standardStatIcons';
import type { EquippedItemKind } from '../../types/stats';

export type CompactTone = 'default' | 'warning' | 'danger' | 'capped' | 'muted';

interface CompactStatProps {
  icon: string;
  iconColor: string;
  value: string;
  unit?: string;
  label?: string;
  tone?: CompactTone;
  sub?: string;
  iconSize?: number;
  title?: string;
}

export const CompactStat = memo(function CompactStat({
  icon,
  iconColor,
  value,
  unit,
  label,
  tone = 'default',
  sub,
  iconSize = 15,
  title,
}: CompactStatProps) {
  const Icon = standardStatIconMap[icon];
  return (
    <div title={title} data-compact-item="stat" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {Icon && <Icon size={iconSize} strokeWidth={2.1} color={iconColor} aria-hidden="true" style={{ flex: 'none' }} />}
      {label && <span className="tw-compact-label">{label}</span>}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span className="tw-compact-value" data-tone={tone}>
          {value}
          {unit && <span className="tw-compact-unit">{unit}</span>}
        </span>
        {sub && <span className="tw-compact-sub" style={{ marginTop: 2 }}>{sub}</span>}
      </div>
    </div>
  );
});

interface CompactResistanceProps {
  icon: string;
  iconColor: string;
  value: number;
  raw: number;
  cap?: number;
  min?: number;
  rawLabel: string;
  showRaw: 'auto' | 'always' | 'never';
  title?: string;
}

function formatSignedPercent(value: number): string {
  return `${Math.round(value)}`;
}

export const CompactResistance = memo(function CompactResistance({
  icon,
  iconColor,
  value,
  raw,
  cap,
  min,
  rawLabel,
  showRaw,
  title,
}: CompactResistanceProps) {
  const Icon = standardStatIconMap[icon];
  const rounded = Math.round(value);
  const differs = Math.abs(raw - value) > 0.5;
  const capped = cap !== undefined && raw > cap + 0.05;
  const tone: CompactTone = rounded < 0 || (min !== undefined && raw < min - 0.05)
    ? 'danger'
    : capped ? 'capped' : rounded === 0 ? 'muted' : 'default';
  const rawVisible = showRaw === 'always' || (showRaw === 'auto' && differs);

  return (
    <div title={title} data-compact-item="resistance" style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 54 }}>
      {Icon && <Icon size={16} strokeWidth={2.1} color={iconColor} aria-hidden="true" style={{ flex: 'none' }} />}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span className="tw-compact-value" data-tone={tone}>
          {formatSignedPercent(value)}
          <span className="tw-compact-unit">%</span>
        </span>
        {rawVisible && (
          <span className="tw-compact-sub" style={{ marginTop: 2 }}>
            {rawLabel} {Math.round(raw)}
          </span>
        )}
      </div>
    </div>
  );
});

interface CompactResourceProps {
  icon: string;
  color: string;
  value: number;
  pct: number;
  tone: 'default' | 'warning' | 'danger';
}

export const CompactResource = memo(function CompactResource({ icon, color, value, pct, tone }: CompactResourceProps) {
  const Icon = standardStatIconMap[icon];
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div data-compact-item="resource" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {Icon && <Icon size={14} strokeWidth={2.1} color={color} aria-hidden="true" style={{ flex: 'none' }} />}
      <div style={{ width: 96, height: 6, background: 'rgba(8, 8, 8, 0.55)', boxShadow: '0 0 0 1px var(--c-line)' }}>
        <div style={{ width: `${clamped}%`, height: 6, background: color }} />
      </div>
      <span className="tw-compact-value" data-tone={tone === 'default' ? 'default' : tone} style={{ fontSize: 13 }}>
        {Math.round(value)}
      </span>
    </div>
  );
});

interface CompactExperienceRingProps {
  level: number;
  currentXp: number;
  totalXp: number;
  xpLabel: string;
}

const RING_SIZE = 50;
const RING_RADIUS = 21;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const CompactExperienceRing = memo(function CompactExperienceRing({
  level,
  currentXp,
  totalXp,
  xpLabel,
}: CompactExperienceRingProps) {
  const pct = totalXp > 0 ? Math.max(0, Math.min(1, currentXp / totalXp)) : 0;
  const dash = Math.max(0.001, RING_CIRCUMFERENCE * pct);
  return (
    <div data-compact-item="experience" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, flex: 'none' }}>
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} aria-hidden="true" style={{ filter: 'none' }}>
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="rgba(10, 9, 8, 0.5)" stroke="rgba(236, 231, 219, 0.16)" strokeWidth={3} />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--c-gold)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${RING_CIRCUMFERENCE}`}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </svg>
        <span
          className="tw-compact-value"
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700 }}
        >
          {level}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="tw-compact-label">{xpLabel} {Math.floor(pct * 100)}%</span>
        <span className="tw-compact-value" style={{ fontSize: 13 }}>
          {Math.round(currentXp).toLocaleString('en-US')}
          <span className="tw-compact-unit"> / {Math.round(totalXp).toLocaleString('en-US')}</span>
        </span>
      </div>
    </div>
  );
});

const EQUIP_KIND_ICONS: Record<EquippedItemKind, LucideIcon> = {
  empty: Hand,
  unarmed: HandFist,
  sword: Sword,
  dagger: Sword,
  waraxe: Axe,
  mace: Hammer,
  greatsword: Swords,
  battleaxe: Axe,
  warhammer: Hammer,
  bow: BowArrow,
  crossbow: Crosshair,
  staff: Wand,
  spell: WandSparkles,
  destruction: Flame,
  restoration: HeartPulse,
  alteration: Shield,
  illusion: Sparkles,
  conjuration: WandSparkles,
  shield: Shield,
  torch: Flame,
  other: Zap,
};

const VOICE_ICON = standardStatIconMap.voice;

// lucide has no dagger; a short blade with a cross guard keeps it distinct from the sword.
function DaggerIcon({ size, color, strokeWidth }: { size: number; color: string; strokeWidth: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.5 3.5l3 3-8 8-3-3z" />
      <path d="M8 11l5 5" />
      <path d="M10.5 13.5l-5 5" />
      <path d="M4 20l1.5-1.5" />
    </svg>
  );
}

export type EquipSlotKey = 'R' | 'L' | 'Z';
export type EquipNameDisplay = 'always' | 'onChange' | 'never';

interface CompactEquipSlotProps {
  slotKey: EquipSlotKey;
  name: string;
  emptyLabel: string;
  kind: EquippedItemKind;
  value?: number;
  nameDisplay: EquipNameDisplay;
  accent?: string;
}

const NAME_FLASH_MS = 3000;

export const CompactEquipSlot = memo(function CompactEquipSlot({
  slotKey,
  name,
  emptyLabel,
  kind,
  value,
  nameDisplay,
  accent,
}: CompactEquipSlotProps) {
  const [flashName, setFlashName] = useState<string | null>(null);
  const previousNameRef = useRef(name);

  useEffect(() => {
    if (previousNameRef.current === name) return;
    previousNameRef.current = name;
    if (nameDisplay !== 'onChange') return;
    const show = window.setTimeout(() => setFlashName(name), 0);
    const hide = window.setTimeout(() => setFlashName(null), NAME_FLASH_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [name, nameDisplay]);

  const isEmpty = kind === 'empty' || !name;
  const Icon = slotKey === 'Z' ? VOICE_ICON : EQUIP_KIND_ICONS[kind] ?? EQUIP_KIND_ICONS.other;
  const visibleName = nameDisplay === 'always' ? (name || emptyLabel) : nameDisplay === 'onChange' ? flashName : null;
  const highlighted = nameDisplay === 'onChange' && flashName !== null;
  const showValue = value !== undefined && value > 0 && !isEmpty;

  return (
    <div data-compact-item="equip-slot" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 54 }}>
      <div
        style={{
          position: 'relative',
          width: 54,
          height: 60,
          boxSizing: 'border-box',
          background: 'var(--c-surface)',
          borderRadius: 3,
          boxShadow: highlighted
            ? '0 0 0 1px rgba(230, 196, 120, 0.9)'
            : isEmpty ? '0 0 0 1px rgba(236, 231, 219, 0.14)' : '0 0 0 1px rgba(236, 231, 219, 0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="tw-compact-label" style={{ position: 'absolute', left: 5, top: 3, fontSize: 10, fontWeight: 700, color: accent ?? 'var(--c-text-2)' }}>
          {slotKey}
        </span>
        {slotKey !== 'Z' && kind === 'dagger' ? (
          <DaggerIcon size={26} strokeWidth={1.7} color="var(--c-text)" />
        ) : Icon && (
          <Icon
            size={26}
            strokeWidth={1.7}
            color={isEmpty ? 'rgba(236, 231, 219, 0.35)' : 'var(--c-text)'}
            aria-hidden="true"
          />
        )}
        {showValue && (
          <span className="tw-compact-value" style={{ position: 'absolute', right: 5, bottom: 3, fontSize: 12, fontWeight: 700 }}>
            {Math.round(value)}
          </span>
        )}
      </div>
      <span
        className="tw-compact-label"
        data-compact-equip-name
        style={{ fontSize: 11, color: 'var(--c-text)', height: 14, maxWidth: 108, overflow: 'hidden', textOverflow: 'ellipsis', visibility: visibleName ? 'visible' : 'hidden' }}
      >
        {visibleName ?? ' '}
      </span>
    </div>
  );
});
