import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const srcDir = fileURLToPath(new URL('../src', import.meta.url));
const testSource = fileURLToPath(new URL('./native-tests/user_font_names_test.cpp', import.meta.url));
const nameCases = JSON.parse(readFileSync(new URL('../view/src/data/userFontNameCases.json', import.meta.url), 'utf8'));

function findCompiler() {
  const candidates = [process.env.CXX, 'g++', 'clang++'].filter(Boolean);
  return candidates.find((compiler) => spawnSync(compiler, ['--version'], { stdio: 'ignore' }).status === 0);
}

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

function cppBytes(text) {
  return utf8Bytes(text).map(byte => `\\x${byte.toString(16).padStart(2, '0')}`).join('');
}

function caseName({ name, repeat = 1, suffix = '' }) {
  return name.repeat(repeat) + suffix;
}

const compiler = findCompiler();

test(
  'native user font name rules accept and reject the same names as the view',
  { skip: compiler ? false : 'no host C++ compiler (set CXX, or install g++/clang++)' },
  () => {
    const workDir = mkdtempSync(join(tmpdir(), 'tw-user-font-names-'));
    try {
      const cases = nameCases.map(nameCase => {
        const name = caseName(nameCase);
        // Separate literals keep a \x escape from swallowing the following hex digits.
        return `{ ${JSON.stringify(nameCase.label)}, std::string("${cppBytes(name)}", ${utf8Bytes(name).length}), ${nameCase.valid} },`;
      });
      writeFileSync(join(workDir, 'user_font_name_cases.inc'), `${cases.join('\n')}\n`);

      const binary = join(workDir, process.platform === 'win32' ? 'user_font_names_test.exe' : 'user_font_names_test');
      const build = spawnSync(
        compiler,
        ['-std=c++23', '-O1', '-Wall', '-Wextra', '-Werror', `-I${srcDir}`, `-I${workDir}`, testSource, '-o', binary],
        { encoding: 'utf8' },
      );
      assert.equal(build.status, 0, `compile failed:\n${build.stdout}${build.stderr}`);

      const run = spawnSync(binary, [], { encoding: 'utf8' });
      assert.equal(run.signal, null, `test binary crashed with ${run.signal}:\n${run.stderr}`);
      assert.equal(run.status, 0, `test binary failed:\n${run.stdout}${run.stderr}`);
      assert.match(run.stdout, /user_font_names_test: ok/);
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  },
);
