// The browser tests in view/e2e, rewritten to run inside the page so the same checks can run in
// the game's engine. Each scenario names the e2e test it follows; keep the two in step.

import {
  boxOf,
  byTestId,
  check,
  checkClose,
  click,
  clickAt,
  drag,
  isShown,
  nextFrame,
  overlaps,
  pathBetween,
  press,
  query,
  roundBox,
  sleep,
  textOf,
  waitFor,
  widget,
  type Box,
} from './driver';

export interface ScenarioContext {
  /** A fresh app given these saved settings (or this raw text), then a first stats update. */
  openHud(settings: object | string): Promise<void>;
  sendStats(stats: object): void;
  /** Opens the settings window on a category (its `data-category`). */
  openSettings(category: string): Promise<void>;
  /** Every settings save the page tried to send in this scenario, oldest first. */
  saves(): Array<Record<string, unknown>>;
  /** A value to keep in the report, for reading a failure afterwards. */
  record(name: string, value: unknown): void;
}

export interface Scenario {
  id: string;
  name: string;
  run(context: ScenarioContext): Promise<void>;
}

const COMPACT = { general: { onboardingSeen: true, hudStyle: 'compact', iconTheme: 'standard', language: 'ko' } };
const EFFECTS = 'effects';

/** Timed effects as the plugin reports them; only the first one is harmful. */
export function makeEffects(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    instanceId: 500 + index,
    sourceName: `Effect ${index}`,
    effectName: `Effect ${index}`,
    remainingSec: 40 + index * 10,
    totalSec: 300,
    isDebuff: index === 0,
    sourceFormId: 0x100 + index,
    effectFormId: 0x200 + index,
    spellFormId: 0x300 + index,
    category: 'armor',
    magnitude: 10,
  }));
}

function shownWidget(itemId: string): Promise<HTMLElement> {
  return waitFor(`${itemId} on screen`, () => {
    const element = widget(itemId);
    return isShown(element) ? element : null;
  });
}

function rowsOf(list: Element, rowSelector: string): HTMLElement[] {
  return Array.from(list.querySelectorAll<HTMLElement>(rowSelector));
}

async function effectRows(count: number, rowSelector = '.tw-ceffect-row'): Promise<HTMLElement[]> {
  return waitFor(`${count} effect rows`, () => {
    const list = widget('timedEffects.list');
    const rows = list ? rowsOf(list, rowSelector) : [];
    return rows.length === count ? rows : null;
  });
}

function rowNamed(rows: HTMLElement[], name: string): HTMLElement {
  const row = rows.find(candidate => textOf(candidate).includes(name));
  check(row !== undefined, `no row for ${name}`);
  return row;
}

function listBox(): Box {
  const list = widget('timedEffects.list');
  check(list !== null, 'the effect list is not on the page');
  return boxOf(list);
}

async function growDirection(direction: 'up' | 'down'): Promise<void> {
  const option = await waitFor(`the grow ${direction} option`, () => {
    const element = byTestId(`timed-effects-grow-select-option-${direction}`);
    return isShown(element) ? element : null;
  });
  await click(option, `the grow ${direction} option`);
  await waitFor(`the list growing ${direction}`, () =>
    query('[data-widget-item-id="timedEffects.list"] .tw-ceffect-list, [data-widget-item-id="timedEffects.list"] .tw-effect-list')
      ?.getAttribute('data-grow') === direction);
  await nextFrame();
}

function lastSavedLayoutY(context: ScenarioContext, itemId: string): number | null {
  const saves = context.saves();
  const layouts = saves[saves.length - 1]?.itemLayouts as Record<string, { y?: number }> | undefined;
  const y = layouts?.[itemId]?.y;
  return typeof y === 'number' ? y : null;
}

// --- effectsGrowUp.e2e.ts ---

