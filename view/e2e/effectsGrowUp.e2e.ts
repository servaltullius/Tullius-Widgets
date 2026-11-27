import { expect, test, type Page } from '@playwright/test';
import { boxOf, makeEffects, openHud, openSettings, overlaps, savedSettings, sendStats, widget } from './hud';

// The timed effect list growing up from its bottom edge (docs/plans/2026-11-26-effects-grow-up.md).

const COMPACT = { general: { onboardingSeen: true, hudStyle: 'compact', iconTheme: 'standard', language: 'ko' } };
const EFFECTS = '효과·시간';

/** Presses Ctrl+Z; true when the layout history took the key (it prevents the default only when it undid something). */
async function pressUndo(page: Page): Promise<boolean> {
  // Listening before the key goes down, so the press cannot overtake the listener.
  await page.evaluate(() => {
    const target = window as Window & { __undoTaken?: boolean };
    delete target.__undoTaken;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'z') return;
      window.removeEventListener('keydown', onKeyDown);
      // After every other listener has had the event.
      window.setTimeout(() => {
        target.__undoTaken = event.defaultPrevented;
      }, 0);
    };
    window.addEventListener('keydown', onKeyDown);
  });
  await page.keyboard.press('Control+z');
  await page.waitForFunction(() => (window as Window & { __undoTaken?: boolean }).__undoTaken !== undefined);
  return page.evaluate(() => (window as Window & { __undoTaken?: boolean }).__undoTaken === true);
}

