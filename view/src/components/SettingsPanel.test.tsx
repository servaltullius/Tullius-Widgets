// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { defaultSettings } from '../data/defaultSettings';
import type { WidgetSettings } from '../types/settings';
import { SETTINGS_PANEL_STORAGE_KEYS } from '../constants/bridge';
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

  it('scales the panel shell proportionally on a 4K viewport', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 3840 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 2160 });

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

    const panel = container.querySelector('[data-settings-panel-shell="true"]') as HTMLDivElement | null;
    const title = container.querySelector('h2') as HTMLHeadingElement | null;

    expect(panel).not.toBeNull();
    expect(title).not.toBeNull();
    if (!panel || !title) {
      throw new Error('expected settings panel shell and title to render');
    }

    expect(parseFloat(panel.style.minWidth)).toBeGreaterThan(680);
    expect(parseFloat(title.style.fontSize)).toBeGreaterThan(36);
    expect(panel.style.scrollbarGutter).toBe('stable');
    expect(parseFloat(panel.style.paddingRight)).toBeGreaterThan(parseFloat(panel.style.paddingLeft));
  });

  it('centers the panel with whole-pixel coordinates instead of transform-based positioning', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 720 });
    const settings = cloneSettings();
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    HTMLElement.prototype.getBoundingClientRect = function() {
      return DOMRect.fromRect({ x: 0, y: 0, width: 680, height: 420 });
    };

    try {
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

      const panel = container.querySelector('[data-settings-panel-shell="true"]') as HTMLDivElement | null;
      const wrapper = container.querySelector('[data-settings-panel-wrapper="true"]') as HTMLDivElement | null;

      expect(panel).not.toBeNull();
      expect(wrapper).not.toBeNull();
      if (!panel || !wrapper) {
        throw new Error('expected settings panel wrapper and shell to render');
      }

      expect(panel.style.transform).toBe('none');
      expect(wrapper.style.display).toBe('flex');
      expect(wrapper.style.justifyContent).toBe('center');
      expect(wrapper.style.alignItems).toBe('center');
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('gives the close button enough vertical box room to avoid clipped label text', async () => {
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

    const closeButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('닫기'),
    ) as HTMLButtonElement | undefined;

    expect(closeButton).toBeDefined();
    if (!closeButton) {
      throw new Error('expected close button to render');
    }

    expect(closeButton.style.display).toBe('inline-flex');
    expect(closeButton.style.alignItems).toBe('center');
    expect(parseFloat(closeButton.style.minHeight)).toBeGreaterThan(parseFloat(closeButton.style.fontSize));
    expect(closeButton.style.lineHeight).toBe('1');
    expect(closeButton.style.color).toBe('var(--tw-color-button-text)');
    expect(closeButton.style.fontWeight).toBe('600');
    expect(closeButton.style.textShadow).toBe('1px 1px 2px rgba(0,0,0,0.75)');
  });

  it('gives the tab menu labels stronger weight and shadow so they read crisply over the HUD', async () => {
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

    const generalTab = Array.from(container.querySelectorAll('[data-settings-panel-tabs] button')).find(button =>
      button.textContent?.includes('일반'),
    ) as HTMLButtonElement | undefined;
    const combatTab = Array.from(container.querySelectorAll('[data-settings-panel-tabs] button')).find(button =>
      button.textContent?.includes('전투 수치'),
    ) as HTMLButtonElement | undefined;

    expect(generalTab).toBeDefined();
    expect(combatTab).toBeDefined();
    if (!generalTab || !combatTab) {
      throw new Error('expected tab buttons to render');
    }

    expect(generalTab.style.fontWeight).toBe('700');
    expect(combatTab.style.fontWeight).toBe('600');
    expect(generalTab.style.textShadow).toBe('1px 1px 2px rgba(0,0,0,0.7)');
    expect(combatTab.style.textShadow).toBe('1px 1px 2px rgba(0,0,0,0.7)');
    expect(generalTab.style.lineHeight).toBe('1');
    expect(combatTab.style.lineHeight).toBe('1');
  });

  it('restores a stored panel position instead of always centering the shell', async () => {
    window.localStorage.setItem(
      SETTINGS_PANEL_STORAGE_KEYS.position,
      JSON.stringify({ left: 120, top: 88 }),
    );

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

    const panel = container.querySelector('[data-settings-panel-shell="true"]') as HTMLDivElement | null;

    expect(panel).not.toBeNull();
    if (!panel) {
      throw new Error('expected settings panel shell to render');
    }

    expect(panel.style.left).toBe('120px');
    expect(panel.style.top).toBe('88px');
    expect(panel.style.transform).toBe('none');
  });

  it('clamps a stored panel position back into the viewport on open', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 960 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 640 });
    window.localStorage.setItem(
      SETTINGS_PANEL_STORAGE_KEYS.position,
      JSON.stringify({ left: 4000, top: 3000 }),
    );

    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function() {
      return DOMRect.fromRect({ x: 4000, y: 3000, width: 680, height: 420 });
    };

    const settings = cloneSettings();

    try {
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
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }

    const panel = container.querySelector('[data-settings-panel-shell="true"]') as HTMLDivElement | null;

    expect(panel).not.toBeNull();
    if (!panel) {
      throw new Error('expected settings panel shell to render');
    }

    expect(parseFloat(panel.style.left)).toBeLessThanOrEqual(960 - 680);
    expect(parseFloat(panel.style.top)).toBeLessThanOrEqual(640 - 420);
    expect(parseFloat(panel.style.left)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(panel.style.top)).toBeGreaterThanOrEqual(0);
  });

  it('drags the panel from the header handle and stores the resulting px position', async () => {
    const settings = cloneSettings();
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    HTMLElement.prototype.getBoundingClientRect = function() {
      if ((this as HTMLElement).dataset.settingsPanelDragHandle === 'true') {
        return DOMRect.fromRect({ x: 100, y: 80, width: 680, height: 72 });
      }

      if ((this as HTMLElement).tagName === 'BUTTON') {
        return DOMRect.fromRect({ x: 0, y: 0, width: 88, height: 32 });
      }

      return DOMRect.fromRect({ x: 100, y: 80, width: 680, height: 420 });
    };

    try {
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

      const panel = container.querySelector('[data-settings-panel-shell="true"]') as HTMLDivElement | null;
      const handle = container.querySelector('[data-settings-panel-drag-handle="true"]') as HTMLDivElement | null;

      expect(panel).not.toBeNull();
      expect(handle).not.toBeNull();
      if (!panel || !handle) {
        throw new Error('expected settings panel shell and drag handle to render');
      }

      await act(async () => {
        handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 150, clientY: 100 }));
      });

      await act(async () => {
        window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 250, clientY: 210 }));
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 250, clientY: 210 }));
      });

      expect(panel.style.left).toBe('200px');
      expect(panel.style.top).toBe('190px');
      expect(panel.style.transform).toBe('none');
      expect(window.localStorage.getItem(SETTINGS_PANEL_STORAGE_KEYS.position)).toBe(
        JSON.stringify({ left: 200, top: 190 }),
      );
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('rounds dragged panel positions to whole pixels so the header text stays crisp', async () => {
    const settings = cloneSettings();
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    HTMLElement.prototype.getBoundingClientRect = function() {
      if ((this as HTMLElement).dataset.settingsPanelDragHandle === 'true') {
        return DOMRect.fromRect({ x: 100.5, y: 80.25, width: 680, height: 72 });
      }

      if ((this as HTMLElement).tagName === 'BUTTON') {
        return DOMRect.fromRect({ x: 0, y: 0, width: 88, height: 32 });
      }

      return DOMRect.fromRect({ x: 100.5, y: 80.25, width: 680, height: 420 });
    };

    try {
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

      const panel = container.querySelector('[data-settings-panel-shell="true"]') as HTMLDivElement | null;
      const handle = container.querySelector('[data-settings-panel-drag-handle="true"]') as HTMLDivElement | null;

      expect(panel).not.toBeNull();
      expect(handle).not.toBeNull();
      if (!panel || !handle) {
        throw new Error('expected settings panel shell and drag handle to render');
      }

      await act(async () => {
        handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 150, clientY: 100 }));
      });

      await act(async () => {
        window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 250, clientY: 210 }));
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 250, clientY: 210 }));
      });

      expect(panel.style.left.includes('.')).toBe(false);
      expect(panel.style.top.includes('.')).toBe(false);
      expect(window.localStorage.getItem(SETTINGS_PANEL_STORAGE_KEYS.position)).toBe(
        JSON.stringify({ left: 201, top: 190 }),
      );
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('reclamps the stored panel position when the viewport shrinks after open', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 960 });
    window.localStorage.setItem(
      SETTINGS_PANEL_STORAGE_KEYS.position,
      JSON.stringify({ left: 900, top: 520 }),
    );

    const settings = cloneSettings();
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    HTMLElement.prototype.getBoundingClientRect = function() {
      return DOMRect.fromRect({ x: 900, y: 520, width: 680, height: 420 });
    };

    try {
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

      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 900 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 540 });

      await act(async () => {
        window.dispatchEvent(new Event('resize'));
      });

      const panel = container.querySelector('[data-settings-panel-shell="true"]') as HTMLDivElement | null;
      expect(panel).not.toBeNull();
      if (!panel) {
        throw new Error('expected settings panel shell to render');
      }

      expect(parseFloat(panel.style.left)).toBeLessThanOrEqual(220);
      expect(parseFloat(panel.style.top)).toBeLessThanOrEqual(120);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
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

  it('shows the quick-edit card above the tabs using the registry label and keeps it mounted across tab switches', async () => {
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
    expect(Boolean(quickEditCard.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    const initialCardNode = quickEditCard;
    const effectsTab = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.includes('효과/시간'),
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
