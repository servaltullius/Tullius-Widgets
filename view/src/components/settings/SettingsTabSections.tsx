import { useContext, useEffect, useState } from 'react';
import type { Language, UpdateSettingFn, WidgetSettings } from '../../types/settings';
import { t, type LocalizationLanguageEntry } from '../../i18n/translations';
import { LayoutEditGuide } from './LayoutEditGuide';
import { GroupTitle, Note, SelectRow, SettingRow, SettingsSection, SliderRow, SubSettings, Toggle } from './SettingsControls';
import type { PanelDockPreference } from './settingsPanelState';
import { PresetSection } from './PresetSection';
import { HotkeySettings } from './HotkeySettings';
import { formatHotkey } from '../../utils/hotkeys';
import { FONT_PRESET_OPTIONS } from '../../utils/fontPresets';
import { buildItemLayoutsForHudStyle, captureLayoutSlot, shiftEffectListForLayout } from '../../utils/itemLayoutEditing';
import { findIconPack, type IconPack } from '../../data/iconPacks';
import { IconPacksContext } from '../../hooks/useIconPacks';
import { findUserFont, type UserFont } from '../../data/userFonts';
import { UserFontsContext } from '../../hooks/useUserFonts';
import { MAX_HIDE_DELAY_SECONDS } from '../../data/defaultSettings';

// How long a "click again" confirmation (slot load, position reset) waits for the second click.
const CONFIRM_AGAIN_MS = 4000;
const AUTO_HIDE_CONDITIONS = [
  ['showInCombat', 'autoHideInCombat'],
  ['showWeaponDrawn', 'autoHideWeaponDrawn'],
  ['showSneaking', 'autoHideSneaking'],
  ['showResourcesNotFull', 'autoHideResourcesNotFull'],
  ['showOnChange', 'autoHideOnChange'],
] as const;

const PRESET_COLORS = [
  '', '#6699cc', '#cc6666', '#66cc99', '#cc99cc', '#ccaa66', '#66cccc', '#ffffff',
];

interface SectionControlProps {
  lang: Language;
  /** Section ids to show; every section when omitted. */
  sections?: readonly string[];
  panelScale?: number;
}

function isShown(sections: readonly string[] | undefined, id: string): boolean {
  return !sections || sections.includes(id);
}

function readItemVisibility(settings: WidgetSettings, itemId: string, fallback: boolean): boolean {
  return settings.itemLayouts[itemId]?.visible ?? fallback;
}

function updateItemVisibility(onUpdate: UpdateSettingFn, itemId: string, value: boolean): void {
  onUpdate(`itemLayouts.${itemId}.visible`, value);
}

interface ItemVisibilityToggleConfig {
  itemId: string;
  fallback: boolean;
  label: string;
}

interface ItemVisibilityToggleProps {
  settings: WidgetSettings;
  onUpdate: UpdateSettingFn;
  config: ItemVisibilityToggleConfig;
}

function ItemVisibilityToggle({
  settings,
  onUpdate,
  config,
}: ItemVisibilityToggleProps) {
  return (
    <Toggle
      label={config.label}
      checked={readItemVisibility(settings, config.itemId, config.fallback)}
      onChange={value => updateItemVisibility(onUpdate, config.itemId, value)}
    />
  );
}

function buildCarryWeightDisplayOptions(lang: Language) {
  return [
    { value: 'combined', label: t(lang, 'numberAndMeter') },
    { value: 'valueOnly', label: t(lang, 'numberOnly') },
    { value: 'meterOnly', label: t(lang, 'meterOnly') },
  ];
}

function buildResistanceDisplayOptions(lang: Language) {
  return [
    { value: 'effectiveOnly', label: t(lang, 'effectiveOnly') },
    { value: 'rawOnly', label: t(lang, 'rawOnly') },
    { value: 'both', label: t(lang, 'both') },
  ];
}

function buildTimeDisplayOptions(lang: Language) {
  return [
    { value: 'dateTime', label: t(lang, 'dateAndTime') },
    { value: 'timeOnly', label: t(lang, 'timeOnly') },
  ];
}

function buildTimedEffectsLayoutOptions(lang: Language) {
  return [
    { value: 'vertical', label: t(lang, 'layoutVertical') },
    { value: 'horizontal', label: t(lang, 'layoutHorizontal') },
  ];
}

const USER_FONT_OPTION_PREFIX = 'user-font:';

function buildFontOptions(lang: Language, fonts: readonly UserFont[]) {
  return [
    ...FONT_PRESET_OPTIONS.map(option => ({ value: option.value, label: t(lang, option.labelKey) })),
    ...fonts.map(font => ({
      value: `${USER_FONT_OPTION_PREFIX}${font.id}`,
      label: t(lang, 'fontUserOption').replace('{name}', font.id),
    })),
  ];
}

