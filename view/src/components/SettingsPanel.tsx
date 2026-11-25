import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import '../assets/panel.css';
import type { Language, UpdateSettingFn, WidgetItemLayout, WidgetSettings } from '../types/settings';
import type { SelectedItemLayoutActions } from '../hooks/useSelectedItemLayoutActions';
import type { WidgetInteractionMode } from '../hooks/useWidgetEditSelection';
import { t, type LocalizationLanguageEntry } from '../i18n/translations';
import type { SettingsFileNotice } from '../types/settingsFileNotice';
import {
  type PanelDockPreference,
  readStoredPanelDock,
  readStoredSettingsCategory,
  writeStoredPanelDock,
  writeStoredSettingsCategory,
} from './settings/settingsPanelState';
import {
  SETTINGS_CATEGORIES,
  SETTINGS_CATEGORY_GROUPS,
  findCategoryForSection,
  getSettingsCategory,
  type SettingsCategoryId,
} from './settings/settingsCategories';
import { PanelPortalContext } from './settings/panelPortal';
import { resolveAutoDockSide, resolveDockSide, resolveSettingsWindowRect, type PanelDockSide } from './settings/panelDock';
import { keepCardClearOfBar, placeQuickEditCard, placeUnanchoredQuickEditCard, resolveEditBarEdge, type EditBarEdge } from './settings/floatingPlacement';
import type { WidgetBounds } from '../utils/widgetBounds';
import { claimEscape } from '../utils/escapeOwners';
import {
  CombatTabSections,
  EffectsTabSections,
  GeneralTabSections,
  PresetsTabSections,
} from './settings/SettingsTabSections';
import { SelectedWidgetQuickEditCard } from './settings/SelectedWidgetQuickEditCard';
import { resolvePanelScale } from './settings/panelScale';
import {
  getWidgetItemDefaultZIndex,
  getWidgetItemRegistryEntry,
  getItemShowWhenOptions,
  resolveItemShowWhen,
} from '../data/widgetItemRegistry';

export type SettingsPanelMode = 'settings' | 'layout';

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
  /** Measures the HUD widgets on screen; used when the window opens and when layout mode starts. */
  measureWidgetBounds?: () => WidgetBounds[];
  /** Measures one widget on screen, for the quick-edit card beside it. */
  measureItemBounds?: (itemId: string) => WidgetBounds | null;
  /** Set while a widget is being dragged or resized. */
  interactionMode?: WidgetInteractionMode | null;
  /** Clears the widget selection (the card's close button, "related settings"). */
  onDeselectItem?: () => void;
  /** Starts a new undo step, so cancelling layout mode can itself be undone with Ctrl+Z. */
  onLayoutCheckpoint?: () => void;
  /** The saved settings could not be read; see SettingsFileNotice. */
  settingsFileNotice?: SettingsFileNotice | null;
  onDismissSettingsFileNotice?: () => void;
}

const QUICK_EDIT_CARD_WIDTH_PX = 300;
const FLOATING_GAP_PX = 12;
const FLOATING_MARGIN_PX = 16;
/** The layout bar's widest extent and its band height (bar plus edge offset), before scaling. */
const EDIT_BAR_BAND_WIDTH_PX = 760;
const EDIT_BAR_BAND_HEIGHT_PX = 76;

type CategoryRenderer = 'general' | 'widgets' | 'effects' | 'layout';
const CATEGORY_RENDERERS: Record<SettingsCategoryId, CategoryRenderer> = {
  display: 'general',
  hotkeys: 'general',
  progression: 'widgets',
  combat: 'widgets',
  equipment: 'widgets',
  effects: 'effects',
  layout: 'layout',
  slots: 'layout',
};

