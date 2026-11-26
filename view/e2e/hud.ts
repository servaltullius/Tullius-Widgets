import { expect, type Locator, type Page } from '@playwright/test';

// Plays the plugin's side for browser tests: the page's bridge functions take settings and stats
// the way the plugin sends them, and saves are caught where the plugin would receive them.

export interface BoxPx {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

declare global {
  interface Window {
    __e2eSaves?: string[];
  }
}

/** Loads the HUD and gives it saved settings, as the plugin does when the view is ready. */
export async function openHud(page: Page, settings: unknown): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.updateSettings === 'function' && typeof window.updateStats === 'function');
  await page.evaluate(() => {
    window.__e2eSaves = [];
    window.onSettingsChanged = json => {
      window.__e2eSaves?.push(json);
    };
  });
  await sendSettings(page, settings);
}

/** Sends a settings payload as the plugin would: an object is serialized, a string goes as is. */
export async function sendSettings(page: Page, settings: unknown): Promise<void> {
  const json = typeof settings === 'string' ? settings : JSON.stringify({ schemaVersion: 7, ...(settings as object) });
  await page.evaluate(payload => window.updateSettings?.(payload), json);
}

export async function sendStats(page: Page, stats: unknown): Promise<void> {
  await page.evaluate(payload => window.updateStats?.(payload), JSON.stringify(stats));
}

/** Every settings payload the page has sent to the plugin so far, parsed. */
export async function savedSettings(page: Page): Promise<Array<Record<string, unknown>>> {
  const saves = await page.evaluate(() => window.__e2eSaves ?? []);
  return saves.map(json => JSON.parse(json) as Record<string, unknown>);
}

export function widget(page: Page, itemId: string): Locator {
  return page.locator(`[data-widget-item-id="${itemId}"]`);
}

export async function boxOf(locator: Locator): Promise<BoxPx> {
  const box = await locator.boundingBox();
  expect(box, 'element is on screen').not.toBeNull();
  return { left: box!.x, top: box!.y, right: box!.x + box!.width, bottom: box!.y + box!.height };
}

export function overlaps(a: BoxPx, b: BoxPx): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** Opens the settings window on a category, the way the settings hotkey and a click would. */
export async function openSettings(page: Page, category: RegExp): Promise<void> {
  await page.evaluate(() => window.toggleSettings?.());
  await page.locator('.tw-w-nav-item', { hasText: category }).click();
}

/** A timed effect as the plugin reports it; only the first one is harmful. */
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
