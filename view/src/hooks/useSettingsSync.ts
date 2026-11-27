import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { BRIDGE_CALLBACKS } from '../constants/bridge';
import { callNative } from '../utils/nativeCalls';
import type { WidgetSettings } from '../types/settings';
import { serializeSettingsPayload, type LoadedSettingsFile } from './settingsShared';

export type SettingsSyncState = 'idle' | 'retrying' | 'failed' | 'saved';

interface UseSettingsSyncParams {
  settingsRevisionRef: MutableRefObject<number>;
  /** The saved file this view took in; sent with every save. */
  loadedSettingsFileRef: MutableRefObject<LoadedSettingsFile>;
}

export function useSettingsSync({ settingsRevisionRef, loadedSettingsFileRef }: UseSettingsSyncParams) {
  const [lastSettingsSyncOk, setLastSettingsSyncOk] = useState<boolean | null>(null);
  const [settingsSyncState, setSettingsSyncState] = useState<SettingsSyncState>('idle');
  const debounceTimerRef = useRef<number | null>(null);
  const lastQueuedSettingsJsonRef = useRef('');
  const lastQueuedSettingsRevisionRef = useRef<number | null>(null);
  const lastDispatchedSettingsJsonRef = useRef('');
  const lastDispatchedSettingsRevisionRef = useRef<number | null>(null);
  const lastRetriedSettingsJsonRef = useRef('');
  const lastRetriedSettingsRevisionRef = useRef<number | null>(null);
  const allowSameValueRetryRef = useRef(false);
  const warnedLegacySyncResultRef = useRef(false);

  const dispatchSettingsJson = useCallback((json: string, revision: number) => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      lastDispatchedSettingsJsonRef.current = json;
      lastDispatchedSettingsRevisionRef.current = revision;
      callNative(BRIDGE_CALLBACKS.onSettingsChanged, json);
    }, 200);
  }, []);

  const notifySettingsChanged = useCallback((nextSettings: WidgetSettings, explicitRevision?: number) => {
    const nextRevision = explicitRevision !== undefined
      ? explicitRevision
      : settingsRevisionRef.current + 1;
    settingsRevisionRef.current = Math.max(settingsRevisionRef.current, nextRevision);

    const json = serializeSettingsPayload(nextSettings, settingsRevisionRef.current, loadedSettingsFileRef.current);
    if (json === lastQueuedSettingsJsonRef.current) {
      return;
    }

    lastQueuedSettingsJsonRef.current = json;
    lastQueuedSettingsRevisionRef.current = settingsRevisionRef.current;
    lastRetriedSettingsJsonRef.current = '';
    lastRetriedSettingsRevisionRef.current = null;
    allowSameValueRetryRef.current = false;
    setSettingsSyncState('idle');
    dispatchSettingsJson(json, settingsRevisionRef.current);
  }, [dispatchSettingsJson, loadedSettingsFileRef, settingsRevisionRef]);

  const rememberQueuedSettings = useCallback((settings: WidgetSettings, explicitRevision?: number) => {
    const revision = explicitRevision ?? settingsRevisionRef.current;
    settingsRevisionRef.current = Math.max(settingsRevisionRef.current, revision);
    // Settings that just came in from the file replace anything still waiting to be sent: a save
    // queued before them would otherwise write the older state over the file just read.
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    lastQueuedSettingsJsonRef.current = serializeSettingsPayload(
      settings,
      settingsRevisionRef.current,
      loadedSettingsFileRef.current,
    );
    lastQueuedSettingsRevisionRef.current = settingsRevisionRef.current;
    lastRetriedSettingsJsonRef.current = '';
    lastRetriedSettingsRevisionRef.current = null;
    allowSameValueRetryRef.current = false;
    setSettingsSyncState('idle');
  }, [loadedSettingsFileRef, settingsRevisionRef]);

  const handleSettingsSyncResult = useCallback((success: boolean, revision?: number) => {
    const queuedRevision = lastQueuedSettingsRevisionRef.current;
    const dispatchedRevision = lastDispatchedSettingsRevisionRef.current;
    let effectiveRevision = revision;

    if (effectiveRevision === undefined) {
      if (!warnedLegacySyncResultRef.current) {
        warnedLegacySyncResultRef.current = true;
        console.warn(
          '[TulliusWidgets] Received legacy settings sync result without revision. Stale ack detection is limited until the native bridge is updated.',
        );
      }
      effectiveRevision = dispatchedRevision ?? undefined;
    }

    const newestKnownRevision = Math.max(
      queuedRevision ?? -1,
      dispatchedRevision ?? -1,
    );
    if (effectiveRevision !== undefined && effectiveRevision < newestKnownRevision) {
      return;
    }

    setLastSettingsSyncOk(success);
    if (success) {
      lastRetriedSettingsJsonRef.current = '';
      lastRetriedSettingsRevisionRef.current = null;
      allowSameValueRetryRef.current = false;
      setSettingsSyncState('saved');
      return;
    }

    console.error('Settings save failed in native layer');
    allowSameValueRetryRef.current = true;
    const failedJson = lastDispatchedSettingsJsonRef.current;
    const failedRevision = lastDispatchedSettingsRevisionRef.current;
    if (
      failedJson === ''
      || failedRevision === null
      || (queuedRevision !== null && failedRevision < queuedRevision)
      || failedJson !== lastQueuedSettingsJsonRef.current
      || failedRevision !== lastQueuedSettingsRevisionRef.current
      || (failedJson === lastRetriedSettingsJsonRef.current
        && failedRevision === lastRetriedSettingsRevisionRef.current)
    ) {
      setSettingsSyncState('failed');
      return;
    }

    lastRetriedSettingsJsonRef.current = failedJson;
    lastRetriedSettingsRevisionRef.current = failedRevision;
    setSettingsSyncState('retrying');
    dispatchSettingsJson(failedJson, failedRevision);
  }, [dispatchSettingsJson]);

  const retryPersistedSettings = useCallback((currentSettings: WidgetSettings) => {
    if (!allowSameValueRetryRef.current) {
      return false;
    }

    allowSameValueRetryRef.current = false;
    notifySettingsChanged(currentSettings, settingsRevisionRef.current + 1);
    return true;
  }, [notifySettingsChanged, settingsRevisionRef]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    lastSettingsSyncOk,
    settingsSyncState,
    notifySettingsChanged,
    rememberQueuedSettings,
    handleSettingsSyncResult,
    retryPersistedSettings,
  };
}
