// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { defaultSettings } from '../../data/defaultSettings';
import { normalizeUserFonts } from '../../data/userFonts';
import { resolveWidgetItemLayouts } from '../../data/widgetItemRegistry';
import { UserFontsContext } from '../../hooks/useUserFonts';
import { updateValueByPath } from '../../hooks/settingsShared';
import { t } from '../../i18n/translations';
import type { WidgetSettings } from '../../types/settings';
import { CombatTabSections, EffectsTabSections, GeneralTabSections, PresetsTabSections } from './SettingsTabSections';

function cloneSettings(): WidgetSettings {
  return structuredClone(defaultSettings);
}

function getByTestId(container: HTMLElement, testId: string): HTMLElement | null {
  return container.querySelector(`[data-testid="${testId}"]`);
}

function getByTestIdFromDocument(testId: string): HTMLElement | null {
  return document.querySelector(`[data-testid="${testId}"]`);
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

  it('offers the weather and time-played toggles in the time section', async () => {
    const settings = cloneSettings();
    const onUpdate = vi.fn();
    await act(async () => {
      root = createRoot(container);
      root.render(
        <EffectsTabSections lang="ko" settings={settings} onUpdate={onUpdate} isSectionExpanded={() => true} toggleSection={() => {}} />,
      );
    });
    const playtime = getToggleInputByLabel(container, '누적 플레이 시간');
    expect(getToggleInputByLabel(container, '날씨')).not.toBeNull();
    expect(playtime).not.toBeNull();
    await act(async () => {
      playtime!.click();
    });
    expect(onUpdate.mock.calls.some(call => String(call[0]).includes('playtime'))).toBe(true);
  });

  it('renders the font preset selector and updates the general fontPreset path', async () => {
    const settings = cloneSettings();
    const onUpdate = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <GeneralTabSections
          lang="ko"
          settings={settings}
          selectedLanguage="ko"
          effectiveVisible={settings.general.visible}
          onUpdate={onUpdate}
          accentColor="#ffffff"
          availableLanguages={[{ code: 'ko', label: '한국어', file: 'ko.json' }]}
          isSectionExpanded={() => true}
          toggleSection={() => {}}
        />,
      );
    });

    const fontPresetSelect = getByTestId(container, 'font-preset-select');
    expect(fontPresetSelect).toBeTruthy();

    await act(async () => {
      fontPresetSelect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const readableOption = getByTestIdFromDocument('font-preset-select-option-readable');
    expect(readableOption).toBeTruthy();

    await act(async () => {
      readableOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdate).toHaveBeenCalledWith('general.fontPreset', 'readable');
  });

  it('exposes auto-hide controls and explains when the free-camera vitals selection is empty', async () => {
    let settings = cloneSettings();
    settings.itemLayouts = resolveWidgetItemLayouts({ settings, viewportWidth: 1920, viewportHeight: 1080 });
    const render = () => root?.render(
      <GeneralTabSections
        lang="ko"
        settings={settings}
        selectedLanguage="ko"
        effectiveVisible
        onUpdate={onUpdate}
        accentColor="#fff"
        availableLanguages={[]}
        isSectionExpanded={() => true}
        toggleSection={() => {}}
      />,
    );
    const onUpdate = vi.fn((path: string, value: unknown) => {
      settings = updateValueByPath(settings, path, value);
      render();
    });
    const findSlider = (label: string) => Array.from(container.querySelectorAll('label'))
      .find(element => element.textContent?.startsWith(label))?.querySelector('input[type="range"]');

    await act(async () => {
      root = createRoot(container);
      render();
    });
    expect(findSlider(t('ko', 'changeDisplaySeconds'))).toBeTruthy();
    expect(findSlider(t('ko', 'hideDelaySeconds'))).toBeUndefined();
    expect(getToggleInputByLabel(container, t('ko', 'autoHideInCombat'))).toBeFalsy();
    await act(async () => getToggleInputByLabel(container, t('ko', 'autoHide'))?.click());
    expect(onUpdate).toHaveBeenCalledWith('general.autoHide.enabled', true);
    for (const key of ['autoHideInCombat', 'autoHideWeaponDrawn', 'autoHideSneaking', 'autoHideResourcesNotFull', 'autoHideOnChange'] as const) {
      expect(getToggleInputByLabel(container, t('ko', key))).toBeTruthy();
    }
    await act(async () => getToggleInputByLabel(container, t('ko', 'autoHideSneaking'))?.click());
    expect(onUpdate).toHaveBeenCalledWith('general.autoHide.showSneaking', true);
    expect(findSlider(t('ko', 'hideDelaySeconds'))?.getAttribute('min')).toBe('0');
    expect(findSlider(t('ko', 'hideDelaySeconds'))?.getAttribute('max')).toBe('30');

    await act(async () => getByTestId(container, 'free-camera-display-select')?.click());
    await act(async () => getByTestIdFromDocument('free-camera-display-select-option-vitals')?.click());
    expect(onUpdate).toHaveBeenCalledWith('general.freeCameraDisplay', 'vitals');
    expect(container.textContent).toContain(t('ko', 'freeCameraNoVitals'));
    await act(async () => {
      settings = updateValueByPath(settings, 'itemLayouts.player.health.visible', true);
      render();
    });
    expect(container.textContent).not.toContain(t('ko', 'freeCameraNoVitals'));
  });

  describe('user fonts', () => {
    const fonts = normalizeUserFonts(JSON.stringify({ fonts: [{ id: "King's Font", files: ['Font.ttf'] }] }));

    async function renderFonts(savedFont: string, status: 'none' | 'ready' | 'missing' | 'failed') {
      const settings = cloneSettings();
      settings.general.userFont = savedFont;
      const onUpdate = vi.fn();
      await act(async () => {
        root = createRoot(container);
        root.render(
          <UserFontsContext.Provider value={{ fonts, status }}>
            <GeneralTabSections
              lang="ko"
              settings={settings}
              selectedLanguage="ko"
              effectiveVisible
              onUpdate={onUpdate}
              accentColor="#fff"
              availableLanguages={[]}
              isSectionExpanded={() => true}
              toggleSection={() => {}}
            />
          </UserFontsContext.Provider>,
        );
      });
      return onUpdate;
    }

    async function chooseFont(value: string) {
      await act(async () => getByTestId(container, 'font-preset-select')!.click());
      const option = getByTestIdFromDocument(`font-preset-select-option-${value}`);
      expect(option).not.toBeNull();
      await act(async () => option!.click());
    }

    it('saves only the discovered folder when a user font is chosen', async () => {
      const onUpdate = await renderFonts('', 'none');
      expect(container.textContent).toContain(t('ko', 'userFontHint'));
      await chooseFont("user-font:King's Font");
      expect(onUpdate.mock.calls).toEqual([['general.userFont', "King's Font"]]);
    });

    it('displays the discovered case and persists the two changes when choosing a preset', async () => {
      const onUpdate = await renderFonts("king's font", 'ready');
      expect(getByTestId(container, 'font-preset-select')?.textContent).toContain("사용자 글꼴: King's Font");
      await chooseFont('readable');
      expect(onUpdate.mock.calls).toEqual([
        ['general.fontPreset', 'readable', { persist: false }],
        ['general.userFont', ''],
      ]);
    });

    it('shows the preset and the saved name when the folder is missing', async () => {
      const onUpdate = await renderFonts('Missing Font', 'missing');
      expect(getByTestId(container, 'font-preset-select')?.textContent).toContain(t('ko', 'fontPresetDefault'));
      expect(container.textContent).toContain(t('ko', 'userFontMissing').replace('{name}', 'Missing Font'));
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('keeps the installed font selected and explains a load failure', async () => {
      const onUpdate = await renderFonts("King's Font", 'failed');
      expect(getByTestId(container, 'font-preset-select')?.textContent).toContain("사용자 글꼴: King's Font");
      expect(container.textContent).toContain(t('ko', 'userFontLoadFailed').replace('{name}', "King's Font"));
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  it('switches the HUD style and moves widgets to that style\'s default layout', async () => {
    const settings = cloneSettings();
    const onUpdate = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <GeneralTabSections
          lang="ko"
          settings={settings}
          selectedLanguage="ko"
          effectiveVisible={settings.general.visible}
          onUpdate={onUpdate}
          accentColor="#ffffff"
          availableLanguages={[{ code: 'ko', label: '한국어', file: 'ko.json' }]}
          isSectionExpanded={() => true}
          toggleSection={() => {}}
        />,
      );
    });

    const hudStyleSelect = getByTestId(container, 'hud-style-select');
    expect(hudStyleSelect?.textContent).toContain('컴팩트');

    await act(async () => {
      hudStyleSelect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      getByTestIdFromDocument('hud-style-select-option-classic')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // The icon style applies to both styles (compact has its own Dororong set).
    expect(getByTestId(container, 'icon-theme-select')).not.toBeNull();
    expect(onUpdate).toHaveBeenCalledWith('general.hudStyle', 'classic', { persist: false });
    const itemLayoutsCall = onUpdate.mock.calls.find(call => call[0] === 'itemLayouts');
    expect(itemLayoutsCall?.[1]['experience.progress']).toMatchObject({ x: 1530, y: 60 });
  });

  it('saves the current arrangement to a layout slot and loads it back', async () => {
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

    const load = container.querySelector('[data-layout-slot-load="0"]') as HTMLButtonElement;
    expect(load.disabled).toBe(true);

    await act(async () => {
      (container.querySelector('[data-layout-slot-save="0"]') as HTMLButtonElement).click();
    });
    const saveCall = onUpdate.mock.calls.find(call => call[0] === 'layoutSlots');
    const savedSlots = saveCall?.[1];
    expect(savedSlots[0]).toMatchObject({ hudStyle: 'compact', compactAnchor: 'bottomLeft', size: 'medium' });
    expect(savedSlots[0].itemLayouts['experience.progress']).toMatchObject({ viewportWidth: window.innerWidth, viewportHeight: window.innerHeight });

    onUpdate.mockClear();
    const withSlot = { ...settings, layoutSlots: savedSlots };
    await act(async () => {
      root!.render(
        <PresetsTabSections
          lang="ko"
          settings={withSlot}
          onUpdate={onUpdate}
          isSectionExpanded={() => true}
          toggleSection={() => {}}
        />,
      );
    });
    await act(async () => {
      (container.querySelector('[data-layout-slot-load="0"]') as HTMLButtonElement).click();
    });
    // The first click only asks for confirmation.
    expect(onUpdate).not.toHaveBeenCalled();
    expect(container.querySelector('[data-layout-slot-load="0"]')?.textContent).toContain('한 번 더');
    await act(async () => {
      (container.querySelector('[data-layout-slot-load="0"]') as HTMLButtonElement).click();
    });
    expect(onUpdate).toHaveBeenCalledWith('general.hudStyle', 'compact', { persist: false });
    expect(onUpdate).toHaveBeenCalledWith('general.size', 'medium', { persist: false });
    expect(onUpdate).toHaveBeenCalledWith('itemLayouts', savedSlots[0].itemLayouts);
    const loadedLayouts = onUpdate.mock.calls.find(call => call[0] === 'itemLayouts')?.[1];
    expect(loadedLayouts).not.toBe(savedSlots[0].itemLayouts);
  });

  it('moves compact widgets to the roomier layout when the Dororong icons are chosen', async () => {
    const settings = cloneSettings();
    const onUpdate = vi.fn();
    await act(async () => {
      root = createRoot(container);
      root.render(
        <GeneralTabSections
          lang="ko"
          settings={settings}
          selectedLanguage="ko"
          effectiveVisible={settings.general.visible}
          onUpdate={onUpdate}
          accentColor="#ffffff"
          availableLanguages={[{ code: 'ko', label: '한국어', file: 'ko.json' }]}
          isSectionExpanded={() => true}
          toggleSection={() => {}}
        />,
      );
    });
    await act(async () => {
      getByTestId(container, 'icon-theme-select')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      getByTestIdFromDocument('icon-theme-select-option-dororong')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onUpdate).toHaveBeenCalledWith('general.iconTheme', 'dororong', { persist: false });
    const layouts = onUpdate.mock.calls.find(call => call[0] === 'itemLayouts')?.[1];
    expect(layouts['resistance.fire'].x - layouts['resistance.magic'].x).toBe(90);
  });

  it('rebuilds the compact cluster at the chosen size', async () => {
    const settings = cloneSettings();
    const onUpdate = vi.fn();
    await act(async () => {
      root = createRoot(container);
      root.render(
        <PresetsTabSections lang="ko" settings={settings} onUpdate={onUpdate} isSectionExpanded={() => true} toggleSection={() => {}} />,
      );
    });
    await act(async () => {
      getByTestId(container, 'compact-size-select')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      getByTestIdFromDocument('compact-size-select-option-large')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onUpdate).toHaveBeenCalledWith('general.size', 'large', { persist: false });
    const itemLayoutsCall = onUpdate.mock.calls.find(call => call[0] === 'itemLayouts');
    expect(itemLayoutsCall?.[1]['experience.progress'].scale).toBe(1.18);
  });

  it('lets an unanswered slot load confirmation lapse', async () => {
    vi.useFakeTimers();
    try {
      const settings = cloneSettings();
      settings.layoutSlots = [
        { savedAt: 0, hudStyle: 'compact', compactAnchor: 'bottomLeft', itemLayouts: {} },
        null,
        null,
      ];
      const onUpdate = vi.fn();
      await act(async () => {
        root = createRoot(container);
        root.render(
          <PresetsTabSections lang="ko" settings={settings} onUpdate={onUpdate} isSectionExpanded={() => true} toggleSection={() => {}} />,
        );
      });
      const load = () => container.querySelector('[data-layout-slot-load="0"]') as HTMLButtonElement;
      await act(async () => { load().click(); });
      expect(load().textContent).toContain('한 번 더');
      await act(async () => { vi.advanceTimersByTime(5000); });
      expect(load().textContent).not.toContain('한 번 더');
      await act(async () => { load().click(); });
      expect(onUpdate).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('updates the icon theme and exposes the badge toggle for Dororong icons', async () => {
    const settings = cloneSettings();
    settings.general.hudStyle = 'classic';
    const onUpdate = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <GeneralTabSections
          lang="ko"
          settings={settings}
          selectedLanguage="ko"
          effectiveVisible={settings.general.visible}
          onUpdate={onUpdate}
          accentColor="#ffffff"
          availableLanguages={[{ code: 'ko', label: '한국어', file: 'ko.json' }]}
          isSectionExpanded={() => true}
          toggleSection={() => {}}
        />,
      );
    });

    const iconThemeSelect = getByTestId(container, 'icon-theme-select');
    expect(iconThemeSelect).toBeTruthy();
    expect(getToggleInputByLabel(container, '아이콘 위 보조 뱃지')).toBeFalsy();

    await act(async () => {
      iconThemeSelect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const dororongOption = getByTestIdFromDocument('icon-theme-select-option-dororong');
    expect(dororongOption).toBeTruthy();
    await act(async () => {
      dororongOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onUpdate).toHaveBeenCalledWith('general.iconTheme', 'dororong');

    settings.general.iconTheme = 'dororong';
    settings.general.showIconBadges = true;
    await act(async () => {
      root?.render(
        <GeneralTabSections
          lang="ko"
          settings={settings}
          selectedLanguage="ko"
          effectiveVisible={settings.general.visible}
          onUpdate={onUpdate}
          accentColor="#ffffff"
          availableLanguages={[{ code: 'ko', label: '한국어', file: 'ko.json' }]}
          isSectionExpanded={() => true}
          toggleSection={() => {}}
        />,
      );
    });

    const badgeToggle = getToggleInputByLabel(container, '아이콘 위 보조 뱃지');
    expect(badgeToggle).toBeTruthy();
    await act(async () => {
      badgeToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onUpdate).toHaveBeenCalledWith('general.showIconBadges', false);
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
    const meterOnlyOption = getByTestIdFromDocument('carry-weight-display-select-option-meterOnly');
    expect(meterOnlyOption).toBeTruthy();
    await act(async () => {
      meterOnlyOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      resistanceSelect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const rawOnlyOption = getByTestIdFromDocument('resistance-display-select-option-rawOnly');
    expect(rawOnlyOption).toBeTruthy();
    await act(async () => {
      rawOnlyOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      gameTimeSelect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const gameTimeOnlyOption = getByTestIdFromDocument('time-game-display-select-option-timeOnly');
    expect(gameTimeOnlyOption).toBeTruthy();
    await act(async () => {
      gameTimeOnlyOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      realTimeSelect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const realTimeOnlyOption = getByTestIdFromDocument('time-real-display-select-option-timeOnly');
    expect(realTimeOnlyOption).toBeTruthy();
    await act(async () => {
      realTimeOnlyOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      timedEffectsSelect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const horizontalOption = getByTestIdFromDocument('timed-effects-layout-select-option-horizontal');
    expect(horizontalOption).toBeTruthy();
    expect(container.contains(horizontalOption!)).toBe(false);
    await act(async () => {
      horizontalOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdate).toHaveBeenCalledWith('playerInfo.carryWeightDisplay', 'meterOnly');
    expect(onUpdate).toHaveBeenCalledWith('resistances.displayMode', 'rawOnly');
    expect(onUpdate).toHaveBeenCalledWith('time.gameDisplay', 'timeOnly');
    expect(onUpdate).toHaveBeenCalledWith('time.realDisplay', 'timeOnly');
    expect(onUpdate).toHaveBeenCalledWith('timedEffects.listLayout', 'horizontal');
  });

  it('renders the voice equipped toggle and updates the canonical item visibility path', async () => {
    const settings = cloneSettings();
    settings.equipped.voice = false;
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

    const voiceToggle = getToggleInputByLabel(container, '포효/파워');
    expect(voiceToggle).toBeTruthy();

    await act(async () => {
      voiceToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdate).toHaveBeenCalledWith('itemLayouts.equipped.voice.visible', true);
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
