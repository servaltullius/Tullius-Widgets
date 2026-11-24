import { resolveItemShowWhen, WIDGET_ITEM_IDS } from '../data/widgetItemRegistry';
import { t } from '../i18n/translations';
import type { HudStyle, Language, WidgetItemLayout, WidgetSettings } from '../types/settings';
import type { RuntimeDiagnostics } from '../types/runtime';
import type { CombatStats, PlayerInfo } from '../types/stats';

const CARRY_WARNING_THRESHOLD = 85;
const CARRY_DANGER_THRESHOLD = 100;
const FULL_RESOURCE_PERCENT = 99.5;
export const VITAL_ITEM_IDS = ['player.health', 'player.magicka', 'player.stamina'] as const;

export type HudValueTone = 'default' | 'warning' | 'danger';
export type HudSettingsSyncState = 'idle' | 'retrying' | 'failed' | 'saved';

export interface ExperienceProgress {
  currentXp: number;
  totalXpForNextLevel: number;
}

export interface HudVisibilityInputs {
  visible: boolean;
  hasLiveStats: boolean;
  general: WidgetSettings['general'];
  stats: CombatStats;
  settingsOpen: boolean;
  itemLayouts: Record<string, WidgetItemLayout>;
}

export interface HudVisibilityHistory {
  visible: boolean;
  settingsOpen: boolean;
  freeCamera: boolean;
  lastActiveAt: number | null;
  changeExpiresAt: number | null;
}

interface HudVisibilityParams extends HudVisibilityInputs {
  nowMs: number;
  lastChangeAtByItem: Readonly<Record<string, number>>;
  previous: HudVisibilityHistory | null;
}

export interface HudVisibility {
  render: boolean;
  opacity: 0 | 1;
  itemMask: ReadonlySet<string> | null;
  bypassShowWhen: ReadonlySet<string> | null;
}

export const HIDDEN_HUD: HudVisibility = { render: false, opacity: 0, itemMask: null, bypassShowWhen: null };
const VISIBLE_HUD: HudVisibility = { ...HIDDEN_HUD, render: true, opacity: 1 };

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function formatPercent(value: number): string {
  return `${Math.round(clampPercent(value))}%`;
}

// Resource values turn amber, then red, below these percentages.
export const LOW_RESOURCE_THRESHOLDS = { health: 30, magicka: 25, stamina: 25 } as const;

export function getLowResourceTone(
  percent: number,
  warningThreshold: number,
): HudValueTone {
  const normalized = clampPercent(percent);
  const dangerThreshold = Math.max(5, Math.round(warningThreshold * 0.55));
  if (normalized <= dangerThreshold) return 'danger';
  if (normalized <= warningThreshold) return 'warning';
  return 'default';
}

export function getCarryTone(percent: number): HudValueTone {
  if (percent >= CARRY_DANGER_THRESHOLD) return 'danger';
  if (percent >= CARRY_WARNING_THRESHOLD) return 'warning';
  return 'default';
}

export function formatWeight(value: number): string {
  return value.toFixed(1);
}

// Thousands separators without toLocaleString: these run on every stats update, and locale
// formatting is by far the slowest part of a HUD render (more so in Ultralight).
export function formatThousands(value: number): string {
  const rounded = Math.round(value);
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return rounded < 0 ? `-${digits}` : digits;
}

export function formatGold(value: number): string {
  return formatThousands(value);
}

export function hasMeaningfulDifference(a: number, b: number): boolean {
  return Math.abs(a - b) > 0.05;
}

// The plugin corrects a threshold left over from the previous level. XP at or past the
// threshold is a level-up the player has not taken yet: progress shows full, like the
// vanilla bar, instead of being guessed down to the next level (2026-10-13: 565/495 shown
// as 0/495 on a load order with its own leveling curve).
export function resolveExperienceProgress(playerInfo: PlayerInfo): ExperienceProgress {
  const currentXp = Math.max(0, Math.round(playerInfo.experience));
  const providedTotalXp = Math.max(0, Math.round(playerInfo.nextLevelTotalXp));
  const totalXpForNextLevel = providedTotalXp > 0
    ? providedTotalXp
    : currentXp + Math.max(0, Math.round(playerInfo.expToNextLevel));

  return {
    currentXp,
    totalXpForNextLevel,
  };
}

