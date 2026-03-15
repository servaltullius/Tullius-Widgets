// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { defaultSettings } from '../data/defaultSettings';
import type { WidgetSettings } from '../types/settings';
import { SettingsPanel } from './SettingsPanel';

function cloneSettings(): WidgetSettings {
  return structuredClone(defaultSettings);
}

describe('SettingsPanel', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    window.sessionStorage.clear();
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    window.sessionStorage.clear();
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
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
    settings.itemLayouts['player.level'] = {
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
          selectedItemId="player.level"
        />,
      );
    });

    const quickEditCard = container.querySelector('[data-selected-widget-quick-edit-card]') as HTMLDivElement | null;
    const tabs = container.querySelector('[data-settings-panel-tabs]') as HTMLDivElement | null;

    expect(quickEditCard).not.toBeNull();
    expect(quickEditCard?.textContent).toContain('레벨');
    expect(Boolean(quickEditCard?.compareDocumentPosition(tabs!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    const initialCardNode = quickEditCard;
    const effectsTab = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.includes('효과/시간'),
    );

    await act(async () => {
      effectsTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const afterTabSwitchCard = container.querySelector('[data-selected-widget-quick-edit-card]') as HTMLDivElement | null;
    expect(afterTabSwitchCard).toBe(initialCardNode);
    expect(afterTabSwitchCard?.textContent).toContain('레벨');
  });
});