interface CardPosition {
  left: number;
  top: number;
}

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
  measureWidgetBounds,
  measureItemBounds,
  interactionMode = null,
  onDeselectItem,
  onLayoutCheckpoint,
  settingsFileNotice = null,
  onDismissSettingsFileNotice,
}: SettingsPanelProps) {
  const [category, setCategory] = useState<SettingsCategoryId>(() => readStoredSettingsCategory());
  const [mode, setMode] = useState<SettingsPanelMode>('settings');
  const [dockPreference, setDockPreference] = useState<PanelDockPreference>(() => readStoredPanelDock());
  // Decided when the panel opens and kept until it closes, so dragging a widget never makes the
  // window jump to the other side under the pointer.
  const [autoDockSide, setAutoDockSide] = useState<PanelDockSide>('right');
  const [editBarEdge, setEditBarEdge] = useState<EditBarEdge>('top');
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [cardPosition, setCardPosition] = useState<CardPosition | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const editBarRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const layoutStartRef = useRef<HTMLButtonElement>(null);
  const layoutApplyRef = useRef<HTMLButtonElement>(null);
  // The widget arrangement when layout mode started; cancelling puts it back.
  const layoutSnapshotRef = useRef<WidgetSettings['itemLayouts'] | null>(null);
  // The latest arrangement and callbacks for cancelling from the Esc key handler.
  const cancelSourceRef = useRef({ itemLayouts: settings.itemLayouts, onUpdate, onLayoutCheckpoint });
  useEffect(() => {
    cancelSourceRef.current = { itemLayouts: settings.itemLayouts, onUpdate, onLayoutCheckpoint };
  });

  // Puts the arrangement back as it was when layout mode started. The restore is its own undo
  // step, so Ctrl+Z brings the edits back after an accidental cancel.
  const cancelLayoutMode = useCallback(() => {
    const snapshot = layoutSnapshotRef.current;
    const source = cancelSourceRef.current;
    layoutSnapshotRef.current = null;
    // Compared by content: edits undone by hand (a size up and back down) need no restore step.
    if (snapshot && snapshot !== source.itemLayouts && JSON.stringify(snapshot) !== JSON.stringify(source.itemLayouts)) {
      source.onLayoutCheckpoint?.();
      source.onUpdate('itemLayouts', snapshot);
    }
    pendingFocusRef.current = 'settings';
    setMode('settings');
  }, []);
  const pendingFocusRef = useRef<SettingsPanelMode | null>(null);
  const pendingSectionScrollRef = useRef<string | null>(null);
  // Bumped for every "related settings" request, so the scroll also runs when the category and
  // the mode were already showing.
  const [sectionScrollRequest, setSectionScrollRequest] = useState(0);

  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const panelScale = resolvePanelScale(viewport.width, viewport.height);

  useEffect(() => {
    writeStoredSettingsCategory(category);
  }, [category]);

  // Every opening starts in the settings window, on the side that covers less of the HUD.
  useLayoutEffect(() => {
    if (!open) {
      setMode('settings');
      return;
    }
    const scale = resolvePanelScale(window.innerWidth, window.innerHeight);
    setAutoDockSide(resolveAutoDockSide({
      hudStyle: settings.general.hudStyle,
      compactAnchor: settings.general.compactAnchor,
      widgetBounds: measureWidgetBounds?.() ?? [],
      panelScale: scale,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    }));
    // Only the opening counts; later layout or style changes keep the side until the next opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // In layout mode the page answers Esc by cancelling the edit. The claim is made before paint so
  // the plugin hears about it before the next key press.
  const inLayoutMode = open && mode === 'layout';
  useLayoutEffect(() => (inLayoutMode ? claimEscape('layoutMode', cancelLayoutMode) : undefined), [cancelLayoutMode, inLayoutMode]);

  // Moves the keyboard focus to the main button of the surface that just appeared.
  useEffect(() => {
    if (pendingFocusRef.current !== mode) return;
    pendingFocusRef.current = null;
    (mode === 'layout' ? layoutApplyRef : layoutStartRef).current?.focus();
  }, [mode]);

  // Clicking a widget does not move the keyboard focus (its mousedown is cancelled), so the panel
  // control clicked last would keep the arrow keys: a segmented choice would flip, a category would
  // change. Selecting a widget therefore lets go of the focus, so the arrows move the widget.
  useEffect(() => {
    if (!selectedItemId) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && layerRef.current?.contains(active) && !cardRef.current?.contains(active)) {
      active.blur();
    }
  }, [selectedItemId]);

  // Each category opens at its top; the body element is reused, so a long category scrolled down
  // would otherwise open the next one part way down. A "related settings" jump scrolls itself.
  useEffect(() => {
    if (pendingSectionScrollRef.current) return;
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [category]);

  // "Related settings" scrolls to the widget's section once its category is on screen and hands
  // the keyboard to that category's tab, since the card button that was pressed is gone.
  useEffect(() => {
    const sectionId = pendingSectionScrollRef.current;
    if (!sectionId || mode !== 'settings') return;
    pendingSectionScrollRef.current = null;
    bodyRef.current?.querySelector(`[data-section-id="${sectionId}"]`)?.scrollIntoView?.({ block: 'start' });
    layerRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
  }, [category, mode, sectionScrollRequest]);

  const selectedRegistryEntry = selectedItemId ? getWidgetItemRegistryEntry(selectedItemId) : null;
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
  const showCard = Boolean(open && selectedRegistryEntry && resolvedSelectedItemLayout);
  const interacting = interactionMode !== null;
  const dockSide = resolveDockSide(dockPreference, autoDockSide);

  // Places the quick-edit card beside the selected widget after every render, so it follows
  // drags, nudges, undo, slot loads, screen changes and widgets that grow with new stats. There is
  // deliberately no dependency list (the widget's size is not a prop); the state changes only when
  // the spot moves, so the extra render settles at once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!showCard || !selectedItemId || !cardRef.current) {
      if (cardPosition !== null) setCardPosition(null);
      return;
    }
    const scale = resolvePanelScale(window.innerWidth, window.innerHeight);
    const margin = Math.round(FLOATING_MARGIN_PX * scale);
    const cardRect = cardRef.current.getBoundingClientRect();
    const view = { width: window.innerWidth, height: window.innerHeight };
    const gap = Math.round(FLOATING_GAP_PX * scale);
    const card = { width: cardRect.width, height: cardRect.height };
    const anchor = measureItemBounds?.(selectedItemId) ?? null;
    let placement = anchor
      ? placeQuickEditCard({ anchor, card, viewport: view, gap, margin })
      : placeUnanchoredQuickEditCard({ card, viewport: view, margin, windowSide: mode === 'settings' ? dockSide : null });
    const barRect = mode === 'layout' ? editBarRef.current?.getBoundingClientRect() : undefined;
    if (barRect) {
      placement = keepCardClearOfBar({ placement, card, bar: barRect, edge: editBarEdge, viewport: view, gap, margin });
    }
    const next = { left: Math.round(placement.left), top: Math.round(placement.top) };
    if (!cardPosition || cardPosition.left !== next.left || cardPosition.top !== next.top) {
      setCardPosition(next);
    }
  });

  if (!open) return null;

  const windowRect = resolveSettingsWindowRect(dockSide, panelScale, viewport);
  const currentCategory = getSettingsCategory(category);
  const renderer = CATEGORY_RENDERERS[currentCategory.id];
  const sections = currentCategory.sections;
  const hasSelectedItemActions = Boolean(selectedItemId && selectedItemLayoutActions);
  const relatedCategory = selectedRegistryEntry ? findCategoryForSection(selectedRegistryEntry.legacyGroupId) : null;

  const changeDockPreference = (next: PanelDockPreference) => {
    setDockPreference(next);
    writeStoredPanelDock(next);
  };

  const startLayoutMode = () => {
    setEditBarEdge(resolveEditBarEdge({
      widgetBounds: measureWidgetBounds?.() ?? [],
      viewport,
      bar: {
        width: Math.min(EDIT_BAR_BAND_WIDTH_PX * panelScale, viewport.width),
        height: EDIT_BAR_BAND_HEIGHT_PX * panelScale,
      },
    }));
    layoutSnapshotRef.current = settings.itemLayouts;
    pendingFocusRef.current = 'layout';
    setMode('layout');
  };

  // Keeps every change made in layout mode (they were already applied while editing).
  const applyLayoutMode = () => {
    layoutSnapshotRef.current = null;
    pendingFocusRef.current = 'settings';
    setMode('settings');
  };

  const moveEditBar = () => {
    setEditBarEdge(edge => (edge === 'top' ? 'bottom' : 'top'));
  };

  const showRelatedSettings = () => {
    if (!selectedRegistryEntry || !relatedCategory) return;
    pendingSectionScrollRef.current = selectedRegistryEntry.legacyGroupId;
    setSectionScrollRequest(request => request + 1);
    setCategory(relatedCategory);
    setMode('settings');
    onDeselectItem?.();
  };

  const moveCategoryFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = SETTINGS_CATEGORIES.findIndex(entry => entry.id === category);
    const next = SETTINGS_CATEGORIES[(index + step + SETTINGS_CATEGORIES.length) % SETTINGS_CATEGORIES.length];
    setCategory(next.id);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-category="${next.id}"]`)?.focus();
  };

  const layerStyle = { '--ps': panelScale } as CSSProperties;

  return (
    <div
      ref={layerRef}
      className="tw-panel-layer"
      data-panel-mode={mode}
      data-selected-item-id={selectedItemId ?? undefined}
      data-has-selected-item-actions={hasSelectedItemActions ? 'true' : 'false'}
      style={layerStyle}
    >
      <PanelPortalContext.Provider value={portalTarget}>
        {mode === 'settings' ? (
          <aside
            className="tw-panel tw-window"
            data-settings-panel-shell="true"
            data-dock={dockSide}
            data-ghost={interacting ? 'true' : 'false'}
            aria-label={t(lang, 'title')}
            style={{ left: windowRect.left, top: windowRect.top, width: windowRect.width, height: windowRect.height }}
          >
            <nav className="tw-w-nav">
              <div className="tw-w-brand">{t(lang, 'title')}</div>
              <div
                className="tw-w-nav-list"
                role="tablist"
                aria-orientation="vertical"
                aria-label={t(lang, 'title')}
                data-settings-panel-tabs="true"
                onKeyDown={moveCategoryFocus}
              >
                {SETTINGS_CATEGORY_GROUPS.map(group => (
                  <div key={group.id} className="tw-w-nav-group">
                    <div className="tw-w-nav-group-label">{t(lang, group.labelKey)}</div>
                    {SETTINGS_CATEGORIES.filter(entry => entry.group === group.id).map(entry => (
                      <button
                        key={entry.id}
                        type="button"
                        role="tab"
                        className="tw-w-nav-item"
                        data-category={entry.id}
                        aria-selected={entry.id === category}
                        aria-controls="tw-settings-category-body"
                        tabIndex={entry.id === category ? 0 : -1}
                        onClick={() => setCategory(entry.id)}
                      >
                        {t(lang, entry.labelKey)}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="tw-w-nav-foot">
                <button ref={layoutStartRef} type="button" className="tw-p-btn is-primary" data-layout-mode-start="true" onClick={startLayoutMode}>
                  {t(lang, 'layoutModeStart')}
                </button>
                <p className="tw-p-help">{t(lang, 'layoutModeStartHint')}</p>
              </div>
            </nav>

            <div className="tw-w-main">
              <header className="tw-w-head">
                <div>
                  <h2 className="tw-w-title">{t(lang, currentCategory.labelKey)}</h2>
                  <p className="tw-w-desc">{t(lang, currentCategory.descriptionKey)}</p>
                </div>
                <button type="button" className="tw-p-btn" data-panel-close="true" onClick={onClose}>
                  {t(lang, 'close')} <span className="tw-p-key">Esc</span>
                </button>
              </header>
              {settingsFileNotice && (
                <div
                  className="tw-w-notice"
                  role="alert"
                  data-settings-file-notice={settingsFileNotice.kind}
                >
                  <div className="tw-w-notice-body">
                    <div className="tw-w-notice-title">{t(lang, 'settingsBackupNoticeTitle')}</div>
                    <p className="tw-w-notice-text">
                      {settingsFileNotice.kind === 'backup'
                        ? t(lang, 'settingsBackupNoticeText').split('{file}').join(settingsFileNotice.fileName)
                        : t(lang, 'settingsLoadFailedText')}
                    </p>
                  </div>
                  {onDismissSettingsFileNotice && (
                    <button type="button" className="tw-p-btn is-small" data-settings-file-notice-dismiss="true" onClick={onDismissSettingsFileNotice}>
                      {t(lang, 'settingsBackupNoticeDismiss')}
                    </button>
                  )}
                </div>
              )}
              <div
                ref={bodyRef}
                id="tw-settings-category-body"
                className="tw-p-body"
                role="tabpanel"
                data-settings-panel-body="true"
                data-category={currentCategory.id}
              >
                {renderer === 'general' && (
                  <GeneralTabSections
                    lang={lang}
                    settings={settings}
                    selectedLanguage={lang}
                    effectiveVisible={effectiveVisible}
                    onUpdate={onUpdate}
                    accentColor={accentColor}
                    availableLanguages={availableLanguages}
                    sections={sections}
                    panelScale={panelScale}
                    panelDock={dockPreference}
                    onPanelDockChange={changeDockPreference}
                  />
                )}
                {renderer === 'widgets' && (
                  <CombatTabSections lang={lang} settings={settings} onUpdate={onUpdate} sections={sections} panelScale={panelScale} />
                )}
                {renderer === 'effects' && (
                  <EffectsTabSections lang={lang} settings={settings} onUpdate={onUpdate} sections={sections} panelScale={panelScale} />
                )}
                {renderer === 'layout' && (
                  <PresetsTabSections
                    lang={lang}
                    settings={settings}
                    onUpdate={onUpdate}
                    sections={sections}
                    panelScale={panelScale}
                    onStartLayoutEdit={startLayoutMode}
                  />
                )}
              </div>
            </div>
          </aside>
        ) : (
          <div className="tw-editbar-strip" data-edge={editBarEdge}>
            <div
              ref={editBarRef}
              className="tw-panel tw-editbar"
              role="toolbar"
              aria-label={t(lang, 'layoutModeTitle')}
              data-layout-edit-bar="true"
              data-ghost={interacting ? 'true' : 'false'}
              // Never wider than the band the automatic top or bottom choice measured.
              style={{ maxWidth: Math.min(Math.round(EDIT_BAR_BAND_WIDTH_PX * panelScale), viewport.width) }}
            >
              <span className="tw-editbar-title">{t(lang, 'layoutModeTitle')}</span>
              <span className="tw-editbar-hint">{t(lang, 'layoutModeHint')}</span>
              <span className="tw-editbar-actions">
                <button
                  type="button"
                  className="tw-p-btn"
                  data-edit-bar-move="true"
                  title={t(lang, editBarEdge === 'top' ? 'editBarMoveDownHint' : 'editBarMoveUpHint')}
                  onClick={moveEditBar}
                >
                  {t(lang, editBarEdge === 'top' ? 'editBarMoveDown' : 'editBarMoveUp')}
                </button>
                <button type="button" className="tw-p-btn" data-layout-mode-cancel="true" onClick={cancelLayoutMode}>
                  {t(lang, 'layoutModeCancel')} <span className="tw-p-key">Esc</span>
                </button>
                <button ref={layoutApplyRef} type="button" className="tw-p-btn is-primary" data-layout-mode-apply="true" onClick={applyLayoutMode}>
                  {t(lang, 'layoutModeApply')}
                </button>
              </span>
            </div>
          </div>
        )}

        {showCard && selectedItemId && selectedRegistryEntry && resolvedSelectedItemLayout && (
          <div
            ref={cardRef}
            className="tw-panel tw-quick-pop"
            data-quick-edit-popover="true"
            data-hidden={interacting || cardPosition === null ? 'true' : 'false'}
            style={{
              left: cardPosition?.left ?? 0,
              top: cardPosition?.top ?? 0,
              width: Math.round(QUICK_EDIT_CARD_WIDTH_PX * panelScale),
              maxHeight: Math.max(0, viewport.height - 2 * Math.round(FLOATING_MARGIN_PX * panelScale)),
            }}
          >
            {/* Keyed by widget, so a menu left open on one widget's card never writes to the next one. */}
            <SelectedWidgetQuickEditCard
              key={selectedItemId}
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
              showWhen={resolveItemShowWhen(selectedItemId, resolvedSelectedItemLayout, settings.general.hudStyle)}
              showWhenOptions={getItemShowWhenOptions(selectedItemId)}
              onShowWhenChange={next => onUpdate(`itemLayouts.${selectedItemId}.showWhen`, next)}
              onShowRelatedSettings={relatedCategory ? showRelatedSettings : undefined}
              onClose={onDeselectItem}
              panelScale={panelScale}
            />
          </div>
        )}

        <div ref={setPortalTarget} className="tw-portal" data-panel-portal="true" />
      </PanelPortalContext.Provider>
    </div>
  );
}
