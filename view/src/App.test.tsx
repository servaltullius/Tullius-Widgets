// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { defaultSettings } from './data/defaultSettings';
import { createSelectedItemLayoutActions } from './hooks/useSelectedItemLayoutActions';
import { resolveWidgetItemLayouts } from './hooks/useWidgetItemLayouts';
import type { WidgetSettings } from './types/settings';
import { resolveFontPresetVariables } from './utils/fontPresets';

function cloneSettings(): WidgetSettings {
  return structuredClone(defaultSettings);
}

describe('App item layout actions', () => {
  it('resolves CSS font variables from the selected preset', () => {
    const defaultVariables = resolveFontPresetVariables('default');
    const readableVariables = resolveFontPresetVariables('readable');

    expect(defaultVariables['--tw-font-ui']).toContain('Segoe UI');
    expect(defaultVariables['--tw-font-hud']).toContain('Segoe UI');
    expect(readableVariables['--tw-font-ui']).toContain('Noto Sans KR');
    expect(readableVariables['--tw-font-hud']).toContain('Noto Sans KR');
    expect(readableVariables['--tw-font-ui']).not.toBe(defaultVariables['--tw-font-ui']);
  });

  it('updates selected item visibility, scale, and lock through canonical itemLayouts paths', () => {
    const settings = cloneSettings();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    itemLayouts['player.level'] = {
      ...itemLayouts['player.level'],
      visible: true,
    };
    const updateSetting = vi.fn();

    const actions = createSelectedItemLayoutActions({
      selectedItemId: 'player.level',
      itemLayouts,
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
      updateSetting,
    });

    actions.setSelectedItemVisible(false);
    actions.setSelectedItemScale(1.55);
    actions.setSelectedItemLocked(true);

    expect(updateSetting).toHaveBeenNthCalledWith(1, 'itemLayouts.player.level.visible', false);
    expect(updateSetting).toHaveBeenNthCalledWith(2, 'itemLayouts.player.level.scale', 1.55);
    expect(updateSetting).toHaveBeenNthCalledWith(3, 'itemLayouts.player.level.locked', true);
  });

  it('resets the selected item position without changing scale, lock, or zIndex', () => {
    const settings = cloneSettings();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1440,
      viewportHeight: 900,
    });
    const updateSetting = vi.fn();
    const original = itemLayouts['time.real'];
    const currentLayouts = {
      ...itemLayouts,
      'time.real': {
        ...original,
        x: original.x + 180,
        y: original.y + 120,
        scale: 2,
        locked: true,
        zIndex: 77,
      },
    };

    const actions = createSelectedItemLayoutActions({
      selectedItemId: 'time.real',
      itemLayouts: currentLayouts,
      settings,
      viewportWidth: 1440,
      viewportHeight: 900,
      updateSetting,
    });

    actions.resetSelectedItemPosition();

    expect(updateSetting).toHaveBeenCalledWith('itemLayouts', {
      ...currentLayouts,
      'time.real': {
        ...currentLayouts['time.real'],
        x: original.x,
        y: original.y,
        viewportWidth: 1440,
        viewportHeight: 900,
      },
    });
  });

  it('reorders visible selected items but blocks reorder when hidden or locked', () => {
    const settings = cloneSettings();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    const updateSetting = vi.fn();
    for (const [index, itemId] of Object.keys(itemLayouts).entries()) {
      itemLayouts[itemId] = { ...itemLayouts[itemId], visible: false, zIndex: index + 100 };
    }
    const layouts = {
      ...itemLayouts,
      'player.level': { ...itemLayouts['player.level'], visible: true, zIndex: 0, locked: false },
      'player.gold': { ...itemLayouts['player.gold'], visible: false, zIndex: 1, locked: false },
      'player.carryWeight': { ...itemLayouts['player.carryWeight'], visible: true, zIndex: 2, locked: false },
    };

    const visibleActions = createSelectedItemLayoutActions({
      selectedItemId: 'player.level',
      itemLayouts: layouts,
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
      updateSetting,
    });
    visibleActions.bringSelectedItemForward();

    expect(updateSetting).toHaveBeenCalledWith(
      'itemLayouts',
      expect.objectContaining({
        'player.carryWeight': expect.objectContaining({ zIndex: 0 }),
        'player.gold': expect.objectContaining({ zIndex: 1 }),
        'player.level': expect.objectContaining({ zIndex: 2 }),
      }),
    );

    updateSetting.mockClear();

    const hiddenActions = createSelectedItemLayoutActions({
      selectedItemId: 'player.gold',
      itemLayouts: layouts,
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
      updateSetting,
    });
    hiddenActions.setSelectedItemVisible(true);
    expect(updateSetting).toHaveBeenCalledWith('itemLayouts.player.gold.visible', true);

    updateSetting.mockClear();
    hiddenActions.bringSelectedItemForward();
    expect(updateSetting).not.toHaveBeenCalled();

    const lockedActions = createSelectedItemLayoutActions({
      selectedItemId: 'player.carryWeight',
      itemLayouts: {
        ...layouts,
        'player.carryWeight': { ...layouts['player.carryWeight'], locked: true },
      },
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
      updateSetting,
    });
    lockedActions.sendSelectedItemBackward();
    expect(updateSetting).not.toHaveBeenCalled();
  });

  it('nudges the selected item through canonical itemLayouts updates', () => {
    const settings = cloneSettings();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });
    const updateSetting = vi.fn();
    const original = itemLayouts['player.level'];

    const actions = createSelectedItemLayoutActions({
      selectedItemId: 'player.level',
      itemLayouts,
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
      updateSetting,
    });
    actions.nudgeSelectedItem(1, -1);

    expect(updateSetting).toHaveBeenCalledWith('itemLayouts', {
      ...itemLayouts,
      'player.level': {
        ...original,
        x: original.x + 1,
        y: original.y - 1,
        viewportWidth: 1920,
        viewportHeight: 1080,
      },
    });
  });
});
