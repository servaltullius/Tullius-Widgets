// Shared runner for the host-compiled native tests in this folder. Each
// scripts/*.native.test.mjs file calls defineNativeTest() for one .cpp here.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const srcDir = fileURLToPath(new URL('../../src', import.meta.url));

function findCompiler() {
  const candidates = [process.env.CXX, 'g++', 'clang++'].filter(Boolean);
  return candidates.find((compiler) => spawnSync(compiler, ['--version'], { stdio: 'ignore' }).status === 0);
}

const compiler = findCompiler();

/**
 * Compiles scripts/native-tests/<name>.cpp against src/ with warnings as
 * errors, runs it, and expects "<name>: ok" on stdout.
 */
export function defineNativeTest(title, name) {
  const testSource = fileURLToPath(new URL(`./${name}.cpp`, import.meta.url));

  test(title, { skip: compiler ? false : 'no host C++ compiler (set CXX, or install g++/clang++)' }, () => {
    const workDir = mkdtempSync(join(tmpdir(), `tw-${name}-`));
    try {
      const binary = join(workDir, process.platform === 'win32' ? `${name}.exe` : name);
      const build = spawnSync(
        compiler,
        ['-std=c++20', '-O1', '-Wall', '-Wextra', '-Werror', `-I${srcDir}`, testSource, '-o', binary],
        { encoding: 'utf8' },
      );
      assert.equal(build.status, 0, `compile failed:\n${build.stdout}${build.stderr}`);

      const run = spawnSync(binary, [], { encoding: 'utf8' });
      assert.equal(run.signal, null, `test binary crashed with ${run.signal}:\n${run.stderr}`);
      assert.equal(run.status, 0, `test binary failed:\n${run.stdout}${run.stderr}`);
      assert.match(run.stdout, new RegExp(`${name}: ok`));
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
}