const switchingKeepsTheListInPlace: Scenario = {
  id: 'grow-up/switch-in-place',
  name: 'switching direction keeps the list in place and puts the most pressing effect at the bottom',
  async run(context) {
    await context.openHud(COMPACT);
    context.sendStats({ timedEffects: makeEffects(3) });
    await effectRows(3);
    const down = listBox();
    context.record('down', roundBox(down));

    await context.openSettings(EFFECTS);
    await growDirection('up');
    const up = listBox();
    context.record('up', roundBox(up));
    checkClose(up.top, down.top, 'top after switching up');
    checkClose(up.bottom, down.bottom, 'bottom after switching up');

    const rows = await effectRows(3);
    const harmful = boxOf(rowNamed(rows, 'Effect 0'));
    for (const name of ['Effect 1', 'Effect 2']) {
      check(boxOf(rowNamed(rows, name)).top < harmful.top, `${name} is not above the harmful effect`);
    }

    context.sendStats({ timedEffects: makeEffects(1) });
    await effectRows(1);
    const one = listBox();
    context.record('one', roundBox(one));
    checkClose(one.bottom, up.bottom, 'bottom with one effect');
    check(one.top > up.top, 'the top did not come down with fewer effects');

    context.sendStats({ timedEffects: makeEffects(3) });
    await effectRows(3);
    await growDirection('down');
    const back = listBox();
    context.record('back', roundBox(back));
    checkClose(back.top, down.top, 'top after switching back down');
  },
};

const rightCornerMovesNothingElse: Scenario = {
  id: 'grow-up/right-corner',
  name: 'switching direction in a right-hand corner moves no other widget, even one switched on later',
  async run(context) {
    const corner = { general: { ...COMPACT.general, compactAnchor: 'bottomRight' }, playerInfo: { level: true } };
    await context.openHud({ ...corner, resistances: { disease: true } });
    const diseaseInCluster = boxOf(await shownWidget('resistance.disease'));
    context.record('diseaseInCluster', roundBox(diseaseInCluster));

    await context.openHud(corner);
    context.sendStats({ timedEffects: makeEffects(3) });
    await effectRows(3);
    const levelBefore = boxOf(await shownWidget('player.level'));
    const listBefore = listBox();

    await context.openSettings(EFFECTS);
    await growDirection('up');
    const levelAfter = boxOf(await shownWidget('player.level'));
    context.record('level', { before: roundBox(levelBefore), after: roundBox(levelAfter) });
    checkClose(levelAfter.left, levelBefore.left, 'level widget left');
    checkClose(levelAfter.top, levelBefore.top, 'level widget top');
    const listAfter = listBox();
    checkClose(listAfter.left, listBefore.left, 'list left');
    checkClose(listAfter.bottom, listBefore.bottom, 'list bottom');

    await context.openSettings('combat');
    const toggle = await waitFor('the disease toggle', () =>
      Array.from(document.querySelectorAll<HTMLElement>('label.tw-p-toggle-row')).find(label => textOf(label).includes('질병')));
    await click(toggle, 'the disease toggle');
    const diseaseShown = boxOf(await shownWidget('resistance.disease'));
    context.record('diseaseShown', roundBox(diseaseShown));
    checkClose(diseaseShown.left, diseaseInCluster.left, 'disease widget left');
    checkClose(diseaseShown.top, diseaseInCluster.top, 'disease widget top');
  },
};

const undoAfterSwitching: Scenario = {
  id: 'grow-up/undo-after-switch',
  name: 'undo right after switching direction does not move the list',
  async run(context) {
    await context.openHud(COMPACT);
    context.sendStats({ timedEffects: makeEffects(3) });
    await effectRows(3);
    await context.openSettings(EFFECTS);

    // First, Ctrl+Z does undo a layout edit here, so a key that undoes nothing below is the
    // history starting over, not the key missing the page. (The layout history takes the key,
    // preventing its default, only when it undid something.)
    const before = listBox();
    const list = widget('timedEffects.list');
    check(list !== null, 'the effect list is not on the page');
    await clickAt({ x: before.left + 40, y: (before.top + before.bottom) / 2 }, list, 'the effect list');
    // A real click there would also take the focus off any control, which keeps the arrows.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    check(await press('ArrowDown', { target: document.body }), 'the arrow key did not nudge the selected list');
    await waitFor('the nudge to move the list', () => listBox().top > before.top + 0.5);
    check(await press('z', { ctrlKey: true, target: document.body }), 'Ctrl+Z did not undo the nudge');
    await waitFor('the undo to bring the list back', () => Math.abs(listBox().top - before.top) <= 1);

    // Switching direction starts the history over (the list's y is now its other edge), so
    // Ctrl+Z right after has nothing to undo and the list stays where it is.
    await growDirection('up');
    const switched = listBox();
    const undone = await press('z', { ctrlKey: true, target: document.body });
    await nextFrame();
    const afterUndo = listBox();
    context.record('list', { before: roundBox(before), switched: roundBox(switched), afterUndo: roundBox(afterUndo), undone });
    check(!undone, 'Ctrl+Z undid a layout from before the switch');
    checkClose(afterUndo.top, switched.top, 'top after undo');
    checkClose(afterUndo.bottom, switched.bottom, 'bottom after undo');
  },
};

