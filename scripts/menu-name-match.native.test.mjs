import { defineNativeTest } from './native-tests/harness.mjs';

defineNativeTest('menu name matcher rejects corrupted names without reading past them', 'menu_name_match_test');
