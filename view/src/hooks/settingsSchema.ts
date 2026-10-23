import type {
  CarryWeightDisplayMode,
  FontPreset,
  CompactAnchor,
  EquipNameDisplay,
  HudStyle,
  GroupPosition,
  IconTheme,
  Language,
  ResistanceDisplayMode,
  TimeDisplayMode,
  TimedEffectListLayout,
  WidgetLayout,
  WidgetSettings,
  WidgetSize,
} from '../types/settings';
import { LAYOUT_SLOT_COUNT } from '../types/settings';
import { defaultSettings } from '../data/defaultSettings';
import { isValidIconPackId } from '../data/iconPacks';
import { sanitizeWidgetItemLayouts } from '../data/widgetItemRegistry';
import { isPlainObject, readBoolean, readNumber } from '../utils/normalize';
import { sanitizeHotkeys } from '../utils/hotkeys';
import { TIMED_EFFECT_FILTERS, TIMED_EFFECT_LONG_LIMITS, type TimedEffectFilter } from '../utils/timedEffectFilter';
import { readRevision, SETTINGS_SCHEMA_VERSION } from './settingsShared';

function readEnum<T extends string>(value: unknown, fallback: T, allowed: readonly T[]): T {
  if (typeof value !== 'string') return fallback;
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function readLanguageCode(value: unknown, fallback: Language): Language {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized || fallback;
}

function readAccentColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  if (value === '') return '';
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

const TIMED_EFFECT_LIST_LAYOUTS = ['vertical', 'horizontal'] as const;
const CARRY_WEIGHT_DISPLAY_MODES = ['combined', 'valueOnly', 'meterOnly'] as const;
const RESISTANCE_DISPLAY_MODES = ['effectiveOnly', 'rawOnly', 'both'] as const;
const TIME_DISPLAY_MODES = ['dateTime', 'timeOnly'] as const;
const FONT_PRESETS = ['default', 'readable', 'compact', 'classic'] as const;
const ICON_THEMES = ['standard', 'dororong'] as const;
const STAGE2_STANDALONE_LEVEL_SCHEMA_VERSION = 4;
const ICON_PRESENTATION_SCHEMA_VERSION = 6;
// Settings saved before the compact HUD existed keep the classic card look and layout.
const HUD_STYLE_SCHEMA_VERSION = 7;
const HUD_STYLES: readonly HudStyle[] = ['compact', 'classic'];
const WIDGET_SIZES: readonly WidgetSize[] = ['xsmall', 'small', 'medium', 'large'];

interface MergeSettingsOptions {
  allowLegacyStandaloneLevelFallback?: boolean;
}

function mergeBooleanSection<T extends Record<string, boolean>>(defaults: T, incoming: unknown): T {
  if (!isPlainObject(incoming)) return defaults;
  const source = incoming as Record<string, unknown>;
  const next = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const incomingValue = source[key as string];
    if (typeof incomingValue === 'boolean') {
      next[key] = incomingValue as T[keyof T];
    }
  }
  return next;
}

function sanitizePositions(incoming: unknown): Record<string, GroupPosition> {
  if (!isPlainObject(incoming)) return {};
  const out: Record<string, GroupPosition> = {};
  for (const [key, rawPos] of Object.entries(incoming)) {
    if (!isPlainObject(rawPos)) continue;
    const x = rawPos.x;
    const y = rawPos.y;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    out[key] = { x, y };
  }
  return out;
}

function sanitizeLayouts(incoming: unknown): Record<string, WidgetLayout> {
  if (!isPlainObject(incoming)) return {};
  const out: Record<string, WidgetLayout> = {};
  for (const [key, rawLayout] of Object.entries(incoming)) {
    if (rawLayout === 'vertical' || rawLayout === 'horizontal') {
      out[key] = rawLayout;
    }
  }
  return out;
}

function sanitizeGroupScales(incoming: unknown): Record<string, number> {
  if (!isPlainObject(incoming)) return {};
  const out: Record<string, number> = {};
  for (const [key, rawScale] of Object.entries(incoming)) {
    if (typeof rawScale !== 'number' || !Number.isFinite(rawScale) || rawScale <= 0) {
      continue;
    }
    out[key] = rawScale;
  }
  return out;
}

