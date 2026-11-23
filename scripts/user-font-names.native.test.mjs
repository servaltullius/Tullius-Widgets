import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineNativeTest } from './native-tests/harness.mjs';

// The view tests use the same table (view/src/data/userFonts.test.ts), so the plugin and the
// view accept and reject exactly the same folder and file names.
const nameCases = JSON.parse(readFileSync(new URL('../view/src/data/userFontNameCases.json', import.meta.url), 'utf8'));

// The plugin sees names as UTF-8 bytes. A lone UTF-16 surrogate cannot be encoded, so it becomes
// the three bytes a naive encoder would emit (ED A0 80), which a strict UTF-8 check must reject.
function utf8Bytes(text) {
  const bytes = [];
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes.push(...Buffer.from(text.slice(i, i + 2), 'utf8'));
        i++;
        continue;
      }
    }
    if (unit >= 0xd800 && unit <= 0xdfff) {
      bytes.push(0xe0 | (unit >> 12), 0x80 | ((unit >> 6) & 0x3f), 0x80 | (unit & 0x3f));
      continue;
    }
    bytes.push(...Buffer.from(text[i], 'utf8'));
  }
  return bytes;
}

function writeNameCases(workDir) {
  const lines = nameCases.map(({ label, name, repeat = 1, suffix = '', valid }) => {
    const bytes = utf8Bytes(name.repeat(repeat) + suffix);
    const escaped = bytes.map(byte => `\\x${byte.toString(16).padStart(2, '0')}`).join('');
    return `{ ${JSON.stringify(label)}, std::string("${escaped}", ${bytes.length}), ${valid} },`;
  });
  writeFileSync(join(workDir, 'user_font_name_cases.inc'), `${lines.join('\n')}\n`);
}

defineNativeTest(
  'native user font name rules accept and reject the same names as the view',
  'user_font_names_test',
  { prepare: writeNameCases },
);