const RESISTANCE_SIGNATURE_KEYS = ['magic', 'fire', 'frost', 'shock', 'poison', 'disease'] as const;

// Per-item change signature. Clocks and effect countdowns tick on their own, so they are
// deliberately left out: only changes the player should notice (values, equipment, effects
// gained or lost) count.
function collectItemSignature(itemId: string, stats: CombatStats): string | null {
  for (const key of RESISTANCE_SIGNATURE_KEYS) {
    if (itemId === `resistance.${key}`) {
      return `res.${key}:${stats.resistances[key]}|res.${key}.raw:${stats.calcMeta.rawResistances[key]}`;
    }
  }

  switch (itemId) {
    case 'defense.armorRating': return `def.armor:${stats.defense.armorRating}`;
    case 'defense.damageReduction': return `def.reduction:${stats.defense.damageReduction}`;
    case 'offense.rightHandDamage': return `off.right:${stats.offense.rightHandDamage}`;
    case 'offense.leftHandDamage': return `off.left:${stats.offense.leftHandDamage}`;
    case 'offense.critChance': return `off.crit:${stats.offense.critChance}`;
    // Applying a poison (or running out) wakes the slot; single doses used in combat do not.
    case 'equipped.rightHand': return `eq.right:${stats.equipped.rightHand}:${stats.equipped.rightHandPoisonCount > 0}`;
    case 'equipped.leftHand': return `eq.left:${stats.equipped.leftHand}:${stats.equipped.leftHandPoisonCount > 0}`;
    case 'equipped.voice': return `eq.voice:${stats.equipped.voiceType}:${stats.equipped.voice}`;
    case 'equipped.potion': return `eq.potion:${stats.equipped.potionName}:${stats.equipped.potionCount ?? -1}`;
    case 'movement.speedMult': return `move.speed:${stats.movement.speedMult}`;
    case 'time.weather': return `weather:${stats.time.weather}`;
    case 'player.level': return `pi.level:${stats.playerInfo.level}`;
    case 'player.gold': return `pi.gold:${stats.playerInfo.gold}`;
    case 'player.carryWeight': return `pi.carry:${stats.playerInfo.carryWeight}|pi.maxCarry:${stats.playerInfo.maxCarryWeight}`;
    case 'player.health': return `pi.health:${stats.playerInfo.health}`;
    case 'player.magicka': return `pi.magicka:${stats.playerInfo.magicka}`;
    case 'player.stamina': return `pi.stamina:${stats.playerInfo.stamina}`;
    case 'experience.progress':
      return [
        `pi.level:${stats.playerInfo.level}`,
        `xp.current:${stats.playerInfo.experience}`,
        `xp.toNext:${stats.playerInfo.expToNextLevel}`,
        `xp.total:${stats.playerInfo.nextLevelTotalXp}`,
      ].join('|');
    case 'timedEffects.list':
      // Sorted by key: the plugin orders effects by remaining time, so two effects swapping places
      // as they count down is not a change in which effects are active.
      return `effects:${stats.timedEffects
        .map(effect => `${effect.stableKey}:${Math.trunc(effect.totalSec)}:${effect.isDebuff ? 1 : 0}`)
        .sort()
        .join(';')}`;
    default:
      return null;
  }
}

export function buildItemChangeSignatures(
  stats: CombatStats,
  itemLayouts: Record<string, WidgetItemLayout>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const itemId of WIDGET_ITEM_IDS) {
    if (!itemLayouts[itemId]?.visible) continue;
    const signature = collectItemSignature(itemId, stats);
    if (signature !== null) {
      out[itemId] = signature;
    }
  }
  return out;
}

// The compact effect list grows downward from its top edge. Cap the rows so it stops above the
// resource-bar zone at the bottom of the screen (or the screen edge when it was placed lower);
// the list's own "+N" line, which needs one more row, reports the rest.
const COMPACT_EFFECT_ROW_PITCH = 24;
const RESOURCE_BAR_ZONE = 0.91;

