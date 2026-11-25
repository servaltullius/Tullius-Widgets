// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { useMemo, useState, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { defaultSettings } from '../data/defaultSettings';
import type { WidgetSettings } from '../types/settings';
import { SETTINGS_PANEL_STORAGE_KEYS } from '../constants/bridge';
import { toWidgetBounds } from '../utils/widgetBounds';
import { claimEscape, isSelectMenuOpen } from '../utils/escapeOwners';
import { SettingsPanel } from './SettingsPanel';

function cloneSettings(): WidgetSettings {
  return structuredClone(defaultSettings);
}

describe('SettingsPanel', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const originalViewport = {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  };

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    window.sessionStorage.clear();
    window.localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalViewport.innerWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalViewport.innerHeight });
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });


  const languages = [{ code: 'ko', label: '한국어', file: 'ko.json', locale: 'ko-KR' }];
  type PanelProps = ComponentProps<typeof SettingsPanel>;

  function panelElement(props: Partial<PanelProps> = {}) {
    return (
      <SettingsPanel
        settings={props.settings ?? cloneSettings()}
        lang="ko"
        effectiveVisible
        open
        onClose={() => {}}
        onUpdate={() => {}}
        accentColor="#4fd1c5"
        availableLanguages={languages}
        selectedItemId={null}
        {...props}
      />
    );
  }

  async function renderPanel(props: Partial<PanelProps> = {}) {
    await act(async () => {
      root = createRoot(container);
      root.render(panelElement(props));
    });
  }

  async function rerenderPanel(props: Partial<PanelProps> = {}) {
    await act(async () => {
      root?.render(panelElement(props));
    });
  }

  function panelShell(): HTMLElement {
    const panel = container.querySelector('[data-settings-panel-shell="true"]') as HTMLElement | null;
    if (!panel) throw new Error('expected the settings window to render');
    return panel;
  }

  function panelMode(): string | undefined {
    return (container.querySelector('.tw-panel-layer') as HTMLElement | null)?.dataset.panelMode;
  }

  function categoryButton(label: string): HTMLButtonElement {
    const tab = Array.from(container.querySelectorAll('[role="tab"]')).find(button => button.textContent === label);
    if (!tab) throw new Error(`expected a category named ${label}`);
    return tab as HTMLButtonElement;
  }

  async function click(element: Element | null) {
    if (!element) throw new Error('expected an element to click');
    await act(async () => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function pressEscape(options: { repeat?: boolean } = {}) {
    let event: KeyboardEvent | null = null;
    await act(async () => {
      event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, repeat: options.repeat ?? false });
      document.body.dispatchEvent(event);
    });
    return event as unknown as KeyboardEvent;
  }

  function setViewport(width: number, height: number) {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  }

  it('renders the settings window with categories on the left and the panel scale as a CSS variable', async () => {
    setViewport(3840, 2160);
    await renderPanel();

    const layer = container.querySelector('.tw-panel-layer') as HTMLElement;
    expect(layer.style.getPropertyValue('--ps')).toBe('1.6');
    expect(panelMode()).toBe('settings');
    const shell = panelShell();
    expect(shell.querySelector('.tw-w-brand')?.textContent).toBe('툴리우스 위젯');
    expect(Array.from(shell.querySelectorAll('[role="tab"]')).map(tab => tab.textContent)).toEqual([
      '표시와 모양', '단축키와 언어', '성장·플레이어', '저항·방어·공격', '장비·이동', '효과·시간', '위치와 크기', '슬롯과 프리셋',
    ]);
    expect(shell.querySelector('.tw-w-title')?.textContent).toBe('표시와 모양');
    expect(shell.querySelector('.tw-w-desc')?.textContent).toContain('HUD');
    expect(shell.querySelector('[data-panel-close="true"]')).not.toBeNull();
    expect(shell.querySelector('[data-layout-mode-start="true"]')).not.toBeNull();
    expect(container.querySelector('[data-panel-portal="true"]')).not.toBeNull();
  });

  it('shows the settings file notice, with the kept file name once there is one, until it is dismissed', async () => {
    await renderPanel();
    expect(document.querySelector('[data-settings-file-notice]')).toBeNull();

    const onDismiss = vi.fn();
    await rerenderPanel({ settingsFileNotice: { kind: 'loadFailed' }, onDismissSettingsFileNotice: onDismiss });
    let notice = document.querySelector('[data-settings-file-notice]');
    expect(notice?.getAttribute('data-settings-file-notice')).toBe('loadFailed');
    expect(notice?.getAttribute('role')).toBe('alert');
    expect(notice?.textContent).toContain('TulliusWidgets.log');

    await rerenderPanel({
      settingsFileNotice: { kind: 'backup', fileName: 'TulliusWidgets.json.unloaded-20261125-133800.bak' },
      onDismissSettingsFileNotice: onDismiss,
    });
    notice = document.querySelector('[data-settings-file-notice]');
    expect(notice?.getAttribute('data-settings-file-notice')).toBe('backup');
    // The file name fills both places in the restore steps.
    expect(notice?.textContent?.split('TulliusWidgets.json.unloaded-20261125-133800.bak').length).toBe(3);

    await click(document.querySelector('[data-settings-file-notice-dismiss]'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('places the window 32px from the chosen edge, vertically centred', async () => {
    setViewport(1920, 1080);
    await renderPanel();

    const shell = panelShell();
    expect(shell.dataset.dock).toBe('right');
    expect([shell.style.left, shell.style.top, shell.style.width, shell.style.height]).toEqual(['948px', '180px', '940px', '720px']);
  });

  it('opens opposite a compact HUD anchored on either side', async () => {
    const settings = cloneSettings();
    settings.general.hudStyle = 'compact';
    settings.general.compactAnchor = 'bottomLeft';
    await renderPanel({ settings });
    expect(panelShell().dataset.dock).toBe('right');

    await act(async () => root?.unmount());
    const rightAnchored = cloneSettings();
    rightAnchored.general.hudStyle = 'compact';
    rightAnchored.general.compactAnchor = 'topRight';
    await renderPanel({ settings: rightAnchored });
    expect(panelShell().dataset.dock).toBe('left');
  });

  it('opens a classic HUD window on the side that covers fewer measured widgets', async () => {
    setViewport(1920, 1080);
    const settings = cloneSettings();
    settings.general.hudStyle = 'classic';
    const rightWidget = toWidgetBounds({ left: 1500, top: 400, width: 200, height: 100, right: 1700, bottom: 500 });
    await renderPanel({ settings, measureWidgetBounds: () => [rightWidget] });

    expect(panelShell().dataset.dock).toBe('left');
  });

  it('keeps the side chosen at opening even when the HUD moves while the panel is open', async () => {
    const settings = cloneSettings();
    settings.general.hudStyle = 'compact';
    settings.general.compactAnchor = 'bottomLeft';
    await renderPanel({ settings });
    expect(panelShell().dataset.dock).toBe('right');

    const moved = cloneSettings();
    moved.general.hudStyle = 'compact';
    moved.general.compactAnchor = 'bottomRight';
    await rerenderPanel({ settings: moved });

    expect(panelShell().dataset.dock).toBe('right');
  });

  it('stores the window side from the hotkeys category and can return to automatic', async () => {
    window.localStorage.setItem(SETTINGS_PANEL_STORAGE_KEYS.dock, 'left');
    await renderPanel();
    expect(panelShell().dataset.dock).toBe('left');

    await click(categoryButton('단축키와 언어'));
    await click(container.querySelector('[data-testid="panel-dock-select-option-auto"]'));

    expect(panelShell().dataset.dock).toBe('right');
    expect(window.localStorage.getItem(SETTINGS_PANEL_STORAGE_KEYS.dock)).toBe('auto');
  });

  it('ignores an unknown stored dock value', async () => {
    window.localStorage.setItem(SETTINGS_PANEL_STORAGE_KEYS.dock, 'center');
    await renderPanel();

    expect(panelShell().dataset.dock).toBe('right');
  });

  it('switches categories, shows only their sections and remembers the last one', async () => {
    await renderPanel();
    expect(categoryButton('표시와 모양').getAttribute('aria-selected')).toBe('true');

    await click(categoryButton('성장·플레이어'));

    const body = container.querySelector('[data-settings-panel-body="true"]') as HTMLElement;
    expect(body.dataset.category).toBe('progression');
    expect(categoryButton('성장·플레이어').getAttribute('aria-selected')).toBe('true');
    expect(categoryButton('표시와 모양').getAttribute('aria-selected')).toBe('false');
    expect(Array.from(body.querySelectorAll('[data-section-id]')).map(section => section.getAttribute('data-section-id'))).toEqual(['experience', 'playerInfo']);
    expect(window.sessionStorage.getItem(SETTINGS_PANEL_STORAGE_KEYS.activeTab)).toBe('progression');

    await act(async () => root?.unmount());
    await renderPanel();
    expect((container.querySelector('[data-settings-panel-body="true"]') as HTMLElement).dataset.category).toBe('progression');
  });

  it('falls back to the first category for a tab id from the old layout', async () => {
    window.sessionStorage.setItem(SETTINGS_PANEL_STORAGE_KEYS.activeTab, 'general');
    await renderPanel();

    expect((container.querySelector('[data-settings-panel-body="true"]') as HTMLElement).dataset.category).toBe('display');
  });

  it('moves between categories with the up and down arrow keys', async () => {
    await renderPanel();
    const list = container.querySelector('[data-settings-panel-tabs="true"]') as HTMLElement;

    await act(async () => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(categoryButton('단축키와 언어').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(categoryButton('단축키와 언어'));

    for (let press = 0; press < 2; press += 1) {
      await act(async () => {
        list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      });
    }
    expect(categoryButton('슬롯과 프리셋').getAttribute('aria-selected')).toBe('true');
  });

  it('closes an open select menu on Esc without letting the key reach the panel', async () => {
    const panelEscape: string[] = [];
    const onPanelKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) panelEscape.push('closed');
    };
    window.addEventListener('keydown', onPanelKeyDown);
    try {
      await renderPanel();
      await click(categoryButton('단축키와 언어'));
      await click(container.querySelector('[data-testid="language-select"]'));

      const menu = container.querySelector('[role="listbox"]');
      expect(menu).not.toBeNull();
      expect(menu?.closest('[data-panel-portal="true"]')).not.toBeNull();
      expect(isSelectMenuOpen()).toBe(true);

      await pressEscape();

      expect(container.querySelector('[role="listbox"]')).toBeNull();
      expect(isSelectMenuOpen()).toBe(false);
      expect(panelEscape).toEqual([]);
    } finally {
      window.removeEventListener('keydown', onPanelKeyDown);
    }
  });

  it('folds the window into the layout bar, claims Esc and returns to the window on Esc', async () => {
    const reports: string[] = [];
    window.onEscapeOwner = argument => {
      reports.push(argument);
    };
    try {
      await renderPanel();
      await click(container.querySelector('[data-layout-mode-start="true"]'));

      expect(panelMode()).toBe('layout');
      expect(container.querySelector('[data-settings-panel-shell="true"]')).toBeNull();
      const bar = container.querySelector('[data-layout-edit-bar="true"]');
      expect(bar).not.toBeNull();
      expect(document.activeElement).toBe(container.querySelector('[data-layout-mode-apply="true"]'));
      expect(reports).toEqual(['1']);

      const escape = await pressEscape();

      expect(escape.defaultPrevented).toBe(true);
      expect(panelMode()).toBe('settings');
      expect(document.activeElement).toBe(container.querySelector('[data-layout-mode-start="true"]'));
      // Released by the page's own Esc keydown, so the plugin stands aside for that same press.
      expect(reports).toEqual(['1', '0e']);
    } finally {
      delete window.onEscapeOwner;
    }
  });

  it('cancels layout mode on Esc by restoring the arrangement from when it started', async () => {
    const before = cloneSettings();
    before.itemLayouts = { 'player.level': { visible: true, x: 10, y: 20, scale: 1, locked: false, zIndex: 1 } };
    const onUpdate = vi.fn();
    const onLayoutCheckpoint = vi.fn();
    await renderPanel({ settings: before, onUpdate, onLayoutCheckpoint });
    await click(container.querySelector('[data-layout-mode-start="true"]'));

    const edited = { ...before, itemLayouts: { 'player.level': { ...before.itemLayouts['player.level'], x: 300 } } };
    await rerenderPanel({ settings: edited, onUpdate, onLayoutCheckpoint });
    await pressEscape();

    expect(panelMode()).toBe('settings');
    expect(onLayoutCheckpoint).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith('itemLayouts', before.itemLayouts);
  });

  it('keeps the edits on apply and does nothing on cancel without edits', async () => {
    const settings = cloneSettings();
    const onUpdate = vi.fn();
    await renderPanel({ settings, onUpdate });

    await click(container.querySelector('[data-layout-mode-start="true"]'));
    await click(container.querySelector('[data-layout-mode-cancel="true"]'));
    expect(panelMode()).toBe('settings');
    expect(onUpdate).not.toHaveBeenCalled();

    await click(container.querySelector('[data-layout-mode-start="true"]'));
    const edited = { ...settings, itemLayouts: { ...settings.itemLayouts, 'player.level': { visible: true, x: 1, y: 1, scale: 1, locked: false, zIndex: 1 } } };
    await rerenderPanel({ settings: edited, onUpdate });
    await click(container.querySelector('[data-layout-mode-apply="true"]'));
    expect(panelMode()).toBe('settings');
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('moves the layout bar between the top and bottom and fades it while a widget is dragged', async () => {
    await renderPanel();
    await click(container.querySelector('[data-layout-mode-start="true"]'));
    const strip = () => container.querySelector('.tw-editbar-strip') as HTMLElement;
    const moveButton = () => container.querySelector('[data-edit-bar-move="true"]') as HTMLButtonElement;
    expect(strip().dataset.edge).toBe('top');
    expect(moveButton().textContent).toBe('아래로');

    await click(moveButton());
    expect(strip().dataset.edge).toBe('bottom');
    expect(moveButton().textContent).toBe('위로');

    await rerenderPanel({ interactionMode: 'drag' });
    expect((container.querySelector('[data-layout-edit-bar="true"]') as HTMLElement).dataset.ghost).toBe('true');
  });

  it('shows the pictured layout guide in the position and size category', async () => {
    await renderPanel();
    await click(categoryButton('위치와 크기'));

    const steps = container.querySelectorAll('[data-layout-edit-guide="true"] .tw-guide-step');
    expect(steps).toHaveLength(3);
    expect(steps[0].textContent).toContain('끌어서 옮기기');
    expect(steps[0].querySelector('svg')).not.toBeNull();
  });

  it('starts layout mode from the position and size category too', async () => {
    await renderPanel();
    await click(categoryButton('위치와 크기'));
    await click(container.querySelector('[data-layout-mode-start-inline="true"]'));

    expect(panelMode()).toBe('layout');
  });

  it('leaves Esc to a widget selection and ignores a held key in layout mode', async () => {
    await renderPanel();
    await click(container.querySelector('[data-layout-mode-start="true"]'));

    const deselect = vi.fn();
    const releaseSelection = claimEscape('selection', deselect);
    await pressEscape();
    expect(deselect).toHaveBeenCalledTimes(1);
    expect(panelMode()).toBe('layout');
    releaseSelection();

    const held = await pressEscape({ repeat: true });
    expect(held.defaultPrevented).toBe(true);
    expect(panelMode()).toBe('layout');

    await pressEscape();
    expect(panelMode()).toBe('settings');
  });

  it('returns to the settings window from the bar button and starts each opening in the window', async () => {
    await renderPanel();
    await click(container.querySelector('[data-layout-mode-start="true"]'));
    await click(container.querySelector('[data-layout-mode-apply="true"]'));
    expect(panelMode()).toBe('settings');

    await click(container.querySelector('[data-layout-mode-start="true"]'));
    await rerenderPanel({ open: false });
    await rerenderPanel({ open: true });
    expect(panelMode()).toBe('settings');
  });

  it('puts the layout bar at the bottom when widgets fill the top centre', async () => {
    setViewport(1920, 1080);
    const topCentre = toWidgetBounds({ left: 760, top: 10, width: 400, height: 60, right: 1160, bottom: 70 });
    await renderPanel({ measureWidgetBounds: () => [topCentre] });
    await click(container.querySelector('[data-layout-mode-start="true"]'));

    expect((container.querySelector('.tw-editbar-strip') as HTMLElement).dataset.edge).toBe('bottom');
  });

  it('fades the window and hides the card while a widget is dragged', async () => {
    await renderPanel({ selectedItemId: 'experience.progress', interactionMode: 'drag' });

    expect(panelShell().dataset.ghost).toBe('true');
    expect((container.querySelector('[data-quick-edit-popover="true"]') as HTMLElement).dataset.hidden).toBe('true');

    await rerenderPanel({ selectedItemId: 'experience.progress', interactionMode: null });
    expect(panelShell().dataset.ghost).toBe('false');
    expect((container.querySelector('[data-quick-edit-popover="true"]') as HTMLElement).dataset.hidden).toBe('false');
  });

  it('scrolls to the related section even when its category is already open', async () => {
    const scrolled: Array<string | null> = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoView(this: Element) {
      scrolled.push(this.getAttribute('data-section-id'));
    };
    try {
      await renderPanel({ selectedItemId: 'player.gold', onDeselectItem: () => {} });
      await click(categoryButton('성장·플레이어'));

      await click(container.querySelector('[data-quick-edit-related-settings="true"]'));
      expect(scrolled).toEqual(['playerInfo']);

      await click(container.querySelector('[data-quick-edit-related-settings="true"]'));
      expect(scrolled).toEqual(['playerInfo', 'playerInfo']);
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it('keeps a card without a measurable widget away from the settings window', async () => {
    setViewport(1920, 1080);
    await renderPanel({ selectedItemId: 'experience.progress', measureItemBounds: () => null });

    expect(panelShell().dataset.dock).toBe('right');
    expect((container.querySelector('[data-quick-edit-popover="true"]') as HTMLElement).style.left).toBe('16px');
  });

  it('lets go of the keyboard focus on a panel control when a widget is selected', async () => {
    await renderPanel();
    const option = container.querySelector('[data-testid="hud-style-select-option-compact"]') as HTMLButtonElement;
    option.focus();
    expect(document.activeElement).toBe(option);

    await rerenderPanel({ selectedItemId: 'experience.progress' });

    expect(document.activeElement).toBe(document.body);
  });

  it('keeps the focus inside the card when the selection stays', async () => {
    await renderPanel({ selectedItemId: 'experience.progress' });
    const slider = container.querySelector('[data-quick-edit-size-slider="true"]') as HTMLInputElement;
    slider.focus();

    await rerenderPanel({ selectedItemId: 'experience.progress', selectedItemLayout: { visible: true, x: 1, y: 2, scale: 1.2, locked: false, zIndex: 1 } });

    expect(document.activeElement).toBe(slider);
  });

  it('places the card beside the selected widget', async () => {
    setViewport(1920, 1080);
    const widget = toWidgetBounds({ left: 100, top: 300, width: 150, height: 50, right: 250, bottom: 350 });
    await renderPanel({ selectedItemId: 'experience.progress', measureItemBounds: id => (id === 'experience.progress' ? widget : null) });

    const card = container.querySelector('[data-quick-edit-popover="true"]') as HTMLElement;
    expect(card.style.left).toBe('262px');
    expect(card.style.top).toBe('300px');
    expect(card.style.width).toBe('300px');
  });

  it('opens the related settings category and clears the selection from the card', async () => {
    const onDeselectItem = vi.fn();
    await renderPanel({ selectedItemId: 'resistance.fire', onDeselectItem });
    await click(container.querySelector('[data-layout-mode-start="true"]'));

    await click(container.querySelector('[data-quick-edit-related-settings="true"]'));

    expect(panelMode()).toBe('settings');
    expect((container.querySelector('[data-settings-panel-body="true"]') as HTMLElement).dataset.category).toBe('combat');
    expect(onDeselectItem).toHaveBeenCalledTimes(1);

    await rerenderPanel({ selectedItemId: 'resistance.fire', onDeselectItem });
    await click(container.querySelector('[data-quick-edit-close="true"]'));
    expect(onDeselectItem).toHaveBeenCalledTimes(2);
  });

  it('hides the quick-edit card when no widget is selected', async () => {
    const settings = cloneSettings();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <SettingsPanel
          settings={settings}
          lang="ko"
          effectiveVisible
          open
          onClose={() => {}}
          onUpdate={() => {}}
          accentColor="#4fd1c5"
          availableLanguages={[{ code: 'ko', label: '한국어', file: 'ko.json', locale: 'ko-KR' }]}
          selectedItemId={null}
        />,
      );
    });

    expect(container.querySelector('[data-selected-widget-quick-edit-card]')).toBeNull();
  });

  it('shows the quick-edit card beside the window using the registry label and keeps it mounted across category switches', async () => {
    const settings = cloneSettings();
    settings.itemLayouts['experience.progress'] = {
      visible: true,
      x: 120,
      y: 240,
      scale: 1.25,
      locked: false,
      zIndex: 3,
    };

    await act(async () => {
      root = createRoot(container);
      root.render(
        <SettingsPanel
          settings={settings}
          lang="ko"
          effectiveVisible
          open
          onClose={() => {}}
          onUpdate={() => {}}
          accentColor="#4fd1c5"
          availableLanguages={[{ code: 'ko', label: '한국어', file: 'ko.json', locale: 'ko-KR' }]}
          selectedItemId="experience.progress"
          selectedItemLayout={{
            visible: true,
            x: 120,
            y: 240,
            scale: 1.4,
            locked: false,
            zIndex: 4,
          }}
        />,
      );
    });

    const quickEditCard = container.querySelector('[data-selected-widget-quick-edit-card]') as HTMLDivElement | null;
    const tabs = container.querySelector('[data-settings-panel-tabs]') as HTMLDivElement | null;

    expect(quickEditCard).not.toBeNull();
    expect(tabs).not.toBeNull();
    if (!quickEditCard || !tabs) {
      throw new Error('expected quick-edit card and tabs to render');
    }
    expect(quickEditCard?.textContent).toContain('통합 진행 위젯');
    expect(quickEditCard?.textContent).not.toContain('경험치 진행도');
    // The card floats beside the widget, outside the window's scrolling body.
    expect(quickEditCard.closest('[data-quick-edit-popover="true"]')).not.toBeNull();
    expect(quickEditCard.closest('[data-settings-panel-body="true"]')).toBeNull();

    const initialCardNode = quickEditCard;
    const effectsTab = Array.from(container.querySelectorAll('[role="tab"]')).find(
      button => button.textContent === '효과·시간',
    );

    await act(async () => {
      effectsTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const afterTabSwitchCard = container.querySelector('[data-selected-widget-quick-edit-card]') as HTMLDivElement | null;
    expect(afterTabSwitchCard).toBe(initialCardNode);
    expect(afterTabSwitchCard?.textContent).toContain('통합 진행 위젯');
  });

  it('keeps the quick-edit card mounted while hiding the selected widget and allows showing it again', async () => {
    function Harness() {
      const [settings, setSettings] = useState(() => {
        const next = cloneSettings();
        next.itemLayouts['player.level'] = {
          visible: true,
          x: 120,
          y: 240,
          scale: 1.25,
          locked: false,
          zIndex: 3,
        };
        return next;
      });

      const selectedItemLayoutActions = useMemo(() => ({
        setSelectedItemVisible(nextVisible: boolean) {
          setSettings(current => ({
            ...current,
            itemLayouts: {
              ...current.itemLayouts,
              'player.level': {
                ...current.itemLayouts['player.level'],
                visible: nextVisible,
              },
            },
          }));
          return true;
        },
        setSelectedItemScale(nextScale: number) {
          setSettings(current => ({
            ...current,
            itemLayouts: {
              ...current.itemLayouts,
              'player.level': {
                ...current.itemLayouts['player.level'],
                scale: nextScale,
              },
            },
          }));
          return true;
        },
        setSelectedItemLocked(nextLocked: boolean) {
          setSettings(current => ({
            ...current,
            itemLayouts: {
              ...current.itemLayouts,
              'player.level': {
                ...current.itemLayouts['player.level'],
                locked: nextLocked,
              },
            },
          }));
          return true;
        },
        nudgeSelectedItem() {
          return false;
        },
        resetSelectedItemPosition() {
          return false;
        },
        bringSelectedItemForward() {
          return false;
        },
        sendSelectedItemBackward() {
          return false;
        },
      }), []);

      return (
        <SettingsPanel
          settings={settings}
          lang="ko"
          effectiveVisible
          open
          onClose={() => {}}
          onUpdate={() => {}}
          accentColor="#4fd1c5"
          availableLanguages={[{ code: 'ko', label: '한국어', file: 'ko.json', locale: 'ko-KR' }]}
          selectedItemId="player.level"
          selectedItemLayout={settings.itemLayouts['player.level']}
          selectedItemLayoutActions={selectedItemLayoutActions}
        />
      );
    }

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness />);
    });

    const visibilityToggle = container.querySelector('[data-quick-edit-visibility-toggle="true"]') as HTMLInputElement | null;
    const bringForwardButton = container.querySelector('[data-quick-edit-bring-forward="true"]') as HTMLButtonElement | null;
    const sendBackwardButton = container.querySelector('[data-quick-edit-send-backward="true"]') as HTMLButtonElement | null;

    await act(async () => {
      visibilityToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-selected-widget-quick-edit-card]')).not.toBeNull();
    expect((container.querySelector('[data-quick-edit-visibility-toggle="true"]') as HTMLInputElement).checked).toBe(false);
    expect(bringForwardButton?.disabled).toBe(true);
    expect(sendBackwardButton?.disabled).toBe(true);

    await act(async () => {
      (container.querySelector('[data-quick-edit-visibility-toggle="true"]') as HTMLInputElement)
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect((container.querySelector('[data-quick-edit-visibility-toggle="true"]') as HTMLInputElement).checked).toBe(true);
  });

  it('uses the selected item layout prop for live quick-edit values and wires size/lock callbacks', async () => {
    function Harness() {
      const [settings] = useState(() => {
        const next = cloneSettings();
        next.itemLayouts['player.level'] = {
          visible: true,
          x: 120,
          y: 240,
          scale: 1.25,
          locked: false,
          zIndex: 3,
        };
        return next;
      });
      const [selectedItemLayout, setSelectedItemLayout] = useState({
        visible: true,
        x: 160,
        y: 260,
        scale: 1.55,
        locked: false,
        zIndex: 7,
      });

      const selectedItemLayoutActions = useMemo(() => ({
        setSelectedItemVisible(nextVisible: boolean) {
          setSelectedItemLayout(current => ({ ...current, visible: nextVisible }));
          return true;
        },
        setSelectedItemScale(nextScale: number) {
          setSelectedItemLayout(current => ({ ...current, scale: nextScale }));
          return true;
        },
        setSelectedItemLocked(nextLocked: boolean) {
          setSelectedItemLayout(current => ({ ...current, locked: nextLocked }));
          return true;
        },
        nudgeSelectedItem() {
          return false;
        },
        resetSelectedItemPosition() {
          return false;
        },
        bringSelectedItemForward() {
          return false;
        },
        sendSelectedItemBackward() {
          return false;
        },
      }), []);

      return (
        <SettingsPanel
          settings={settings}
          lang="ko"
          effectiveVisible
          open
          onClose={() => {}}
          onUpdate={() => {}}
          accentColor="#4fd1c5"
          availableLanguages={[{ code: 'ko', label: '한국어', file: 'ko.json', locale: 'ko-KR' }]}
          selectedItemId="player.level"
          selectedItemLayout={selectedItemLayout}
          selectedItemLayoutActions={selectedItemLayoutActions}
        />
      );
    }

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness />);
    });

    const sizeSlider = container.querySelector('[data-quick-edit-size-slider="true"]') as HTMLInputElement | null;
    const lockToggle = container.querySelector('[data-quick-edit-lock-toggle="true"]') as HTMLInputElement | null;

    expect(sizeSlider?.value).toBe('1.55');
    expect(container.textContent).toContain('z 7');

    await act(async () => {
      sizeSlider!.value = '1.7';
      sizeSlider?.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect((container.querySelector('[data-quick-edit-size-slider="true"]') as HTMLInputElement).value).toBe('1.7');

    await act(async () => {
      lockToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect((container.querySelector('[data-quick-edit-lock-toggle="true"]') as HTMLInputElement).checked).toBe(true);
    expect((container.querySelector('[data-quick-edit-size-slider="true"]') as HTMLInputElement).disabled).toBe(true);
  });
});
