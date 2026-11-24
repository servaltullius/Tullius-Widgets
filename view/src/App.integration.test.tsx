// @vitest-environment jsdom
/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { URL as NodeUrl } from 'node:url';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const { selectedActionSnapshots } = vi.hoisted(() => ({
  selectedActionSnapshots: [] as Array<{
    selectedItemId: string | null;
    playerLevelLayout: {
      visible: boolean;
      x: number;
      y: number;
      scale: number;
      locked: boolean;
      zIndex: number;
    } | null;
  }>,
}));

vi.mock('./hooks/useSelectedItemLayoutActions', async importOriginal => {
  const actual = await importOriginal<typeof import('./hooks/useSelectedItemLayoutActions')>();

  return {
    ...actual,
    createSelectedItemLayoutActions: (
      params: Parameters<typeof actual.createSelectedItemLayoutActions>[0],
    ) => {
      const playerLevelLayout = params.itemLayouts['player.level'];
      selectedActionSnapshots.push({
        selectedItemId: params.selectedItemId,
        playerLevelLayout: playerLevelLayout
          ? {
            visible: playerLevelLayout.visible,
            x: playerLevelLayout.x,
            y: playerLevelLayout.y,
            scale: playerLevelLayout.scale,
            locked: playerLevelLayout.locked,
            zIndex: playerLevelLayout.zIndex,
          }
          : null,
      });

      return actual.createSelectedItemLayoutActions(params);
    },
  };
});

import { App } from './App';
import { FONTS_READY_EVENT } from './utils/fontsReady';
import { defaultSettings } from './data/defaultSettings';
import { resolveWidgetItemLayouts } from './hooks/useWidgetItemLayouts';

type TestWindow = Window & {
  toggleSettings?: () => void;
};

function parsePx(value: string): number {
  return Number.parseFloat(value.replace('px', ''));
}

function getWidget(container: HTMLDivElement, itemId: string): HTMLDivElement | null {
  return container.querySelector(`[data-widget-item-id="${itemId}"]`) as HTMLDivElement | null;
}

function dispatchArrowKey(key: string, options: { shiftKey?: boolean } = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    shiftKey: options.shiftKey ?? false,
  }));
}

async function waitForFrame() {
  await new Promise<void>(resolve => {
    window.requestAnimationFrame(() => resolve());
  });
}

function getDefaultPlayerLevelLayout() {
  const settings = structuredClone(defaultSettings);
  settings.general.hudStyle = 'classic';
  return resolveWidgetItemLayouts({
    settings,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  })['player.level'];
}