function buildHudStyleOptions(lang: Language) {
  return [
    { value: 'compact', label: t(lang, 'hudStyleCompact') },
    { value: 'classic', label: t(lang, 'hudStyleClassic') },
  ];
}

function buildEquipNameDisplayOptions(lang: Language) {
  return [
    { value: 'always', label: t(lang, 'equipNameAlways') },
    { value: 'onChange', label: t(lang, 'equipNameOnChange') },
    { value: 'never', label: t(lang, 'equipNameNever') },
  ];
}

const ICON_PACK_OPTION_PREFIX = 'pack:';

// User icon packs only change the compact HUD, so the classic style lists the built-in themes.
function buildIconThemeOptions(lang: Language, packs: readonly IconPack[]) {
  return [
    { value: 'standard', label: t(lang, 'iconThemeStandard') },
    { value: 'dororong', label: t(lang, 'iconThemeDororong') },
    ...packs.map(pack => ({ value: `${ICON_PACK_OPTION_PREFIX}${pack.id}`, label: t(lang, 'iconThemePack').replace('{name}', pack.name) })),
  ];
}

interface GeneralTabSectionsProps extends SectionControlProps {
  settings: WidgetSettings;
  selectedLanguage: Language;
  effectiveVisible: boolean;
  onUpdate: UpdateSettingFn;
  accentColor: string;
  availableLanguages: LocalizationLanguageEntry[];
  /** The drawer side; the row is shown only when the panel provides a handler. */
  panelDock?: PanelDockPreference;
  onPanelDockChange?: (dock: PanelDockPreference) => void;
}

