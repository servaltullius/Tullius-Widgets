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

function getByTestId(container: HTMLElement, testId: string): HTMLElement | null {
  return container.querySelector(`[data-testid="${testId}"]`);
}

function getToggleInputByLabel(container: HTMLElement, label: string): HTMLInputElement | null {
  const textNode = Array.from(container.querySelectorAll('span')).find(
    element => element.textContent === label,
  );
  const wrapper = textNode?.closest('label');
  return wrapper?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
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

  it('uses stage 2 progression wording while keeping canonical experience and level toggle paths', async () => {
    const settings = cloneSettings();
    const onUpdate = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <CombatTabSections
          lang="ko"
          settings={settings}
          onUpdate={onUpdate}
          isSectionExpanded={() => true}
          toggleSection={() => {}}
        />,
      );
    });

    expect(container.textContent).toContain('성장 진행도');
    expect(container.textContent).toContain('통합 진행 위젯');
    expect(container.textContent).toContain('별도 레벨 표시');
    expect(container.textContent).not.toContain('경험치 진행도');

    const progressionToggle = getToggleInputByLabel(container, '통합 진행 위젯');
    const standaloneLevelToggle = getToggleInputByLabel(container, '별도 레벨 표시');

    expect(progressionToggle).toBeTruthy();
    expect(standaloneLevelToggle).toBeTruthy();
    expect(progressionToggle?.style.width).toBe('30px');
    expect(progressionToggle?.style.height).toBe('30px');
    expect(progressionToggle?.style.appearance).toBe('none');

    await act(async () => {
      progressionToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      standaloneLevelToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdate).toHaveBeenCalledWith('itemLayouts.experience.progress.visible', false);
    expect(onUpdate).toHaveBeenCalledWith('itemLayouts.player.level.visible', true);
  });

  it('renders stage 1 display selectors and updates the correct settings paths', async () => {
    const settings = cloneSettings();
    const onUpdate = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <>
          <CombatTabSections
            lang="ko"
            settings={settings}
            onUpdate={onUpdate}
            isSectionExpanded={() => true}
            toggleSection={() => {}}
          />
          <EffectsTabSections
            lang="ko"
            settings={settings}
            onUpdate={onUpdate}
            isSectionExpanded={() => true}
            toggleSection={() => {}}
          />
        </>,
      );
    });

    const carryWeightSelect = getByTestId(container, 'carry-weight-display-select');
    const resistanceSelect = getByTestId(container, 'resistance-display-select');
    const gameTimeSelect = getByTestId(container, 'time-game-display-select');
    const realTimeSelect = getByTestId(container, 'time-real-display-select');
    const timedEffectsSelect = getByTestId(container, 'timed-effects-layout-select');

    expect(carryWeightSelect).toBeTruthy();
    expect(resistanceSelect).toBeTruthy();
    expect(gameTimeSelect).toBeTruthy();
    expect(realTimeSelect).toBeTruthy();
    expect(timedEffectsSelect).toBeTruthy();

    await act(async () => {
      carryWeightSelect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const meterOnlyOption = getByTestId(container, 'carry-weight-display-select-option-meterOnly');
    expect(meterOnlyOption).toBeTruthy();
    await act(async () => {
      meterOnlyOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      resistanceSelect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const rawOnlyOption = getByTestId(container, 'resistance-display-select-option-rawOnly');
    expect(rawOnlyOption).toBeTruthy();
    await act(async () => {
      rawOnlyOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      gameTimeSelect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const gameTimeOnlyOption = getByTestId(container, 'time-game-display-select-option-timeOnly');
    expect(gameTimeOnlyOption).toBeTruthy();
    await act(async () => {
      gameTimeOnlyOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      realTimeSelect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const realTimeOnlyOption = getByTestId(container, 'time-real-display-select-option-timeOnly');
    expect(realTimeOnlyOption).toBeTruthy();
    await act(async () => {
      realTimeOnlyOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      timedEffectsSelect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const horizontalOption = getByTestId(container, 'timed-effects-layout-select-option-horizontal');
    expect(horizontalOption).toBeTruthy();
    await act(async () => {
      horizontalOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdate).toHaveBeenCalledWith('playerInfo.carryWeightDisplay', 'meterOnly');
    expect(onUpdate).toHaveBeenCalledWith('resistances.displayMode', 'rawOnly');
    expect(onUpdate).toHaveBeenCalledWith('time.gameDisplay', 'timeOnly');
    expect(onUpdate).toHaveBeenCalledWith('time.realDisplay', 'timeOnly');
    expect(onUpdate).toHaveBeenCalledWith('timedEffects.listLayout', 'horizontal');
  });

  it('shows time display selectors only while the corresponding time widgets are enabled', async () => {
    const settings = cloneSettings();
    settings.time.gameDateTime = false;
    settings.time.realDateTime = false;
    settings.itemLayouts['time.game'] = {
      visible: false,
      x: 0,
      y: 0,
      scale: 1,
      locked: false,
      zIndex: 1,
    };
    settings.itemLayouts['time.real'] = {
      visible: false,
      x: 0,
      y: 0,
      scale: 1,
      locked: false,
      zIndex: 1,
    };

    await act(async () => {
      root = createRoot(container);
      root.render(
        <EffectsTabSections
          lang="ko"
          settings={settings}
          onUpdate={vi.fn()}
          isSectionExpanded={() => true}
          toggleSection={() => {}}
        />,
      );
    });

    expect(getByTestId(container, 'time-game-display-select')).toBeNull();
    expect(getByTestId(container, 'time-real-display-select')).toBeNull();

    settings.itemLayouts['time.game'] = { ...settings.itemLayouts['time.game'], visible: true };
    settings.itemLayouts['time.real'] = { ...settings.itemLayouts['time.real'], visible: true };

    await act(async () => {
      root?.render(
        <EffectsTabSections
          lang="ko"
          settings={settings}
          onUpdate={vi.fn()}
          isSectionExpanded={() => true}
          toggleSection={() => {}}
        />,
      );
    });

    expect(getByTestId(container, 'time-game-display-select')).toBeTruthy();
    expect(getByTestId(container, 'time-real-display-select')).toBeTruthy();
  });
});