function sanitizeLayoutSlots(incoming: unknown): WidgetSettings['layoutSlots'] {
  const slots: WidgetSettings['layoutSlots'] = Array.from({ length: LAYOUT_SLOT_COUNT }, () => null);
  if (!Array.isArray(incoming)) return slots;
  for (let index = 0; index < LAYOUT_SLOT_COUNT; index++) {
    const raw = incoming[index];
    if (!isPlainObject(raw)) continue;
    const itemLayouts = sanitizeWidgetItemLayouts(raw.itemLayouts);
    if (Object.keys(itemLayouts).length === 0) continue;
    slots[index] = {
      savedAt: readNumber(raw.savedAt, 0, 0, Number.MAX_SAFE_INTEGER),
      hudStyle: readEnum<HudStyle>(raw.hudStyle, 'compact', HUD_STYLES),
      compactAnchor: readEnum<CompactAnchor>(raw.compactAnchor, 'bottomLeft', ['bottomLeft', 'bottomRight', 'topLeft', 'topRight']),
      ...(typeof raw.size === 'string' && WIDGET_SIZES.includes(raw.size as WidgetSize) ? { size: raw.size as WidgetSize } : {}),
      itemLayouts,
    };
  }
  return slots;
}

function cloneDefaultSettings(): WidgetSettings {
  if (typeof structuredClone === 'function') {
    return structuredClone(defaultSettings);
  }
  return JSON.parse(JSON.stringify(defaultSettings)) as WidgetSettings;
}

function mergeGeneralSettings(
  target: WidgetSettings['general'],
  incoming: unknown,
  savedSchemaVersion: number | null,
): void {
  const isLegacyIconPresentation = savedSchemaVersion === null
    || savedSchemaVersion < ICON_PRESENTATION_SCHEMA_VERSION;
  const isLegacyHudStyle = savedSchemaVersion === null
    || savedSchemaVersion < HUD_STYLE_SCHEMA_VERSION;
  if (!isPlainObject(incoming)) {
    if (isLegacyHudStyle) {
      target.hudStyle = 'classic';
    }
    if (isLegacyIconPresentation) {
      target.iconTheme = 'dororong';
      target.showIconBadges = true;
    }
    return;
  }

  target.visible = readBoolean(incoming.visible, target.visible);
  target.combatOnly = readBoolean(incoming.combatOnly, target.combatOnly);
  target.showOnChangeOnly = readBoolean(incoming.showOnChangeOnly, target.showOnChangeOnly);
  target.changeDisplaySeconds = readNumber(incoming.changeDisplaySeconds, target.changeDisplaySeconds, 1, 15);
  target.onboardingSeen = readBoolean(incoming.onboardingSeen, target.onboardingSeen);
  target.opacity = readNumber(incoming.opacity, target.opacity, 10, 100);
  target.size = readEnum<WidgetSize>(incoming.size, target.size, WIDGET_SIZES);
  target.language = readLanguageCode(incoming.language, target.language);
  target.fontPreset = readEnum<FontPreset>(incoming.fontPreset, target.fontPreset, FONT_PRESETS);
  const hasExplicitIconTheme = typeof incoming.iconTheme === 'string'
    && ICON_THEMES.includes(incoming.iconTheme as IconTheme);
  const hasExplicitIconBadgeSetting = typeof incoming.showIconBadges === 'boolean';
  target.iconTheme = readEnum<IconTheme>(incoming.iconTheme, target.iconTheme, ICON_THEMES);
  target.showIconBadges = readBoolean(incoming.showIconBadges, target.showIconBadges);
  target.iconPack = typeof incoming.iconPack === 'string' && (incoming.iconPack === '' || isValidIconPackId(incoming.iconPack))
    ? incoming.iconPack
    : target.iconPack;
  if (isLegacyIconPresentation) {
    if (!hasExplicitIconTheme) {
      target.iconTheme = 'dororong';
    }
    if (!hasExplicitIconBadgeSetting) {
      target.showIconBadges = true;
    }
  }
  const hasExplicitHudStyle = typeof incoming.hudStyle === 'string'
    && HUD_STYLES.includes(incoming.hudStyle as HudStyle);
  target.hudStyle = readEnum<HudStyle>(incoming.hudStyle, target.hudStyle, HUD_STYLES);
  if (isLegacyHudStyle && !hasExplicitHudStyle) {
    target.hudStyle = 'classic';
  }
  target.compactAnchor = readEnum<CompactAnchor>(
    incoming.compactAnchor,
    target.compactAnchor,
    ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'],
  );
  const hotkeys = sanitizeHotkeys(
    incoming.settingsHotkey ?? target.settingsHotkey,
    incoming.visibilityHotkey ?? target.visibilityHotkey,
  );
  target.settingsHotkey = hotkeys.settingsHotkey;
  target.visibilityHotkey = hotkeys.visibilityHotkey;
  target.accentColor = readAccentColor(incoming.accentColor, target.accentColor);
  target.transparentBg = readBoolean(incoming.transparentBg, target.transparentBg);
}

