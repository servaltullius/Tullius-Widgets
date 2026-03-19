import { useEffect, useRef, useState } from 'react';
import type { Language, UpdateSettingFn, WidgetSettings } from '../types/settings';
import type { SelectedItemLayoutActions } from '../hooks/useSelectedItemLayoutActions';
import { t, type LocalizationLanguageEntry } from '../i18n/translations';
import { COMBAT_WIDGET_GROUP_IDS, EFFECT_WIDGET_GROUP_IDS } from '../data/widgetRegistry';
import {
  type PanelTab,
  clampStoredPanelPosition,
  readStoredExpandedSections,
  readStoredPanelPosition,
  readStoredPanelTab,
  writeStoredExpandedSections,
  writeStoredPanelPosition,
  writeStoredPanelTab,
} from './settings/settingsPanelState';
import {
  AlertsTabSections,
  CombatTabSections,
  EffectsTabSections,
  GeneralTabSections,
  PresetsTabSections,
} from './settings/SettingsTabSections';
import { SelectedWidgetQuickEditCard } from './settings/SelectedWidgetQuickEditCard';
import { resolvePanelScale, scalePanelPixels } from './settings/panelScale';
import {
  getWidgetItemDefaultZIndex,
  getWidgetItemRegistryEntry,
} from '../data/widgetItemRegistry';
import type { WidgetItemLayout } from '../types/settings';

