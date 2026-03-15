// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

type TestWindow = Window & {
  toggleSettings?: () => void;
};

function parsePx(value: string): number {
  return Number.parseFloat(value.replace('px', ''));
}

function getWidget(container: HTMLDivElement, itemId: string): HTMLDivElement | null {
  return container.querySelector(`[data-widget-item-id="${itemId}"]`) as HTMLDivElement | null;
}

async function waitForFrame() {
  await new Promise<void>(resolve => {
    window.requestAnimationFrame(() => resolve());
  });
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
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  it('keeps quick-edit action state canonical while a drag preview is active', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<App />);
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
});