const dragSnapsByRealEdges: Scenario = {
  id: 'grow-up/drag-snap',
  name: 'a list growing up snaps by its real edges when dragged, is saved by its bottom edge, and says so in its card',
  async run(context) {
    await context.openHud({ ...COMPACT, playerInfo: { level: true }, timedEffects: { growDirection: 'up' } });
    context.sendStats({ timedEffects: makeEffects(2) });
    await effectRows(2);
    await context.openSettings(EFFECTS);

    const list = widget('timedEffects.list');
    check(list !== null, 'the effect list is not on the page');
    const start = boxOf(list);
    const level = boxOf(await shownWidget('player.level'));
    // The list's top edge dropped 3px below the level widget's top should snap to it.
    const grab = { x: start.left + 40, y: (start.top + start.bottom) / 2 };
    const lifted = { x: grab.x, y: grab.y - 20 };
    const drop = { x: grab.x, y: grab.y + (level.top + 3 - start.top) };
    await drag(grab, [...pathBetween(grab, lifted, 4), ...pathBetween(lifted, drop, 10)], list, 'the effect list');

    const nudge = await waitFor('the quick-edit card', () => query('[data-quick-edit-nudge-y="+1"]'));
    check(nudge.getAttribute('aria-label') === 'Y 위치(아래 끝) +1', 'the card does not call y the bottom edge', {
      label: nudge.getAttribute('aria-label'),
    });

    const moved = listBox();
    context.record('boxes', { start: roundBox(start), level: roundBox(level), moved: roundBox(moved) });
    checkClose(moved.top, level.top, 'list top against the level widget top');
    checkClose(moved.bottom - moved.top, start.bottom - start.top, 'list height');
    const savedY = await waitFor('the drag to be saved', () => {
      const y = lastSavedLayoutY(context, 'timedEffects.list');
      return y !== null && Math.round(y) === Math.round(moved.bottom) ? y : null;
    });
    context.record('savedY', savedY);
  },
};

const resizeKeepsBottomLeft: Scenario = {
  id: 'grow-up/resize',
  name: 'resizing a list growing up keeps its bottom-left corner and the handle under the cursor',
  async run(context) {
    await context.openHud({ ...COMPACT, timedEffects: { growDirection: 'up' } });
    context.sendStats({ timedEffects: makeEffects(4) });
    await effectRows(4);
    await context.openSettings(EFFECTS);

    const list = widget('timedEffects.list');
    check(list !== null, 'the effect list is not on the page');
    const start = boxOf(list);
    await clickAt({ x: start.left + 40, y: (start.top + start.bottom) / 2 }, list, 'the effect list');
    const handle = await waitFor('the resize handle', () => {
      const element = query('[data-resize-handle="timedEffects.list"]');
      return isShown(element) ? element : null;
    });
    const handleBox = boxOf(handle);
    const from = { x: (handleBox.left + handleBox.right) / 2, y: (handleBox.top + handleBox.bottom) / 2 };
    // Shrinks by a share of the width, so the scale stays inside its limits at any screen size.
    const delta = Math.round(start.width * 0.15);
    await drag(from, pathBetween(from, { x: from.x - delta, y: from.y }, 10), handle, 'the resize handle');

    const resized = listBox();
    context.record('boxes', { start: roundBox(start), resized: roundBox(resized), delta });
    checkClose(resized.left, start.left, 'left edge');
    checkClose(resized.bottom, start.bottom, 'bottom edge');
    checkClose(resized.right, start.right - delta, 'right edge under the cursor', 3);
    check(resized.top > start.top, 'the list did not shrink toward its bottom edge');
  },
};

