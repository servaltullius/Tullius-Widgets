import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../data/defaultSettings';
import { updateValueByPath } from './settingsShared';

describe('settingsShared.updateValueByPath', () => {
  it('updates a dotted item id show-when policy and rejects unknown values', () => {
    const settings = structuredClone(defaultSettings);
    const next = updateValueByPath(settings, 'itemLayouts.player.gold.showWhen', 'combat');
    expect(next).not.toBe(settings);
    expect(next.itemLayouts['player.gold'].showWhen).toBe('combat');

    const rejected = updateValueByPath(next, 'itemLayouts.player.gold.showWhen', 'sometimes');
    expect(rejected.itemLayouts['player.gold'].showWhen).toBe('combat');
  });
});