export function GeneralTabSections({
  lang,
  settings,
  selectedLanguage,
  effectiveVisible,
  onUpdate,
  accentColor,
  availableLanguages,
  sections,
  panelScale = 1,
  panelDock,
  onPanelDockChange,
}: GeneralTabSectionsProps) {
  const { fonts: userFonts, status: userFontStatus } = useContext(UserFontsContext);
  const { autoHide, freeCameraDisplay, fontPreset, userFont } = settings.general;
  const hasEnabledVital = readItemVisibility(settings, 'player.health', settings.playerInfo.health)
    || readItemVisibility(settings, 'player.magicka', settings.playerInfo.magicka)
    || readItemVisibility(settings, 'player.stamina', settings.playerInfo.stamina);
  const activeUserFont = findUserFont(userFonts, userFont);
  const fontOptions = buildFontOptions(lang, userFonts);
  const compact = settings.general.hudStyle === 'compact';
  const iconPacks = useContext(IconPacksContext);
  const activeIconPack = compact ? findIconPack(iconPacks, settings.general.iconPack) : null;
  const iconThemeOptions = buildIconThemeOptions(lang, compact ? iconPacks : []);
  const visibilityKey = formatHotkey(settings.general.visibilityHotkey);

  return (
    <>
      <SettingsSection id="display" title={t(lang, 'groupDisplay')} shown={isShown(sections, 'display')}>
        <Toggle
          label={t(lang, 'showWidgets')}
          help={effectiveVisible !== settings.general.visible
            ? t(lang, 'sessionVisibilityHint').replace('{key}', visibilityKey)
            : undefined}
          checked={effectiveVisible}
          onChange={value => onUpdate('general.visible', value)}
        />
        <Toggle label={t(lang, 'autoHide')} checked={autoHide.enabled} onChange={value => onUpdate('general.autoHide.enabled', value)} />
        {autoHide.enabled && (
          <SubSettings>
            {AUTO_HIDE_CONDITIONS.map(([field, label]) => (
              <Toggle key={field} label={t(lang, label)} checked={autoHide[field]} onChange={value => onUpdate(`general.autoHide.${field}`, value)} />
            ))}
            <SliderRow
              label={t(lang, 'hideDelaySeconds')}
              value={autoHide.hideDelaySeconds}
              min={0}
              max={MAX_HIDE_DELAY_SECONDS}
              onChange={value => onUpdate('general.autoHide.hideDelaySeconds', value)}
              formatValue={value => t(lang, 'secondsValue').replace('{value}', String(value))}
            />
          </SubSettings>
        )}
        <SliderRow
          label={t(lang, 'changeDisplaySeconds')}
          help={t(lang, 'changeDisplaySecondsHint')}
          value={settings.general.changeDisplaySeconds}
          min={1}
          max={15}
          onChange={value => onUpdate('general.changeDisplaySeconds', value)}
          formatValue={value => t(lang, 'secondsValue').replace('{value}', String(value))}
        />
        <SelectRow
          label={t(lang, 'freeCameraDisplay')}
          help={freeCameraDisplay === 'vitals' && !hasEnabledVital ? t(lang, 'freeCameraNoVitals') : t(lang, 'freeCameraHint')}
          value={freeCameraDisplay}
          options={[
            { value: 'hide', label: t(lang, 'freeCameraHide') },
            { value: 'vitals', label: t(lang, 'freeCameraVitals') },
            { value: 'all', label: t(lang, 'freeCameraAll') },
          ]}
          onChange={value => onUpdate('general.freeCameraDisplay', value)}
          panelScale={panelScale}
          testId="free-camera-display-select"
          variant="segmented"
        />
      </SettingsSection>

      <SettingsSection id="appearance" title={t(lang, 'groupAppearance')} shown={isShown(sections, 'appearance')}>
        <SelectRow
          label={t(lang, 'hudStyleLabel')}
          help={t(lang, 'hudStyleHint')}
          value={settings.general.hudStyle}
          options={buildHudStyleOptions(lang)}
          onChange={nextValue => {
            const hudStyle = nextValue === 'classic' ? 'classic' : 'compact';
            // The same style again keeps the arrangement; it only saves again after a failed save.
            if (hudStyle === settings.general.hudStyle) {
              onUpdate('general.hudStyle', hudStyle);
              return;
            }
            const nextItemLayouts = buildItemLayoutsForHudStyle(settings, hudStyle);
            onUpdate('positions', {}, { persist: false });
            onUpdate('layouts', {}, { persist: false });
            onUpdate('groupScales', {}, { persist: false });
            onUpdate('general.hudStyle', hudStyle, { persist: false });
            onUpdate('itemLayouts', nextItemLayouts);
          }}
          panelScale={panelScale}
          testId="hud-style-select"
          variant="segmented"
        />
        <SliderRow
          label={t(lang, compact ? 'compactSurfaceOpacity' : 'opacity')}
          value={settings.general.opacity}
          min={10}
          max={100}
          onChange={value => onUpdate('general.opacity', value)}
          formatValue={value => `${value}%`}
        />
        {/* Both styles have a Dororong icon set; badges, accent tone and card transparency only
            apply to the classic card style. */}
        <SelectRow
          label={t(lang, 'iconTheme')}
          help={compact ? t(lang, 'iconThemeCompactHint') : undefined}
          value={activeIconPack ? `${ICON_PACK_OPTION_PREFIX}${activeIconPack.id}` : settings.general.iconTheme}
          options={iconThemeOptions}
          onChange={nextValue => {
            if (!compact) {
              onUpdate('general.iconTheme', nextValue as WidgetSettings['general']['iconTheme']);
              return;
            }
            // A pack draws over its base theme; picking a built-in theme drops the pack.
            const pickedPack = nextValue.startsWith(ICON_PACK_OPTION_PREFIX)
              ? findIconPack(iconPacks, nextValue.slice(ICON_PACK_OPTION_PREFIX.length))
              : null;
            if (nextValue.startsWith(ICON_PACK_OPTION_PREFIX) && !pickedPack) return;
            const iconTheme = pickedPack ? pickedPack.base : nextValue as WidgetSettings['general']['iconTheme'];
            const iconPack = pickedPack?.id ?? '';
            if (iconTheme === settings.general.iconTheme) {
              // Same layout and icon size: keep the player's arrangement.
              onUpdate('general.iconPack', iconPack);
              return;
            }
            // The compact Dororong icons are larger and use their own, roomier arrangement.
            const nextItemLayouts = buildItemLayoutsForHudStyle(
              { ...settings, general: { ...settings.general, iconTheme, iconPack } },
              'compact',
            );
            onUpdate('positions', {}, { persist: false });
            onUpdate('layouts', {}, { persist: false });
            onUpdate('groupScales', {}, { persist: false });
            onUpdate('general.iconTheme', iconTheme, { persist: false });
            onUpdate('general.iconPack', iconPack, { persist: false });
            onUpdate('itemLayouts', nextItemLayouts);
          }}
          panelScale={panelScale}
          testId="icon-theme-select"
        />
        {compact && (
          <Note testId="icon-pack-hint">
            {activeIconPack?.author
              ? t(lang, 'iconPackCredit').replace('{name}', activeIconPack.version ? `${activeIconPack.name} ${activeIconPack.version}` : activeIconPack.name).replace('{author}', activeIconPack.author)
              : t(lang, 'iconPackHint')}
          </Note>
        )}
        <SelectRow
          label={t(lang, 'fontPreset')}
          help={t(lang, 'userFontHint')}
          value={activeUserFont ? `${USER_FONT_OPTION_PREFIX}${activeUserFont.id}` : fontPreset}
          options={fontOptions}
          onChange={nextValue => {
            if (nextValue.startsWith(USER_FONT_OPTION_PREFIX)) {
              const pickedFont = findUserFont(userFonts, nextValue.slice(USER_FONT_OPTION_PREFIX.length));
              if (pickedFont) onUpdate('general.userFont', pickedFont.id);
            } else if (userFont) {
              onUpdate('general.fontPreset', nextValue, { persist: false });
              onUpdate('general.userFont', '');
            } else {
              onUpdate('general.fontPreset', nextValue);
            }
          }}
          panelScale={panelScale}
          testId="font-preset-select"
        />
        {userFontStatus === 'loading' && (
          <Note testId="user-font-loading">{t(lang, 'userFontLoading').replace('{name}', userFont)}</Note>
        )}
        {userFontStatus === 'missing' && (
          <Note tone="warn">{t(lang, 'userFontMissing').replace('{name}', userFont)}</Note>
        )}
        {userFontStatus === 'failed' && (
          <Note tone="warn">{t(lang, 'userFontLoadFailed').replace('{name}', userFont)}</Note>
        )}
        {!compact && (
          <>
            {settings.general.iconTheme === 'dororong' && (
              <Toggle
                label={t(lang, 'showIconBadges')}
                checked={settings.general.showIconBadges}
                onChange={value => onUpdate('general.showIconBadges', value)}
              />
            )}
            <SettingRow
              label={t(lang, 'accentColor')}
              help={settings.general.accentColor ? settings.general.accentColor : t(lang, 'accentAuto')}
            >
              <span className="tw-p-swatches">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color || 'auto'}
                    type="button"
                    className="tw-p-swatch"
                    aria-pressed={settings.general.accentColor === color}
                    aria-label={color || t(lang, 'accentAuto')}
                    title={color || t(lang, 'accentAuto')}
                    onClick={() => onUpdate('general.accentColor', color)}
                    style={{ background: color || 'linear-gradient(135deg, #6699cc, #cc6666, #66cc99)' }}
                  />
                ))}
                <input
                  type="color"
                  className="tw-p-swatch"
                  aria-label={t(lang, 'accentColor')}
                  value={accentColor}
                  onChange={event => onUpdate('general.accentColor', event.target.value)}
                />
              </span>
            </SettingRow>
            <Toggle label={t(lang, 'transparentBg')} checked={settings.general.transparentBg} onChange={value => onUpdate('general.transparentBg', value)} />
          </>
        )}
      </SettingsSection>

      <SettingsSection id="languageHotkeys" title={t(lang, 'groupLanguageHotkeys')} shown={isShown(sections, 'languageHotkeys')}>
        <SelectRow
          label={t(lang, 'language')}
          value={selectedLanguage}
          options={availableLanguages.map(option => ({ value: option.code, label: option.label }))}
          onChange={nextValue => onUpdate('general.language', nextValue)}
          panelScale={panelScale}
          testId="language-select"
        />
        <HotkeySettings lang={lang} settings={settings} onUpdate={onUpdate} />
        {onPanelDockChange && (
          <SelectRow
            label={t(lang, 'panelDockLabel')}
            help={t(lang, 'panelDockHint')}
            value={panelDock ?? 'auto'}
            options={[
              { value: 'auto', label: t(lang, 'panelDockAuto') },
              { value: 'left', label: t(lang, 'panelDockLeft') },
              { value: 'right', label: t(lang, 'panelDockRight') },
            ]}
            onChange={value => onPanelDockChange(value as PanelDockPreference)}
            panelScale={panelScale}
            testId="panel-dock-select"
            variant="segmented"
          />
        )}
      </SettingsSection>
    </>
  );
}

