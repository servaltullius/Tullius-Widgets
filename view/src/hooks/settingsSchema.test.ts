import { describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../data/defaultSettings';
import {
  acceptIncomingSettingsRevision,
  mergeWithDefaults,
  warnFutureSettingsSchemaVersion,
} from './settingsSchema';

describe('settingsSchema', () => {
  it('drops invalid positions while preserving valid widget coordinates', () => {
    const merged = mergeWithDefaults({
      positions: {
        playerInfo: { x: 120, y: 240 },
        brokenA: { x: 'bad', y: 10 },
        brokenB: 10,
      },
    });

    expect(merged.positions).toEqual({
      playerInfo: { x: 120, y: 240 },
    });
  });

  it('warns only once for future schema version payloads', () => {
    const warnedFutureSettingsSchemaRef = { current: false };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    warnFutureSettingsSchemaVersion({ schemaVersion: 99 }, warnedFutureSettingsSchemaRef);
    warnFutureSettingsSchemaVersion({ schemaVersion: 100 }, warnedFutureSettingsSchemaRef);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects stale incoming revisions', () => {
    const lastAppliedSettingsRevisionRef = { current: 5 };
    const settingsRevisionRef = { current: 5 };

    const accepted = acceptIncomingSettingsRevision(
      { ...defaultSettings, rev: 4 },
      lastAppliedSettingsRevisionRef,
      settingsRevisionRef,
    );

    expect(accepted).toBe(false);
    expect(settingsRevisionRef.current).toBe(5);
  });
});
