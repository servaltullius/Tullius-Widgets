// The in-game self-test (docs/plans/2026-11-26-in-game-self-test.md). The plugin calls
// enterSelfTestSession() when the view is ready in a self-test session, then runSelfTest() once
// the game has loaded. From then on no call reaches the plugin except the reports: the scenarios
// save, open the settings window and so on, and the plugin never hears of it.

import { BRIDGE_CALLBACKS, BRIDGE_HANDLERS } from '../constants/bridge';
import { restoreSettingsPanelStorage, snapshotSettingsPanelStorage } from '../components/settings/settingsPanelState';
import { SETTINGS_SCHEMA_VERSION } from '../hooks/settingsShared';
import { registerDualBridgeHandler } from '../utils/bridge';
import { interceptNativeCalls, type NativeCallName } from '../utils/nativeCalls';
import { ScenarioFailure, click, isShown, nextFrame, query, waitFor } from './driver';
import { SCENARIOS, type Scenario, type ScenarioContext } from './scenarios';
import { bumpAppKey, getSelfTestProgress, setSelfTestProgress } from './sessionState';

export interface ScenarioResult {
  id: string;
  name: string;
  ok: boolean;
  ms: number;
  error?: string;
  details?: Record<string, unknown>;
  measurements: Record<string, unknown>;
}

export interface SelfTestReport {
  runId: string;
  status: 'started' | 'running' | 'finished';
  pluginVersion: string;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
  view: {
    bundle: string;
    userAgent: string;
    viewport: { width: number; height: number; devicePixelRatio: number };
  };
  /** Calls the page made that were held back from the plugin, by name. */
  nativeCallsHeld: Record<string, number>;
  summary: { passed: number; failed: number; total: number };
  results: ScenarioResult[];
  cleanupError?: string;
}

interface HeldCall {
  name: NativeCallName;
  argument: string;
}

// The settings the page shows outside the run: the defaults, without the first-run guide.
const NEUTRAL_SETTINGS = { general: { onboardingSeen: true } };

let releaseNativeCalls: (() => void) | null = null;
let heldCalls: HeldCall[] = [];
const heldCounts: Record<string, number> = {};
let running = false;
let lastReport: SelfTestReport | null = null;

function holdNativeCalls(): void {
  if (releaseNativeCalls) return;
  releaseNativeCalls = interceptNativeCalls((name, argument) => {
    heldCalls.push({ name, argument });
    heldCounts[name] = (heldCounts[name] ?? 0) + 1;
  });
}

function sendSettingsPayload(settings: object | string): void {
  const json = typeof settings === 'string'
    ? settings
    : JSON.stringify({ schemaVersion: SETTINGS_SCHEMA_VERSION, ...settings });
  window.updateSettings?.(json);
}

function sendReport(report: SelfTestReport): void {
  try {
    window[BRIDGE_CALLBACKS.onSelfTestReport]?.(JSON.stringify(report));
  } catch (error) {
    console.error('[TulliusWidgets] Failed to send the self-test report:', error);
  }
}

/** A fresh app, as a page reload would give, without ending the run. */
async function remountApp(): Promise<void> {
  const before = window.updateSettings;
  bumpAppKey();
  await waitFor('the app to mount again', () =>
    typeof window.updateSettings === 'function'
    && window.updateSettings !== before
    && typeof window.updateStats === 'function', 5000);
  await nextFrame();
}

function createContext(measurements: Record<string, unknown>): ScenarioContext {
  return {
    async openHud(settings) {
      await remountApp();
      heldCalls = [];
      sendSettingsPayload(settings);
      // In the game nothing is drawn until the first stats arrive.
      window.updateStats?.(JSON.stringify({ timedEffects: [] }));
      await waitFor('the HUD to draw', () => document.querySelector('[data-widget-item-id]'));
      await nextFrame();
    },
    sendStats(stats) {
      window.updateStats?.(JSON.stringify(stats));
    },
    async openSettings(category) {
      if (!isShown(query('.tw-w-nav-item'))) window.toggleSettings?.();
      const item = await waitFor(`the ${category} category`, () => {
        const element = query(`.tw-w-nav-item[data-category="${category}"]`);
        return isShown(element) ? element : null;
      });
      await click(item, `the ${category} category`);
      await waitFor(`the ${category} category to open`, () => item.getAttribute('aria-selected') === 'true');
      await nextFrame();
    },
    saves() {
      return heldCalls
        .filter(call => call.name === BRIDGE_CALLBACKS.onSettingsChanged)
        .map(call => JSON.parse(call.argument) as Record<string, unknown>);
    },
    record(name, value) {
      measurements[name] = value;
    },
  };
}