interface WidgetTabSectionsProps extends SectionControlProps {
  settings: WidgetSettings;
  onUpdate: UpdateSettingFn;
}

export function CombatTabSections({
  lang,
  settings,
  onUpdate,
  sections,
  panelScale = 1,
}: WidgetTabSectionsProps) {
  const carryWeightDisplayOptions = buildCarryWeightDisplayOptions(lang);
  const resistanceDisplayOptions = buildResistanceDisplayOptions(lang);
  const experienceToggles: ItemVisibilityToggleConfig[] = [
    {
      itemId: 'experience.progress',
      fallback: settings.experience.enabled,
      label: t(lang, 'integratedProgressionWidget'),
    },
  ];
  const playerInfoToggles: ItemVisibilityToggleConfig[] = [
    {
      itemId: 'player.level',
      fallback: settings.playerInfo.level,
      label: t(lang, 'standaloneLevel'),
    },
    { itemId: 'player.gold', fallback: settings.playerInfo.gold, label: t(lang, 'gold') },
    {
      itemId: 'player.carryWeight',
      fallback: settings.playerInfo.carryWeight,
      label: t(lang, 'carryWeight'),
    },
    { itemId: 'player.health', fallback: settings.playerInfo.health, label: t(lang, 'health') },
    {
      itemId: 'player.magicka',
      fallback: settings.playerInfo.magicka,
      label: t(lang, 'magicka'),
    },
    {
      itemId: 'player.stamina',
      fallback: settings.playerInfo.stamina,
      label: t(lang, 'stamina'),
    },
  ];
  const resistanceToggles: ItemVisibilityToggleConfig[] = [
    { itemId: 'resistance.magic', fallback: settings.resistances.magic, label: t(lang, 'magic') },
    { itemId: 'resistance.fire', fallback: settings.resistances.fire, label: t(lang, 'fire') },
    { itemId: 'resistance.frost', fallback: settings.resistances.frost, label: t(lang, 'frost') },
    { itemId: 'resistance.shock', fallback: settings.resistances.shock, label: t(lang, 'shock') },
    { itemId: 'resistance.poison', fallback: settings.resistances.poison, label: t(lang, 'poison') },
    {
      itemId: 'resistance.disease',
      fallback: settings.resistances.disease,
      label: t(lang, 'disease'),
    },
  ];
  const defenseToggles: ItemVisibilityToggleConfig[] = [
    {
      itemId: 'defense.armorRating',
      fallback: settings.defense.armorRating,
      label: t(lang, 'armorRating'),
    },
    {
      itemId: 'defense.damageReduction',
      fallback: settings.defense.damageReduction,
      label: t(lang, 'damageReduction'),
    },
  ];
  const offenseToggles: ItemVisibilityToggleConfig[] = [
    {
      itemId: 'offense.rightHandDamage',
      fallback: settings.offense.rightHandDamage,
      label: t(lang, 'rightHandDamage'),
    },
    {
      itemId: 'offense.leftHandDamage',
      fallback: settings.offense.leftHandDamage,
      label: t(lang, 'leftHandDamage'),
    },
    {
      itemId: 'offense.critChance',
      fallback: settings.offense.critChance,
      label: t(lang, 'critChance'),
    },
  ];
  const equippedToggles: ItemVisibilityToggleConfig[] = [
    {
      itemId: 'equipped.rightHand',
      fallback: settings.equipped.rightHand,
      label: t(lang, 'rightHandEquipped'),
    },
    {
      itemId: 'equipped.leftHand',
      fallback: settings.equipped.leftHand,
      label: t(lang, 'leftHandEquipped'),
    },
    {
      itemId: 'equipped.voice',
      fallback: settings.equipped.voice,
      label: t(lang, 'voiceEquipped'),
    },
    {
      itemId: 'equipped.potion',
      fallback: settings.equipped.potion,
      label: t(lang, 'equippedPotion'),
    },
  ];
  const movementToggles: ItemVisibilityToggleConfig[] = [
    {
      itemId: 'movement.speedMult',
      fallback: settings.movement.speedMult,
      label: t(lang, 'speed'),
    },
  ];

  return (
    <>
      <SettingsSection id="experience" title={t(lang, 'progressionWidgetPanel')} shown={isShown(sections, 'experience')}>
        {experienceToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
          />
        ))}
        <Toggle
          label={t(lang, 'experienceShowNumbers')}
          checked={settings.experience.showNumbers}
          onChange={value => onUpdate('experience.showNumbers', value)}
        />
      </SettingsSection>

      <SettingsSection id="playerInfo" title={t(lang, 'playerInfo')} shown={isShown(sections, 'playerInfo')}>
        {playerInfoToggles.slice(0, 3).map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
          />
        ))}
        <SelectRow
          label={t(lang, 'carryWeightDisplay')}
          value={settings.playerInfo.carryWeightDisplay}
          options={carryWeightDisplayOptions}
          onChange={nextValue => onUpdate('playerInfo.carryWeightDisplay', nextValue)}
          panelScale={panelScale}
          testId="carry-weight-display-select"
          variant="segmented"
        />
        {playerInfoToggles.slice(3).map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
          />
        ))}
      </SettingsSection>

      <SettingsSection id="resistances" title={t(lang, 'resistances')} shown={isShown(sections, 'resistances')}>
        <SelectRow
          label={t(lang, 'resistanceDisplay')}
          value={settings.resistances.displayMode}
          options={resistanceDisplayOptions}
          onChange={nextValue => onUpdate('resistances.displayMode', nextValue)}
          panelScale={panelScale}
          testId="resistance-display-select"
          variant="segmented"
        />
        {resistanceToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
          />
        ))}
      </SettingsSection>

      <SettingsSection id="defense" title={t(lang, 'defense')} shown={isShown(sections, 'defense')}>
        {defenseToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
          />
        ))}
      </SettingsSection>

      <SettingsSection id="offense" title={t(lang, 'offense')} shown={isShown(sections, 'offense')}>
        {offenseToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
          />
        ))}
      </SettingsSection>

      <SettingsSection id="equipped" title={t(lang, 'equipped')} shown={isShown(sections, 'equipped')}>
        {equippedToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
          />
        ))}
        {settings.general.hudStyle === 'compact' && (
          <SelectRow
            label={t(lang, 'equipNameDisplayLabel')}
            value={settings.equipped.nameDisplay}
            options={buildEquipNameDisplayOptions(lang)}
            onChange={nextValue => onUpdate('equipped.nameDisplay', nextValue)}
            panelScale={panelScale}
            testId="equip-name-display-select"
            variant="segmented"
          />
        )}
      </SettingsSection>

      <SettingsSection id="movement" title={t(lang, 'movement')} shown={isShown(sections, 'movement')}>
        {movementToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
          />
        ))}
      </SettingsSection>
    </>
  );
}

