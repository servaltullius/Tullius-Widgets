import type { Language, UpdateSettingFn, WidgetSettings } from '../../types/settings';
import { t, type LocalizationLanguageEntry } from '../../i18n/translations';
import { AccordionSection, CustomSelect, Toggle } from './SettingsControls';
import { PresetSection } from './PresetSection';
import { scalePanelPixels } from './panelScale';

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
  return (
    <>
      <AccordionSection
        id="experience"
        title={t(lang, 'progressionWidgetPanel')}
        expanded={isSectionExpanded('experience')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        <Toggle
          label={t(lang, 'integratedProgressionWidget')}
          checked={readItemVisibility(settings, 'experience.progress', settings.experience.enabled)}
          onChange={value => updateItemVisibility(onUpdate, 'experience.progress', value)}
          panelScale={panelScale}
        />
      </AccordionSection>

      <AccordionSection
        id="playerInfo"
        title={t(lang, 'playerInfo')}
        expanded={isSectionExpanded('playerInfo')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        <Toggle label={t(lang, 'standaloneLevel')} checked={readItemVisibility(settings, 'player.level', settings.playerInfo.level)} onChange={value => updateItemVisibility(onUpdate, 'player.level', value)} panelScale={panelScale} />
        <Toggle label={t(lang, 'gold')} checked={readItemVisibility(settings, 'player.gold', settings.playerInfo.gold)} onChange={value => updateItemVisibility(onUpdate, 'player.gold', value)} panelScale={panelScale} />
        <Toggle label={t(lang, 'carryWeight')} checked={readItemVisibility(settings, 'player.carryWeight', settings.playerInfo.carryWeight)} onChange={value => updateItemVisibility(onUpdate, 'player.carryWeight', value)} panelScale={panelScale} />
        <SelectRow
          label={t(lang, 'carryWeightDisplay')}
          value={settings.playerInfo.carryWeightDisplay}
          options={[
            { value: 'combined', label: t(lang, 'numberAndMeter') },
            { value: 'valueOnly', label: t(lang, 'numberOnly') },
            { value: 'meterOnly', label: t(lang, 'meterOnly') },
          ]}
          onChange={nextValue => onUpdate('playerInfo.carryWeightDisplay', nextValue)}
          panelScale={panelScale}
          testId="carry-weight-display-select"
        />
        <Toggle label={t(lang, 'health')} checked={readItemVisibility(settings, 'player.health', settings.playerInfo.health)} onChange={value => updateItemVisibility(onUpdate, 'player.health', value)} panelScale={panelScale} />
        <Toggle label={t(lang, 'magicka')} checked={readItemVisibility(settings, 'player.magicka', settings.playerInfo.magicka)} onChange={value => updateItemVisibility(onUpdate, 'player.magicka', value)} panelScale={panelScale} />
        <Toggle label={t(lang, 'stamina')} checked={readItemVisibility(settings, 'player.stamina', settings.playerInfo.stamina)} onChange={value => updateItemVisibility(onUpdate, 'player.stamina', value)} panelScale={panelScale} />
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
          options={[
            { value: 'effectiveOnly', label: t(lang, 'effectiveOnly') },
            { value: 'rawOnly', label: t(lang, 'rawOnly') },
            { value: 'both', label: t(lang, 'both') },
          ]}
          onChange={nextValue => onUpdate('resistances.displayMode', nextValue)}
          panelScale={panelScale}
          testId="resistance-display-select"
        />
        <Toggle label={t(lang, 'magic')} checked={readItemVisibility(settings, 'resistance.magic', settings.resistances.magic)} onChange={value => updateItemVisibility(onUpdate, 'resistance.magic', value)} panelScale={panelScale} />
        <Toggle label={t(lang, 'fire')} checked={readItemVisibility(settings, 'resistance.fire', settings.resistances.fire)} onChange={value => updateItemVisibility(onUpdate, 'resistance.fire', value)} panelScale={panelScale} />
        <Toggle label={t(lang, 'frost')} checked={readItemVisibility(settings, 'resistance.frost', settings.resistances.frost)} onChange={value => updateItemVisibility(onUpdate, 'resistance.frost', value)} panelScale={panelScale} />
        <Toggle label={t(lang, 'shock')} checked={readItemVisibility(settings, 'resistance.shock', settings.resistances.shock)} onChange={value => updateItemVisibility(onUpdate, 'resistance.shock', value)} panelScale={panelScale} />
        <Toggle label={t(lang, 'poison')} checked={readItemVisibility(settings, 'resistance.poison', settings.resistances.poison)} onChange={value => updateItemVisibility(onUpdate, 'resistance.poison', value)} panelScale={panelScale} />
        <Toggle label={t(lang, 'disease')} checked={readItemVisibility(settings, 'resistance.disease', settings.resistances.disease)} onChange={value => updateItemVisibility(onUpdate, 'resistance.disease', value)} panelScale={panelScale} />
      </AccordionSection>

      <AccordionSection
        id="defense"
        title={t(lang, 'defense')}
        expanded={isSectionExpanded('defense')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        <Toggle label={t(lang, 'armorRating')} checked={readItemVisibility(settings, 'defense.armorRating', settings.defense.armorRating)} onChange={value => updateItemVisibility(onUpdate, 'defense.armorRating', value)} panelScale={panelScale} />
        <Toggle label={t(lang, 'damageReduction')} checked={readItemVisibility(settings, 'defense.damageReduction', settings.defense.damageReduction)} onChange={value => updateItemVisibility(onUpdate, 'defense.damageReduction', value)} panelScale={panelScale} />
      </AccordionSection>

      <AccordionSection
        id="offense"
        title={t(lang, 'offense')}
        expanded={isSectionExpanded('offense')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        <Toggle label={t(lang, 'rightHandDamage')} checked={readItemVisibility(settings, 'offense.rightHandDamage', settings.offense.rightHandDamage)} onChange={value => updateItemVisibility(onUpdate, 'offense.rightHandDamage', value)} panelScale={panelScale} />
        <Toggle label={t(lang, 'leftHandDamage')} checked={readItemVisibility(settings, 'offense.leftHandDamage', settings.offense.leftHandDamage)} onChange={value => updateItemVisibility(onUpdate, 'offense.leftHandDamage', value)} panelScale={panelScale} />
        <Toggle label={t(lang, 'critChance')} checked={readItemVisibility(settings, 'offense.critChance', settings.offense.critChance)} onChange={value => updateItemVisibility(onUpdate, 'offense.critChance', value)} panelScale={panelScale} />
      </AccordionSection>

      <AccordionSection
        id="equipped"
        title={t(lang, 'equipped')}
        expanded={isSectionExpanded('equipped')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        <Toggle label={t(lang, 'rightHandEquipped')} checked={readItemVisibility(settings, 'equipped.rightHand', settings.equipped.rightHand)} onChange={value => updateItemVisibility(onUpdate, 'equipped.rightHand', value)} panelScale={panelScale} />
        <Toggle label={t(lang, 'leftHandEquipped')} checked={readItemVisibility(settings, 'equipped.leftHand', settings.equipped.leftHand)} onChange={value => updateItemVisibility(onUpdate, 'equipped.leftHand', value)} panelScale={panelScale} />
      </AccordionSection>

      <AccordionSection
        id="movement"
        title={t(lang, 'movement')}
        expanded={isSectionExpanded('movement')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        <Toggle label={t(lang, 'speed')} checked={readItemVisibility(settings, 'movement.speedMult', settings.movement.speedMult)} onChange={value => updateItemVisibility(onUpdate, 'movement.speedMult', value)} panelScale={panelScale} />
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

  return (
    <>
      <AccordionSection
        id="time"
        title={t(lang, 'time')}
        expanded={isSectionExpanded('time')}
        onToggle={toggleSection}
        panelScale={panelScale}
      >
        <Toggle label={t(lang, 'gameDateTime')} checked={showGameTime} onChange={value => updateItemVisibility(onUpdate, 'time.game', value)} panelScale={panelScale} />
        {showGameTime && (
          <SelectRow
            label={t(lang, 'timeDisplay')}
            value={settings.time.gameDisplay}
            options={[
              { value: 'dateTime', label: t(lang, 'dateAndTime') },
              { value: 'timeOnly', label: t(lang, 'timeOnly') },
            ]}
            onChange={nextValue => onUpdate('time.gameDisplay', nextValue)}
            panelScale={panelScale}
            testId="time-game-display-select"
          />
        )}
        <Toggle label={t(lang, 'realDateTime')} checked={showRealTime} onChange={value => updateItemVisibility(onUpdate, 'time.real', value)} panelScale={panelScale} />
        {showRealTime && (
          <SelectRow
            label={t(lang, 'timeDisplay')}
            value={settings.time.realDisplay}
            options={[
              { value: 'dateTime', label: t(lang, 'dateAndTime') },
              { value: 'timeOnly', label: t(lang, 'timeOnly') },
            ]}
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
        <Toggle
          label={t(lang, 'timedEffectsEnabled')}
          checked={readItemVisibility(settings, 'timedEffects.list', settings.timedEffects.enabled)}
          onChange={value => updateItemVisibility(onUpdate, 'timedEffects.list', value)}
          panelScale={panelScale}
        />
        <SelectRow
          label={t(lang, 'timedEffectsLayout')}
          value={settings.timedEffects.listLayout}
          options={[
            { value: 'vertical', label: t(lang, 'layoutVertical') },
            { value: 'horizontal', label: t(lang, 'layoutHorizontal') },
          ]}
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
