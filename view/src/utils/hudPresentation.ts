import { resolveItemShowWhen, WIDGET_ITEM_IDS } from '../data/widgetItemRegistry';
import { t } from '../i18n/translations';
import type { HudStyle, Language, WidgetItemLayout, WidgetSettings } from '../types/settings';
import type { RuntimeDiagnostics } from '../types/runtime';
import type { CombatStats, PlayerInfo } from '../types/stats';

const CARRY_WARNING_THRESHOLD = 85;
const CARRY_DANGER_THRESHOLD = 100;
const XP_STALE_TOLERANCE = 1;

export type HudValueTone = 'default' | 'warning' | 'danger';
export type HudSettingsSyncState = 'idle' | 'retrying' | 'failed' | 'saved';

export interface ExperienceProgress {
  currentXp: number;
  totalXpForNextLevel: number;
}

interface HudVisibilityParams {
  visible: boolean;
  hasLiveStats: boolean;
  settings: WidgetSettings;
  stats: CombatStats;
  settingsOpen: boolean;
  nowMs: number;
  lastChangeAtMs: number;
}

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function formatPercent(value: number): string {
  return `${Math.round(clampPercent(value))}%`;
}

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

export function resolveExperienceProgress(playerInfo: PlayerInfo): ExperienceProgress {
  let currentXp = Math.max(0, Math.round(playerInfo.experience));
  const rawNextLevelXp = Math.max(0, Math.round(playerInfo.expToNextLevel));
  const providedTotalXp = Math.max(0, Math.round(playerInfo.nextLevelTotalXp));
  const expectedThreshold = Math.max(0, Math.round(playerInfo.expectedLevelThreshold));
  let totalXpForNextLevel = Math.max(currentXp + rawNextLevelXp, providedTotalXp);

  if (
    currentXp >= totalXpForNextLevel
    && totalXpForNextLevel > 0
    && expectedThreshold > 0
    && Math.abs(totalXpForNextLevel - expectedThreshold) > XP_STALE_TOLERANCE
  ) {
    currentXp = Math.max(0, currentXp - totalXpForNextLevel);
    totalXpForNextLevel = expectedThreshold;
  }

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
      return `effects:${stats.timedEffects
        .map(effect => `${effect.stableKey}:${Math.trunc(effect.totalSec)}:${effect.isDebuff ? 1 : 0}`)
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
  for (const itemId of getVisibleHudItemIds(itemLayouts, stats, false)) {
    const signature = collectItemSignature(itemId, stats);
    if (signature !== null) {
      out[itemId] = signature;
    }
  }
  return out;
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

export function joinTrackedChangeSignature(isInCombat: boolean, itemSignatures: Record<string, string>): string {
  return [`combat:${isInCombat ? 1 : 0}`, ...Object.values(itemSignatures)].join('|');
}

export function buildTrackedChangeSignature(
  stats: CombatStats,
  itemLayouts: Record<string, WidgetItemLayout>,
): string {
  return joinTrackedChangeSignature(stats.isInCombat, buildItemChangeSignatures(stats, itemLayouts));
}

export interface ItemPresenceContext {
  hudStyle: HudStyle;
  nowMs: number;
  lastChangeAtByItem: Record<string, number>;
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
): string[] {
  return WIDGET_ITEM_IDS.filter(itemId => {
    const layout = itemLayouts[itemId];
    if (!layout?.visible) {
      return false;
    }

    if (itemId === 'timedEffects.list') {
      return settingsOpen || stats.timedEffects.length > 0;
    }

    if (presence && !settingsOpen) {
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
  settings,
  stats,
  settingsOpen,
  nowMs,
  lastChangeAtMs,
}: HudVisibilityParams): { changeWindowActive: boolean; shouldShow: boolean } {
  const changeWindowActive =
    !settings.general.showOnChangeOnly
    || settingsOpen
    || (nowMs - lastChangeAtMs) <= settings.general.changeDisplaySeconds * 1000;
  const editModeVisible = settingsOpen && hasLiveStats;

  return {
    changeWindowActive,
    shouldShow:
      hasLiveStats
      && (
        editModeVisible
        || (
          visible
          && (!settings.general.combatOnly || stats.isInCombat)
          && changeWindowActive
        )
      ),
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
