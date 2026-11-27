import { expect, test, type Page } from '@playwright/test';
import { boxOf, makeEffects, openHud, sendSettings, sendStats, widget } from './hud';

// A list growing up stops below the compass row at the top of the screen (72px at 1080p), the
// strip the top-corner presets keep clear, and counts the rest on its "+N" line.

const TOP_LIMIT = 72;
const CLASSIC = { general: { onboardingSeen: true, hudStyle: 'classic', language: 'ko' } };

/** Effects whose source and effect names differ, so each classic card has its second, taller line. */
function namedEffects(count: number) {
  return makeEffects(count).map((effect, index) => ({
    ...effect,
    sourceName: `Potion of Effect ${index}`,
    effectName: `Fortify Effect ${index}`,
  }));
}

async function hiddenCount(page: Page, selector: string): Promise<number> {
  const more = widget(page, 'timedEffects.list').locator(selector);
  if ((await more.count()) === 0) return 0;
  return Number((await more.innerText()).replace('+', ''));
}

test.describe('a list growing up stops below the compass row', () => {
  test('classic column: shows what fits and counts the rest', async ({ page }) => {
    await openHud(page, { ...CLASSIC, timedEffects: { growDirection: 'up', maxVisible: 12 } });
    await sendStats(page, { timedEffects: namedEffects(12) });
    const list = widget(page, 'timedEffects.list');
    const rows = list.locator('.tw-effect-row');
    await expect(list.locator('.tw-effect-hidden-count')).toBeVisible();

    const shown = await rows.count();
    expect(shown).toBeGreaterThan(1);
    expect(shown).toBeLessThan(12);
    expect(await hiddenCount(page, '.tw-effect-hidden-count')).toBe(12 - shown);
    expect((await boxOf(list)).top).toBeGreaterThanOrEqual(TOP_LIMIT - 1);
    // Still anchored at its bottom edge with the most pressing effect there.
    expect((await boxOf(list)).bottom).toBeCloseTo(400, 0);
    const harmful = await boxOf(rows.filter({ hasText: 'Potion of Effect 0' }));
    expect(harmful.bottom).toBeGreaterThanOrEqual(Math.max(...await rows.evaluateAll(cards => cards.map(card => card.getBoundingClientRect().bottom))) - 1);
  });

  test('classic column: every card that fits is shown, with no "+N"', async ({ page }) => {
    // The default count (6) fits above the default spot, second lines and all.
    await openHud(page, { ...CLASSIC, timedEffects: { growDirection: 'up' } });
    await sendStats(page, { timedEffects: namedEffects(6) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-effect-row')).toHaveCount(6);
    await expect(list.locator('.tw-effect-hidden-count')).toHaveCount(0);
    expect((await boxOf(list)).top).toBeGreaterThanOrEqual(TOP_LIMIT - 1);
  });

  test('classic column placed lower: more room, more cards', async ({ page }) => {
    await openHud(page, {
      ...CLASSIC,
      timedEffects: { growDirection: 'up', maxVisible: 12 },
      itemLayouts: {
        'timedEffects.list': { visible: true, x: 1100, y: 1000, scale: 1, locked: false, zIndex: 0, viewportWidth: 1920, viewportHeight: 1080 },
      },
    });
    await sendStats(page, { timedEffects: namedEffects(12) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-effect-row')).toHaveCount(12);
    await expect(list.locator('.tw-effect-hidden-count')).toHaveCount(0);
    expect((await boxOf(list)).top).toBeGreaterThanOrEqual(TOP_LIMIT - 1);
  });

  test('classic rows near the right edge, one card a line: stops at the limit too', async ({ page }) => {
    await openHud(page, {
      ...CLASSIC,
      timedEffects: { growDirection: 'up', maxVisible: 12, listLayout: 'horizontal' },
      itemLayouts: {
        'timedEffects.list': { visible: true, x: 1560, y: 400, scale: 1, locked: false, zIndex: 0, viewportWidth: 1920, viewportHeight: 1080 },
      },
    });
    await sendStats(page, { timedEffects: namedEffects(12) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-effect-hidden-count')).toBeVisible();
    const shown = await list.locator('.tw-effect-row').count();
    expect(shown).toBeGreaterThan(1);
    expect(shown).toBeLessThan(12);
    expect(await hiddenCount(page, '.tw-effect-hidden-count')).toBe(12 - shown);
    expect((await boxOf(list)).top).toBeGreaterThanOrEqual(TOP_LIMIT - 1);
  });

  test('classic column at the default count: six cards and "+1" fit with second lines', async ({ page }) => {
    await openHud(page, { ...CLASSIC, timedEffects: { growDirection: 'up' } });
    await sendStats(page, { timedEffects: namedEffects(7) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-effect-row')).toHaveCount(6);
    expect(await hiddenCount(page, '.tw-effect-hidden-count')).toBe(1);
    expect((await boxOf(list)).top).toBeGreaterThanOrEqual(TOP_LIMIT - 1);
  });

  test('classic column made larger and then smaller again: the cards come back', async ({ page }) => {
    const at = (scale: number) => ({
      ...CLASSIC,
      timedEffects: { growDirection: 'up', maxVisible: 12 },
      itemLayouts: {
        'timedEffects.list': { visible: true, x: 1100, y: 400, scale, locked: false, zIndex: 0, viewportWidth: 1920, viewportHeight: 1080 },
      },
    });
    await openHud(page, at(1));
    await sendStats(page, { timedEffects: namedEffects(12) });
    const list = widget(page, 'timedEffects.list');
    const rows = list.locator('.tw-effect-row');
    await expect(list.locator('.tw-effect-hidden-count')).toBeVisible();
    const atOne = await rows.count();

    await sendSettings(page, at(1.5));
    await expect.poll(() => rows.count()).toBeLessThan(atOne);
    expect((await boxOf(list)).top).toBeGreaterThanOrEqual(TOP_LIMIT - 1);

    await sendSettings(page, at(1));
    await expect.poll(() => rows.count()).toBe(atOne);
    expect((await boxOf(list)).top).toBeGreaterThanOrEqual(TOP_LIMIT - 1);
  });

  test('classic rows moved from the right edge to a wide spot: every card comes back', async ({ page }) => {
    const at = (x: number) => ({
      ...CLASSIC,
      timedEffects: { growDirection: 'up', maxVisible: 12, listLayout: 'horizontal' },
      itemLayouts: {
        'timedEffects.list': { visible: true, x, y: 400, scale: 1, locked: false, zIndex: 0, viewportWidth: 1920, viewportHeight: 1080 },
      },
    });
    await openHud(page, at(1560));
    await sendStats(page, { timedEffects: namedEffects(12) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-effect-hidden-count')).toBeVisible();

    await sendSettings(page, at(200));
    await expect(list.locator('.tw-effect-row')).toHaveCount(12);
    await expect(list.locator('.tw-effect-hidden-count')).toHaveCount(0);
    expect((await boxOf(list)).top).toBeGreaterThanOrEqual(TOP_LIMIT - 1);
  });

  test('classic rows: as many narrower effects in place of wide ones all come back', async ({ page }) => {
    await openHud(page, {
      ...CLASSIC,
      timedEffects: { growDirection: 'up', maxVisible: 12, listLayout: 'horizontal' },
      itemLayouts: {
        'timedEffects.list': { visible: true, x: 1100, y: 250, scale: 1, locked: false, zIndex: 0, viewportWidth: 1920, viewportHeight: 1080 },
      },
    });
    // Long names make wide cards: two to a line, so not all twelve fit.
    const wide = makeEffects(12).map((effect, index) => ({
      ...effect,
      sourceName: `Long source name number ${index} of something`,
      effectName: `Fortify detail ${index}`,
    }));
    await sendStats(page, { timedEffects: wide });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-effect-hidden-count')).toBeVisible();
    expect(await list.locator('.tw-effect-row').count()).toBeLessThan(12);

    // Twelve other effects, with short names: several fit on a line, so all of them fit.
    const narrow = makeEffects(12).map((effect, index) => ({
      ...effect,
      instanceId: 900 + index,
      sourceFormId: 0x1100 + index,
      effectFormId: 0x1200 + index,
      spellFormId: 0x1300 + index,
    }));
    await sendStats(page, { timedEffects: narrow });
    await expect(list.locator('.tw-effect-row')).toHaveCount(12);
    await expect(list.locator('.tw-effect-hidden-count')).toHaveCount(0);
    expect((await boxOf(list)).top).toBeGreaterThanOrEqual(TOP_LIMIT - 1);
  });

  test('compact top corner: stops at the limit and counts the rest', async ({ page }) => {
    await openHud(page, {
      general: { onboardingSeen: true, hudStyle: 'compact', iconTheme: 'standard', language: 'ko', compactAnchor: 'topLeft' },
      timedEffects: { growDirection: 'up', maxVisible: 12 },
    });
    await sendStats(page, { timedEffects: makeEffects(12) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-ceffect-more')).toBeVisible();
    const shown = await list.locator('.tw-ceffect-row').count();
    expect(shown).toBeLessThan(12);
    expect(await hiddenCount(page, '.tw-ceffect-more')).toBe(12 - shown);
    expect((await boxOf(list)).top).toBeGreaterThanOrEqual(TOP_LIMIT - 1);
  });
});
