export {};

declare global {
  interface TulliusWidgetsBridgeV1 {
    updateStats?: (jsonString: string) => void;
    updateSettings?: (jsonString: string) => void;
    updateRuntimeStatus?: (jsonString: string) => void;
    importSettingsFromNative?: (jsonString: string) => void;
    toggleSettings?: () => void;
    toggleWidgetsVisibility?: () => void;
    closeSettings?: () => void;
    setHUDColor?: (hex: string) => void;
  }

  interface TulliusWidgetsBridgeNamespace {
    v1?: TulliusWidgetsBridgeV1;
  }

  interface Window {
    sendDataToSKSE?: unknown;
    TulliusWidgetsBridge?: TulliusWidgetsBridgeNamespace;

    updateStats?: (jsonString: string) => void;
    updateSettings?: (jsonString: string) => void;
    updateRuntimeStatus?: (jsonString: string) => void;
    importSettingsFromNative?: (jsonString: string) => void;
    toggleSettings?: () => void;
    toggleWidgetsVisibility?: () => void;
    closeSettings?: () => void;
    setHUDColor?: (hex: string) => void;

    onSettingsChanged?: (jsonString: string) => void;
    onExportSettings?: (jsonString: string) => void;
    onImportSettings?: (argument: string) => void;
    onRequestUnfocus?: (argument: string) => void;

    onExportResult?: (success: boolean) => void;
    onImportResult?: (success: boolean) => void;
  }
}
