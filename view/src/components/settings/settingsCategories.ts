import type { TranslationKey } from '../../i18n/translations';

export type SettingsCategoryId =
  | 'display'
  | 'hotkeys'
  | 'progression'
  | 'combat'
  | 'equipment'
  | 'effects'
  | 'layout'
  | 'slots';

export type SettingsCategoryGroup = 'settings' | 'widgets' | 'layout';

export interface SettingsCategory {
  id: SettingsCategoryId;
  group: SettingsCategoryGroup;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  /** Section ids (`data-section-id`) shown in this category, in order. */
  sections: readonly string[];
}

export const SETTINGS_CATEGORIES: readonly SettingsCategory[] = [
  { id: 'display', group: 'settings', labelKey: 'categoryDisplay', descriptionKey: 'categoryDisplayDescription', sections: ['display', 'appearance'] },
  { id: 'hotkeys', group: 'settings', labelKey: 'categoryHotkeys', descriptionKey: 'categoryHotkeysDescription', sections: ['languageHotkeys'] },
  { id: 'progression', group: 'widgets', labelKey: 'categoryProgression', descriptionKey: 'categoryProgressionDescription', sections: ['experience', 'playerInfo'] },
  { id: 'combat', group: 'widgets', labelKey: 'categoryCombat', descriptionKey: 'categoryCombatDescription', sections: ['resistances', 'defense', 'offense'] },
  { id: 'equipment', group: 'widgets', labelKey: 'categoryEquipment', descriptionKey: 'categoryEquipmentDescription', sections: ['equipped', 'movement'] },
  { id: 'effects', group: 'widgets', labelKey: 'categoryEffects', descriptionKey: 'categoryEffectsDescription', sections: ['time', 'timedEffects'] },
  { id: 'layout', group: 'layout', labelKey: 'categoryLayout', descriptionKey: 'categoryLayoutDescription', sections: ['layoutTools'] },
  { id: 'slots', group: 'layout', labelKey: 'categorySlots', descriptionKey: 'categorySlotsDescription', sections: ['layoutSlots', 'presets'] },
];

export const SETTINGS_CATEGORY_GROUPS: ReadonlyArray<{ id: SettingsCategoryGroup; labelKey: TranslationKey }> = [
  { id: 'settings', labelKey: 'categoryGroupSettings' },
  { id: 'widgets', labelKey: 'categoryGroupWidgets' },
  { id: 'layout', labelKey: 'categoryGroupLayout' },
];

export const SETTINGS_CATEGORY_IDS: readonly SettingsCategoryId[] = SETTINGS_CATEGORIES.map(category => category.id);

export const DEFAULT_SETTINGS_CATEGORY: SettingsCategoryId = 'display';

export function getSettingsCategory(id: SettingsCategoryId): SettingsCategory {
  return SETTINGS_CATEGORIES.find(category => category.id === id) ?? SETTINGS_CATEGORIES[0];
}

/** The category that holds a section, e.g. a widget's registry `groupId`. */
export function findCategoryForSection(sectionId: string): SettingsCategoryId | null {
  return SETTINGS_CATEGORIES.find(category => category.sections.includes(sectionId))?.id ?? null;
}
