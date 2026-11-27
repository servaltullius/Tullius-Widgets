import { expect, test } from '@playwright/test';
import { boxOf, openHud, overlaps, sendStats, widget } from './hud';

// The days-passed widget (docs/plans/2026-11-25-days-passed-widget.md).

const LAYOUTS = [
  { name: 'compact, standard icons', hudStyle: 'compact', iconTheme: 'standard', text: /지난\s*41일/ },
  { name: 'compact, Dororong icons', hudStyle: 'compact', iconTheme: 'dororong', text: /지난\s*41일/ },
  { name: 'classic', hudStyle: 'classic', iconTheme: 'standard', text: /41일/ },
] as const;

for (const layout of LAYOUTS) {
  test(`days passed shows whole days clear of the play time (${layout.name})`, async ({ page }) => {
    await openHud(page, {
      general: { onboardingSeen: true, hudStyle: layout.hudStyle, iconTheme: layout.iconTheme, language: 'ko' },
      time: { daysPassed: true, playtime: true },
    });
    // A long play time is the widest the neighbour gets in practice.
    await sendStats(page, { time: { daysPassed: 41 }, playerInfo: { playtimeHours: 1234.9 } });

    const days = widget(page, 'time.daysPassed');
    await expect(days).toHaveText(layout.text);
    const playtime = widget(page, 'time.playtime');
    await expect(playtime).toContainText('1,234');
    expect(overlaps(await boxOf(days), await boxOf(playtime))).toBe(false);
  });
}
