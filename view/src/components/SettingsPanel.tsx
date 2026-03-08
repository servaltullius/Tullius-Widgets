import { useEffect, useState } from 'react';
import type { Language, UpdateSettingFn, WidgetSettings, WidgetLayout } from '../types/settings';
import { t, type LocalizationLanguageEntry } from '../i18n/translations';
import { COMBAT_WIDGET_GROUP_IDS, EFFECT_WIDGET_GROUP_IDS } from '../data/widgetRegistry';
import {
  type PanelTab,
  readStoredExpandedSections,
  readStoredPanelTab,
  writeStoredExpandedSections,
  writeStoredPanelTab,
} from './settings/settingsPanelState';
import {
  AlertsTabSections,
  CombatTabSections,
  EffectsTabSections,
  GeneralTabSections,
  PresetsTabSections,
} from './settings/SettingsTabSections';

interface SettingsPanelProps {
  settings: WidgetSettings;
  lang: Language;
  effectiveVisible: boolean;
  open: boolean;
  onClose: () => void;
  onUpdate: UpdateSettingFn;
  accentColor: string;
  availableLanguages: LocalizationLanguageEntry[];
}

const TAB_ORDER: PanelTab[] = ['general', 'combat', 'effects', 'alerts', 'presets'];
const TAB_SECTION_IDS: Record<PanelTab, string[]> = {
  general: ['generalMain'],
  combat: [...COMBAT_WIDGET_GROUP_IDS],
  effects: [...EFFECT_WIDGET_GROUP_IDS],
  alerts: ['visualAlerts'],
  presets: ['presets', 'layoutTools'],
};

const DEFAULT_EXPANDED_SECTIONS: Record<string, boolean> = {
  generalMain: true,
  experience: true,
  playerInfo: true,
  resistances: false,
  defense: false,
  offense: false,
  equipped: false,
  movement: false,
  time: true,
  timedEffects: true,
  visualAlerts: true,
  presets: true,
  layoutTools: true,
};

export function SettingsPanel({
  settings,
  lang,
  effectiveVisible,
  open,
  onClose,
  onUpdate,
  accentColor,
  availableLanguages,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>(() => readStoredPanelTab('general', TAB_ORDER));
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    readStoredExpandedSections(DEFAULT_EXPANDED_SECTIONS),
  );

  useEffect(() => {
    writeStoredPanelTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    writeStoredExpandedSections(expandedSections);
  }, [expandedSections]);

  if (!open) return null;

  const groupLayout = (groupId: string): WidgetLayout => settings.layouts[groupId] ?? 'vertical';
  const currentSectionIds = TAB_SECTION_IDS[activeTab] ?? [];

  const tabLabels: Record<PanelTab, string> = {
    general: t(lang, 'tabGeneral'),
    combat: t(lang, 'tabCombat'),
    effects: t(lang, 'tabEffects'),
    alerts: t(lang, 'tabAlerts'),
    presets: t(lang, 'tabPresets'),
  };

  const isSectionExpanded = (id: string): boolean => expandedSections[id] ?? false;

  const toggleSection = (id: string) => {
    setExpandedSections(previous => ({ ...previous, [id]: !(previous[id] ?? false) }));
  };

  const setCurrentSectionsExpanded = (expanded: boolean) => {
    setExpandedSections(previous => {
      const next = { ...previous };
      for (const sectionId of currentSectionIds) {
        next[sectionId] = expanded;
      }
      return next;
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'var(--tw-color-panel-bg)',
      borderRadius: 'var(--tw-radius-xl)',
      padding: '28px 30px',
      border: '1px solid var(--tw-color-panel-border)',
      minWidth: '680px',
      maxHeight: '85vh',
      overflowY: 'auto',
      zIndex: 1000,
      pointerEvents: 'auto',
      fontFamily: 'var(--tw-font-ui)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--tw-color-panel-title)', margin: 0, fontSize: '36px' }}>{t(lang, 'title')}</h2>
        <button
          onClick={onClose}
          style={{
            background: 'var(--tw-color-button-bg)',
            border: '1px solid var(--tw-color-button-border)',
            color: 'var(--tw-color-panel-text)',
            fontSize: '22px',
            cursor: 'pointer',
            borderRadius: 'var(--tw-radius-sm)',
            padding: '8px 20px',
          }}
        >
          {t(lang, 'close')} (ESC)
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        {TAB_ORDER.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              border: activeTab === tab
                ? '1px solid var(--tw-color-tab-active-border)'
                : '1px solid var(--tw-color-tab-idle-border)',
              background: activeTab === tab
                ? 'var(--tw-color-tab-active-bg)'
                : 'var(--tw-color-tab-idle-bg)',
              color: activeTab === tab
                ? 'var(--tw-color-tab-active-text)'
                : 'var(--tw-color-tab-idle-text)',
              borderRadius: 'var(--tw-radius-sm)',
              fontSize: '20px',
              padding: '8px 14px',
              cursor: 'pointer',
            }}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={() => setCurrentSectionsExpanded(true)}
          style={{
            background: 'var(--tw-color-button-bg)',
            border: '1px solid var(--tw-color-button-border)',
            color: 'var(--tw-color-button-text)',
            borderRadius: 'var(--tw-radius-sm)',
            fontSize: '16px',
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          {t(lang, 'expandAll')}
        </button>
        <button
          onClick={() => setCurrentSectionsExpanded(false)}
          style={{
            background: 'var(--tw-color-button-bg)',
            border: '1px solid var(--tw-color-button-border)',
            color: 'var(--tw-color-button-text)',
            borderRadius: 'var(--tw-radius-sm)',
            fontSize: '16px',
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          {t(lang, 'collapseAll')}
        </button>
      </div>

      {activeTab === 'general' && (
        <GeneralTabSections
          lang={lang}
          settings={settings}
          selectedLanguage={lang}
          effectiveVisible={effectiveVisible}
          onUpdate={onUpdate}
          accentColor={accentColor}
          availableLanguages={availableLanguages}
          isSectionExpanded={isSectionExpanded}
          toggleSection={toggleSection}
        />
      )}

      {activeTab === 'combat' && (
        <CombatTabSections
          lang={lang}
          settings={settings}
          onUpdate={onUpdate}
          groupLayout={groupLayout}
          isSectionExpanded={isSectionExpanded}
          toggleSection={toggleSection}
        />
      )}

      {activeTab === 'effects' && (
        <EffectsTabSections
          lang={lang}
          settings={settings}
          onUpdate={onUpdate}
          groupLayout={groupLayout}
          isSectionExpanded={isSectionExpanded}
          toggleSection={toggleSection}
        />
      )}

      {activeTab === 'alerts' && (
        <AlertsTabSections
          lang={lang}
          settings={settings}
          onUpdate={onUpdate}
          isSectionExpanded={isSectionExpanded}
          toggleSection={toggleSection}
        />
      )}

      {activeTab === 'presets' && (
        <PresetsTabSections
          lang={lang}
          settings={settings}
          onUpdate={onUpdate}
          isSectionExpanded={isSectionExpanded}
          toggleSection={toggleSection}
        />
      )}
    </div>
  );
}
