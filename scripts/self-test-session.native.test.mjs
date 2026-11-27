import { defineNativeTest } from './native-tests/harness.mjs';

defineNativeTest(
  'a self-test session starts only with the marker, asks the page to run, and keeps its report whole',
  'self_test_session_test',
);
