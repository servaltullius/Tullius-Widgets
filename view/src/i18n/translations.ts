import type { Language } from '../types/settings';
import { isPlainObject } from '../utils/normalize';

export const bundledTranslations = {
  ko: {
    title: '툴리우스 위젯',
    general: '일반',
    showWidgets: '위젯 표시',
    sessionVisibilityHint: 'F11 임시 표시 상태가 적용 중입니다. 저장된 기본값과 다를 수 있습니다.',
    combatOnly: '전투 중에만',
    showOnChangeOnly: '값 변화 시에만 표시',
    changeDisplaySeconds: '표시 유지 시간(초)',
    opacity: '투명도',
    size: '크기',
    xsmall: '매우 작게',
    small: '작게',
    medium: '보통',
    large: '크게',
    layout: '배치 방향',
    layoutVertical: '세로',
    layoutHorizontal: '가로',
    accentColor: '색상 톤',
    transparentBg: '배경 투명',
    accentAuto: '자동 (HUD 감지)',
    language: '언어',
    korean: '한국어',
    english: 'English',
    resistances: '저항력',
    magic: '마법',
    fire: '화염',
    frost: '냉기',
    shock: '전기',
    poison: '독',
    disease: '질병',
    defense: '방어',
    armorRating: '방어도',
    damageReduction: '피해 감소',
    offense: '공격',
    rightHandDamage: '오른손 공격력',
    leftHandDamage: '왼손 공격력',
    critChance: '치명타 확률',
    equipped: '장비/마법',
    rightHandEquipped: '오른손 장비',
    leftHandEquipped: '왼손 장비',
    equippedEmpty: '(비어 있음)',
    time: '시간',
    gameDateTime: '스카이림 날짜/시간',
    gameDateTimePattern: '4E {year} {monthName} {day}일 {time}',
    realDateTime: '현실 날짜/시간',
    monthMorningStar: '모닝 스타',
    monthSunsDawn: '선즈 던',
    monthFirstSeed: '퍼스트 시드',
    monthRainsHand: '레인즈 핸드',
    monthSecondSeed: '세컨드 시드',
    monthMidyear: '미드이어',
    monthSunsHeight: '선즈 하이트',
    monthLastSeed: '라스트 시드',
    monthHearthfire: '하스파이어',
    monthFrostfall: '프로스트폴',
    monthSunsDusk: '선즈 더스크',
    monthEveningStar: '이브닝 스타',
    experienceWidget: '경험치',
    experienceProgress: '경험치 진행도',
    timedEffects: '지속 버프/디버프',
    timedEffectsEnabled: '지속 효과 표시',
    timedEffectsMaxVisible: '최대 표시 줄',
    timedEffectsEmpty: '(표시할 지속 효과 없음)',
    movement: '이동',
    speed: '이동 속도',
    playerInfo: '플레이어 정보',
    level: '레벨',
    experience: '현재 경험치',
    expToNextLevel: '레벨업까지 경험치',
    gold: '골드',
    carryWeight: '소지 무게',
    health: '체력',
    magicka: '매지카',
    stamina: '스태미나',
    visualAlerts: '시각 알림',
    visualAlertsEnabled: '시각 알림 사용',
    lowHealth: '체력 부족 경고',
    lowStamina: '스태미나 부족 경고',
    lowMagicka: '매지카 부족 경고',
    overencumbered: '과적재 경고',
    threshold: '임계값',
    resetPositions: '위치 초기화',
    preset: '프리셋',
    exportPreset: '프리셋 내보내기',
    importPreset: '프리셋 가져오기',
    presetHint: '* 파일 위치: Data/SKSE/Plugins/TulliusWidgets_preset.json',
    exportDone: '프리셋을 내보냈습니다!',
    importDone: '프리셋을 가져왔습니다!',
    importFail: '프리셋 파일을 찾을 수 없습니다',
    dragHint: '* 설정 창이 열린 동안 위젯 그룹을 드래그하여 배치 가능',
    close: '닫기',
    tabGeneral: '일반',
    tabCombat: '전투 수치',
    tabEffects: '효과/시간',
    tabAlerts: '시각 알림',
    tabPresets: '프리셋/배치',
    expandAll: '전체 펼치기',
    collapseAll: '전체 접기',
    layoutTools: '배치 도구',
    onboardingTitle: 'Tullius Widgets 시작 안내',
    onboardingLine1: 'Insert: 설정 패널 열기/닫기',
    onboardingLine2: 'F11: 위젯 전체 표시/숨김',
    onboardingLine3: '일반 탭에서 "값 변화 시에만 표시"를 켤 수 있습니다.',
    onboardingOpenSettings: '설정 열기',
    onboardingDismiss: '다시 보지 않기',
    runtimeWarningUnsupported: '지원 범위를 벗어난 Skyrim 런타임입니다.',
    runtimeWarningAddressLibrary: '현재 런타임용 Address Library 파일이 없습니다.',
    runtimeWarningBoth: '런타임/Address Library 호환성 문제가 감지되었습니다.',
    runtimeWarningDetails: '런타임 진단',
    settingsSyncRetrying: '설정 저장을 다시 시도하는 중입니다...',
    settingsSyncFailed: '설정 저장에 실패했습니다. 경로/권한을 확인해 주세요.',
    capRawLabel: '원본',
    capLimitLabel: '캡',
    capArmorLimitLabel: '최대 효율 AR',
  },
  en: {
    title: 'Tullius Widgets',
    general: 'General',
    showWidgets: 'Show Widgets',
    sessionVisibilityHint: 'F11 temporary visibility is active. It may differ from the saved default.',
    combatOnly: 'Combat Only',
    showOnChangeOnly: 'Show Only When Values Change',
    changeDisplaySeconds: 'Display Duration (sec)',
    opacity: 'Opacity',
    size: 'Size',
    xsmall: 'Very Small',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    layout: 'Layout',
    layoutVertical: 'Vertical',
    layoutHorizontal: 'Horizontal',
    accentColor: 'Color Tone',
    transparentBg: 'Transparent Background',
    accentAuto: 'Auto (HUD detect)',
    language: 'Language',
    korean: '한국어',
    english: 'English',
    resistances: 'Resistances',
    magic: 'Magic',
    fire: 'Fire',
    frost: 'Frost',
    shock: 'Shock',
    poison: 'Poison',
    disease: 'Disease',
    defense: 'Defense',
    armorRating: 'Armor Rating',
    damageReduction: 'Damage Reduction',
    offense: 'Offense',
    rightHandDamage: 'Right Hand Damage',
    leftHandDamage: 'Left Hand Damage',
    critChance: 'Critical Chance',
    equipped: 'Equipped',
    rightHandEquipped: 'Right Hand Equipped',
    leftHandEquipped: 'Left Hand Equipped',
    equippedEmpty: '(Empty)',
    time: 'Time',
    gameDateTime: 'Skyrim Date/Time',
    gameDateTimePattern: '4E {year}, {monthName} {day} {time}',
    realDateTime: 'Real Date/Time',
    monthMorningStar: 'Morning Star',
    monthSunsDawn: "Sun's Dawn",
    monthFirstSeed: 'First Seed',
    monthRainsHand: "Rain's Hand",
    monthSecondSeed: 'Second Seed',
    monthMidyear: 'Midyear',
    monthSunsHeight: "Sun's Height",
    monthLastSeed: 'Last Seed',
    monthHearthfire: 'Hearthfire',
    monthFrostfall: 'Frostfall',
    monthSunsDusk: "Sun's Dusk",
    monthEveningStar: 'Evening Star',
    experienceWidget: 'Experience',
    experienceProgress: 'XP Progress',
    timedEffects: 'Timed Buffs/Debuffs',
    timedEffectsEnabled: 'Show Timed Effects',
    timedEffectsMaxVisible: 'Max Visible Rows',
    timedEffectsEmpty: '(No Active Timed Effects)',
    movement: 'Movement',
    speed: 'Speed',
    playerInfo: 'Player Info',
    level: 'Level',
    experience: 'Current XP',
    expToNextLevel: 'XP To Next Level',
    gold: 'Gold',
    carryWeight: 'Carry Weight',
    health: 'Health',
    magicka: 'Magicka',
    stamina: 'Stamina',
    visualAlerts: 'Visual Alerts',
    visualAlertsEnabled: 'Enable Visual Alerts',
    lowHealth: 'Low Health Warning',
    lowStamina: 'Low Stamina Warning',
    lowMagicka: 'Low Magicka Warning',
    overencumbered: 'Overencumbered Warning',
    threshold: 'Threshold',
    resetPositions: 'Reset Positions',
    preset: 'Preset',
    exportPreset: 'Export Preset',
    importPreset: 'Import Preset',
    presetHint: '* File: Data/SKSE/Plugins/TulliusWidgets_preset.json',
    exportDone: 'Preset exported!',
    importDone: 'Preset imported!',
    importFail: 'Preset file not found',
    dragHint: '* Drag widget groups to reposition while settings are open',
    close: 'Close',
    tabGeneral: 'General',
    tabCombat: 'Combat Stats',
    tabEffects: 'Effects/Time',
    tabAlerts: 'Visual Alerts',
    tabPresets: 'Preset/Layout',
    expandAll: 'Expand All',
    collapseAll: 'Collapse All',
    layoutTools: 'Layout Tools',
    onboardingTitle: 'Tullius Widgets Quick Guide',
    onboardingLine1: 'Insert: Open/close settings panel',
    onboardingLine2: 'F11: Toggle all widgets on/off',
    onboardingLine3: 'You can enable "Show only when values change" in General tab.',
    onboardingOpenSettings: 'Open Settings',
    onboardingDismiss: 'Don\'t show again',
    runtimeWarningUnsupported: 'Skyrim runtime is outside the supported range.',
    runtimeWarningAddressLibrary: 'Address Library file for this runtime is missing.',
    runtimeWarningBoth: 'Runtime/Address Library compatibility issue detected.',
    runtimeWarningDetails: 'Runtime diagnostics',
    settingsSyncRetrying: 'Retrying settings save...',
    settingsSyncFailed: 'Failed to save settings. Check file path and permissions.',
    capRawLabel: 'Raw',
    capLimitLabel: 'Cap',
    capArmorLimitLabel: 'Max effective AR',
  },
} as const;