function migrateLegacyExperienceToggle(
  experience: WidgetSettings['experience'],
  experienceIncoming: unknown,
  playerInfoIncoming: unknown,
): void {
  if (isPlainObject(experienceIncoming) || !isPlainObject(playerInfoIncoming)) {
    return;
  }

  const legacyCurrent = playerInfoIncoming.experience;
  const legacyToNext = playerInfoIncoming.expToNextLevel;
  const hasLegacyXpToggle = typeof legacyCurrent === 'boolean' || typeof legacyToNext === 'boolean';
  if (!hasLegacyXpToggle) {
    return;
  }

  const currentEnabled = readBoolean(legacyCurrent, true);
  const toNextEnabled = readBoolean(legacyToNext, true);
  experience.enabled = currentEnabled || toNextEnabled;
}

function mergeTimedEffectsSettings(target: WidgetSettings['timedEffects'], incoming: unknown): void {
  if (!isPlainObject(incoming)) {
    return;
  }

  target.enabled = readBoolean(incoming.enabled, target.enabled);
  target.maxVisible = readNumber(incoming.maxVisible, target.maxVisible, 1, 12);
  target.listLayout = readEnum<TimedEffectListLayout>(
    incoming.listLayout,
    target.listLayout,
    TIMED_EFFECT_LIST_LAYOUTS,
  );
  target.filter = readEnum<TimedEffectFilter>(incoming.filter, target.filter, TIMED_EFFECT_FILTERS);
  target.hideLongerThanMin = TIMED_EFFECT_LONG_LIMITS.includes(incoming.hideLongerThanMin as number)
    ? incoming.hideLongerThanMin as number
    : target.hideLongerThanMin;
}

function mergeResistancesSettings(target: WidgetSettings['resistances'], incoming: unknown): void {
  if (!isPlainObject(incoming)) {
    return;
  }

  target.magic = readBoolean(incoming.magic, target.magic);
  target.fire = readBoolean(incoming.fire, target.fire);
  target.frost = readBoolean(incoming.frost, target.frost);
  target.shock = readBoolean(incoming.shock, target.shock);
  target.poison = readBoolean(incoming.poison, target.poison);
  target.disease = readBoolean(incoming.disease, target.disease);
  target.displayMode = readEnum<ResistanceDisplayMode>(
    incoming.displayMode,
    target.displayMode,
    RESISTANCE_DISPLAY_MODES,
  );
}

function mergeTimeSettings(target: WidgetSettings['time'], incoming: unknown): void {
  if (!isPlainObject(incoming)) {
    return;
  }

  target.gameDateTime = readBoolean(incoming.gameDateTime, target.gameDateTime);
  target.gameDisplay = readEnum<TimeDisplayMode>(
    incoming.gameDisplay,
    target.gameDisplay,
    TIME_DISPLAY_MODES,
  );
  target.realDateTime = readBoolean(incoming.realDateTime, target.realDateTime);
  target.realDisplay = readEnum<TimeDisplayMode>(
    incoming.realDisplay,
    target.realDisplay,
    TIME_DISPLAY_MODES,
  );
  target.weather = readBoolean(incoming.weather, target.weather);
  target.playtime = readBoolean(incoming.playtime, target.playtime);
}

function mergePlayerInfoSettings(target: WidgetSettings['playerInfo'], incoming: unknown): void {
  if (!isPlainObject(incoming)) {
    return;
  }

  target.level = readBoolean(incoming.level, target.level);
  target.gold = readBoolean(incoming.gold, target.gold);
  target.carryWeight = readBoolean(incoming.carryWeight, target.carryWeight);
  target.carryWeightDisplay = readEnum<CarryWeightDisplayMode>(
    incoming.carryWeightDisplay,
    target.carryWeightDisplay,
    CARRY_WEIGHT_DISPLAY_MODES,
  );
  target.health = readBoolean(incoming.health, target.health);
  target.magicka = readBoolean(incoming.magicka, target.magicka);
  target.stamina = readBoolean(incoming.stamina, target.stamina);
}

function readExplicitStandaloneLevelVisibility(incoming: unknown): boolean | null {
  if (!isPlainObject(incoming) || typeof incoming.level !== 'boolean') {
    return null;
  }

  return incoming.level;
}

function readExplicitItemVisibility(itemLayoutsIncoming: unknown, itemId: string): boolean | null {
  if (!isPlainObject(itemLayoutsIncoming)) {
    return null;
  }

  const rawLayout = itemLayoutsIncoming[itemId];
  if (!isPlainObject(rawLayout) || typeof rawLayout.visible !== 'boolean') {
    return null;
  }

  return rawLayout.visible;
}