export function getCompactEffectRowLimit(
  layout: Pick<WidgetItemLayout, 'y' | 'scale' | 'viewportHeight'> | undefined,
  listLayout: WidgetSettings['timedEffects']['listLayout'],
  fallbackViewportHeight: number,
): number {
  if (!layout) return Number.POSITIVE_INFINITY;
  const viewportHeight = layout.viewportHeight ?? fallbackViewportHeight;
  const barZoneTop = viewportHeight * RESOURCE_BAR_ZONE;
  const bottom = layout.y < barZoneTop ? barZoneTop : viewportHeight;
  const rows = Math.floor((bottom - layout.y) / (COMPACT_EFFECT_ROW_PITCH * Math.max(0.1, layout.scale))) - 1;
  return Math.max(1, rows) * (listLayout === 'horizontal' ? 2 : 1);
}

// The engine reports a two-handed weapon (bow, crossbow, greatsword, battleaxe/warhammer) in
// both hands. Staffs are one-handed and can be dual-wielded, so they are not included.
const TWO_HANDED_KINDS = new Set(['greatsword', 'battleaxe', 'warhammer', 'bow', 'crossbow']);

export function isLeftHandHeldByTwoHanded(stats: CombatStats): boolean {
  const { rightHand, leftHand, rightHandKind } = stats.equipped;
  return TWO_HANDED_KINDS.has(rightHandKind) && rightHand !== '' && leftHand === rightHand;
}