export type BuiltInLanguage = keyof typeof bundledTranslations;
export type TranslationKey = keyof typeof bundledTranslations.ko;
export type TranslationCatalog = Record<TranslationKey, string>;

export interface LocalizationLanguageEntry {
  code: string;
  label: string;
  file: string;
  locale?: string;
}

export interface LocalizationManifest {
  defaultLanguage: string;
  languages: LocalizationLanguageEntry[];
}

const DEFAULT_MANIFEST: LocalizationManifest = {
  defaultLanguage: 'ko',
  languages: [
    { code: 'ko', label: '한국어', file: 'ko.json', locale: 'ko-KR' },
    { code: 'en', label: 'English', file: 'en.json', locale: 'en-US' },
  ],
};

const manifestListeners = new Set<() => void>();
const warnedLocalizationTargets = new Set<string>();
const runtimeCatalogs = new Map<string, Partial<TranslationCatalog>>();
const loadedCatalogLanguages = new Set<string>();
const catalogLoadPromises = new Map<string, Promise<void>>();

let manifestState: LocalizationManifest = DEFAULT_MANIFEST;
let manifestLoadPromise: Promise<LocalizationManifest> | null = null;

function emitLocalizationChanged(): void {
  for (const listener of manifestListeners) {
    listener();
  }
}

