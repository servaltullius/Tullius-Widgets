import { expect, test } from '@playwright/test';
import { openHud, openSettings, savedSettings } from './hud';

// Picking from a settings dropdown with the keyboard.

test('a dropdown opens with the arrow key and Enter picks the highlighted option', async ({ page }) => {
  await openHud(page, { general: { onboardingSeen: true, hudStyle: 'compact', fontPreset: 'default', language: 'ko' } });
  await openSettings(page, /표시와 모양/);

  const trigger = page.getByTestId('font-preset-select');
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  const menu = page.locator('[data-select-menu="font-preset-select"]');
  await expect(menu).toBeVisible();
  // Opens on the chosen option, then moves one down.
  await expect(menu.locator('[data-active="true"]')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  const target = await menu.locator('[data-active="true"]').getAttribute('data-testid');
  await page.keyboard.press('Enter');

  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  const picked = target?.replace('font-preset-select-option-', '');
  await expect.poll(async () => {
    const saves = await savedSettings(page);
    return (saves[saves.length - 1]?.general as { fontPreset?: string } | undefined)?.fontPreset;
  }).toBe(picked);

  // Esc closes an open menu without picking and leaves the window open.
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page.locator('.tw-w-nav-item').first()).toBeVisible();
});