// Classic cards show the extra weapon facts as one small line under the name.
export function buildClassicEquipDetail(stats: CombatStats, hand: 'right' | 'left', lang: Language): string | undefined {
  const equipped = stats.equipped;
  const kind = hand === 'right' ? equipped.rightHandKind : equipped.leftHandKind;
  const chargePct = hand === 'right' ? equipped.rightHandChargePct : equipped.leftHandChargePct;
  const poisonCount = hand === 'right' ? equipped.rightHandPoisonCount : equipped.leftHandPoisonCount;
  const parts: string[] = [];
  if (chargePct !== null) parts.push(t(lang, 'equipDetailCharge').replace('{n}', String(Math.round(chargePct))));
  if (poisonCount > 0) parts.push(t(lang, 'equipDetailPoison').replace('{n}', String(poisonCount)));
  if (equipped.ammoCount !== null && (kind === 'bow' || kind === 'crossbow')) {
    parts.push(t(lang, 'equipDetailAmmo').replace('{n}', formatThousands(equipped.ammoCount)));
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export interface ItemPresenceContext {
  hudStyle: HudStyle;
  nowMs: number;
  lastChangeAtByItem: Readonly<Record<string, number>>;
  changeWindowMs: number;
}

export function isItemPresent(
  itemId: string,
  layout: WidgetItemLayout | undefined,
  stats: CombatStats,
  context: ItemPresenceContext,
): boolean {
  const showWhen = resolveItemShowWhen(itemId, layout, context.hudStyle);
  if (showWhen === 'always') return true;
  const changedAt = context.lastChangeAtByItem[itemId];
  const recentlyChanged = changedAt !== undefined && context.nowMs - changedAt <= context.changeWindowMs;
  if (showWhen === 'combat') return stats.isInCombat;
  if (showWhen === 'change') return recentlyChanged;
  return stats.isInCombat || recentlyChanged;
}

export function getVisibleHudItemIds(
  itemLayouts: Record<string, WidgetItemLayout>,
  stats: CombatStats,
  settingsOpen: boolean,
  presence?: ItemPresenceContext,
  visibility?: Pick<HudVisibility, 'itemMask' | 'bypassShowWhen'>,
): string[] {
  return WIDGET_ITEM_IDS.filter(itemId => {
    const layout = itemLayouts[itemId];
    if (!layout?.visible || (visibility?.itemMask && !visibility.itemMask.has(itemId))) {
      return false;
    }

    if (itemId === 'timedEffects.list') {
      return settingsOpen || stats.timedEffects.length > 0;
    }

    if (presence && !settingsOpen && !visibility?.bypassShowWhen?.has(itemId)) {
      return isItemPresent(itemId, layout, stats, presence);
    }

    return true;
  });
}

export function hasChangeDrivenItems(itemLayouts: Record<string, WidgetItemLayout>, hudStyle: HudStyle): boolean {
  return Object.entries(itemLayouts).some(([itemId, layout]) => {
    if (!layout.visible) return false;
    const showWhen = resolveItemShowWhen(itemId, layout, hudStyle);
    return showWhen === 'change' || showWhen === 'combatOrChange';
  });
}

export function resolveHudVisibility({
  visible,
  hasLiveStats,
  general,
  stats,
  settingsOpen,
  itemLayouts,
  nowMs,
  lastChangeAtByItem,
  previous,
}: HudVisibilityParams): HudVisibility & {
  lastActiveAt: number | null;
  changeExpiresAt: number | null;
  nextCheckAt: number | null;
} {
  const inactive = { lastActiveAt: null, changeExpiresAt: null, nextCheckAt: null };
  if (!hasLiveStats) return { ...HIDDEN_HUD, ...inactive };
  if (settingsOpen) return { ...VISIBLE_HUD, ...inactive };
  if (!visible) return { ...HIDDEN_HUD, ...inactive };

  if (stats.freeCamera) {
    if (general.freeCameraDisplay === 'hide') return { ...HIDDEN_HUD, ...inactive };
    if (general.freeCameraDisplay === 'vitals') {
      const vitals = new Set<string>(VITAL_ITEM_IDS.filter(itemId => itemLayouts[itemId]?.visible));
      return { ...VISIBLE_HUD, itemMask: vitals, bypassShowWhen: vitals, ...inactive };
    }
    return { ...VISIBLE_HUD, ...inactive };
  }

  const { autoHide } = general;
  if (!autoHide.enabled) return { ...VISIBLE_HUD, ...inactive };

  let changeExpiresAt: number | null = null;
  if (autoHide.showOnChange) {
    const windowMs = general.changeDisplaySeconds * 1000;
    for (const [itemId, changedAt] of Object.entries(lastChangeAtByItem)) {
      if (!itemLayouts[itemId]?.visible) continue;
      const expiresAt = changedAt + windowMs;
      if (expiresAt > nowMs && (changeExpiresAt === null || expiresAt > changeExpiresAt)) {
        changeExpiresAt = expiresAt;
      }
    }
  }

  const { healthPct, magickaPct, staminaPct } = stats.alertData;
  const resourcesNotFull = healthPct < FULL_RESOURCE_PERCENT || magickaPct < FULL_RESOURCE_PERCENT
    || staminaPct < FULL_RESOURCE_PERCENT;
  const active = changeExpiresAt !== null
    || (autoHide.showInCombat && stats.isInCombat)
    || (autoHide.showWeaponDrawn && stats.weaponDrawn)
    || (autoHide.showSneaking && stats.sneaking)
    || (autoHide.showResourcesNotFull && resourcesNotFull);
  const resumed = previous !== null && (previous.settingsOpen || !previous.visible || previous.freeCamera);
  let lastActiveAt = previous?.lastActiveAt ?? null;
  if (active || resumed) {
    lastActiveAt = nowMs;
  } else if (previous && previous.changeExpiresAt !== null && previous.changeExpiresAt <= nowMs) {
    // A change remains active until its deadline even if the timer callback runs late.
    lastActiveAt = previous.changeExpiresAt;
  }

  const hideAt = lastActiveAt === null ? null : lastActiveAt + autoHide.hideDelaySeconds * 1000;
  const waitingToHide = hideAt !== null && nowMs < hideAt;
  return {
    ...VISIBLE_HUD,
    opacity: active || waitingToHide ? 1 : 0,
    lastActiveAt,
    changeExpiresAt,
    nextCheckAt: active ? changeExpiresAt : waitingToHide ? hideAt : null,
  };
}

export function getRuntimeWarningText(
  lang: Language,
  runtimeDiagnostics: RuntimeDiagnostics | null,
): string | null {
  if (!runtimeDiagnostics || runtimeDiagnostics.warningCode === 'none') {
    return null;
  }

  switch (runtimeDiagnostics.warningCode) {
    case 'unsupported-runtime':
      return t(lang, 'runtimeWarningUnsupported');
    case 'missing-address-library':
      return t(lang, 'runtimeWarningAddressLibrary');
    case 'unsupported-runtime-and-missing-address-library':
      return t(lang, 'runtimeWarningBoth');
    default:
      return null;
  }
}

export function getSettingsSyncWarningText(
  lang: Language,
  settingsSyncState: HudSettingsSyncState,
  lastSettingsSyncOk: boolean | null,
): string | null {
  if (settingsSyncState === 'retrying') {
    return t(lang, 'settingsSyncRetrying');
  }

  if (settingsSyncState === 'failed' || lastSettingsSyncOk === false) {
    return t(lang, 'settingsSyncFailed');
  }

  return null;
}