function warnLocalizationTargetOnce(target: string, error: unknown): void {
  if (warnedLocalizationTargets.has(target)) {
    return;
  }
  warnedLocalizationTargets.add(target);
  console.warn(`[TulliusWidgets] Failed to load localization resource "${target}".`, error);
}

function isTranslationKey(value: string): value is TranslationKey {
  return value in bundledTranslations.ko;
}

function sanitizeLanguageEntry(value: unknown): LocalizationLanguageEntry | null {
  if (!isPlainObject(value)) return null;
  const code = typeof value.code === 'string' ? value.code.trim() : '';
  const label = typeof value.label === 'string' ? value.label.trim() : '';
  const file = typeof value.file === 'string' ? value.file.trim() : '';
  const locale = typeof value.locale === 'string' && value.locale.trim()
    ? value.locale.trim()
    : undefined;

  if (!code || !label || !file) {
    return null;
  }

  return { code, label, file, locale };
}

function sanitizeManifest(value: unknown): LocalizationManifest | null {
  if (!isPlainObject(value) || !Array.isArray(value.languages)) {
    return null;
  }

  const defaultLanguage = typeof value.defaultLanguage === 'string' && value.defaultLanguage.trim()
    ? value.defaultLanguage.trim()
    : DEFAULT_MANIFEST.defaultLanguage;
  const seenCodes = new Set<string>();
  const languages = value.languages
    .map(sanitizeLanguageEntry)
    .filter((entry): entry is LocalizationLanguageEntry => {
      if (!entry) return false;
      if (seenCodes.has(entry.code)) return false;
      seenCodes.add(entry.code);
      return true;
    });

  if (languages.length === 0) {
    return null;
  }

  return {
    defaultLanguage,
    languages,
  };
}