interface SettingsPanelProps {
  settings: WidgetSettings;
  lang: Language;
  effectiveVisible: boolean;
  open: boolean;
  onClose: () => void;
  onUpdate: UpdateSettingFn;
  accentColor: string;
  availableLanguages: LocalizationLanguageEntry[];
  selectedItemId?: string | null;
  selectedItemLayout?: WidgetItemLayout | null;
  selectedItemLayoutActions?: SelectedItemLayoutActions;
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
  selectedItemId = null,
  selectedItemLayout = null,
  selectedItemLayoutActions,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>(() => readStoredPanelTab('general', TAB_ORDER));
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    readStoredExpandedSections(DEFAULT_EXPANDED_SECTIONS),
  );
  const [panelPosition, setPanelPosition] = useState(() => readStoredPanelPosition());
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    writeStoredPanelTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    writeStoredExpandedSections(expandedSections);
  }, [expandedSections]);

  useEffect(() => {
    if (!open || !panelPosition || !panelRef.current) {
      return;
    }

    const clamped = clampStoredPanelPosition(
      panelPosition,
      panelRef.current.getBoundingClientRect(),
      window.innerWidth,
      window.innerHeight,
    );

    if (clamped.left !== panelPosition.left || clamped.top !== panelPosition.top) {
      setPanelPosition(clamped);
    }
  }, [open, panelPosition]);

  useEffect(() => {
    if (!panelPosition) {
      return;
    }

    writeStoredPanelPosition(panelPosition);
  }, [panelPosition]);

  if (!open) return null;

  const currentSectionIds = TAB_SECTION_IDS[activeTab] ?? [];
  const hasSelectedItemActions = Boolean(selectedItemId && selectedItemLayoutActions);
  const selectedRegistryEntry = selectedItemId ? getWidgetItemRegistryEntry(selectedItemId) : null;
  const panelScale = resolvePanelScale(window.innerWidth, window.innerHeight);
  const resolvedSelectedItemLayout: WidgetItemLayout | null = selectedItemId
    ? selectedItemLayout ?? settings.itemLayouts[selectedItemId] ?? {
      visible: true,
      x: 0,
      y: 0,
      scale: 1,
      locked: false,
        zIndex: getWidgetItemDefaultZIndex(selectedItemId),
      }
    : null;

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

  const isCentered = panelPosition === null;

  return (
    <div ref={panelRef} style={{
      position: 'fixed',
      top: isCentered ? '50%' : `${panelPosition.top}px`,
      left: isCentered ? '50%' : `${panelPosition.left}px`,
      transform: isCentered ? 'translate(-50%, -50%)' : 'none',
      background: 'var(--tw-color-panel-bg)',
      borderRadius: 'var(--tw-radius-xl)',
      paddingTop: scalePanelPixels(28, panelScale),
      paddingRight: scalePanelPixels(44, panelScale),
      paddingBottom: scalePanelPixels(28, panelScale),
      paddingLeft: scalePanelPixels(30, panelScale),
      border: '1px solid var(--tw-color-panel-border)',
      minWidth: scalePanelPixels(680, panelScale),
      maxHeight: '85vh',
      overflowY: 'auto',
      scrollbarGutter: 'stable',
      zIndex: 1000,
      pointerEvents: 'auto',
      fontFamily: 'var(--tw-font-ui)',
    }}
      data-selected-item-id={selectedItemId ?? undefined}
      data-has-selected-item-actions={hasSelectedItemActions ? 'true' : 'false'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: scalePanelPixels(16, panelScale) }}>
        <h2 style={{ color: 'var(--tw-color-panel-title)', margin: 0, fontSize: scalePanelPixels(36, panelScale) }}>{t(lang, 'title')}</h2>
        <button
          onClick={onClose}
          style={{
            background: 'var(--tw-color-button-bg)',
            border: '1px solid var(--tw-color-button-border)',
            color: 'var(--tw-color-panel-text)',
            fontSize: scalePanelPixels(22, panelScale),
            cursor: 'pointer',
            borderRadius: 'var(--tw-radius-sm)',
            padding: `${scalePanelPixels(8, panelScale)} ${scalePanelPixels(20, panelScale)}`,
          }}
        >
          {t(lang, 'close')} (ESC)
        </button>
      </div>

      {selectedRegistryEntry && resolvedSelectedItemLayout && (
        <SelectedWidgetQuickEditCard
          lang={lang}
          title={t(lang, selectedRegistryEntry.labelKey)}
          layout={resolvedSelectedItemLayout}
          minScale={selectedRegistryEntry.minScale}
          maxScale={selectedRegistryEntry.maxScale}
          onToggleVisible={selectedItemLayoutActions?.setSelectedItemVisible}
          onScaleChange={selectedItemLayoutActions?.setSelectedItemScale}
          onNudgeX={deltaX => selectedItemLayoutActions?.nudgeSelectedItem(deltaX, 0)}
          onNudgeY={deltaY => selectedItemLayoutActions?.nudgeSelectedItem(0, deltaY)}
          onReset={selectedItemLayoutActions?.resetSelectedItemPosition}
          onToggleLocked={selectedItemLayoutActions?.setSelectedItemLocked}
          onBringForward={selectedItemLayoutActions?.bringSelectedItemForward}
          onSendBackward={selectedItemLayoutActions?.sendSelectedItemBackward}
          panelScale={panelScale}
        />
      )}

      <div data-settings-panel-tabs style={{ display: 'flex', flexWrap: 'wrap', gap: scalePanelPixels(8, panelScale), marginBottom: scalePanelPixels(12, panelScale) }}>
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
              fontSize: scalePanelPixels(20, panelScale),
              padding: `${scalePanelPixels(8, panelScale)} ${scalePanelPixels(14, panelScale)}`,
              cursor: 'pointer',
            }}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: scalePanelPixels(8, panelScale), marginBottom: scalePanelPixels(12, panelScale) }}>
        <button
          onClick={() => setCurrentSectionsExpanded(true)}
          style={{
            background: 'var(--tw-color-button-bg)',
            border: '1px solid var(--tw-color-button-border)',
            color: 'var(--tw-color-button-text)',
            borderRadius: 'var(--tw-radius-sm)',
            fontSize: scalePanelPixels(16, panelScale),
            padding: `${scalePanelPixels(6, panelScale)} ${scalePanelPixels(10, panelScale)}`,
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
            fontSize: scalePanelPixels(16, panelScale),
            padding: `${scalePanelPixels(6, panelScale)} ${scalePanelPixels(10, panelScale)}`,
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
          panelScale={panelScale}
        />
      )}

      {activeTab === 'combat' && (
        <CombatTabSections
          lang={lang}
          settings={settings}
          onUpdate={onUpdate}
          isSectionExpanded={isSectionExpanded}
          toggleSection={toggleSection}
          panelScale={panelScale}
        />
      )}

      {activeTab === 'effects' && (
        <EffectsTabSections
          lang={lang}
          settings={settings}
          onUpdate={onUpdate}
          isSectionExpanded={isSectionExpanded}
          toggleSection={toggleSection}
          panelScale={panelScale}
        />
      )}

      {activeTab === 'alerts' && (
        <AlertsTabSections
          lang={lang}
          settings={settings}
          onUpdate={onUpdate}
          isSectionExpanded={isSectionExpanded}
          toggleSection={toggleSection}
          panelScale={panelScale}
        />
      )}

      {activeTab === 'presets' && (
        <PresetsTabSections
          lang={lang}
          settings={settings}
          onUpdate={onUpdate}
          isSectionExpanded={isSectionExpanded}
          toggleSection={toggleSection}
          panelScale={panelScale}
        />
      )}
    </div>
  );
}
