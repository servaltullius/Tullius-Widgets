import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { WidgetSettings } from '../types/settings';
import { serializeSettingsPayload } from './settingsShared';

interface UseSettingsSyncParams {
  settingsRevisionRef: MutableRefObject<number>;
}

export function useSettingsSync({ settingsRevisionRef }: UseSettingsSyncParams) {
  const [lastSettingsSyncOk, setLastSettingsSyncOk] = useState<boolean | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const lastQueuedSettingsJsonRef = useRef('');
  const lastDispatchedSettingsJsonRef = useRef('');
  const lastRetriedSettingsJsonRef = useRef('');
  const allowSameValueRetryRef = useRef(false);

  const dispatchSettingsJson = useCallback((json: string) => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      lastDispatchedSettingsJsonRef.current = json;
      window.onSettingsChanged?.(json);
    }, 200);
  }, []);

  const notifySettingsChanged = useCallback((nextSettings: WidgetSettings, explicitRevision?: number) => {
    const nextRevision = explicitRevision !== undefined
      ? explicitRevision
      : settingsRevisionRef.current + 1;
    settingsRevisionRef.current = Math.max(settingsRevisionRef.current, nextRevision);

    const json = serializeSettingsPayload(nextSettings, settingsRevisionRef.current);
    if (json === lastQueuedSettingsJsonRef.current) {
      return;
    }

    lastQueuedSettingsJsonRef.current = json;
    lastRetriedSettingsJsonRef.current = '';
    allowSameValueRetryRef.current = false;
    dispatchSettingsJson(json);
  }, [dispatchSettingsJson, settingsRevisionRef]);

  const rememberQueuedSettings = useCallback((settings: WidgetSettings, explicitRevision?: number) => {
    const revision = explicitRevision ?? settingsRevisionRef.current;
    settingsRevisionRef.current = Math.max(settingsRevisionRef.current, revision);
    lastQueuedSettingsJsonRef.current = serializeSettingsPayload(settings, settingsRevisionRef.current);
    lastRetriedSettingsJsonRef.current = '';
    allowSameValueRetryRef.current = false;
  }, [settingsRevisionRef]);

  const handleSettingsSyncResult = useCallback((success: boolean) => {
    setLastSettingsSyncOk(success);
    if (success) {
      lastRetriedSettingsJsonRef.current = '';
      allowSameValueRetryRef.current = false;
      return;
    }

    console.error('Settings save failed in native layer');
    allowSameValueRetryRef.current = true;
    const failedJson = lastDispatchedSettingsJsonRef.current;
    if (
      failedJson === ''
      || failedJson !== lastQueuedSettingsJsonRef.current
      || failedJson === lastRetriedSettingsJsonRef.current
    ) {
      return;
    }

    lastRetriedSettingsJsonRef.current = failedJson;
    dispatchSettingsJson(failedJson);
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
    notifySettingsChanged,
    rememberQueuedSettings,
    handleSettingsSyncResult,
    retryPersistedSettings,
  };
}
