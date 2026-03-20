import type { Language, UpdateSettingFn, WidgetSettings } from '../../types/settings';
import { t, type LocalizationLanguageEntry } from '../../i18n/translations';
import { AccordionSection, CustomSelect, Toggle } from './SettingsControls';
import { PresetSection } from './PresetSection';
import { scalePanelPixels } from './panelScale';
import { FONT_PRESET_OPTIONS } from '../../utils/fontPresets';

const PRESET_COLORS = [
  '', '#6699cc', '#cc6666', '#66cc99', '#cc99cc', '#ccaa66', '#66cccc', '#ffffff',
];

interface SectionControlProps {
  lang: Language;
  isSectionExpanded: (id: string) => boolean;
  toggleSection: (id: string) => void;
  panelScale?: number;
}

interface SelectRowProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  panelScale?: number;
  testId?: string;
}

function SelectRow({
  label,
  value,
  options,
  onChange,
  panelScale = 1,
  testId,
}: SelectRowProps) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${scalePanelPixels(8, panelScale)} 0` }}>
      <span style={{ color: '#aaa', fontSize: scalePanelPixels(20, panelScale) }}>{label}</span>
      <CustomSelect
        value={value}
        options={options}
        onChange={onChange}
        panelScale={panelScale}
        testId={testId}
      />
    </label>
  );
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
  panelScale?: number;
}

function ItemVisibilityToggle({
  settings,
  onUpdate,
  config,
  panelScale = 1,
}: ItemVisibilityToggleProps) {
  return (
    <Toggle
      label={config.label}
      checked={readItemVisibility(settings, config.itemId, config.fallback)}
      onChange={value => updateItemVisibility(onUpdate, config.itemId, value)}
      panelScale={panelScale}
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

function buildFontPresetOptions(lang: Language) {
  return FONT_PRESET_OPTIONS.map(option => ({
    value: option.value,
    label: t(lang, option.labelKey),
  }));
}

interface GeneralTabSectionsProps extends SectionControlProps {
  settings: WidgetSettings;
  selectedLanguage: Language;
  effectiveVisible: boolean;
  onUpdate: UpdateSettingFn;
  accentColor: string;
  availableLanguages: LocalizationLanguageEntry[];
}

export function GeneralTabSections({
  lang,
  settings,
  selectedLanguage,
  effectiveVisible,
  onUpdate,
  accentColor,
  availableLanguages,
  isSectionExpanded,
  toggleSection,
  panelScale = 1,
}: GeneralTabSectionsProps) {
  const fontPresetOptions = buildFontPresetOptions(lang);

  return (
    <AccordionSection
      id="generalMain"
      title={t(lang, 'general')}
      expanded={isSectionExpanded('generalMain')}
      onToggle={toggleSection}
      panelScale={panelScale}
    >
      <Toggle label={t(lang, 'showWidgets')} checked={effectiveVisible} onChange={value => onUpdate('general.visible', value)} panelScale={panelScale} />
      {effectiveVisible !== settings.general.visible && (
        <p style={{ color: '#a8bbd8', fontSize: scalePanelPixels(16, panelScale), margin: `0 0 ${scalePanelPixels(8, panelScale)} 0` }}>
          {t(lang, 'sessionVisibilityHint')}
        </p>
      )}
      <Toggle label={t(lang, 'combatOnly')} checked={settings.general.combatOnly} onChange={value => onUpdate('general.combatOnly', value)} panelScale={panelScale} />
      <Toggle label={t(lang, 'showOnChangeOnly')} checked={settings.general.showOnChangeOnly} onChange={value => onUpdate('general.showOnChangeOnly', value)} panelScale={panelScale} />
      {settings.general.showOnChangeOnly && (
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${scalePanelPixels(8, panelScale)} 0 ${scalePanelPixels(8, panelScale)} ${scalePanelPixels(20, panelScale)}` }}>
          <span style={{ color: '#aaa', fontSize: scalePanelPixels(20, panelScale) }}>
            {t(lang, 'changeDisplaySeconds')}: {settings.general.changeDisplaySeconds}
          </span>
          <input
            type="range"
            min={1}
            max={15}
            value={settings.general.changeDisplaySeconds}
            onChange={event => onUpdate('general.changeDisplaySeconds', Number(event.target.value))}
            style={{ width: scalePanelPixels(180, panelScale) }}
          />
        </label>
      )}

      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${scalePanelPixels(8, panelScale)} 0` }}>
        <span style={{ color: '#ddd', fontSize: scalePanelPixels(24, panelScale) }}>{t(lang, 'opacity')}: {settings.general.opacity}%</span>
        <input
          type="range"
          min={10}
          max={100}
          value={settings.general.opacity}
          onChange={event => onUpdate('general.opacity', Number(event.target.value))}
          style={{ width: scalePanelPixels(220, panelScale), height: scalePanelPixels(8, panelScale) }}
        />
      </label>

      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${scalePanelPixels(8, panelScale)} 0` }}>
        <span style={{ color: '#ddd', fontSize: scalePanelPixels(24, panelScale) }}>{t(lang, 'language')}</span>
        <CustomSelect value={selectedLanguage}
          options={availableLanguages.map(option => ({ value: option.code, label: option.label }))}
          onChange={nextValue => onUpdate('general.language', nextValue)}
          panelScale={panelScale}
        />
      </label>

      <SelectRow
        label={t(lang, 'fontPreset')}
        value={settings.general.fontPreset}
        options={fontPresetOptions}
        onChange={nextValue => onUpdate('general.fontPreset', nextValue)}
        panelScale={panelScale}
        testId="font-preset-select"
      />

      <div style={{ padding: `${scalePanelPixels(8, panelScale)} 0` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: scalePanelPixels(8, panelScale) }}>
          <span style={{ color: '#ddd', fontSize: scalePanelPixels(24, panelScale) }}>{t(lang, 'accentColor')}</span>
          <span style={{ color: '#888', fontSize: scalePanelPixels(18, panelScale) }}>
            {settings.general.accentColor ? settings.general.accentColor : t(lang, 'accentAuto')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: scalePanelPixels(8, panelScale), flexWrap: 'wrap', alignItems: 'center' }}>
          {PRESET_COLORS.map(color => (
            <div key={color || 'auto'} onClick={() => onUpdate('general.accentColor', color)}
              style={{
                width: scalePanelPixels(36, panelScale), height: scalePanelPixels(36, panelScale), borderRadius: scalePanelPixels(6, panelScale), cursor: 'pointer',
                background: color || 'linear-gradient(135deg, #6699cc, #cc6666, #66cc99)',
                border: settings.general.accentColor === color
                  ? '3px solid #ffd700' : '2px solid rgba(255,255,255,0.2)',
                boxSizing: 'border-box',
              }} title={color || t(lang, 'accentAuto')} />
          ))}
          <input
            type="color"
            value={accentColor}
            onChange={event => onUpdate('general.accentColor', event.target.value)}
            style={{ width: scalePanelPixels(36, panelScale), height: scalePanelPixels(36, panelScale), border: 'none', cursor: 'pointer', background: 'transparent' }}
          />
        </div>
      </div>
      <Toggle label={t(lang, 'transparentBg')} checked={settings.general.transparentBg} onChange={value => onUpdate('general.transparentBg', value)} panelScale={panelScale} />
    </AccordionSection>
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
  isSectionExpanded,
  toggleSection,
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
      <AccordionSection
        id="experience"
        title={t(lang, 'progressionWidgetPanel')}
        expanded={isSectionExpanded('experience')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        {experienceToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
            panelScale={panelScale}
          />
        ))}
      </AccordionSection>

      <AccordionSection
        id="playerInfo"
        title={t(lang, 'playerInfo')}
        expanded={isSectionExpanded('playerInfo')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        {playerInfoToggles.slice(0, 3).map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
            panelScale={panelScale}
          />
        ))}
        <SelectRow
          label={t(lang, 'carryWeightDisplay')}
          value={settings.playerInfo.carryWeightDisplay}
          options={carryWeightDisplayOptions}
          onChange={nextValue => onUpdate('playerInfo.carryWeightDisplay', nextValue)}
          panelScale={panelScale}
          testId="carry-weight-display-select"
        />
        {playerInfoToggles.slice(3).map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
            panelScale={panelScale}
          />
        ))}
      </AccordionSection>

      <AccordionSection
        id="resistances"
        title={t(lang, 'resistances')}
        expanded={isSectionExpanded('resistances')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        <SelectRow
          label={t(lang, 'resistanceDisplay')}
          value={settings.resistances.displayMode}
          options={resistanceDisplayOptions}
          onChange={nextValue => onUpdate('resistances.displayMode', nextValue)}
          panelScale={panelScale}
          testId="resistance-display-select"
        />
        {resistanceToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
            panelScale={panelScale}
          />
        ))}
      </AccordionSection>

      <AccordionSection
        id="defense"
        title={t(lang, 'defense')}
        expanded={isSectionExpanded('defense')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        {defenseToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
            panelScale={panelScale}
          />
        ))}
      </AccordionSection>

      <AccordionSection
        id="offense"
        title={t(lang, 'offense')}
        expanded={isSectionExpanded('offense')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        {offenseToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
            panelScale={panelScale}
          />
        ))}
      </AccordionSection>

      <AccordionSection
        id="equipped"
        title={t(lang, 'equipped')}
        expanded={isSectionExpanded('equipped')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        {equippedToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
            panelScale={panelScale}
          />
        ))}
      </AccordionSection>

      <AccordionSection
        id="movement"
        title={t(lang, 'movement')}
        expanded={isSectionExpanded('movement')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        {movementToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
            panelScale={panelScale}
          />
        ))}
      </AccordionSection>
    </>
  );
}

