import { useEffect, useState } from 'react';
import type { UpdateSettingFn, WidgetSettings, WidgetLayout } from '../types/settings';
import { t } from '../i18n/translations';
import { COMBAT_WIDGET_GROUP_IDS, EFFECT_WIDGET_GROUP_IDS } from '../data/widgetRegistry';
import {
  AlertsTabSections,
  CombatTabSections,
  EffectsTabSections,
  GeneralTabSections,
  PresetsTabSections,
} from './settings/SettingsTabSections';

interface SettingsPanelProps {
  settings: WidgetSettings;
  effectiveVisible: boolean;
  open: boolean;
  onClose: () => void;
  onUpdate: UpdateSettingFn;
  accentColor: string;
}

type PanelTab = 'general' | 'combat' | 'effects' | 'alerts' | 'presets';

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

let rememberedPanelTab: PanelTab = 'general';
let rememberedExpandedSections: Record<string, boolean> = { ...DEFAULT_EXPANDED_SECTIONS };

export function SettingsPanel({ settings, effectiveVisible, open, onClose, onUpdate, accentColor }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>(rememberedPanelTab);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ...DEFAULT_EXPANDED_SECTIONS,
    ...rememberedExpandedSections,
  });

  useEffect(() => {
    rememberedPanelTab = activeTab;
  }, [activeTab]);

  useEffect(() => {
    rememberedExpandedSections = expandedSections;
  }, [expandedSections]);

  if (!open) return null;

  const lang = settings.general.language;
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
      background: 'rgba(20, 20, 30, 0.95)',
      borderRadius: '16px',
      padding: '28px 30px',
      border: '1px solid rgba(255, 215, 0, 0.3)',
      minWidth: '680px',
      maxHeight: '85vh',
      overflowY: 'auto',
      zIndex: 1000,
      pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#ffd700', margin: 0, fontSize: '36px' }}>{t(lang, 'title')}</h2>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#ccc',
            fontSize: '22px',
            cursor: 'pointer',
            borderRadius: '8px',
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
              border: activeTab === tab ? '1px solid rgba(255,215,0,0.75)' : '1px solid rgba(255,255,255,0.2)',
              background: activeTab === tab ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.05)',
              color: activeTab === tab ? '#ffd700' : '#cfd6e6',
              borderRadius: '8px',
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
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#d7d7d7',
            borderRadius: '8px',
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
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#d7d7d7',
            borderRadius: '8px',
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
          effectiveVisible={effectiveVisible}
          onUpdate={onUpdate}
          accentColor={accentColor}
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