function reconcileStandaloneLevelVisibility(
  target: WidgetSettings['playerInfo'],
  playerInfoIncoming: unknown,
  itemLayoutsIncoming: unknown,
  savedSchemaVersion: number | null,
  options: MergeSettingsOptions,
): void {
  const explicitItemVisibility = readExplicitItemVisibility(itemLayoutsIncoming, 'player.level');
  if (explicitItemVisibility !== null) {
    target.level = explicitItemVisibility;
    return;
  }

  const explicitLegacyVisibility = readExplicitStandaloneLevelVisibility(playerInfoIncoming);
  if (explicitLegacyVisibility !== null) {
    target.level = explicitLegacyVisibility;
    return;
  }

  const shouldPreserveLegacyDefault = savedSchemaVersion === null
    ? options.allowLegacyStandaloneLevelFallback === true
    : savedSchemaVersion < STAGE2_STANDALONE_LEVEL_SCHEMA_VERSION;

  if (shouldPreserveLegacyDefault) {
    target.level = true;
  }
}

export function mergeWithDefaults(
  saved: Record<string, unknown>,
  options: MergeSettingsOptions = {},
): WidgetSettings {
  const merged = cloneDefaultSettings();
  const savedSchemaVersion = readRevision(saved.schemaVersion);
  if (savedSchemaVersion === null || savedSchemaVersion < HUD_STYLE_SCHEMA_VERSION) {
    // Fields missing from pre-compact saves keep the defaults those versions shipped with.
    merged.resistances.disease = false;
    merged.equipped.voice = false;
    merged.equipped.potion = false;
    merged.offense.rightHandDamage = true;
    merged.offense.leftHandDamage = true;
    merged.time.gameDisplay = 'dateTime';
    merged.time.realDisplay = 'dateTime';
    merged.time.weather = false;
  }

  mergeGeneralSettings(merged.general, saved.general, savedSchemaVersion);
  mergeResistancesSettings(merged.resistances, saved.resistances);
  merged.defense = mergeBooleanSection(merged.defense, saved.defense);
  merged.offense = mergeBooleanSection(merged.offense, saved.offense);
  const { nameDisplay: defaultNameDisplay, ...equippedVisibility } = merged.equipped;
  merged.equipped = {
    ...mergeBooleanSection(equippedVisibility, saved.equipped),
    nameDisplay: readEnum<EquipNameDisplay>(
      isPlainObject(saved.equipped) ? saved.equipped.nameDisplay : undefined,
      defaultNameDisplay,
      ['always', 'onChange', 'never'],
    ),
  };
  merged.movement = mergeBooleanSection(merged.movement, saved.movement);
  mergeTimeSettings(merged.time, saved.time);
  merged.experience = mergeBooleanSection(merged.experience, saved.experience);
  mergePlayerInfoSettings(merged.playerInfo, saved.playerInfo);

  migrateLegacyExperienceToggle(merged.experience, saved.experience, saved.playerInfo);
  mergeTimedEffectsSettings(merged.timedEffects, saved.timedEffects);
  merged.positions = sanitizePositions(saved.positions);
  merged.layouts = sanitizeLayouts(saved.layouts);
  merged.groupScales = sanitizeGroupScales(saved.groupScales);
  merged.itemLayouts = sanitizeWidgetItemLayouts(saved.itemLayouts);
  merged.layoutSlots = sanitizeLayoutSlots(saved.layoutSlots);
  reconcileStandaloneLevelVisibility(
    merged.playerInfo,
    saved.playerInfo,
    saved.itemLayouts,
    savedSchemaVersion,
    options,
  );
  return merged;
}

export function warnFutureSettingsSchemaVersion(
  parsed: Record<string, unknown>,
  warnedFutureSettingsSchemaRef: { current: boolean },
): void {
  const schemaVersion = readRevision(parsed.schemaVersion);
  if (
    schemaVersion === null
    || schemaVersion <= SETTINGS_SCHEMA_VERSION
    || warnedFutureSettingsSchemaRef.current
  ) {
    return;
  }

  warnedFutureSettingsSchemaRef.current = true;
  console.warn(
    `[TulliusWidgets] Received settings schemaVersion ${schemaVersion}, but UI supports up to ${SETTINGS_SCHEMA_VERSION}. Falling back to tolerant parsing.`,
  );
}

export function acceptIncomingSettingsRevision(
  parsed: Record<string, unknown>,
  lastAppliedSettingsRevisionRef: { current: number | null },
  settingsRevisionRef: { current: number },
): boolean {
  const incomingRevision = readRevision(parsed.rev);
  if (incomingRevision === null) {
    return true;
  }

  const lastAppliedRevision = lastAppliedSettingsRevisionRef.current;
  if (lastAppliedRevision !== null && incomingRevision < lastAppliedRevision) {
    return false;
  }

  lastAppliedSettingsRevisionRef.current = incomingRevision;
  settingsRevisionRef.current = Math.max(settingsRevisionRef.current, incomingRevision);
  return true;
}