export function EffectsTabSections({
  lang,
  settings,
  onUpdate,
  isSectionExpanded,
  toggleSection,
  panelScale = 1,
}: WidgetTabSectionsProps) {
  const showGameTime = readItemVisibility(settings, 'time.game', settings.time.gameDateTime);
  const showRealTime = readItemVisibility(settings, 'time.real', settings.time.realDateTime);
  const timeDisplayOptions = buildTimeDisplayOptions(lang);
  const timedEffectsLayoutOptions = buildTimedEffectsLayoutOptions(lang);
  const timeToggles: ItemVisibilityToggleConfig[] = [
    { itemId: 'time.game', fallback: settings.time.gameDateTime, label: t(lang, 'gameDateTime') },
    { itemId: 'time.real', fallback: settings.time.realDateTime, label: t(lang, 'realDateTime') },
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
      <AccordionSection
        id="time"
        title={t(lang, 'time')}
        expanded={isSectionExpanded('time')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        <ItemVisibilityToggle
          settings={settings}
          onUpdate={onUpdate}
          config={timeToggles[0]}
          panelScale={panelScale}
        />
        {showGameTime && (
          <SelectRow
            label={t(lang, 'timeDisplay')}
            value={settings.time.gameDisplay}
            options={timeDisplayOptions}
            onChange={nextValue => onUpdate('time.gameDisplay', nextValue)}
            panelScale={panelScale}
            testId="time-game-display-select"
          />
        )}
        <ItemVisibilityToggle
          settings={settings}
          onUpdate={onUpdate}
          config={timeToggles[1]}
          panelScale={panelScale}
        />
        {showRealTime && (
          <SelectRow
            label={t(lang, 'timeDisplay')}
            value={settings.time.realDisplay}
            options={timeDisplayOptions}
            onChange={nextValue => onUpdate('time.realDisplay', nextValue)}
            panelScale={panelScale}
            testId="time-real-display-select"
          />
        )}
      </AccordionSection>

      <AccordionSection
        id="timedEffects"
        title={t(lang, 'timedEffects')}
        expanded={isSectionExpanded('timedEffects')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        {timedEffectsToggles.map(config => (
          <ItemVisibilityToggle
            key={config.itemId}
            settings={settings}
            onUpdate={onUpdate}
            config={config}
            panelScale={panelScale}
          />
        ))}
        <SelectRow
          label={t(lang, 'timedEffectsLayout')}
          value={settings.timedEffects.listLayout}
          options={timedEffectsLayoutOptions}
          onChange={nextValue => onUpdate('timedEffects.listLayout', nextValue)}
          panelScale={panelScale}
          testId="timed-effects-layout-select"
        />
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${scalePanelPixels(8, panelScale)} 0` }}>
          <span style={{ color: '#aaa', fontSize: scalePanelPixels(20, panelScale) }}>
            {t(lang, 'timedEffectsMaxVisible')}: {settings.timedEffects.maxVisible}
          </span>
          <input
            type="range"
            min={1}
            max={12}
            value={settings.timedEffects.maxVisible}
            onChange={event => onUpdate('timedEffects.maxVisible', Number(event.target.value))}
            style={{ width: scalePanelPixels(180, panelScale) }}
          />
        </label>
      </AccordionSection>
    </>
  );
}

interface AlertsTabSectionsProps extends SectionControlProps {
  settings: WidgetSettings;
  onUpdate: UpdateSettingFn;
}

export function AlertsTabSections({
  lang,
  settings,
  onUpdate,
  isSectionExpanded,
  toggleSection,
  panelScale = 1,
}: AlertsTabSectionsProps) {
  return (
    <AccordionSection
      id="visualAlerts"
      title={t(lang, 'visualAlerts')}
      expanded={isSectionExpanded('visualAlerts')}
      onToggle={toggleSection}
      panelScale={panelScale}
    >
      <Toggle label={t(lang, 'visualAlertsEnabled')} checked={settings.visualAlerts.enabled} onChange={value => onUpdate('visualAlerts.enabled', value)} panelScale={panelScale} />
      {settings.visualAlerts.enabled && (
        <>
          <Toggle label={t(lang, 'lowHealth')} checked={settings.visualAlerts.lowHealth} onChange={value => onUpdate('visualAlerts.lowHealth', value)} panelScale={panelScale} />
          {settings.visualAlerts.lowHealth && (
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${scalePanelPixels(4, panelScale)} 0 ${scalePanelPixels(8, panelScale)} ${scalePanelPixels(20, panelScale)}` }}>
              <span style={{ color: '#aaa', fontSize: scalePanelPixels(20, panelScale) }}>{t(lang, 'threshold')}: {settings.visualAlerts.lowHealthThreshold}%</span>
              <input
                type="range"
                min={10}
                max={60}
                value={settings.visualAlerts.lowHealthThreshold}
                onChange={event => onUpdate('visualAlerts.lowHealthThreshold', Number(event.target.value))}
                style={{ width: scalePanelPixels(180, panelScale) }}
              />
            </label>
          )}
          <Toggle label={t(lang, 'lowStamina')} checked={settings.visualAlerts.lowStamina} onChange={value => onUpdate('visualAlerts.lowStamina', value)} panelScale={panelScale} />
          {settings.visualAlerts.lowStamina && (
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${scalePanelPixels(4, panelScale)} 0 ${scalePanelPixels(8, panelScale)} ${scalePanelPixels(20, panelScale)}` }}>
              <span style={{ color: '#aaa', fontSize: scalePanelPixels(20, panelScale) }}>{t(lang, 'threshold')}: {settings.visualAlerts.lowStaminaThreshold}%</span>
              <input
                type="range"
                min={10}
                max={60}
                value={settings.visualAlerts.lowStaminaThreshold}
                onChange={event => onUpdate('visualAlerts.lowStaminaThreshold', Number(event.target.value))}
                style={{ width: scalePanelPixels(180, panelScale) }}
              />
            </label>
          )}
          <Toggle label={t(lang, 'lowMagicka')} checked={settings.visualAlerts.lowMagicka} onChange={value => onUpdate('visualAlerts.lowMagicka', value)} panelScale={panelScale} />
          {settings.visualAlerts.lowMagicka && (
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${scalePanelPixels(4, panelScale)} 0 ${scalePanelPixels(8, panelScale)} ${scalePanelPixels(20, panelScale)}` }}>
              <span style={{ color: '#aaa', fontSize: scalePanelPixels(20, panelScale) }}>{t(lang, 'threshold')}: {settings.visualAlerts.lowMagickaThreshold}%</span>
              <input
                type="range"
                min={10}
                max={60}
                value={settings.visualAlerts.lowMagickaThreshold}
                onChange={event => onUpdate('visualAlerts.lowMagickaThreshold', Number(event.target.value))}
                style={{ width: scalePanelPixels(180, panelScale) }}
              />
            </label>
          )}
          <Toggle label={t(lang, 'overencumbered')} checked={settings.visualAlerts.overencumbered} onChange={value => onUpdate('visualAlerts.overencumbered', value)} panelScale={panelScale} />
        </>
      )}
    </AccordionSection>
  );
}

