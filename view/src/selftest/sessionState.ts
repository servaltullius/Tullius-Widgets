// What the self-test banner shows, and the key that remounts the app between scenarios. Both live
// outside the app, which the self-test unmounts and mounts again for every scenario.

export type SelfTestPhase = 'off' | 'waiting' | 'running' | 'finished';

export interface SelfTestProgress {
  phase: SelfTestPhase;
  done: number;
  total: number;
  passed: number;
  failed: number;
}

const OFF: SelfTestProgress = { phase: 'off', done: 0, total: 0, passed: 0, failed: 0 };

let progress: SelfTestProgress = OFF;
const progressListeners = new Set<() => void>();

export function getSelfTestProgress(): SelfTestProgress {
  return progress;
}

export function subscribeSelfTestProgress(listener: () => void): () => void {
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
}

export function setSelfTestProgress(next: Partial<SelfTestProgress>): void {
  progress = { ...progress, ...next };
  for (const listener of progressListeners) listener();
}

let appKey = 0;
const appKeyListeners = new Set<() => void>();

export function getAppKey(): number {
  return appKey;
}

export function subscribeAppKey(listener: () => void): () => void {
  appKeyListeners.add(listener);
  return () => appKeyListeners.delete(listener);
}

/** Unmounts the app and mounts a fresh one, as a page reload would but without losing the run. */
export function bumpAppKey(): void {
  appKey += 1;
  for (const listener of appKeyListeners) listener();
}

/** Back to the state before any session, for tests. */
export function resetSelfTestStateForTests(): void {
  progress = OFF;
  appKey = 0;
}
