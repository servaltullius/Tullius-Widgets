export type RuntimeWarningCode =
  | 'none'
  | 'unsupported-runtime'
  | 'missing-address-library'
  | 'unsupported-runtime-and-missing-address-library';

export interface RuntimeDiagnostics {
  runtimeVersion: string;
  skseVersion: string;
  addressLibraryPath: string;
  addressLibraryPresent: boolean;
  runtimeSupported: boolean;
  usesAddressLibrary: boolean;
  warningCode: RuntimeWarningCode;
}
