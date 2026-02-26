type BridgeHandlerKey = Extract<keyof TulliusWidgetsBridgeV1, keyof Window>;

type BridgeHandler<K extends BridgeHandlerKey> = NonNullable<TulliusWidgetsBridgeV1[K]>;

function ensureBridgeV1(): TulliusWidgetsBridgeV1 {
  let bridgeNamespace = window.TulliusWidgetsBridge;
  if (!bridgeNamespace) {
    bridgeNamespace = {};
    window.TulliusWidgetsBridge = bridgeNamespace;
  }

  let bridgeV1 = bridgeNamespace.v1;
  if (!bridgeV1) {
    bridgeV1 = {};
    bridgeNamespace.v1 = bridgeV1;
  }

  return bridgeV1;
}

export function registerDualBridgeHandler<K extends BridgeHandlerKey>(
  key: K,
  handler: BridgeHandler<K>,
): () => void {
  const bridgeV1 = ensureBridgeV1();
  const windowBridge = window as Pick<Window, BridgeHandlerKey>;
  const windowHandler = handler as Pick<Window, BridgeHandlerKey>[K];

  bridgeV1[key] = handler;
  windowBridge[key] = windowHandler;

  return () => {
    if (windowBridge[key] === windowHandler) {
      delete windowBridge[key];
    }

    const latestBridgeNamespace = window.TulliusWidgetsBridge;
    const latestBridgeV1 = latestBridgeNamespace?.v1;
    if (latestBridgeV1) {
      if (latestBridgeV1[key] === handler) {
        delete latestBridgeV1[key];
      }
    }

    if (window.TulliusWidgetsBridge?.v1 && Object.keys(window.TulliusWidgetsBridge.v1).length === 0) {
      delete window.TulliusWidgetsBridge.v1;
    }

    if (window.TulliusWidgetsBridge && Object.keys(window.TulliusWidgetsBridge).length === 0) {
      delete window.TulliusWidgetsBridge;
    }
  };
}
