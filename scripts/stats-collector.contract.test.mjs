import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const statsCollectorText = readFileSync(new URL('../src/StatsCollector.cpp', import.meta.url), 'utf8');
const statsPayloadText = readFileSync(new URL('../src/StatsPayload.h', import.meta.url), 'utf8');
const statsWriterHeaderText = readFileSync(new URL('../src/StatsJsonWriter.h', import.meta.url), 'utf8');
const statsWriterText = readFileSync(new URL('../src/StatsJsonWriter.cpp', import.meta.url), 'utf8');

test('stats collector separates payload definitions, collection, and JSON writing by file', () => {
  assert.match(statsPayloadText, /struct StatsPayload \{/);
  assert.match(statsPayloadText, /StatsPayload CollectStatsPayload\(RE::PlayerCharacter\* player\);/);
  assert.match(statsWriterHeaderText, /class StatsJsonWriter \{/);
  assert.match(statsCollectorText, /const auto payload = StatsCollectorInternal::CollectStatsPayload\(player\);/);
  assert.match(statsCollectorText, /StatsCollectorInternal::StatsJsonWriter writer;/);
  assert.doesNotMatch(statsCollectorText, /struct StatsPayload \{/);
  assert.doesNotMatch(statsCollectorText, /class StatsJsonWriter \{/);
});

test('stats collector writer still emits core payload contract sections', () => {
  assert.match(statsWriterText, /\\"schemaVersion\\"/);
  assert.match(statsWriterText, /\\"seq\\"/);
  assert.match(statsWriterText, /\\"calcMeta\\"/);
  assert.match(statsWriterText, /\\"timedEffects\\"/);
  assert.match(statsWriterText, /\\"expectedLevelThreshold\\"/);
  assert.match(statsWriterText, /\\"isInCombat\\"/);
});
