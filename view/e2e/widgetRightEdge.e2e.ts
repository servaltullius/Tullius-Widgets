import { expect, test, type Locator } from '@playwright/test';
import { boxOf, makeEffects, openHud, openSettings, sendSettings, sendStats, widget } from './hud';

// A widget wraps its content to the room between its left edge and the right edge of the screen.
// Its scale is applied after that, so the room it wraps to has to be the visible room divided by
// its scale: then a widget made larger near the right edge stays on the screen, and one made
// smaller uses the room it has.

const VIEWPORT_WIDTH = 1920;
/** Room left of the right edge: three short cards a line at the list's own size. */
const RIGHT_EDGE_ROOM = 520;
const LIST_X = VIEWPORT_WIDTH - RIGHT_EDGE_ROOM;

function classicRows(scale: number, growDirection: 'down' | 'up' = 'down', x = LIST_X) {
  return {
    general: { onboardingSeen: true, hudStyle: 'classic', language: 'ko' },
    timedEffects: { maxVisible: 12, listLayout: 'horizontal', growDirection },
    itemLayouts: {
      'timedEffects.list': { visible: true, x, y: 600, scale, locked: false, zIndex: 0, viewportWidth: 1920, viewportHeight: 1080 },
    },
  };
}

/** How many cards share the line of the first card. */
async function cardsOnFirstLine(list: Locator): Promise<number> {
  const tops = await list.locator('.tw-effect-row').evaluateAll(cards => cards.map(card => Math.round(card.getBoundingClientRect().top)));
  return tops.filter(top => Math.abs(top - tops[0]) <= 1).length;
}

/** The list's content is no wider than its own box (both before the scale). */
async function expectContentInsideBox(list: Locator): Promise<void> {
  const { content, box } = await list.evaluate(element => ({ content: element.scrollWidth, box: element.clientWidth }));
  expect(content).toBeLessThanOrEqual(box + 1);
}

/** Waits until the list is drawn at this scale, so what is measured next is the new layout. */
async function expectDrawnAt(list: Locator, scale: number): Promise<void> {
  await expect(list).toHaveAttribute('style', new RegExp(`scale\\(${String(scale).replace('.', '\\.')}\\)`));
}

test.describe('a widget near the right edge of the screen', () => {
  for (const growDirection of ['down', 'up'] as const) {
    test(`made larger, it wraps to stay on the screen (list growing ${growDirection})`, async ({ page }) => {
      await openHud(page, classicRows(1, growDirection));
      await sendStats(page, { timedEffects: makeEffects(8) });
      const list = widget(page, 'timedEffects.list');
      await expect(list.locator('.tw-effect-row')).toHaveCount(8);
      const perLineAtOne = await cardsOnFirstLine(list);
      expect(perLineAtOne).toBeGreaterThan(1);
      expect((await boxOf(list)).right).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);

      await sendSettings(page, classicRows(1.5, growDirection));
      await expectDrawnAt(list, 1.5);
      expect((await boxOf(list)).right).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
      expect((await boxOf(list)).left).toBeCloseTo(LIST_X, 0);
      expect(await cardsOnFirstLine(list)).toBeLessThan(perLineAtOne);
      await expectContentInsideBox(list);
    });
  }

  test('made smaller, it uses the room it has instead of wrapping early', async ({ page }) => {
    await openHud(page, classicRows(1));
    await sendStats(page, { timedEffects: makeEffects(8) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-effect-row')).toHaveCount(8);
    const perLineAtOne = await cardsOnFirstLine(list);

    await sendSettings(page, classicRows(0.7));
    await expectDrawnAt(list, 0.7);
    expect(await cardsOnFirstLine(list)).toBeGreaterThan(perLineAtOne);
    expect((await boxOf(list)).right).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
    await expectContentInsideBox(list);
  });

  test('dragged toward the right edge at 1.5×, it rewraps while the mouse is still down', async ({ page }) => {
    // Starts right of the settings window (which ends near x=972), where it can be grabbed.
    await openHud(page, classicRows(1.5, 'down', 1000));
    await sendStats(page, { timedEffects: makeEffects(8) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-effect-row')).toHaveCount(8);
    const perLineAtStart = await cardsOnFirstLine(list);

    await openSettings(page, /효과·시간/);
    const start = await boxOf(list);
    const grabX = start.left + 30;
    const grabY = start.top + 20;
    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    await page.mouse.move(grabX + 20, grabY, { steps: 4 });
    await page.mouse.move(grabX + (LIST_X - start.left), grabY, { steps: 12 });

    // Mid-drag: the list has moved most of the way and already wraps to the room it has left.
    await expect.poll(async () => (await boxOf(list)).left).toBeGreaterThan(LIST_X - 40);
    expect((await boxOf(list)).right).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
    expect(await cardsOnFirstLine(list)).toBeLessThan(perLineAtStart);

    await page.mouse.up();
    expect((await boxOf(list)).right).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
  });

  test('far from the edge, a larger list keeps its cards on one line while they fit', async ({ page }) => {
    // Three cards and plenty of room even at 1.5×: nothing to wrap.
    await openHud(page, classicRows(1, 'down', 300));
    await sendStats(page, { timedEffects: makeEffects(3) });
    const list = widget(page, 'timedEffects.list');
    await expect(list.locator('.tw-effect-row')).toHaveCount(3);
    expect(await cardsOnFirstLine(list)).toBe(3);
    await expectContentInsideBox(list);
    const atOne = await boxOf(list);

    await sendSettings(page, classicRows(1.5, 'down', 300));
    await expectDrawnAt(list, 1.5);
    const larger = await boxOf(list);
    expect((larger.right - larger.left) / (atOne.right - atOne.left)).toBeCloseTo(1.5, 1);
    expect(await cardsOnFirstLine(list)).toBe(3);
    await expectContentInsideBox(list);
  });
});