interface PresetsTabSectionsProps extends SectionControlProps {
  settings: WidgetSettings;
  onUpdate: UpdateSettingFn;
}

export function PresetsTabSections({
  lang,
  settings,
  onUpdate,
  isSectionExpanded,
  toggleSection,
  panelScale = 1,
}: PresetsTabSectionsProps) {
  return (
    <>
      <AccordionSection
        id="presets"
        title={t(lang, 'preset')}
        expanded={isSectionExpanded('presets')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        <PresetSection lang={lang} settings={settings} panelScale={panelScale} />
      </AccordionSection>

      <AccordionSection
        id="layoutTools"
        title={t(lang, 'layoutTools')}
        expanded={isSectionExpanded('layoutTools')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        <button
          onClick={() => {
            onUpdate('positions', {}, { persist: false });
            onUpdate('layouts', {}, { persist: false });
            onUpdate('groupScales', {}, { persist: false });
            onUpdate('itemLayouts', {});
          }}
          style={{
            background: 'rgba(255,100,100,0.2)',
            border: '1px solid rgba(255,100,100,0.4)',
            color: '#ff8888',
            fontSize: scalePanelPixels(20, panelScale),
            cursor: 'pointer',
            borderRadius: scalePanelPixels(8, panelScale),
            padding: `${scalePanelPixels(12, panelScale)} ${scalePanelPixels(20, panelScale)}`,
            width: '100%',
          }}
        >
          {t(lang, 'resetPositions')}
        </button>
        <p style={{ color: '#888', fontSize: scalePanelPixels(18, panelScale), margin: `${scalePanelPixels(10, panelScale)} 0 0 0`, textAlign: 'center' }}>
          {t(lang, 'dragHint')}
        </p>
        <p style={{ color: '#88a4c4', fontSize: scalePanelPixels(18, panelScale), margin: `${scalePanelPixels(6, panelScale)} 0 0 0`, textAlign: 'center' }}>
          {t(lang, 'editVisibilityHint')}
        </p>
      </AccordionSection>
    </>
  );
}