function orderScenario(look: { id: string; name: string; settings: object; row: string }): Scenario {
  return {
    id: `grow-up/order-${look.id}`,
    name: `growing up puts the most pressing effect at the bottom (${look.name})`,
    async run(context) {
      const base = look.settings as { timedEffects?: object };
      await context.openHud({ ...base, timedEffects: { ...(base.timedEffects ?? {}), growDirection: 'up' } });
      context.sendStats({ timedEffects: makeEffects(3) });
      const rows = await effectRows(3, look.row);
      const harmful = boxOf(rowNamed(rows, 'Effect 0'));
      const others = ['Effect 1', 'Effect 2'].map(name => boxOf(rowNamed(rows, name)));
      context.record('tops', { harmful: harmful.top, others: others.map(other => other.top) });
      for (const other of others) check(other.top <= harmful.top + 0.5, 'a row sits below the harmful effect');
      check(Math.min(...others.map(other => other.top)) < harmful.top - 1, 'no row sits above the bottom one');
    },
  };
}

function defaultSpotScenario(iconTheme: 'standard' | 'dororong'): Scenario {
  return {
    id: `grow-up/default-spot-${iconTheme}`,
    name: `the default spot climbs clear of the level widget (${iconTheme})`,
    async run(context) {
      await context.openHud({
        general: { onboardingSeen: true, hudStyle: 'compact', iconTheme, language: 'ko' },
        playerInfo: { level: true },
        timedEffects: { growDirection: 'up', maxVisible: 12 },
      });
      context.sendStats({ timedEffects: makeEffects(12) });
      await effectRows(12);
      const list = listBox();
      const level = boxOf(await shownWidget('player.level'));
      context.record('boxes', { list: roundBox(list), level: roundBox(level) });
      check(!overlaps(list, level), 'the list covers the level widget');
      check(list.top >= 0, 'the list runs off the top of the screen');
    },
  };
}

// --- daysPassed.e2e.ts ---

function daysPassedScenario(layout: { id: string; name: string; hudStyle: string; iconTheme: string; text: RegExp }): Scenario {
  return {
    id: `days-passed/${layout.id}`,
    name: `days passed shows whole days clear of the play time (${layout.name})`,
    async run(context) {
      await context.openHud({
        general: { onboardingSeen: true, hudStyle: layout.hudStyle, iconTheme: layout.iconTheme, language: 'ko' },
        time: { daysPassed: true, playtime: true },
      });
      context.sendStats({ time: { daysPassed: 41 }, playerInfo: { playtimeHours: 1234.9 } });
      const days = await waitFor('days passed showing 41', () => {
        const element = widget('time.daysPassed');
        return element && layout.text.test(textOf(element)) ? element : null;
      });
      const playtime = await waitFor('the play time showing 1,234', () => {
        const element = widget('time.playtime');
        return element && textOf(element).includes('1,234') ? element : null;
      });
      context.record('texts', { days: textOf(days), playtime: textOf(playtime) });
      context.record('boxes', { days: roundBox(boxOf(days)), playtime: roundBox(boxOf(playtime)) });
      check(!overlaps(boxOf(days), boxOf(playtime)), 'days passed covers the play time');
    },
  };
}

// --- settingsFileNotice.e2e.ts ---

