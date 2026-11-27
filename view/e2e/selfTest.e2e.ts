import { expect, test } from '@playwright/test';
import { PREVIEW_PORT } from '../playwright.config';
import { SCENARIOS } from '../src/selftest/scenarios';

// The in-game self-test (docs/plans/2026-11-26-in-game-self-test.md), run in Chromium under the
// game's conditions: the shipped build, the plugin's bridge present (so stats start empty), the
// plugin's functions fixed in place, and every scenario on one page without a reload.

const PREVIEW = `http://127.0.0.1:${PREVIEW_PORT}/`;
const PLUGIN_CALLS = [
  'onSettingsChanged',
  'onSettingsLoadFailed',
  'onRequestUnfocus',
  'onSettingsVisibilityChanged',
  'onExportSettings',
  'onImportSettings',
  'onHotkeyCapture',
  'onEscapeOwner',
];

declare global {
  interface Window {
    __pluginCalls?: Array<[string, string]>;
    __selfTestReports?: string[];
  }
}

interface Report {
  runId: string;
  status: string;
  summary: { passed: number; failed: number; total: number };
  results: Array<{ id: string; ok: boolean; error?: string; details?: unknown; measurements: unknown }>;
  nativeCallsHeld: Record<string, number>;
  view: { viewport: { width: number; height: number } };
}

for (const screen of [
  { name: '1080p', width: 1920, height: 1080 },
  { name: '4K', width: 3840, height: 2160 },
]) {
  test(`the in-game self-test passes in the shipped build and tells the plugin nothing (${screen.name})`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: screen.width, height: screen.height });
    await page.addInitScript(names => {
      window.__pluginCalls = [];
      window.__selfTestReports = [];
      Object.defineProperty(window, 'sendDataToSKSE', { value: () => undefined, configurable: false });
      for (const name of names) {
        Object.defineProperty(window, name, {
          value: (argument: string) => window.__pluginCalls?.push([name, argument]),
          writable: false,
          configurable: false,
        });
      }
      window.onSelfTestReport = json => {
        window.__selfTestReports?.push(json);
      };
    }, PLUGIN_CALLS);

    await page.goto(PREVIEW);
    await page.waitForFunction(() => typeof window.runSelfTest === 'function' && typeof window.updateSettings === 'function');
    await page.evaluate(() => window.enterSelfTestSession?.());
    await expect(page.locator('[data-selftest-phase="waiting"]')).toBeVisible();
    await page.evaluate(() => {
      window.__pluginCalls = [];
    });

    await page.evaluate(() => window.runSelfTest?.('e2e-run', 'browser'));
    await page.waitForFunction(
      () => (window.__selfTestReports ?? []).some(json => (JSON.parse(json) as { status: string }).status === 'finished'),
      null,
      { timeout: 150_000 },
    );

    const reports = (await page.evaluate(() => window.__selfTestReports ?? [])).map(json => JSON.parse(json) as Report);
    expect(reports[0]?.status).toBe('started');
    const total = SCENARIOS.length;
    expect(reports.filter(report => report.status === 'running')).toHaveLength(total);
    const final = reports[reports.length - 1]!;
    expect(final.status).toBe('finished');
    expect(final.runId).toBe('e2e-run');
    expect(final.view.viewport).toMatchObject({ width: screen.width, height: screen.height });
    expect(final.results).toHaveLength(total);
    const failures = final.results.filter(result => !result.ok);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
    expect(final.summary).toEqual({ passed: total, failed: 0, total });

    // The scenarios saved and opened the settings window, and none of it reached the plugin.
    expect(final.nativeCallsHeld.onSettingsChanged).toBeGreaterThan(0);
    expect(final.nativeCallsHeld.onSettingsVisibilityChanged).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__pluginCalls)).toEqual([]);
    await expect(page.locator('[data-selftest-phase="finished"]')).toBeVisible();
  });
}
