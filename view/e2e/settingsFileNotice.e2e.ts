import { expect, test } from '@playwright/test';
import { openHud, savedSettings } from './hud';

// Saved settings that cannot be read (docs/plans/2026-11-25-settings-load-safeguard.md).

test('unreadable saved settings are announced, and opening the window to read why saves nothing', async ({ page }) => {
  // The file the plugin sends is cut off mid-way.
  await openHud(page, '{"general":{"iconTheme":"doro');

  await expect(page.getByTestId('settings-backup-banner')).toBeVisible();

  await page.evaluate(() => window.toggleSettings?.());
  await expect(page.locator('[data-settings-file-notice="loadFailed"]')).toBeVisible();
  await expect(page.getByTestId('settings-backup-banner')).toBeHidden();

  // A save waits 200 ms before it goes out; give it well over that.
  await page.waitForTimeout(800);
  expect(await savedSettings(page)).toEqual([]);

  // Naming the kept backup replaces the notice; it closes on request.
  await page.evaluate(() => window.showSettingsBackupNotice?.('TulliusWidgets.json.unloaded-20261126-120000.bak'));
  const notice = page.locator('[data-settings-file-notice="backup"]');
  await expect(notice).toContainText('TulliusWidgets.json.unloaded-20261126-120000.bak');
  await page.locator('[data-settings-file-notice-dismiss]').click();
  await expect(notice).toBeHidden();
});
