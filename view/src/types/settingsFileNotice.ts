/**
 * Why the player is being told about their settings file: the saved settings could not be read
 * (the view started from defaults), or a change was then saved over them and the plugin kept the
 * old file under `fileName`.
 */
export type SettingsFileNotice =
  | { kind: 'loadFailed' }
  | { kind: 'backup'; fileName: string };
