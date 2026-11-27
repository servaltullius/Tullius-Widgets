import { useSyncExternalStore } from 'react';
import { App } from '../App';
import { SelfTestBanner } from './SelfTestBanner';
import { getAppKey, subscribeAppKey } from './sessionState';

/** The app, which the self-test mounts afresh for every scenario by changing its key, and its banner. */
export function AppRoot() {
  const appKey = useSyncExternalStore(subscribeAppKey, getAppKey);
  return (
    <>
      <App key={appKey} />
      <SelfTestBanner />
    </>
  );
}
