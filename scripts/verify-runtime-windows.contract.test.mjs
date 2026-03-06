import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scriptText = readFileSync(new URL('./verify-runtime-windows.ps1', import.meta.url), 'utf8');
const sharedLibText = readFileSync(new URL('./release-local.lib.ps1', import.meta.url), 'utf8');

test('CreateLocalPackage only skips release-local phases that were already verified in this run', () => {
  assert.match(scriptText, /\.\s+\(Join-Path \$scriptDir "release-local\.lib\.ps1"\)/);
  assert.match(
    scriptText,
    /Get-ReleaseLocalArgumentsForPackaging\s*`\s*-SkipFrontendChecks:\$SkipFrontendChecks\s*`\s*-SkipPluginBuild:\$SkipPluginBuild/s,
  );
  assert.match(scriptText, /& "\$scriptDir\/release-local\.ps1" @releaseLocalArguments/);
  assert.match(sharedLibText, /function Get-ReleaseLocalArgumentsForPackaging/);
  assert.doesNotMatch(
    scriptText,
    /release-local\.ps1" -NoPublish -SkipLint -SkipFrontendBuild -SkipPluginBuild/,
  );
});

test('verify-runtime-windows reuses shared helpers instead of redefining them locally', () => {
  assert.doesNotMatch(scriptText, /function Require-Command/);
  assert.doesNotMatch(scriptText, /function Parse-VersionFromXmake/);
  assert.doesNotMatch(scriptText, /function Get-ReleaseLocalArgumentsForPackaging/);
  assert.match(sharedLibText, /function Parse-VersionFromXmake/);
  assert.match(sharedLibText, /function Assert-TulliusWidgetsBuildOutputs/);
});

test('verify-runtime-windows stages frontend and plugin builds when launched from a WSL UNC worktree', () => {
  assert.match(scriptText, /\$usesUncWorkRoot = \$workRoot\.StartsWith\("\\\\"\)/);
  assert.match(scriptText, /Get-WslContext -Path \$workRoot/);
  assert.match(scriptText, /Prepare-FrontendBuildWorkspace -SourceRoot \$repoRoot -WslContext \$wslContext/);
  assert.match(scriptText, /Prepare-PluginBuildWorkspace -SourceRoot \$repoRoot -WslContext \$wslContext/);
  assert.match(scriptText, /Invoke-CmdCommands -Path \$frontendViewPath -Commands @\(/);
  assert.match(scriptText, /Invoke-CmdCommands -Path \$pluginBuildRoot -Commands @\(/);
  assert.match(scriptText, /Remove-StageRoots -Paths \$stageRoots/);
});
