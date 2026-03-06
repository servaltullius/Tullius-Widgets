import { t } from '../i18n/translations';
import type { Language, WidgetSettings } from '../types/settings';
import type { RuntimeDiagnostics } from '../types/runtime';
import type { CombatStats, PlayerInfo } from '../types/stats';

const CARRY_WARNING_THRESHOLD = 85;
const CARRY_DANGER_THRESHOLD = 100;
const XP_STALE_TOLERANCE = 1;

export type HudValueTone = 'default' | 'warning' | 'danger';
export type HudSettingsSyncState = 'idle' | 'retrying' | 'failed' | 'saved';

export interface VisibleWidgetGroups {
  hasVisibleResistance: boolean;
  hasVisibleDefense: boolean;
  hasVisibleOffense: boolean;
  hasVisibleEquipped: boolean;
  hasVisibleTime: boolean;
  hasVisibleTimedEffects: boolean;
  hasVisibleMovement: boolean;
  hasVisibleExperience: boolean;
  hasVisiblePlayerInfo: boolean;
}

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

export function formatGold(value: number): string {
  return value.toLocaleString();
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

export function buildTrackedChangeSignature(
  stats: CombatStats,
  settings: WidgetSettings,
  nowMs: number,
): string {
  const parts: string[] = [`combat:${stats.isInCombat ? 1 : 0}`];

  if (settings.resistances.magic) parts.push(`res.magic:${stats.resistances.magic}`);
  if (settings.resistances.fire) parts.push(`res.fire:${stats.resistances.fire}`);
  if (settings.resistances.frost) parts.push(`res.frost:${stats.resistances.frost}`);
  if (settings.resistances.shock) parts.push(`res.shock:${stats.resistances.shock}`);
  if (settings.resistances.poison) parts.push(`res.poison:${stats.resistances.poison}`);
  if (settings.resistances.disease) parts.push(`res.disease:${stats.resistances.disease}`);
  if (settings.defense.armorRating) parts.push(`def.armor:${stats.defense.armorRating}`);
  if (settings.defense.damageReduction) parts.push(`def.reduction:${stats.defense.damageReduction}`);
  if (settings.offense.rightHandDamage) parts.push(`off.right:${stats.offense.rightHandDamage}`);
  if (settings.offense.leftHandDamage) parts.push(`off.left:${stats.offense.leftHandDamage}`);
  if (settings.offense.critChance) parts.push(`off.crit:${stats.offense.critChance}`);
  if (settings.equipped.rightHand) parts.push(`eq.right:${stats.equipped.rightHand}`);
  if (settings.equipped.leftHand) parts.push(`eq.left:${stats.equipped.leftHand}`);
  if (settings.movement.speedMult) parts.push(`move.speed:${stats.movement.speedMult}`);
  if (settings.playerInfo.level) parts.push(`pi.level:${stats.playerInfo.level}`);
  if (settings.playerInfo.gold) parts.push(`pi.gold:${stats.playerInfo.gold}`);
  if (settings.playerInfo.carryWeight) {
    parts.push(`pi.carry:${stats.playerInfo.carryWeight}`);
    parts.push(`pi.maxCarry:${stats.playerInfo.maxCarryWeight}`);
  }
  if (settings.playerInfo.health) parts.push(`pi.health:${stats.playerInfo.health}`);
  if (settings.playerInfo.magicka) parts.push(`pi.magicka:${stats.playerInfo.magicka}`);
  if (settings.playerInfo.stamina) parts.push(`pi.stamina:${stats.playerInfo.stamina}`);

  if (settings.experience.enabled) {
    parts.push(`xp.current:${stats.playerInfo.experience}`);
    parts.push(`xp.toNext:${stats.playerInfo.expToNextLevel}`);
    parts.push(`xp.total:${stats.playerInfo.nextLevelTotalXp}`);
  }

  if (settings.time.gameDateTime) {
    parts.push(`time.year:${stats.time.year}`);
    parts.push(`time.month:${stats.time.month}`);
    parts.push(`time.day:${stats.time.day}`);
    parts.push(`time.hour:${stats.time.hour}`);
    parts.push(`time.minute:${stats.time.minute}`);
  }
  if (settings.time.realDateTime) {
    parts.push(`time.real:${Math.floor(nowMs / 1000)}`);
  }

  if (settings.timedEffects.enabled) {
    const timedEffectSignature = stats.timedEffects
      .map(effect => `${effect.stableKey}:${Math.trunc(effect.remainingSec)}:${Math.trunc(effect.totalSec)}:${effect.isDebuff ? 1 : 0}`)
      .join(';');
    parts.push(`effects:${timedEffectSignature}`);
  }

  return parts.join('|');
}

export function getVisibleWidgetGroups(
  settings: WidgetSettings,
  stats: CombatStats,
  settingsOpen: boolean,
): VisibleWidgetGroups {
  return {
    hasVisibleResistance: Object.values(settings.resistances).some(Boolean),
    hasVisibleDefense: Object.values(settings.defense).some(Boolean),
    hasVisibleOffense: Object.values(settings.offense).some(Boolean),
    hasVisibleEquipped: Object.values(settings.equipped).some(Boolean),
    hasVisibleTime: Object.values(settings.time).some(Boolean),
    hasVisibleTimedEffects: settings.timedEffects.enabled && (settingsOpen || stats.timedEffects.length > 0),
    hasVisibleMovement: settings.movement.speedMult,
    hasVisibleExperience: settings.experience.enabled,
    hasVisiblePlayerInfo: Object.values(settings.playerInfo).some(Boolean),
  };
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

  return {
    changeWindowActive,
    shouldShow:
      visible
      && hasLiveStats
      && (!settings.general.combatOnly || stats.isInCombat)
      && changeWindowActive,
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
