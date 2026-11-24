import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../data/defaultSettings';
import { mockStats } from '../data/mockStats';
import { resolveWidgetItemLayouts } from '../hooks/useWidgetItemLayouts';
import { getVisibleHudItemIds, resolveHudVisibility, type HudVisibilityHistory } from './hudPresentation';

function createInputs(): Parameters<typeof resolveHudVisibility>[0] {
  const settings = structuredClone(defaultSettings);
  settings.general.autoHide = {
    enabled: true,
    showInCombat: false,
    showWeaponDrawn: false,
    showSneaking: false,
    showResourcesNotFull: false,
    showOnChange: false,
    hideDelaySeconds: 3,
  };
  return {
    visible: true,
    hasLiveStats: true,
    general: settings.general,
    stats: structuredClone(mockStats),
    settingsOpen: false,
    itemLayouts: resolveWidgetItemLayouts({ settings, viewportWidth: 1920, viewportHeight: 1080 }),
    nowMs: 10_000,
    lastChangeAtByItem: {},
    previous: null,
  };
}

function remember(inputs: ReturnType<typeof createInputs>): HudVisibilityHistory {
  const { lastActiveAt, changeExpiresAt } = resolveHudVisibility(inputs);
  return { visible: inputs.visible, settingsOpen: inputs.settingsOpen, freeCamera: inputs.stats.freeCamera, lastActiveAt, changeExpiresAt };
}

describe('resolveHudVisibility', () => {
  it('requires live stats, then prioritizes editing, effective visibility, and free camera', () => {
    const inputs = createInputs();
    inputs.stats.freeCamera = true;
    expect(resolveHudVisibility({ ...inputs, hasLiveStats: false, settingsOpen: true })).toMatchObject({ render: false, opacity: 0 });
    expect(resolveHudVisibility({ ...inputs, settingsOpen: true, visible: false })).toMatchObject({ render: true, opacity: 1, itemMask: null });

    expect(resolveHudVisibility(inputs)).toMatchObject({ render: false, opacity: 0 });
    inputs.general.freeCameraDisplay = 'all';
    expect(resolveHudVisibility({ ...inputs, visible: false })).toMatchObject({ render: false });
    expect(resolveHudVisibility(inputs)).toMatchObject({ render: true, opacity: 1, itemMask: null, bypassShowWhen: null });

    inputs.stats.freeCamera = false;
    expect(resolveHudVisibility(inputs)).toMatchObject({ render: true, opacity: 0, lastActiveAt: null, nextCheckAt: null });
    inputs.general.autoHide.enabled = false;
    expect(resolveHudVisibility(inputs)).toMatchObject({ render: true, opacity: 1 });
  });

  it('applies vitals only to enabled resource widgets and preserves showWhen in all mode', () => {
    const inputs = createInputs();
    inputs.general.freeCameraDisplay = 'vitals';
    inputs.stats.freeCamera = true;
    inputs.itemLayouts['player.health'] = { ...inputs.itemLayouts['player.health'], visible: true, showWhen: 'combat' };
    inputs.itemLayouts['player.magicka'] = { ...inputs.itemLayouts['player.magicka'], visible: false };
    inputs.itemLayouts['player.stamina'] = { ...inputs.itemLayouts['player.stamina'], visible: true, showWhen: 'change' };
    const presence = { hudStyle: inputs.general.hudStyle, nowMs: inputs.nowMs, lastChangeAtByItem: {}, changeWindowMs: 4000 };
    const vitals = resolveHudVisibility(inputs);
    expect(vitals).toMatchObject({ render: true, opacity: 1, itemMask: new Set(['player.health', 'player.stamina']) });
    expect(getVisibleHudItemIds(inputs.itemLayouts, inputs.stats, false, presence, vitals)).toEqual(['player.health', 'player.stamina']);

    inputs.general.freeCameraDisplay = 'all';
    const all = getVisibleHudItemIds(inputs.itemLayouts, inputs.stats, false, presence, resolveHudVisibility(inputs));
    expect(all).toContain('player.gold');
    expect(all).not.toContain('player.health');
    expect(all).not.toContain('player.stamina');
  });

  it.each([
    ['showInCombat', 'isInCombat'],
    ['showWeaponDrawn', 'weaponDrawn'],
    ['showSneaking', 'sneaking'],
  ] as const)('shows for %s independently of the other conditions', (condition, stat) => {
    const inputs = createInputs();
    inputs.stats[stat] = true;
    expect(resolveHudVisibility(inputs).opacity).toBe(0);
    inputs.general.autoHide[condition] = true;
    expect(resolveHudVisibility(inputs)).toMatchObject({ opacity: 1, lastActiveAt: inputs.nowMs });
  });

  it.each(['healthPct', 'magickaPct', 'staminaPct'] as const)('uses 99.5 as the full threshold for %s', stat => {
    const inputs = createInputs();
    inputs.general.autoHide.showResourcesNotFull = true;
    inputs.stats.alertData[stat] = 99.5;
    expect(resolveHudVisibility(inputs).opacity).toBe(0);
    inputs.stats.alertData[stat] = 99.49;
    expect(resolveHudVisibility(inputs).opacity).toBe(1);
  });

  it('uses the newest enabled widget change, then measures the hide delay from its expiry', () => {
    const inputs = createInputs();
    inputs.general.autoHide.showOnChange = true;
    inputs.lastChangeAtByItem = { 'player.gold': 7000, 'resistance.fire': 8000, 'player.health': 9000 };
    inputs.itemLayouts['player.health'].visible = false;
    expect(resolveHudVisibility(inputs)).toMatchObject({ opacity: 1, nextCheckAt: 12_000 });
    const previous = remember(inputs);
    expect(resolveHudVisibility({ ...inputs, previous, nowMs: 12_001 })).toMatchObject({
      opacity: 1, lastActiveAt: 12_000, nextCheckAt: 15_000,
    });
    expect(resolveHudVisibility({ ...inputs, previous, nowMs: 15_000 })).toMatchObject({ opacity: 0, nextCheckAt: null });
  });

  it.each([0, 3, 30])('uses a %s-second delay with an exclusive end and shows immediately on reactivation', delay => {
    const inputs = createInputs();
    inputs.general.autoHide.showInCombat = true;
    inputs.general.autoHide.hideDelaySeconds = delay;
    inputs.stats.isInCombat = true;
    const previous = remember(inputs);
    inputs.stats.isInCombat = false;
    const expiresAt = inputs.nowMs + delay * 1000;
    if (delay > 0) {
      expect(resolveHudVisibility({ ...inputs, previous, nowMs: expiresAt - 1 }).opacity).toBe(1);
    }
    expect(resolveHudVisibility({ ...inputs, previous, nowMs: expiresAt })).toMatchObject({ opacity: 0, nextCheckAt: null });
    inputs.stats.isInCombat = true;
    expect(resolveHudVisibility({ ...inputs, previous, nowMs: expiresAt + 1 })).toMatchObject({ opacity: 1, lastActiveAt: expiresAt + 1 });
  });

  it.each([
    ['settings close', { settingsOpen: true }],
    ['visibility returns', { visible: false }],
    ['free camera exits', { freeCamera: true }],
  ] as const)('restarts the delay when %s', (_, transition) => {
    const inputs = createInputs();
    const previous = { ...remember(inputs), ...transition };
    expect(resolveHudVisibility({ ...inputs, previous })).toMatchObject({
      opacity: 1, lastActiveAt: inputs.nowMs, nextCheckAt: inputs.nowMs + 3000,
    });
  });
});