function sanitizeCatalog(value: unknown): Partial<TranslationCatalog> {
  if (!isPlainObject(value)) {
    return {};
  }

  const catalog: Partial<TranslationCatalog> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (!isTranslationKey(key) || typeof rawValue !== 'string') {
      continue;
    }
    catalog[key] = rawValue;
  }
  return catalog;
}

function getManifestLanguage(language: string): LocalizationLanguageEntry | null {
  return manifestState.languages.find(entry => entry.code === language) ?? null;
}

function hasBundledLanguage(language: string): language is BuiltInLanguage {
  return language in bundledTranslations;
}

function hasKnownLanguage(language: string): boolean {
  return Boolean(language) && (hasBundledLanguage(language) || getManifestLanguage(language) !== null);
}

async function fetchJsonResource(target: string): Promise<unknown | null> {
  try {
    const response = await fetch(target, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    warnLocalizationTargetOnce(target, error);
    return null;
  }
}

export async function ensureLocalizationManifest(): Promise<LocalizationManifest> {
  if (manifestLoadPromise) {
    return manifestLoadPromise;
  }

  manifestLoadPromise = (async () => {
    const parsed = sanitizeManifest(await fetchJsonResource('./i18n/manifest.json'));
    if (parsed) {
      manifestState = parsed;
      emitLocalizationChanged();
      return manifestState;
    }
    manifestLoadPromise = null;
    return manifestState;
  })();

  return manifestLoadPromise;
}

export async function ensureLanguageCatalog(language: Language): Promise<void> {
  await ensureLocalizationManifest();

  const selectedLanguage = getManifestLanguage(language);
  if (!selectedLanguage || loadedCatalogLanguages.has(language)) {
    return;
  }

  const existingPromise = catalogLoadPromises.get(language);
  if (existingPromise) {
    await existingPromise;
    return;
  }

  const promise = (async () => {
    const resource = await fetchJsonResource(`./i18n/${selectedLanguage.file}`);
    if (resource === null) {
      catalogLoadPromises.delete(language);
      return;
    }

    const parsed = sanitizeCatalog(resource);
    loadedCatalogLanguages.add(language);
    if (Object.keys(parsed).length > 0) {
      runtimeCatalogs.set(language, parsed);
    }
    catalogLoadPromises.delete(language);
    emitLocalizationChanged();
  })();

  catalogLoadPromises.set(language, promise);
  await promise;
}

export function getLocalizationManifest(): LocalizationManifest {
  return manifestState;
}

export function getAvailableLanguages(): LocalizationLanguageEntry[] {
  return manifestState.languages;
}

export function getDefaultLanguage(): Language {
  const manifestDefault = manifestState.defaultLanguage.trim();
  if (hasKnownLanguage(manifestDefault)) {
    return manifestDefault;
  }

  return DEFAULT_MANIFEST.defaultLanguage;
}

export function resolveLanguage(language: Language): Language {
  const normalized = language.trim();
  if (hasKnownLanguage(normalized)) {
    return normalized;
  }

  return getDefaultLanguage();
}

export function getLanguageLocale(language: Language): string {
  const resolvedLanguage = resolveLanguage(language);
  const manifestLocale = getManifestLanguage(resolvedLanguage)?.locale;
  if (manifestLocale) {
    return manifestLocale;
  }
  if (resolvedLanguage === 'ko') {
    return 'ko-KR';
  }
  if (resolvedLanguage === 'en') {
    return 'en-US';
  }
  return resolvedLanguage || 'en-US';
}

function getBuiltInText(language: string, key: TranslationKey): string | null {
  if (hasBundledLanguage(language)) {
    return bundledTranslations[language as BuiltInLanguage][key];
  }
  return null;
}

export function t(lang: Language, key: TranslationKey): string {
  const resolvedLanguage = resolveLanguage(lang);
  const runtimeText = runtimeCatalogs.get(resolvedLanguage)?.[key];
  if (runtimeText !== undefined) {
    return runtimeText;
  }

  const builtInText = getBuiltInText(resolvedLanguage, key);
  if (builtInText !== null) {
    return builtInText;
  }

  return bundledTranslations.en[key] ?? bundledTranslations.ko[key] ?? key;
}

const SKYRIM_MONTH_KEYS = [
  'monthMorningStar',
  'monthSunsDawn',
  'monthFirstSeed',
  'monthRainsHand',
  'monthSecondSeed',
  'monthMidyear',
  'monthSunsHeight',
  'monthLastSeed',
  'monthHearthfire',
  'monthFrostfall',
  'monthSunsDusk',
  'monthEveningStar',
] as const satisfies readonly TranslationKey[];

interface SkyrimDateTimeParts {
  year: number;
  month: number;
  day: number;
  time: string;
}

export function getLocalizedSkyrimMonthName(lang: Language, month: number): string {
  const monthKey = SKYRIM_MONTH_KEYS[month];
  if (!monthKey) {
    return bundledTranslations.en.monthMorningStar;
  }
  return t(lang, monthKey);
}

export function formatSkyrimDateTime(lang: Language, parts: SkyrimDateTimeParts): string {
  const pattern = t(lang, 'gameDateTimePattern');
  const monthName = getLocalizedSkyrimMonthName(lang, parts.month);

  return pattern
    .split('{year}').join(String(parts.year))
    .split('{monthName}').join(monthName)
    .split('{day}').join(String(parts.day))
    .split('{time}').join(parts.time);
}

export function subscribeLocalization(listener: () => void): () => void {
  manifestListeners.add(listener);
  return () => {
    manifestListeners.delete(listener);
  };
}

export function resetLocalizationStateForTests(): void {
  manifestState = DEFAULT_MANIFEST;
  manifestLoadPromise = null;
  warnedLocalizationTargets.clear();
  runtimeCatalogs.clear();
  loadedCatalogLanguages.clear();
  catalogLoadPromises.clear();
  emitLocalizationChanged();
}