const unreadableSettingsFile: Scenario = {
  id: 'settings-file/unreadable',
  name: 'unreadable saved settings are announced, and opening the window to read why saves nothing',
  async run(context) {
    await context.openHud('{"general":{"iconTheme":"doro');
    await waitFor('the settings file banner', () => isShown(byTestId('settings-backup-banner')));

    window.toggleSettings?.();
    await waitFor('the notice in the settings window', () => isShown(query('[data-settings-file-notice="loadFailed"]')));
    await waitFor('the banner to give way', () => !isShown(byTestId('settings-backup-banner')));

    // A save waits 200 ms before it goes out; give it well over that.
    await sleep(800);
    check(context.saves().length === 0, 'opening the window saved over the unread file', { saves: context.saves().length });

    const fileName = 'TulliusWidgets.json.unloaded-20261126-120000.bak';
    window.showSettingsBackupNotice?.(fileName);
    const notice = await waitFor('the kept-backup notice', () => {
      const element = query('[data-settings-file-notice="backup"]');
      return element && textOf(element).includes(fileName) ? element : null;
    });
    const dismiss = await waitFor('the dismiss button', () => query('[data-settings-file-notice-dismiss]'));
    await click(dismiss, 'the dismiss button');
    await waitFor('the notice to close', () => !isShown(notice) || !notice.isConnected);
  },
};

// --- dropdownKeyboard.e2e.ts ---

const dropdownKeyboard: Scenario = {
  id: 'dropdown/keyboard',
  name: 'a dropdown opens with the arrow key and Enter picks the highlighted option',
  async run(context) {
    await context.openHud({ general: { onboardingSeen: true, hudStyle: 'compact', fontPreset: 'default', language: 'ko' } });
    await context.openSettings('display');

    const trigger = await waitFor('the font preset dropdown', () => byTestId('font-preset-select'));
    trigger.focus();
    await press('ArrowDown', { target: trigger });
    const menu = await waitFor('the open menu', () => {
      const element = query('[data-select-menu="font-preset-select"]');
      return isShown(element) ? element : null;
    });
    const opened = await waitFor('the highlighted option', () => menu.querySelector('[data-active="true"]'));
    check(opened.getAttribute('aria-selected') === 'true', 'the menu did not open on the chosen option');

    await press('ArrowDown', { target: document.activeElement ?? trigger });
    const target = menu.querySelector('[data-active="true"]')?.getAttribute('data-testid') ?? '';
    await press('Enter', { target: document.activeElement ?? trigger });
    await waitFor('the menu to close', () => !isShown(query('[data-select-menu="font-preset-select"]')));
    check(document.activeElement === trigger, 'focus did not return to the dropdown');

    const picked = target.replace('font-preset-select-option-', '');
    context.record('picked', picked);
    await waitFor(`the pick (${picked}) to be saved`, () => {
      const saves = context.saves();
      return (saves[saves.length - 1]?.general as { fontPreset?: string } | undefined)?.fontPreset === picked;
    });

    // Esc closes an open menu without picking and leaves the window open.
    await press('Enter', { target: trigger });
    await waitFor('the menu to open again', () => isShown(query('[data-select-menu="font-preset-select"]')));
    await press('Escape', { target: document.activeElement ?? trigger });
    await waitFor('the menu to close on Esc', () => !isShown(query('[data-select-menu="font-preset-select"]')));
    check(isShown(query('.tw-w-nav-item')), 'Esc closed the settings window too');
  },
};

export const SCENARIOS: readonly Scenario[] = [
  switchingKeepsTheListInPlace,
  rightCornerMovesNothingElse,
  undoAfterSwitching,
  dragSnapsByRealEdges,
  resizeKeepsBottomLeft,
  orderScenario({
    id: 'classic-column',
    name: 'classic, in a column',
    settings: { general: { onboardingSeen: true, hudStyle: 'classic', language: 'ko' } },
    row: '.tw-effect-row',
  }),
  orderScenario({
    id: 'compact-rows',
    name: 'compact, in rows of two',
    settings: { ...COMPACT, timedEffects: { listLayout: 'horizontal' } },
    row: '.tw-ceffect-row',
  }),
  defaultSpotScenario('standard'),
  defaultSpotScenario('dororong'),
  daysPassedScenario({ id: 'compact-standard', name: 'compact, standard icons', hudStyle: 'compact', iconTheme: 'standard', text: /지난\s*41일/ }),
  daysPassedScenario({ id: 'compact-dororong', name: 'compact, Dororong icons', hudStyle: 'compact', iconTheme: 'dororong', text: /지난\s*41일/ }),
  daysPassedScenario({ id: 'classic', name: 'classic', hudStyle: 'classic', iconTheme: 'standard', text: /41일/ }),
  unreadableSettingsFile,
  dropdownKeyboard,
];
