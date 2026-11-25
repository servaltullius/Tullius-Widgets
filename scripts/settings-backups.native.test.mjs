import { defineNativeTest } from './native-tests/harness.mjs';

defineNativeTest(
  'settings saves keep the old file when the view never took it in, and once per session',
  'settings_backups_test',
);
