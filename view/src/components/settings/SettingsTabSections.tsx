import type { UpdateSettingFn, WidgetLayout, WidgetSettings } from '../../types/settings';
import { t } from '../../i18n/translations';
import { AccordionSection, CustomSelect, LayoutSelect, Toggle } from './SettingsControls';
import { PresetSection } from './PresetSection';

const PRESET_COLORS = [
  '', '#6699cc', '#cc6666', '#66cc99', '#cc99cc', '#ccaa66', '#66cccc', '#ffffff',
];

interface SectionControlProps {
  lang: 'ko' | 'en';
  isSectionExpanded: (id: string) => boolean;
  toggleSection: (id: string) => void;
}

interface GeneralTabSectionsProps extends SectionControlProps {
  settings: WidgetSettings;
  effectiveVisible: boolean;
  onUpdate: UpdateSettingFn;
  accentColor: string;
}

export function GeneralTabSections({
  lang,
  settings,
  effectiveVisible,
  onUpdate,
  accentColor,
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
        <span style={{ color: '#ddd', fontSize: '24px' }}>{t(lang, 'size')}</span>
        <CustomSelect value={settings.general.size}
          options={[
            { value: 'xsmall', label: t(lang, 'xsmall') },
            { value: 'small', label: t(lang, 'small') },
            { value: 'medium', label: t(lang, 'medium') },
            { value: 'large', label: t(lang, 'large') },
          ]}
          onChange={nextValue => onUpdate('general.size', nextValue)}
        />
      </label>

      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
        <span style={{ color: '#ddd', fontSize: '24px' }}>{t(lang, 'language')}</span>
        <CustomSelect value={settings.general.language}
          options={[
            { value: 'ko', label: t(lang, 'korean') },
            { value: 'en', label: t(lang, 'english') },
          ]}
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
  groupLayout: (groupId: string) => WidgetLayout;
}

export function CombatTabSections({
  lang,
  settings,
  onUpdate,
  groupLayout,
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
        <LayoutSelect lang={lang} groupId="experience" value={groupLayout('experience')} onUpdate={onUpdate} />
        <Toggle
          label={t(lang, 'experienceProgress')}
          checked={settings.experience.enabled}
          onChange={value => onUpdate('experience.enabled', value)}
        />
      </AccordionSection>

      <AccordionSection
        id="playerInfo"
        title={t(lang, 'playerInfo')}
        expanded={isSectionExpanded('playerInfo')}
        onToggle={toggleSection}
      >
        <LayoutSelect lang={lang} groupId="playerInfo" value={groupLayout('playerInfo')} onUpdate={onUpdate} />
        <Toggle label={t(lang, 'level')} checked={settings.playerInfo.level} onChange={value => onUpdate('playerInfo.level', value)} />
        <Toggle label={t(lang, 'gold')} checked={settings.playerInfo.gold} onChange={value => onUpdate('playerInfo.gold', value)} />
        <Toggle label={t(lang, 'carryWeight')} checked={settings.playerInfo.carryWeight} onChange={value => onUpdate('playerInfo.carryWeight', value)} />
        <Toggle label={t(lang, 'health')} checked={settings.playerInfo.health} onChange={value => onUpdate('playerInfo.health', value)} />
        <Toggle label={t(lang, 'magicka')} checked={settings.playerInfo.magicka} onChange={value => onUpdate('playerInfo.magicka', value)} />
        <Toggle label={t(lang, 'stamina')} checked={settings.playerInfo.stamina} onChange={value => onUpdate('playerInfo.stamina', value)} />
      </AccordionSection>

      <AccordionSection
        id="resistances"
        title={t(lang, 'resistances')}
        expanded={isSectionExpanded('resistances')}
        onToggle={toggleSection}
      >
        <LayoutSelect lang={lang} groupId="resistances" value={groupLayout('resistances')} onUpdate={onUpdate} />
        <Toggle label={t(lang, 'magic')} checked={settings.resistances.magic} onChange={value => onUpdate('resistances.magic', value)} />
        <Toggle label={t(lang, 'fire')} checked={settings.resistances.fire} onChange={value => onUpdate('resistances.fire', value)} />
        <Toggle label={t(lang, 'frost')} checked={settings.resistances.frost} onChange={value => onUpdate('resistances.frost', value)} />
        <Toggle label={t(lang, 'shock')} checked={settings.resistances.shock} onChange={value => onUpdate('resistances.shock', value)} />
        <Toggle label={t(lang, 'poison')} checked={settings.resistances.poison} onChange={value => onUpdate('resistances.poison', value)} />
        <Toggle label={t(lang, 'disease')} checked={settings.resistances.disease} onChange={value => onUpdate('resistances.disease', value)} />
      </AccordionSection>

      <AccordionSection
        id="defense"
        title={t(lang, 'defense')}
        expanded={isSectionExpanded('defense')}
        onToggle={toggleSection}
      >
        <LayoutSelect lang={lang} groupId="defense" value={groupLayout('defense')} onUpdate={onUpdate} />
        <Toggle label={t(lang, 'armorRating')} checked={settings.defense.armorRating} onChange={value => onUpdate('defense.armorRating', value)} />
        <Toggle label={t(lang, 'damageReduction')} checked={settings.defense.damageReduction} onChange={value => onUpdate('defense.damageReduction', value)} />
      </AccordionSection>

      <AccordionSection
        id="offense"
        title={t(lang, 'offense')}
        expanded={isSectionExpanded('offense')}
        onToggle={toggleSection}
      >
        <LayoutSelect lang={lang} groupId="offense" value={groupLayout('offense')} onUpdate={onUpdate} />
        <Toggle label={t(lang, 'rightHandDamage')} checked={settings.offense.rightHandDamage} onChange={value => onUpdate('offense.rightHandDamage', value)} />
        <Toggle label={t(lang, 'leftHandDamage')} checked={settings.offense.leftHandDamage} onChange={value => onUpdate('offense.leftHandDamage', value)} />
        <Toggle label={t(lang, 'critChance')} checked={settings.offense.critChance} onChange={value => onUpdate('offense.critChance', value)} />
      </AccordionSection>

      <AccordionSection
        id="equipped"
        title={t(lang, 'equipped')}
        expanded={isSectionExpanded('equipped')}
        onToggle={toggleSection}
      >
        <LayoutSelect lang={lang} groupId="equipped" value={groupLayout('equipped')} onUpdate={onUpdate} />
        <Toggle label={t(lang, 'rightHandEquipped')} checked={settings.equipped.rightHand} onChange={value => onUpdate('equipped.rightHand', value)} />
        <Toggle label={t(lang, 'leftHandEquipped')} checked={settings.equipped.leftHand} onChange={value => onUpdate('equipped.leftHand', value)} />
      </AccordionSection>

      <AccordionSection
        id="movement"
        title={t(lang, 'movement')}
        expanded={isSectionExpanded('movement')}
        onToggle={toggleSection}
      >
        <LayoutSelect lang={lang} groupId="movement" value={groupLayout('movement')} onUpdate={onUpdate} />
        <Toggle label={t(lang, 'speed')} checked={settings.movement.speedMult} onChange={value => onUpdate('movement.speedMult', value)} />
      </AccordionSection>
    </>
  );
}

export function EffectsTabSections({
  lang,
  settings,
  onUpdate,
  groupLayout,
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
        <LayoutSelect lang={lang} groupId="time" value={groupLayout('time')} onUpdate={onUpdate} />
        <Toggle label={t(lang, 'gameDateTime')} checked={settings.time.gameDateTime} onChange={value => onUpdate('time.gameDateTime', value)} />
        <Toggle label={t(lang, 'realDateTime')} checked={settings.time.realDateTime} onChange={value => onUpdate('time.realDateTime', value)} />
      </AccordionSection>

      <AccordionSection
        id="timedEffects"
        title={t(lang, 'timedEffects')}
        expanded={isSectionExpanded('timedEffects')}
        onToggle={toggleSection}
      >
        <LayoutSelect lang={lang} groupId="timedEffects" value={groupLayout('timedEffects')} onUpdate={onUpdate} />
        <Toggle
          label={t(lang, 'timedEffectsEnabled')}
          checked={settings.timedEffects.enabled}
          onChange={value => onUpdate('timedEffects.enabled', value)}
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
          onClick={() => onUpdate('positions', {})}
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
      </AccordionSection>
    </>
  );
}