export function EffectsTabSections({
  lang,
  settings,
  onUpdate,
  sections,
  panelScale = 1,
}: WidgetTabSectionsProps) {
  const showGameTime = readItemVisibility(settings, 'time.game', settings.time.gameDateTime);
  const showRealTime = readItemVisibility(settings, 'time.real', settings.time.realDateTime);
  const timeDisplayOptions = buildTimeDisplayOptions(lang);
  const timedEffectsLayoutOptions = buildTimedEffectsLayoutOptions(lang);
  const timeToggles: ItemVisibilityToggleConfig[] = [
    { itemId: 'time.game', fallback: settings.time.gameDateTime, label: t(lang, 'gameDateTime') },
    { itemId: 'time.real', fallback: settings.time.realDateTime, label: t(lang, 'realDateTime') },
    { itemId: 'time.weather', fallback: settings.time.weather, label: t(lang, 'weather') },
    { itemId: 'time.playtime', fallback: settings.time.playtime, label: t(lang, 'playtime') },
    { itemId: 'time.daysPassed', fallback: settings.time.daysPassed, label: t(lang, 'daysPassed') },
  ];
  const timedEffectsToggles: ItemVisibilityToggleConfig[] = [
    {
      itemId: 'timedEffects.list',
      fallback: settings.timedEffects.enabled,
      label: t(lang, 'timedEffectsEnabled'),
    },
  ];

  return (
    <>
      <SettingsSection id="time" title={t(lang, 'time')} shown={isShown(sections, 'time')}>
        <ItemVisibilityToggle
          settings={settings}
          onUpdate={onUpdate}
          config={timeToggles[0]}
        />
        {showGameTime && (
          <SubSettings>
            <SelectRow
              label={t(lang, 'timeDisplay')}
              value={settings.time.gameDisplay}
              options={timeDisplayOptions}
              onChange={nextValue => onUpdate('time.gameDisplay', nextValue)}
              panelScale={panelScale}
              testId="time-game-display-select"
              variant="segmented"
            />
          </SubSettings>
        )}
        <ItemVisibilityToggle
          settings={settings}
          onUpdate={onUpdate}
          config={timeToggles[1]}
        />
        {showRealTime && (
          <SubSettings>
            <SelectRow
              label={t(lang, 'timeDisplay')}
              value={settings.time.realDisplay}
              options={timeDisplayOptions}
              onChange={nextValue => onUpdate('time.realDisplay', nextValue)}
              panelScale={panelScale}
              testId="time-real-display-select"
              variant="segmented"
            />
          </SubSettings>
        )}
        {timeToggles.slice(2).map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
          />
        ))}
      </SettingsSection>

      <SettingsSection id="timedEffects" title={t(lang, 'timedEffects')} shown={isShown(sections, 'timedEffects')}>
        {timedEffectsToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
          />
        ))}
        <SelectRow
          label={t(lang, 'timedEffectsLayout')}
          value={settings.timedEffects.listLayout}
          options={timedEffectsLayoutOptions}
          onChange={nextValue => {
            const listLayout = nextValue as WidgetSettings['timedEffects']['listLayout'];
            const shifted = shiftEffectListForLayout(settings, listLayout);
            if (shifted) onUpdate('itemLayouts', shifted, { persist: false });
            onUpdate('timedEffects.listLayout', listLayout);
          }}
          panelScale={panelScale}
          testId="timed-effects-layout-select"
          variant="segmented"
        />
        <SelectRow
          label={t(lang, 'timedEffectsFilter')}
          value={settings.timedEffects.filter}
          options={[
            { value: 'all', label: t(lang, 'timedEffectsFilterAll') },
            { value: 'debuffs', label: t(lang, 'timedEffectsFilterDebuffs') },
            { value: 'buffs', label: t(lang, 'timedEffectsFilterBuffs') },
          ]}
          onChange={nextValue => onUpdate('timedEffects.filter', nextValue)}
          panelScale={panelScale}
          testId="timed-effects-filter-select"
          variant="segmented"
        />
        <SelectRow
          label={t(lang, 'timedEffectsHideLong')}
          value={String(settings.timedEffects.hideLongerThanMin)}
          options={[
            { value: '0', label: t(lang, 'timedEffectsHideLongOff') },
            { value: '10', label: t(lang, 'timedEffectsHideLong10') },
            { value: '60', label: t(lang, 'timedEffectsHideLong60') },
          ]}
          onChange={nextValue => onUpdate('timedEffects.hideLongerThanMin', Number(nextValue))}
          panelScale={panelScale}
          testId="timed-effects-hide-long-select"
          variant="segmented"
        />
        <SliderRow
          label={t(lang, 'timedEffectsMaxVisible')}
          value={settings.timedEffects.maxVisible}
          min={1}
          max={12}
          onChange={value => onUpdate('timedEffects.maxVisible', value)}
        />
      </SettingsSection>
    </>
  );
}

