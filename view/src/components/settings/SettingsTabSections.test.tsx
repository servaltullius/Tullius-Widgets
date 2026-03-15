// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { defaultSettings } from '../../data/defaultSettings';
import type { WidgetSettings } from '../../types/settings';
import { CombatTabSections, EffectsTabSections, GeneralTabSections, PresetsTabSections } from './SettingsTabSections';

function cloneSettings(): WidgetSettings {
  return structuredClone(defaultSettings);
}

describe('SettingsTabSections', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  it('hides the global size control and removes group layout selectors in phase 2', async () => {
    const settings = cloneSettings();
    const onUpdate = vi.fn();
    const isSectionExpanded = () => true;
    const toggleSection = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <>
          <GeneralTabSections
            lang="ko"
            settings={settings}
            selectedLanguage="ko"
            effectiveVisible={settings.general.visible}
            onUpdate={onUpdate}
            accentColor="#ffffff"
            availableLanguages={[{ code: 'ko', label: '한국어', file: 'ko.json' }]}
            isSectionExpanded={isSectionExpanded}
            toggleSection={toggleSection}
          />
          <CombatTabSections
            lang="ko"
            settings={settings}
            onUpdate={onUpdate}
            isSectionExpanded={isSectionExpanded}
            toggleSection={toggleSection}
          />
          <EffectsTabSections
            lang="ko"
            settings={settings}
            onUpdate={onUpdate}
            isSectionExpanded={isSectionExpanded}
            toggleSection={toggleSection}
          />
        </>,
      );
    });

    expect(container.textContent).not.toContain('크기');
    expect(container.textContent).not.toContain('배치 방향');
  });

  it('resets layout tools through canonical itemLayouts instead of legacy positions', async () => {
    const settings = cloneSettings();
    const onUpdate = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <PresetsTabSections
          lang="ko"
          settings={settings}
          onUpdate={onUpdate}
          isSectionExpanded={() => true}
          toggleSection={() => {}}
        />,
      );
    });

    const resetButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.includes('위치 초기화'),
    );

    expect(resetButton).toBeTruthy();

    await act(async () => {
      resetButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdate).toHaveBeenCalledWith('positions', {}, { persist: false });
    expect(onUpdate).toHaveBeenCalledWith('layouts', {}, { persist: false });
    expect(onUpdate).toHaveBeenCalledWith('groupScales', {}, { persist: false });
    expect(onUpdate).toHaveBeenCalledWith('itemLayouts', {});
  });
});