async function runScenario(scenario: Scenario): Promise<ScenarioResult> {
  const measurements: Record<string, unknown> = {};
  const startedAt = Date.now();
  try {
    await scenario.run(createContext(measurements));
    return { id: scenario.id, name: scenario.name, ok: true, ms: Date.now() - startedAt, measurements };
  } catch (error) {
    return {
      id: scenario.id,
      name: scenario.name,
      ok: false,
      ms: Date.now() - startedAt,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      details: error instanceof ScenarioFailure ? error.details : undefined,
      measurements,
    };
  }
}

function describeView(): SelfTestReport['view'] {
  return {
    bundle: document.querySelector('script[type="module"][src]')?.getAttribute('src') ?? '',
    userAgent: navigator.userAgent,
    viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
  };
}

/** The page is in a self-test session: hold every call to the plugin and show the notice. */
export async function enterSelfTestSession(): Promise<void> {
  holdNativeCalls();
  if (getSelfTestProgress().phase !== 'off') return;
  setSelfTestProgress({ phase: 'waiting', total: SCENARIOS.length });
  try {
    await waitFor('the app', () => typeof window.updateSettings === 'function', 5000);
    // A run that began meanwhile has given the page its own settings.
    if (running || getSelfTestProgress().phase !== 'waiting') return;
    sendSettingsPayload(NEUTRAL_SETTINGS);
  } catch (error) {
    console.error('[TulliusWidgets] The self-test session could not set up the page:', error);
  }
}

export async function runSelfTest(runId: string, pluginVersion = '', scenarios: readonly Scenario[] = SCENARIOS): Promise<SelfTestReport> {
  // The plugin asks again when it did not hear that the run started; answer with where it is.
  if (lastReport && lastReport.runId === runId && (running || lastReport.status === 'finished')) {
    sendReport(lastReport);
    return lastReport;
  }
  if (running) {
    throw new Error('a self-test run is already going');
  }

  running = true;
  holdNativeCalls();
  // The scenarios open the settings window, which remembers its category and side.
  const panelStorage = snapshotSettingsPanelStorage();
  const startedAt = new Date().toISOString();
  const results: ScenarioResult[] = [];
  const build = (status: SelfTestReport['status'], extra: Partial<SelfTestReport> = {}): SelfTestReport => {
    const passed = results.filter(result => result.ok).length;
    const now = new Date().toISOString();
    return {
      runId,
      status,
      pluginVersion,
      startedAt,
      updatedAt: now,
      finishedAt: status === 'finished' ? now : null,
      view: describeView(),
      nativeCallsHeld: { ...heldCounts },
      summary: { passed, failed: results.length - passed, total: scenarios.length },
      results: [...results],
      ...extra,
    };
  };

  try {
    setSelfTestProgress({ phase: 'running', done: 0, total: scenarios.length, passed: 0, failed: 0 });
    lastReport = build('started');
    sendReport(lastReport);

    for (const scenario of scenarios) {
      results.push(await runScenario(scenario));
      const passed = results.filter(result => result.ok).length;
      setSelfTestProgress({ done: results.length, passed, failed: results.length - passed });
      lastReport = build('running');
      sendReport(lastReport);
    }

    let cleanupError: string | undefined;
    try {
      await remountApp();
      sendSettingsPayload(NEUTRAL_SETTINGS);
    } catch (error) {
      cleanupError = error instanceof Error ? error.message : String(error);
    }

    lastReport = build('finished', cleanupError ? { cleanupError } : {});
    sendReport(lastReport);
    setSelfTestProgress({ phase: 'finished' });
    return lastReport;
  } finally {
    restoreSettingsPanelStorage(panelStorage);
    running = false;
  }
}

/** Puts enterSelfTestSession() and runSelfTest() where the plugin calls them. */
export function installSelfTestBridge(): () => void {
  const unregister = [
    registerDualBridgeHandler(BRIDGE_HANDLERS.enterSelfTestSession, () => {
      void enterSelfTestSession();
    }),
    registerDualBridgeHandler(BRIDGE_HANDLERS.runSelfTest, (runId: string, pluginVersion?: string) => {
      void runSelfTest(runId, pluginVersion).catch(error => {
        console.error('[TulliusWidgets] The self-test run failed:', error);
      });
    }),
  ];
  return () => {
    for (const release of unregister) release();
  };
}

/** Back to the state before any session, for tests. */
export function resetSelfTestRunnerForTests(): void {
  releaseNativeCalls?.();
  releaseNativeCalls = null;
  heldCalls = [];
  for (const key of Object.keys(heldCounts)) delete heldCounts[key];
  running = false;
  lastReport = null;
}