interface PresetsTabSectionsProps extends SectionControlProps {
  settings: WidgetSettings;
  onUpdate: UpdateSettingFn;
  /** Folds the settings window into the layout bar; the button is shown only with a handler. */
  onStartLayoutEdit?: () => void;
}

export function PresetsTabSections({
  lang,
  settings,
  onUpdate,
  sections,
  panelScale = 1,
  onStartLayoutEdit,
}: PresetsTabSectionsProps) {
  const [pendingSlotLoad, setPendingSlotLoad] = useState<number | null>(null);
  const [pendingReset, setPendingReset] = useState(false);
  // An unanswered load confirmation lapses so a much later single click cannot replace the layout.
  useEffect(() => {
    if (pendingSlotLoad === null) return;
    const timer = window.setTimeout(() => setPendingSlotLoad(null), CONFIRM_AGAIN_MS);
    return () => window.clearTimeout(timer);
  }, [pendingSlotLoad]);
  // Resetting moves every widget back at once, so it also asks for a second click.
  useEffect(() => {
    if (!pendingReset) return;
    const timer = window.setTimeout(() => setPendingReset(false), CONFIRM_AGAIN_MS);
    return () => window.clearTimeout(timer);
  }, [pendingReset]);
  return (
    <>

      <SettingsSection id="layoutTools" title={t(lang, 'layoutTools')} shown={isShown(sections, 'layoutTools')}>
        {onStartLayoutEdit && (
          <>
            <button
              type="button"
              className="tw-p-btn is-primary"
              data-layout-mode-start-inline="true"
              onClick={onStartLayoutEdit}
              style={{ width: '100%', marginTop: 'calc(16px * var(--ps))' }}
            >
              {t(lang, 'layoutModeStart')}
            </button>
            <Note>{t(lang, 'layoutModeStartHint')}</Note>
          </>
        )}
        {settings.general.hudStyle === 'compact' && (
          <>
            <SelectRow
              label={t(lang, 'compactAnchorLabel')}
              value={settings.general.compactAnchor}
              options={[
                { value: 'bottomLeft', label: t(lang, 'compactAnchorBottomLeft') },
                { value: 'bottomRight', label: t(lang, 'compactAnchorBottomRight') },
                { value: 'topLeft', label: t(lang, 'compactAnchorTopLeft') },
                { value: 'topRight', label: t(lang, 'compactAnchorTopRight') },
              ]}
              onChange={nextValue => {
                const compactAnchor = nextValue as WidgetSettings['general']['compactAnchor'];
                if (compactAnchor === settings.general.compactAnchor) {
                  onUpdate('general.compactAnchor', compactAnchor);
                  return;
                }
                const nextItemLayouts = buildItemLayoutsForHudStyle(
                  { ...settings, general: { ...settings.general, compactAnchor } },
                  'compact',
                );
                onUpdate('positions', {}, { persist: false });
                onUpdate('layouts', {}, { persist: false });
                onUpdate('groupScales', {}, { persist: false });
                onUpdate('general.compactAnchor', compactAnchor, { persist: false });
                onUpdate('itemLayouts', nextItemLayouts);
              }}
              panelScale={panelScale}
              testId="compact-anchor-select"
            />
            <SelectRow
              label={t(lang, 'compactSizeLabel')}
              value={settings.general.size}
              options={[
                { value: 'xsmall', label: t(lang, 'compactSizeXSmall') },
                { value: 'small', label: t(lang, 'compactSizeSmall') },
                { value: 'medium', label: t(lang, 'compactSizeMedium') },
                { value: 'large', label: t(lang, 'compactSizeLarge') },
              ]}
              onChange={nextValue => {
                const size = nextValue as WidgetSettings['general']['size'];
                if (size === settings.general.size) {
                  onUpdate('general.size', size);
                  return;
                }
                const nextItemLayouts = buildItemLayoutsForHudStyle(
                  { ...settings, general: { ...settings.general, size } },
                  'compact',
                );
                onUpdate('positions', {}, { persist: false });
                onUpdate('layouts', {}, { persist: false });
                onUpdate('groupScales', {}, { persist: false });
                onUpdate('general.size', size, { persist: false });
                onUpdate('itemLayouts', nextItemLayouts);
              }}
              panelScale={panelScale}
              testId="compact-size-select"
            />
            {typeof window !== 'undefined' && window.innerHeight < 900 && settings.general.size !== 'large' && (
              <p className="tw-p-note tw-p-help is-warn" data-compact-size-hint>
                {t(lang, 'compactSizeSmallScreenHint')}
              </p>
            )}
            <Note>{t(lang, 'compactAnchorHint')}</Note>
          </>
        )}
        <GroupTitle>{t(lang, 'layoutEditingLabel')}</GroupTitle>
        <LayoutEditGuide lang={lang} />
        <Note>{t(lang, 'editVisibilityHint')}</Note>
        <Note>{t(lang, 'layoutUndoHint')}</Note>
        <button
          type="button"
          className={pendingReset ? 'tw-p-btn is-danger is-armed' : 'tw-p-btn is-danger'}
          data-reset-positions="true"
          data-confirm-pending={pendingReset ? 'true' : undefined}
          onClick={() => {
            if (!pendingReset) {
              setPendingReset(true);
              return;
            }
            setPendingReset(false);
            onUpdate('positions', {}, { persist: false });
            onUpdate('layouts', {}, { persist: false });
            onUpdate('groupScales', {}, { persist: false });
            onUpdate('itemLayouts', {});
          }}
          style={{ width: '100%', marginTop: 'calc(10px * var(--ps))' }}
        >
          {t(lang, pendingReset ? 'resetPositionsConfirm' : 'resetPositions')}
        </button>
      </SettingsSection>

      <SettingsSection id="layoutSlots" title={t(lang, 'layoutSlotsLabel')} shown={isShown(sections, 'layoutSlots')}>
        <div data-layout-slots>
          {settings.layoutSlots.map((slot, index) => (
            <div key={index} className="tw-p-row" data-layout-slot={index}>
              <div>
                <div className="tw-p-label">{t(lang, 'layoutSlotName')} {index + 1}</div>
                <p className="tw-p-help">
                  {slot
                    ? `${t(lang, slot.hudStyle === 'compact' ? 'hudStyleCompact' : 'hudStyleClassic')} · ${new Date(slot.savedAt).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : t(lang, 'layoutSlotEmpty')}
                </p>
              </div>
              <span className="tw-p-button-row">
              <button
                type="button"
                data-layout-slot-save={index}
                onClick={() => {
                  const next = [...settings.layoutSlots];
                  setPendingSlotLoad(null);
                  next[index] = captureLayoutSlot(settings, Date.now(), { width: window.innerWidth, height: window.innerHeight });
                  onUpdate('layoutSlots', next);
                }}
                className="tw-p-btn is-small"
              >
                {t(lang, 'layoutSlotSave')}
              </button>
              <button
                type="button"
                data-layout-slot-load={index}
                disabled={!slot}
                onClick={() => {
                  if (!slot) return;
                  // Loading replaces the current arrangement and cannot be undone: ask once more.
                  if (pendingSlotLoad !== index) {
                    setPendingSlotLoad(index);
                    return;
                  }
                  setPendingSlotLoad(null);
                  onUpdate('positions', {}, { persist: false });
                  onUpdate('layouts', {}, { persist: false });
                  onUpdate('groupScales', {}, { persist: false });
                  onUpdate('general.hudStyle', slot.hudStyle, { persist: false });
                  onUpdate('general.compactAnchor', slot.compactAnchor, { persist: false });
                  if (slot.size) onUpdate('general.size', slot.size, { persist: false });
                  onUpdate('itemLayouts', { ...slot.itemLayouts });
                }}
                className={pendingSlotLoad === index ? 'tw-p-btn is-small is-primary' : 'tw-p-btn is-small'}
              >
                {t(lang, pendingSlotLoad === index ? 'layoutSlotConfirm' : 'layoutSlotLoad')}
              </button>
              </span>
            </div>
          ))}
          <Note>{t(lang, 'layoutSlotsHint')}</Note>
        </div>
      </SettingsSection>

      <SettingsSection id="presets" title={t(lang, 'preset')} shown={isShown(sections, 'presets')}>
        <PresetSection lang={lang} settings={settings} />
      </SettingsSection>
    </>
  );
}
