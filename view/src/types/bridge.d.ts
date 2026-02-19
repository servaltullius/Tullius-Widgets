export {};

declare global {
  interface Window {
    sendDataToSKSE?: unknown;

    updateStats?: (jsonString: string) => void;
    updateSettings?: (jsonString: string) => void;
    importSettingsFromNative?: (jsonString: string) => void;
    toggleSettings?: () => void;
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