test.describe('timed effect list growing up', () => {
  test('switching direction keeps the list in place and puts the most pressing effect at the bottom', async ({ page }) => {
    await openHud(page, COMPACT);
    await sendStats(page, { timedEffects: makeEffects(3) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-ceffect-row')).toHaveCount(3);
    const down = await boxOf(list);

    await openSettings(page, new RegExp(EFFECTS));
    await page.getByTestId('timed-effects-grow-select-option-up').click();
    await expect(list.locator('.tw-ceffect-list')).toHaveAttribute('data-grow', 'up');
    const up = await boxOf(list);
    expect(up.top).toBeCloseTo(down.top, 0);
    expect(up.bottom).toBeCloseTo(down.bottom, 0);

    // The harmful effect (first in priority) sits at the anchored bottom edge.
    const rows = list.locator('.tw-ceffect-row');
    const harmful = await boxOf(rows.filter({ hasText: 'Effect 0' }));
    for (const index of [1, 2]) {
      expect((await boxOf(rows.filter({ hasText: `Effect ${index}` }))).top).toBeLessThan(harmful.top);
    }

    // Fewer effects: the bottom edge stays, the top comes down.
    await sendStats(page, { timedEffects: makeEffects(1) });
    await expect(rows).toHaveCount(1);
    const one = await boxOf(list);
    expect(one.bottom).toBeCloseTo(up.bottom, 0);
    expect(one.top).toBeGreaterThan(up.top);

    // And back down: still in place.
    await sendStats(page, { timedEffects: makeEffects(3) });
    await expect(rows).toHaveCount(3);
    await page.getByTestId('timed-effects-grow-select-option-down').click();
    await expect(list.locator('.tw-ceffect-list')).toHaveAttribute('data-grow', 'down');
    const back = await boxOf(list);
    expect(back.top).toBeCloseTo(down.top, 0);
  });

  test('switching direction in a right-hand corner moves no other widget, even one switched on later', async ({ page }) => {
    // The corner cluster is placed by its right edge, and the default grow-up list sits further
    // right. Widgets that are off by default (disease resistance) are not saved until shown.
    const corner = { general: { ...COMPACT.general, compactAnchor: 'bottomRight' }, playerInfo: { level: true } };
    await openHud(page, { ...corner, resistances: { disease: true } });
    const disease = widget(page, 'resistance.disease');
    const diseaseInCluster = await boxOf(disease);

    await openHud(page, corner);
    await sendStats(page, { timedEffects: makeEffects(3) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-ceffect-row')).toHaveCount(3);
    const level = widget(page, 'player.level');
    const levelBefore = await boxOf(level);
    const listBefore = await boxOf(list);

    await openSettings(page, new RegExp(EFFECTS));
    await page.getByTestId('timed-effects-grow-select-option-up').click();
    await expect(list.locator('.tw-ceffect-list')).toHaveAttribute('data-grow', 'up');
    const levelAfter = await boxOf(level);
    expect(levelAfter.left).toBeCloseTo(levelBefore.left, 0);
    expect(levelAfter.top).toBeCloseTo(levelBefore.top, 0);
    const listAfter = await boxOf(list);
    expect(listAfter.left).toBeCloseTo(listBefore.left, 0);
    expect(listAfter.bottom).toBeCloseTo(listBefore.bottom, 0);

    // Switched on afterwards, it still takes its place in the cluster.
    await page.locator('.tw-w-nav-item[data-category="combat"]').click();
    await page.locator('label.tw-p-toggle-row', { hasText: '질병' }).click();
    await expect(disease).toBeVisible();
    const diseaseShown = await boxOf(disease);
    expect(diseaseShown.left).toBeCloseTo(diseaseInCluster.left, 0);
    expect(diseaseShown.top).toBeCloseTo(diseaseInCluster.top, 0);
  });

  test('undo right after switching direction does not move the list', async ({ page }) => {
    await openHud(page, COMPACT);
    await sendStats(page, { timedEffects: makeEffects(3) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-ceffect-row')).toHaveCount(3);

    await openSettings(page, new RegExp(EFFECTS));

    // First, Ctrl+Z does undo a layout edit here, so a key that undoes nothing below is the
    // history starting over, not the key missing the page.
    const before = await boxOf(list);
    await page.mouse.click(before.left + 40, (before.top + before.bottom) / 2);
    await page.keyboard.press('ArrowDown');
    await expect.poll(async () => (await boxOf(list)).top).toBeGreaterThan(before.top + 0.5);
    expect(await pressUndo(page)).toBe(true);
    await expect.poll(async () => Math.round((await boxOf(list)).top)).toBe(Math.round(before.top));

    // Switching direction starts the history over (its y is now the other edge), so Ctrl+Z right
    // after has nothing to undo and the list stays where it is.
    await page.getByTestId('timed-effects-grow-select-option-up').click();
    await expect(list.locator('.tw-ceffect-list')).toHaveAttribute('data-grow', 'up');
    const switched = await boxOf(list);
    expect(await pressUndo(page)).toBe(false);
    // Undo works on a frame; give it one before measuring.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve(null))));
    const afterUndo = await boxOf(list);
    expect(afterUndo.top).toBeCloseTo(switched.top, 0);
    expect(afterUndo.bottom).toBeCloseTo(switched.bottom, 0);
  });

  test('a list growing up snaps by its real edges when dragged, is saved by its bottom edge, and says so in its card', async ({ page }) => {
    await openHud(page, { ...COMPACT, playerInfo: { level: true }, timedEffects: { growDirection: 'up' } });
    await sendStats(page, { timedEffects: makeEffects(2) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-ceffect-row')).toHaveCount(2);

    await openSettings(page, new RegExp(EFFECTS));
    const start = await boxOf(list);
    const level = await boxOf(widget(page, 'player.level'));
    // Drop the list's top edge 3px below the level widget's top: it should snap to line up with
    // it. Snapping by the saved y (the bottom edge) as if it were the top would land elsewhere.
    const grabX = start.left + 40;
    const grabY = (start.top + start.bottom) / 2;
    const dropY = grabY + (level.top + 3 - start.top);
    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    await page.mouse.move(grabX, grabY - 20, { steps: 4 });
    await page.mouse.move(grabX, dropY, { steps: 10 });
    await page.mouse.up();

    // The quick-edit card for the selected list labels its y as the bottom edge.
    await expect(page.locator('[data-quick-edit-nudge-y="+1"]')).toHaveAttribute('aria-label', 'Y 위치(아래 끝) +1');

    const moved = await boxOf(list);
    expect(moved.top).toBeCloseTo(level.top, 0);
    expect(moved.bottom - moved.top).toBeCloseTo(start.bottom - start.top, 0);
    // Loading may already have saved the list once; the drag's own save follows 200 ms later.
    await expect.poll(async () => {
      const saves = await savedSettings(page);
      const last = saves[saves.length - 1]?.itemLayouts as Record<string, { y: number }> | undefined;
      return Math.round(last?.['timedEffects.list']?.y ?? -1);
    }).toBe(Math.round(moved.bottom));
  });

  test('resizing a list growing up keeps its bottom-left corner and the handle under the cursor', async ({ page }) => {
    await openHud(page, { ...COMPACT, timedEffects: { growDirection: 'up' } });
    await sendStats(page, { timedEffects: makeEffects(4) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-ceffect-row')).toHaveCount(4);

    await openSettings(page, new RegExp(EFFECTS));
    const start = await boxOf(list);
    // A click selects the list and shows its resize handle on the top-right corner, across from
    // the bottom-left corner that stays put.
    await page.mouse.click(start.left + 40, (start.top + start.bottom) / 2);
    const handleLocator = page.locator('[data-resize-handle="timedEffects.list"]');

    // Drags the handle along the line from the fixed corner through it, to `factor` of the way.
    const dragHandle = async (factor: number) => {
      const before = await boxOf(list);
      const handle = await boxOf(handleLocator);
      const from = { x: (handle.left + handle.right) / 2, y: (handle.top + handle.bottom) / 2 };
      const to = { x: before.left + (from.x - before.left) * factor, y: before.bottom + (from.y - before.bottom) * factor };
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 5 });
      await page.mouse.move(to.x, to.y, { steps: 5 });
      await page.mouse.up();
      return { before, to, after: await boxOf(list) };
    };

    // Toward the fixed corner it shrinks, only from the top and the right. (Shrinking first keeps
    // the handle clear of the settings window docked beside the list.)
    const shrunk = await dragHandle(0.8);
    expect(shrunk.after.left).toBeCloseTo(start.left, 0);
    expect(shrunk.after.bottom).toBeCloseTo(start.bottom, 0);
    expect(shrunk.after.right).toBeLessThan(start.right - 10);
    expect(shrunk.after.top).toBeGreaterThan(start.top + 5);

    // Away from it it grows, and the corner the handle sits on follows the cursor (within a
    // couple of pixels of rounding).
    const grown = await dragHandle(1.2);
    expect(grown.after.left).toBeCloseTo(start.left, 0);
    expect(grown.after.bottom).toBeCloseTo(start.bottom, 0);
    expect(Math.abs(grown.after.right - grown.to.x)).toBeLessThan(3);
    expect(Math.abs(grown.after.top - grown.to.y)).toBeLessThan(3);
    expect(grown.after.top).toBeLessThan(grown.before.top);
  });

  for (const look of [
    { name: 'classic, in a column', settings: { general: { onboardingSeen: true, hudStyle: 'classic', language: 'ko' } }, row: '.tw-effect-row' },
    { name: 'compact, in rows of two', settings: { ...COMPACT, timedEffects: { listLayout: 'horizontal' } }, row: '.tw-ceffect-row' },
  ] as const) {
    test(`growing up puts the most pressing effect at the bottom (${look.name})`, async ({ page }) => {
      const timedEffects = { ...('timedEffects' in look.settings ? look.settings.timedEffects : {}), growDirection: 'up' };
      await openHud(page, { ...look.settings, timedEffects });
      await sendStats(page, { timedEffects: makeEffects(3) });
      const rows = widget(page, 'timedEffects.list').locator(look.row);
      await expect(rows).toHaveCount(3);
      const harmful = await boxOf(rows.filter({ hasText: 'Effect 0' }));
      const others = [await boxOf(rows.filter({ hasText: 'Effect 1' })), await boxOf(rows.filter({ hasText: 'Effect 2' }))];
      for (const other of others) expect(other.top).toBeLessThanOrEqual(harmful.top + 0.5);
      // At least one row sits above the bottom one: the list really stacks upward.
      expect(Math.min(...others.map(other => other.top))).toBeLessThan(harmful.top - 1);
    });
  }

  for (const iconTheme of ['standard', 'dororong'] as const) {
    test(`the default spot climbs clear of the level widget (${iconTheme})`, async ({ page }) => {
      await openHud(page, {
        general: { onboardingSeen: true, hudStyle: 'compact', iconTheme, language: 'ko' },
        playerInfo: { level: true },
        timedEffects: { growDirection: 'up', maxVisible: 12 },
      });
      await sendStats(page, { timedEffects: makeEffects(12) });
      const list = widget(page, 'timedEffects.list');
      await expect(list.locator('.tw-ceffect-row')).toHaveCount(12);
      const listBox = await boxOf(list);
      expect(overlaps(listBox, await boxOf(widget(page, 'player.level')))).toBe(false);
      expect(listBox.top).toBeGreaterThanOrEqual(0);
    });
  }
});
