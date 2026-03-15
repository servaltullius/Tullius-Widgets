import type { Language, UpdateSettingFn, WidgetSettings } from '../../types/settings';
import { t, type LocalizationLanguageEntry } from '../../i18n/translations';
import { AccordionSection, CustomSelect, Toggle } from './SettingsControls';
import { PresetSection } from './PresetSection';

const PRESET_COLORS = [
  '', '#6699cc', '#cc6666', '#66cc99', '#cc99cc', '#ccaa66', '#66cccc', '#ffffff',
];

interface SectionControlProps {
  lang: Language;
  isSectionExpanded: (id: string) => boolean;
  toggleSection: (id: string) => void;
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
}: GeneralTabSectionsProps) {
  return (
    <AccordionSection
      id="generalMain"
      title={t(lang, 'general')}
      expanded={isSectionExpanded('generalMain')}
      onToggle={toggleSection}
    >
      <Toggle label={t(lang, 'showWidgets')} checked={effectiveVisible} onChange={value => onUpdate('general.visible', value)} />
      {effectiveVisible !== settings.general.visible && (
        <p style={{ color: '#a8bbd8', fontSize: '16px', margin: '0 0 8px 0' }}>
          {t(lang, 'sessionVisibilityHint')}
        </p>
      )}
      <Toggle label={t(lang, 'combatOnly')} checked={settings.general.combatOnly} onChange={value => onUpdate('general.combatOnly', value)} />
      <Toggle label={t(lang, 'showOnChangeOnly')} checked={settings.general.showOnChangeOnly} onChange={value => onUpdate('general.showOnChangeOnly', value)} />
      {settings.general.showOnChangeOnly && (
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 8px 20px' }}>
          <span style={{ color: '#aaa', fontSize: '20px' }}>
            {t(lang, 'changeDisplaySeconds')}: {settings.general.changeDisplaySeconds}
          </span>
          <input
            type="range"
            min={1}
            max={15}
            value={settings.general.changeDisplaySeconds}
            onChange={event => onUpdate('general.changeDisplaySeconds', Number(event.target.value))}
            style={{ width: '180px' }}
          />
        </label>
      )}

      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
        <span style={{ color: '#ddd', fontSize: '24px' }}>{t(lang, 'opacity')}: {settings.general.opacity}%</span>
        <input
          type="range"
          min={10}
          max={100}
          value={settings.general.opacity}
          onChange={event => onUpdate('general.opacity', Number(event.target.value))}
          style={{ width: '220px', height: '8px' }}
        />
      </label>

      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
        <span style={{ color: '#ddd', fontSize: '24px' }}>{t(lang, 'language')}</span>
        <CustomSelect value={selectedLanguage}
          options={availableLanguages.map(option => ({ value: option.code, label: option.label }))}
          onChange={nextValue => onUpdate('general.language', nextValue)}
        />
      </label>

      <div style={{ padding: '8px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: '#ddd', fontSize: '24px' }}>{t(lang, 'accentColor')}</span>
          <span style={{ color: '#888', fontSize: '18px' }}>
            {settings.general.accentColor ? settings.general.accentColor : t(lang, 'accentAuto')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {PRESET_COLORS.map(color => (
            <div key={color || 'auto'} onClick={() => onUpdate('general.accentColor', color)}
              style={{
                width: '36px', height: '36px', borderRadius: '6px', cursor: 'pointer',
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
            style={{ width: '36px', height: '36px', border: 'none', cursor: 'pointer', background: 'transparent' }}
          />
        </div>
      </div>
      <Toggle label={t(lang, 'transparentBg')} checked={settings.general.transparentBg} onChange={value => onUpdate('general.transparentBg', value)} />
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
}: WidgetTabSectionsProps) {
  return (
    <>
      <AccordionSection
        id="experience"
        title={t(lang, 'experienceWidget')}
        expanded={isSectionExpanded('experience')}
        onToggle={toggleSection}
      >
        <Toggle
          label={t(lang, 'experienceProgress')}
          checked={readItemVisibility(settings, 'experience.progress', settings.experience.enabled)}
          onChange={value => updateItemVisibility(onUpdate, 'experience.progress', value)}
        />
      </AccordionSection>

      <AccordionSection
        id="playerInfo"
        title={t(lang, 'playerInfo')}
        expanded={isSectionExpanded('playerInfo')}
        onToggle={toggleSection}
      >
        <Toggle label={t(lang, 'level')} checked={readItemVisibility(settings, 'player.level', settings.playerInfo.level)} onChange={value => updateItemVisibility(onUpdate, 'player.level', value)} />
        <Toggle label={t(lang, 'gold')} checked={readItemVisibility(settings, 'player.gold', settings.playerInfo.gold)} onChange={value => updateItemVisibility(onUpdate, 'player.gold', value)} />
        <Toggle label={t(lang, 'carryWeight')} checked={readItemVisibility(settings, 'player.carryWeight', settings.playerInfo.carryWeight)} onChange={value => updateItemVisibility(onUpdate, 'player.carryWeight', value)} />
        <Toggle label={t(lang, 'health')} checked={readItemVisibility(settings, 'player.health', settings.playerInfo.health)} onChange={value => updateItemVisibility(onUpdate, 'player.health', value)} />
        <Toggle label={t(lang, 'magicka')} checked={readItemVisibility(settings, 'player.magicka', settings.playerInfo.magicka)} onChange={value => updateItemVisibility(onUpdate, 'player.magicka', value)} />
        <Toggle label={t(lang, 'stamina')} checked={readItemVisibility(settings, 'player.stamina', settings.playerInfo.stamina)} onChange={value => updateItemVisibility(onUpdate, 'player.stamina', value)} />
      </AccordionSection>

      <AccordionSection
        id="resistances"
        title={t(lang, 'resistances')}
        expanded={isSectionExpanded('resistances')}
        onToggle={toggleSection}
      >
        <Toggle label={t(lang, 'magic')} checked={readItemVisibility(settings, 'resistance.magic', settings.resistances.magic)} onChange={value => updateItemVisibility(onUpdate, 'resistance.magic', value)} />
        <Toggle label={t(lang, 'fire')} checked={readItemVisibility(settings, 'resistance.fire', settings.resistances.fire)} onChange={value => updateItemVisibility(onUpdate, 'resistance.fire', value)} />
        <Toggle label={t(lang, 'frost')} checked={readItemVisibility(settings, 'resistance.frost', settings.resistances.frost)} onChange={value => updateItemVisibility(onUpdate, 'resistance.frost', value)} />
        <Toggle label={t(lang, 'shock')} checked={readItemVisibility(settings, 'resistance.shock', settings.resistances.shock)} onChange={value => updateItemVisibility(onUpdate, 'resistance.shock', value)} />
        <Toggle label={t(lang, 'poison')} checked={readItemVisibility(settings, 'resistance.poison', settings.resistances.poison)} onChange={value => updateItemVisibility(onUpdate, 'resistance.poison', value)} />
        <Toggle label={t(lang, 'disease')} checked={readItemVisibility(settings, 'resistance.disease', settings.resistances.disease)} onChange={value => updateItemVisibility(onUpdate, 'resistance.disease', value)} />
      </AccordionSection>

      <AccordionSection
        id="defense"
        title={t(lang, 'defense')}
        expanded={isSectionExpanded('defense')}
        onToggle={toggleSection}
      >
        <Toggle label={t(lang, 'armorRating')} checked={readItemVisibility(settings, 'defense.armorRating', settings.defense.armorRating)} onChange={value => updateItemVisibility(onUpdate, 'defense.armorRating', value)} />
        <Toggle label={t(lang, 'damageReduction')} checked={readItemVisibility(settings, 'defense.damageReduction', settings.defense.damageReduction)} onChange={value => updateItemVisibility(onUpdate, 'defense.damageReduction', value)} />
      </AccordionSection>

      <AccordionSection
        id="offense"
        title={t(lang, 'offense')}
        expanded={isSectionExpanded('offense')}
        onToggle={toggleSection}
      >
        <Toggle label={t(lang, 'rightHandDamage')} checked={readItemVisibility(settings, 'offense.rightHandDamage', settings.offense.rightHandDamage)} onChange={value => updateItemVisibility(onUpdate, 'offense.rightHandDamage', value)} />
        <Toggle label={t(lang, 'leftHandDamage')} checked={readItemVisibility(settings, 'offense.leftHandDamage', settings.offense.leftHandDamage)} onChange={value => updateItemVisibility(onUpdate, 'offense.leftHandDamage', value)} />
        <Toggle label={t(lang, 'critChance')} checked={readItemVisibility(settings, 'offense.critChance', settings.offense.critChance)} onChange={value => updateItemVisibility(onUpdate, 'offense.critChance', value)} />
      </AccordionSection>

      <AccordionSection
        id="equipped"
        title={t(lang, 'equipped')}
        expanded={isSectionExpanded('equipped')}
        onToggle={toggleSection}
      >
        <Toggle label={t(lang, 'rightHandEquipped')} checked={readItemVisibility(settings, 'equipped.rightHand', settings.equipped.rightHand)} onChange={value => updateItemVisibility(onUpdate, 'equipped.rightHand', value)} />
        <Toggle label={t(lang, 'leftHandEquipped')} checked={readItemVisibility(settings, 'equipped.leftHand', settings.equipped.leftHand)} onChange={value => updateItemVisibility(onUpdate, 'equipped.leftHand', value)} />
      </AccordionSection>

      <AccordionSection
        id="movement"
        title={t(lang, 'movement')}
        expanded={isSectionExpanded('movement')}
        onToggle={toggleSection}
      >
        <Toggle label={t(lang, 'speed')} checked={readItemVisibility(settings, 'movement.speedMult', settings.movement.speedMult)} onChange={value => updateItemVisibility(onUpdate, 'movement.speedMult', value)} />
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
}: WidgetTabSectionsProps) {
  return (
    <>
      <AccordionSection
        id="time"
        title={t(lang, 'time')}
        expanded={isSectionExpanded('time')}
        onToggle={toggleSection}
      >
        <Toggle label={t(lang, 'gameDateTime')} checked={readItemVisibility(settings, 'time.game', settings.time.gameDateTime)} onChange={value => updateItemVisibility(onUpdate, 'time.game', value)} />
        <Toggle label={t(lang, 'realDateTime')} checked={readItemVisibility(settings, 'time.real', settings.time.realDateTime)} onChange={value => updateItemVisibility(onUpdate, 'time.real', value)} />
      </AccordionSection>

      <AccordionSection
        id="timedEffects"
        title={t(lang, 'timedEffects')}
        expanded={isSectionExpanded('timedEffects')}
        onToggle={toggleSection}
      >
        <Toggle
          label={t(lang, 'timedEffectsEnabled')}
          checked={readItemVisibility(settings, 'timedEffects.list', settings.timedEffects.enabled)}
          onChange={value => updateItemVisibility(onUpdate, 'timedEffects.list', value)}
        />
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <span style={{ color: '#aaa', fontSize: '20px' }}>
            {t(lang, 'timedEffectsMaxVisible')}: {settings.timedEffects.maxVisible}
          </span>
          <input
            type="range"
            min={1}
            max={12}
            value={settings.timedEffects.maxVisible}
            onChange={event => onUpdate('timedEffects.maxVisible', Number(event.target.value))}
            style={{ width: '180px' }}
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
}: AlertsTabSectionsProps) {
  return (
    <AccordionSection
      id="visualAlerts"
      title={t(lang, 'visualAlerts')}
      expanded={isSectionExpanded('visualAlerts')}
      onToggle={toggleSection}
    >
      <Toggle label={t(lang, 'visualAlertsEnabled')} checked={settings.visualAlerts.enabled} onChange={value => onUpdate('visualAlerts.enabled', value)} />
      {settings.visualAlerts.enabled && (
        <>
          <Toggle label={t(lang, 'lowHealth')} checked={settings.visualAlerts.lowHealth} onChange={value => onUpdate('visualAlerts.lowHealth', value)} />
          {settings.visualAlerts.lowHealth && (
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 8px 20px' }}>
              <span style={{ color: '#aaa', fontSize: '20px' }}>{t(lang, 'threshold')}: {settings.visualAlerts.lowHealthThreshold}%</span>
              <input
                type="range"
                min={10}
                max={60}
                value={settings.visualAlerts.lowHealthThreshold}
                onChange={event => onUpdate('visualAlerts.lowHealthThreshold', Number(event.target.value))}
                style={{ width: '180px' }}
              />
            </label>
          )}
          <Toggle label={t(lang, 'lowStamina')} checked={settings.visualAlerts.lowStamina} onChange={value => onUpdate('visualAlerts.lowStamina', value)} />
          {settings.visualAlerts.lowStamina && (
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 8px 20px' }}>
              <span style={{ color: '#aaa', fontSize: '20px' }}>{t(lang, 'threshold')}: {settings.visualAlerts.lowStaminaThreshold}%</span>
              <input
                type="range"
                min={10}
                max={60}
                value={settings.visualAlerts.lowStaminaThreshold}
                onChange={event => onUpdate('visualAlerts.lowStaminaThreshold', Number(event.target.value))}
                style={{ width: '180px' }}
              />
            </label>
          )}
          <Toggle label={t(lang, 'lowMagicka')} checked={settings.visualAlerts.lowMagicka} onChange={value => onUpdate('visualAlerts.lowMagicka', value)} />
          {settings.visualAlerts.lowMagicka && (
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 8px 20px' }}>
              <span style={{ color: '#aaa', fontSize: '20px' }}>{t(lang, 'threshold')}: {settings.visualAlerts.lowMagickaThreshold}%</span>
              <input
                type="range"
                min={10}
                max={60}
                value={settings.visualAlerts.lowMagickaThreshold}
                onChange={event => onUpdate('visualAlerts.lowMagickaThreshold', Number(event.target.value))}
                style={{ width: '180px' }}
              />
            </label>
          )}
          <Toggle label={t(lang, 'overencumbered')} checked={settings.visualAlerts.overencumbered} onChange={value => onUpdate('visualAlerts.overencumbered', value)} />
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
}: PresetsTabSectionsProps) {
  return (
    <>
      <AccordionSection
        id="presets"
        title={t(lang, 'preset')}
        expanded={isSectionExpanded('presets')}
        onToggle={toggleSection}
      >
        <PresetSection lang={lang} settings={settings} />
      </AccordionSection>

      <AccordionSection
        id="layoutTools"
        title={t(lang, 'layoutTools')}
        expanded={isSectionExpanded('layoutTools')}
        onToggle={toggleSection}
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
            fontSize: '20px',
            cursor: 'pointer',
            borderRadius: '8px',
            padding: '12px 20px',
            width: '100%',
          }}
        >
          {t(lang, 'resetPositions')}
        </button>
        <p style={{ color: '#888', fontSize: '18px', margin: '10px 0 0 0', textAlign: 'center' }}>
          {t(lang, 'dragHint')}
        </p>
        <p style={{ color: '#88a4c4', fontSize: '18px', margin: '6px 0 0 0', textAlign: 'center' }}>
          {t(lang, 'editVisibilityHint')}
        </p>
      </AccordionSection>
    </>
  );
}
