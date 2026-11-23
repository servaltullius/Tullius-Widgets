import { defineNativeTest } from './native-tests/harness.mjs';

defineNativeTest(
  'settings JSON member lookup matches only real member names at the requested path',
  'json_utils_test',
);