describe('App quick-edit integration', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const originalFetch = globalThis.fetch;
  const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    window.sessionStorage.clear();
    selectedActionSnapshots.length = 0;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const target = String(input);

      if (target.endsWith('/i18n/manifest.json') || target === './i18n/manifest.json') {
        return new Response(JSON.stringify({
          defaultLanguage: 'ko',
          languages: [
            { code: 'ko', label: '한국어', file: 'ko.json', locale: 'ko-KR' },
            { code: 'en', label: 'English', file: 'en.json', locale: 'en-US' },
          ],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (target.endsWith('/i18n/ko.json') || target === './i18n/ko.json') {
        return new Response('{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('{}', {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    window.sessionStorage.clear();
    selectedActionSnapshots.length = 0;
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  it('fades after a value-change window and hide delay without new stats or remounting widgets', async () => {
    vi.useFakeTimers();
    await act(async () => {
      root = createRoot(container);
      root.render(<App />);
    });
    await act(async () => {
      window.updateSettings?.(JSON.stringify({
        schemaVersion: 7,
        general: { onboardingSeen: true, changeDisplaySeconds: 4, autoHide: { enabled: true, showInCombat: false, hideDelaySeconds: 3 } },
      }));
    });

    const hud = container.querySelector<HTMLDivElement>('.tw-hud-font-root')!;
    const gold = getWidget(container, 'player.gold');
    expect(gold).not.toBeNull();
    expect(hud.style.opacity).toBe('0');
    await act(async () => window.updateStats?.(JSON.stringify({ isInCombat: true })));
    expect(hud.style.opacity).toBe('0');

    await act(async () => window.updateStats?.(JSON.stringify({ playerInfo: { gold: 123 } })));
    expect(hud.style.opacity).toBe('1');
    expect(hud.style.transition).toBe('opacity 200ms');
    await act(async () => vi.advanceTimersByTimeAsync(4000));
    expect(hud.style.opacity).toBe('1');
    await act(async () => vi.advanceTimersByTimeAsync(2999));
    expect(hud.style.opacity).toBe('1');
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(hud.style.opacity).toBe('0');
    expect(hud.style.transition).toBe('opacity 500ms');
    expect(getWidget(container, 'player.gold')).toBe(gold);

    await act(async () => window.updateStats?.(JSON.stringify({ weaponDrawn: true })));
    expect(hud.style.opacity).toBe('1');
    expect(getWidget(container, 'player.gold')).toBe(gold);
    await act(async () => window.updateStats?.(JSON.stringify({ weaponDrawn: false })));
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(hud.style.opacity).toBe('0');
    await act(async () => window.toggleSettings?.());
    expect(hud.style.opacity).toBe('1');
    expect(getWidget(container, 'player.gold')).toBe(gold);
  });

  it('does not wake the HUD when a widget is switched on, and only fades with auto-hide on', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<App />);
    });
    const hud = container.querySelector<HTMLDivElement>('.tw-hud-font-root')!;
    // The plugin sends the saved settings before the first stats.
    await act(async () => window.updateSettings?.(JSON.stringify({ schemaVersion: 7, general: { onboardingSeen: true } })));
    // Same values as the stats already shown, so this sample is not a value change.
    await act(async () => window.updateStats?.(JSON.stringify({ isInCombat: false })));
    // Auto-hide off: F11, the settings panel and the free camera switch without a fade.
    expect(hud.style.opacity).toBe('1');
    expect(hud.style.transition).toBe('none');

    const changeOnly = {
      enabled: true,
      showInCombat: false,
      showWeaponDrawn: false,
      showSneaking: false,
      showResourcesNotFull: false,
      showOnChange: true,
      hideDelaySeconds: 0,
    };
    await act(async () => window.updateSettings?.(JSON.stringify({
      schemaVersion: 7,
      general: { onboardingSeen: true, autoHide: changeOnly },
    })));
    expect(hud.style.opacity).toBe('0');

    await act(async () => window.updateSettings?.(JSON.stringify({
      schemaVersion: 7,
      general: { onboardingSeen: true, autoHide: changeOnly },
      itemLayouts: { 'player.level': { ...getDefaultPlayerLevelLayout(), visible: true } },
    })));
    expect(getWidget(container, 'player.level')).not.toBeNull();
    expect(hud.style.opacity).toBe('0');

    await act(async () => window.updateStats?.(JSON.stringify({ playerInfo: { gold: 987654 } })));
    expect(hud.style.opacity).toBe('1');
  });

  it.each([
    { style: 'classic', textSelector: '.tw-stat-value', appliedKerning: 'normal', presetKerning: 'auto' },
    { style: 'compact', textSelector: '.tw-compact-value', appliedKerning: 'auto', presetKerning: 'normal' },
  ] as const)('applies and clears a user font in the $style HUD without remounting its text', async ({
    style, textSelector, appliedKerning, presetKerning,
  }) => {
    const stylesheet = document.createElement('style');
    stylesheet.textContent = readFileSync(new NodeUrl('./assets/compact-theme.css', import.meta.url), 'utf8');
    document.head.appendChild(stylesheet);
    document.documentElement.classList.add('tw-fonts-ready');
    const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
    Object.defineProperty(document, 'fonts', { configurable: true, value: { load: vi.fn().mockResolvedValue([{}]) } });

    try {
      await act(async () => {
        root = createRoot(container);
        root.render(<App />);
      });
      const setUserFont = (userFont: string) => window.updateSettings?.(JSON.stringify({
        schemaVersion: 7,
        general: { hudStyle: style, userFont, onboardingSeen: true },
        itemLayouts: { 'player.level': { ...getDefaultPlayerLevelLayout(), visible: true } },
      }));
      const setListing = () => window.TulliusWidgetsBridge?.v1?.updateUserFonts?.(JSON.stringify({
        fonts: [{ id: 'HUD Font', files: ['Font-Regular.ttf'] }],
      }));
      await act(async () => setUserFont(''));
      await act(async () => window.toggleSettings?.());
      const widget = getWidget(container, 'player.level');
      const text = widget?.querySelector(textSelector);
      expect(text).toBeTruthy();
      const theme = container.querySelector<HTMLElement>('[data-testid="app-font-theme"]')!;
      const uiFont = theme.style.getPropertyValue('--tw-font-ui');

      // Either bridge message may arrive first.
      if (style === 'classic') {
        await act(async () => setListing());
        await act(async () => setUserFont('hud font'));
      } else {
        await act(async () => setUserFont('hud font'));
        await act(async () => setListing());
      }
      expect(theme.style.getPropertyValue('--tw-font-hud')).toMatch(/^"TW User Font \d+", /);
      expect(theme.style.getPropertyValue('--tw-font-ui')).toBe(uiFont);
      expect(getWidget(container, 'player.level')).toBe(widget);
      expect(widget?.querySelector(textSelector)).toBe(text);
      expect(getComputedStyle(text!).getPropertyValue('font-kerning')).toBe(appliedKerning);
      if (style === 'compact') {
        expect(getComputedStyle(widget!).getPropertyValue('font-kerning')).toBe(appliedKerning);
      }

      await act(async () => setUserFont(''));
      expect(theme.style.getPropertyValue('--tw-font-hud')).not.toContain('TW User Font');
      expect(getWidget(container, 'player.level')).toBe(widget);
      expect(widget?.querySelector(textSelector)).toBe(text);
      expect(getComputedStyle(text!).getPropertyValue('font-kerning')).toBe(presetKerning);
    } finally {
      if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
      else Reflect.deleteProperty(document, 'fonts');
      document.documentElement.classList.remove('tw-fonts-ready');
      stylesheet.remove();
    }
  });

  it('relayouts the HUD when the bundled font becomes ready after a user font switch', async () => {
    const stylesheet = document.createElement('style');
    stylesheet.textContent = readFileSync(new NodeUrl('./assets/compact-theme.css', import.meta.url), 'utf8');
    document.head.appendChild(stylesheet);
    const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
    Object.defineProperty(document, 'fonts', { configurable: true, value: { load: vi.fn().mockResolvedValue([{}]) } });

    try {
      await act(async () => {
        root = createRoot(container);
        root.render(<App />);
      });
      await act(async () => window.TulliusWidgetsBridge?.v1?.updateUserFonts?.(JSON.stringify({
        fonts: [{ id: 'HUD Font', files: ['Font-Regular.ttf'] }],
      })));
      await act(async () => window.updateSettings?.(JSON.stringify({
        schemaVersion: 7,
        general: { hudStyle: 'compact', userFont: 'HUD Font', onboardingSeen: true },
        itemLayouts: { 'player.level': { ...getDefaultPlayerLevelLayout(), visible: true } },
      })));
      await act(async () => window.toggleSettings?.());
      const text = getWidget(container, 'player.level')?.querySelector('.tw-compact-value');
      expect(text).toBeTruthy();
      const kerningBefore = getComputedStyle(text!).getPropertyValue('font-kerning');

      // The bundled font finishes after the user font: its startup rule is outranked by the
      // user font relayout class, so the HUD must relayout on the event instead.
      await act(async () => {
        document.documentElement.classList.add('tw-fonts-ready');
        window.dispatchEvent(new Event(FONTS_READY_EVENT));
      });
      expect(getComputedStyle(text!).getPropertyValue('font-kerning')).not.toBe(kerningBefore);
    } finally {
      if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
      else Reflect.deleteProperty(document, 'fonts');
      document.documentElement.classList.remove('tw-fonts-ready');
      stylesheet.remove();
    }
  });

  it('keeps quick-edit action state canonical while a drag preview is active', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<App />);
    });

    const playerLevelLayout = getDefaultPlayerLevelLayout();

    await act(async () => {
      window.updateSettings?.(JSON.stringify({
        itemLayouts: {
          'player.level': {
            ...playerLevelLayout,
            visible: true,
          },
        },
      }));
    });

    await act(async () => {
      (window as TestWindow).toggleSettings?.();
    });

    const widget = getWidget(container, 'player.level');
    expect(widget).not.toBeNull();
    if (!widget) {
      throw new Error('expected player.level widget to render');
    }

    const originalX = parsePx(widget.style.left);
    const originalY = parsePx(widget.style.top);

    await act(async () => {
      widget.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        clientX: originalX + 8,
        clientY: originalY + 8,
      }));
      window.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        clientX: originalX + 8,
        clientY: originalY + 8,
      }));
    });

    selectedActionSnapshots.length = 0;

    await act(async () => {
      widget.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        clientX: originalX + 8,
        clientY: originalY + 8,
      }));
      window.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true,
        clientX: originalX + 88,
        clientY: originalY + 54,
      }));
      await waitForFrame();
    });

    const previewWidget = getWidget(container, 'player.level');
    expect(previewWidget).not.toBeNull();
    expect(parsePx(previewWidget!.style.left)).not.toBe(originalX);
    expect(parsePx(previewWidget!.style.top)).not.toBe(originalY);

    expect(
      selectedActionSnapshots.some(snapshot => snapshot.selectedItemId === 'player.level'),
    ).toBe(false);

    await act(async () => {
      window.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        clientX: originalX + 88,
        clientY: originalY + 54,
      }));
    });
  });

  it('updates the live HUD through the quick-edit card for nudge, reset, hide, and show', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<App />);
    });

    const playerLevelLayout = getDefaultPlayerLevelLayout();

    await act(async () => {
      window.updateSettings?.(JSON.stringify({
        itemLayouts: {
          'player.level': {
            ...playerLevelLayout,
            visible: true,
          },
        },
      }));
    });

    await act(async () => {
      (window as TestWindow).toggleSettings?.();
    });

    const selectedWidget = getWidget(container, 'player.level');
    expect(selectedWidget).not.toBeNull();
    if (!selectedWidget) {
      throw new Error('expected player.level widget to render');
    }

    const originalX = parsePx(selectedWidget.style.left);
    const originalY = parsePx(selectedWidget.style.top);
    const siblingWidget = getWidget(container, 'player.gold') ?? getWidget(container, 'time.game');
    expect(siblingWidget).not.toBeNull();
    if (!siblingWidget) {
      throw new Error('expected a sibling widget to render');
    }
    const siblingX = parsePx(siblingWidget.style.left);
    const siblingY = parsePx(siblingWidget.style.top);

    await act(async () => {
      selectedWidget.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        clientX: originalX + 8,
        clientY: originalY + 8,
      }));
      window.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        clientX: originalX + 8,
        clientY: originalY + 8,
      }));
    });

    expect(container.querySelector('[data-selected-widget-quick-edit-card]')).not.toBeNull();

    const nudgeXButton = container.querySelector('[data-quick-edit-nudge-x="+1"]') as HTMLButtonElement | null;
    const nudgeYButton = container.querySelector('[data-quick-edit-nudge-y="+1"]') as HTMLButtonElement | null;
    const resetButton = container.querySelector('[data-quick-edit-reset="true"]') as HTMLButtonElement | null;
    const visibilityToggle = container.querySelector('[data-quick-edit-visibility-toggle="true"]') as HTMLInputElement | null;

    await act(async () => {
      nudgeXButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const nudgedXWidget = getWidget(container, 'player.level');
    expect(nudgedXWidget).not.toBeNull();
    expect(parsePx(nudgedXWidget!.style.left)).toBe(originalX + 1);
    expect(parsePx(nudgedXWidget!.style.top)).toBe(originalY);

    await act(async () => {
      nudgeYButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const nudgedWidget = getWidget(container, 'player.level');
    expect(nudgedWidget).not.toBeNull();
    expect(parsePx(nudgedWidget!.style.left)).toBe(originalX + 1);
    expect(parsePx(nudgedWidget!.style.top)).toBe(originalY + 1);

    await act(async () => {
      resetButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const resetWidget = getWidget(container, 'player.level');
    expect(resetWidget).not.toBeNull();
    expect(parsePx(resetWidget!.style.left)).toBe(originalX);
    expect(parsePx(resetWidget!.style.top)).toBe(originalY);

    const currentSiblingWidget = getWidget(container, 'player.gold') ?? getWidget(container, 'time.game');
    expect(currentSiblingWidget).not.toBeNull();
    expect(parsePx(currentSiblingWidget!.style.left)).toBe(siblingX);
    expect(parsePx(currentSiblingWidget!.style.top)).toBe(siblingY);

    await act(async () => {
      visibilityToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-selected-widget-quick-edit-card]')).not.toBeNull();
    expect(getWidget(container, 'player.level')).toBeNull();

    await act(async () => {
      (container.querySelector('[data-quick-edit-visibility-toggle="true"]') as HTMLInputElement | null)
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const restoredWidget = getWidget(container, 'player.level');
    expect(restoredWidget).not.toBeNull();
    expect(parsePx(restoredWidget!.style.left)).toBe(originalX);
    expect(parsePx(restoredWidget!.style.top)).toBe(originalY);
  });

  it('nudges the selected widget with arrow keys and shift-arrow acceleration', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<App />);
    });

    const playerLevelLayout = getDefaultPlayerLevelLayout();

    await act(async () => {
      window.updateSettings?.(JSON.stringify({
        itemLayouts: {
          'player.level': {
            ...playerLevelLayout,
            visible: true,
          },
        },
      }));
    });

    await act(async () => {
      (window as TestWindow).toggleSettings?.();
    });

    const selectedWidget = getWidget(container, 'player.level');
    expect(selectedWidget).not.toBeNull();
    if (!selectedWidget) {
      throw new Error('expected player.level widget to render');
    }

    const originalX = parsePx(selectedWidget.style.left);
    const originalY = parsePx(selectedWidget.style.top);

    await act(async () => {
      selectedWidget.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        clientX: originalX + 8,
        clientY: originalY + 8,
      }));
      window.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        clientX: originalX + 8,
        clientY: originalY + 8,
      }));
    });

    await act(async () => {
      dispatchArrowKey('ArrowRight');
    });

    const onceNudgedWidget = getWidget(container, 'player.level');
    expect(onceNudgedWidget).not.toBeNull();
    expect(parsePx(onceNudgedWidget!.style.left)).toBe(originalX + 1);
    expect(parsePx(onceNudgedWidget!.style.top)).toBe(originalY);

    await act(async () => {
      dispatchArrowKey('ArrowDown', { shiftKey: true });
    });

    const shiftedWidget = getWidget(container, 'player.level');
    expect(shiftedWidget).not.toBeNull();
    expect(parsePx(shiftedWidget!.style.left)).toBe(originalX + 1);
    expect(parsePx(shiftedWidget!.style.top)).toBe(originalY + 10);
  });

  it('shows temporary alignment guides for keyboard nudges without snapping the widget position', async () => {
    vi.useFakeTimers();

    await act(async () => {
      root = createRoot(container);
      root.render(<App />);
    });

    const playerLevelLayout = getDefaultPlayerLevelLayout();

    await act(async () => {
      window.updateSettings?.(JSON.stringify({
        itemLayouts: {
          'player.level': {
            ...playerLevelLayout,
            visible: true,
          },
        },
      }));
    });

    await act(async () => {
      (window as TestWindow).toggleSettings?.();
    });

    const selectedWidget = getWidget(container, 'player.level');
    expect(selectedWidget).not.toBeNull();
    if (!selectedWidget) {
      throw new Error('expected player.level widget to render');
    }

    const originalX = parsePx(selectedWidget.style.left);
    const originalY = parsePx(selectedWidget.style.top);

    await act(async () => {
      selectedWidget.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        clientX: originalX + 8,
        clientY: originalY + 8,
      }));
      window.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        clientX: originalX + 8,
        clientY: originalY + 8,
      }));
    });

    expect(container.querySelectorAll('[data-guide-line]').length).toBe(0);

    await act(async () => {
      dispatchArrowKey('ArrowRight');
    });

    const nudgedWidget = getWidget(container, 'player.level');
    expect(nudgedWidget).not.toBeNull();
    expect(parsePx(nudgedWidget!.style.left)).toBe(originalX + 1);
    expect(parsePx(nudgedWidget!.style.top)).toBe(originalY);
    expect(container.querySelectorAll('[data-guide-line]').length).toBeGreaterThan(0);

    await act(async () => {
      vi.advanceTimersByTime(299);
    });

    expect(container.querySelectorAll('[data-guide-line]').length).toBeGreaterThan(0);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(container.querySelectorAll('[data-guide-line]').length).toBe(0);
  });

  it('does not nudge the selected widget while the quick-edit size slider is focused', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<App />);
    });

    const playerLevelLayout = getDefaultPlayerLevelLayout();

    await act(async () => {
      window.updateSettings?.(JSON.stringify({
        itemLayouts: {
          'player.level': {
            ...playerLevelLayout,
            visible: true,
          },
        },
      }));
    });

    await act(async () => {
      (window as TestWindow).toggleSettings?.();
    });

    const selectedWidget = getWidget(container, 'player.level');
    expect(selectedWidget).not.toBeNull();
    if (!selectedWidget) {
      throw new Error('expected player.level widget to render');
    }

    const originalX = parsePx(selectedWidget.style.left);
    const originalY = parsePx(selectedWidget.style.top);

    await act(async () => {
      selectedWidget.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        clientX: originalX + 8,
        clientY: originalY + 8,
      }));
      window.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        clientX: originalX + 8,
        clientY: originalY + 8,
      }));
    });

    const sizeSlider = container.querySelector('[data-quick-edit-size-slider="true"]') as HTMLInputElement | null;
    expect(sizeSlider).not.toBeNull();
    sizeSlider?.focus();

    await act(async () => {
      dispatchArrowKey('ArrowRight');
    });

    const unchangedWidget = getWidget(container, 'player.level');
    expect(unchangedWidget).not.toBeNull();
    expect(parsePx(unchangedWidget!.style.left)).toBe(originalX);
    expect(parsePx(unchangedWidget!.style.top)).toBe(originalY);
  });

  it('applies resistance display mode and disease visibility changes from the settings panel to the live HUD', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<App />);
    });

    await act(async () => {
      (window as TestWindow).toggleSettings?.();
    });

    const combatTab = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.includes('전투 수치'),
    );
    expect(combatTab).toBeTruthy();

    await act(async () => {
      combatTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const resistancesAccordion = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.includes('저항력'),
    );
    expect(resistancesAccordion).toBeTruthy();

    await act(async () => {
      resistancesAccordion?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const displaySelect = container.querySelector('[data-testid="resistance-display-select"]') as HTMLDivElement | null;
    expect(displaySelect).toBeTruthy();

    await act(async () => {
      displaySelect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const rawOnlyOption = document.querySelector('[data-testid="resistance-display-select-option-rawOnly"]') as HTMLDivElement | null;
    expect(rawOnlyOption).toBeTruthy();

    await act(async () => {
      rawOnlyOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const fireWidget = getWidget(container, 'resistance.fire');
    expect(fireWidget).not.toBeNull();
    expect(fireWidget?.textContent).toContain('120%');
    expect(fireWidget?.textContent).not.toContain('원본 120%');

    const diseaseToggleLabel = Array.from(container.querySelectorAll('span')).find(
      element => element.textContent === '질병',
    )?.closest('label');
    const diseaseToggle = diseaseToggleLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    expect(diseaseToggle).toBeTruthy();
    // Disease resistance is hidden by default.
    expect(diseaseToggle?.checked).toBe(false);
    expect(getWidget(container, 'resistance.disease')).toBeNull();

    await act(async () => {
      diseaseToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect((diseaseToggleLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement | null)?.checked).toBe(true);
    expect(getWidget(container, 'resistance.disease')).not.toBeNull();
  });
});
