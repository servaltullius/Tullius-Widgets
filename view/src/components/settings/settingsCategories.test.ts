import { describe, expect, it } from 'vitest';
import { WIDGET_ITEM_REGISTRY } from '../../data/widgetItemRegistry';
import { SETTINGS_CATEGORIES, SETTINGS_CATEGORY_GROUPS, findCategoryForSection, getSettingsCategory } from './settingsCategories';

describe('settingsCategories', () => {
  it('lists every category under a known group, each section once', () => {
    const groupIds = SETTINGS_CATEGORY_GROUPS.map(group => group.id);
    const sections = SETTINGS_CATEGORIES.flatMap(category => category.sections);
    expect(SETTINGS_CATEGORIES.every(category => groupIds.includes(category.group))).toBe(true);
    expect(new Set(sections).size).toBe(sections.length);
  });

  it('gives every widget a category for "related settings"', () => {
    const missing = Object.values(WIDGET_ITEM_REGISTRY)
      .filter(entry => findCategoryForSection(entry.legacyGroupId) === null)
      .map(entry => entry.id);
    expect(missing).toEqual([]);
  });

  it('maps sections to their categories', () => {
    expect(findCategoryForSection('playerInfo')).toBe('progression');
    expect(findCategoryForSection('offense')).toBe('combat');
    expect(findCategoryForSection('movement')).toBe('equipment');
    expect(findCategoryForSection('timedEffects')).toBe('effects');
    expect(findCategoryForSection('layoutSlots')).toBe('slots');
    expect(findCategoryForSection('unknown')).toBeNull();
  });

  it('falls back to the first category for an unknown id', () => {
    expect(getSettingsCategory('nope' as never).id).toBe('display');
  });
});
