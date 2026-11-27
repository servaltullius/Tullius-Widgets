import { BRIDGE_CALLBACKS } from '../constants/bridge';

/** The calls this page makes into the plugin (each a function the plugin puts on `window`). */
export type NativeCallName =
  | typeof BRIDGE_CALLBACKS.onSettingsChanged
  | typeof BRIDGE_CALLBACKS.onSettingsLoadFailed
  | typeof BRIDGE_CALLBACKS.onRequestUnfocus
  | typeof BRIDGE_CALLBACKS.onSettingsVisibilityChanged
  | typeof BRIDGE_CALLBACKS.onExportSettings
  | typeof BRIDGE_CALLBACKS.onImportSettings
  | typeof BRIDGE_CALLBACKS.onHotkeyCapture
  | typeof BRIDGE_CALLBACKS.onEscapeOwner;

type Interceptor = (name: NativeCallName, argument: string) => void;

let interceptor: Interceptor | null = null;

/**
 * Calls the plugin, or hands the call to the self-test while one runs (the plugin then hears
 * nothing: no save, no focus change). Returns whether the call went somewhere.
 */
export function callNative(name: NativeCallName, argument: string): boolean {
  if (interceptor) {
    interceptor(name, argument);
    return true;
  }
  const target = window[name];
  if (typeof target !== 'function') return false;
  target(argument);
  return true;
}

/** Holds every call to the plugin until the returned function is called. One holder at a time. */
export function interceptNativeCalls(handler: Interceptor): () => void {
  if (interceptor) {
    throw new Error('native calls are already intercepted');
  }
  interceptor = handler;
  return () => {
    if (interceptor === handler) interceptor = null;
  };
}

export function isInterceptingNativeCalls(): boolean {
  return interceptor !== null;
}
