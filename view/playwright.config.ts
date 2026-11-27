import { defineConfig, devices } from '@playwright/test';

// Browser tests of the view: the HUD and settings window running in Chromium against the Vite
// dev server, with the plugin's side played by the page's bridge functions (see e2e/hud.ts).
// Game-engine (Ultralight) behaviour still needs a check in game.
const PORT = 5299;
// The in-game self-test runs against the production build, as shipped (e2e/selfTest.e2e.ts).
export const PREVIEW_PORT = 5298;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // The default layouts are drawn for 1920×1080.
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } }],
  webServer: [
    {
      command: `npx vite --port ${PORT} --strictPort --host 127.0.0.1`,
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npx vite build --outDir e2e-dist --emptyOutDir --logLevel warn && npx vite preview --outDir e2e-dist --port ${PREVIEW_PORT} --strictPort --host 127.0.0.1`,
      url: `http://127.0.0.1:${PREVIEW_PORT}`,
      // Never reused: a preview left running serves the build it was started with, not the code
      // under test. A server still on the port stops the run with an error instead.
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
