import type { WidgetItemLayout, WidgetSettings } from '../types/settings';
import { getWidgetItemDefaultZIndex } from '../data/widgetItemRegistry';
import { isPlainObject } from '../utils/normalize';

export const SETTINGS_SCHEMA_VERSION = 5;

const DEFAULT_ITEM_LAYOUT: WidgetItemLayout = {
  visible: true,
  x: 0,
  y: 0,
  scale: 1,
  locked: false,
  zIndex: 0,
};

function getDefaultItemLayout(itemId: string): WidgetItemLayout {
  return {
    ...DEFAULT_ITEM_LAYOUT,
    zIndex: getWidgetItemDefaultZIndex(itemId),
  };
}

export function readRevision(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const revision = Math.trunc(value);
  if (revision < 0) return null;
  return revision;
}

export function serializeSettingsPayload(settings: WidgetSettings, revision: number): string {
  return JSON.stringify({
    ...settings,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    rev: revision,
  });
}

export function updateValueByPath(current: WidgetSettings, path: string, value: unknown): WidgetSettings {
  if (path.startsWith('itemLayouts.')) {
    const keys = path.split('.');
    if (keys.length >= 3) {
      const itemId = keys.slice(1, -1).join('.');
      const leafKey = keys[keys.length - 1] as keyof WidgetItemLayout;
      if (
        leafKey === 'visible'
        || leafKey === 'x'
        || leafKey === 'y'
        || leafKey === 'scale'
        || leafKey === 'locked'
        || leafKey === 'zIndex'
      ) {
        const currentItem = current.itemLayouts[itemId] ?? getDefaultItemLayout(itemId);
        if (Object.is(currentItem[leafKey], value)) {
          return current;
        }

        return {
          ...current,
          itemLayouts: {
            ...current.itemLayouts,
            [itemId]: {
              ...currentItem,
              [leafKey]: value,
            },
          },
        };
      }
    }
  }

  const keys = path.split('.');
  if (keys.length === 0) return current;

  const parentChain: Array<{ parent: Record<string, unknown>; key: string }> = [];
  let cursor: unknown = current as unknown as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!isPlainObject(cursor)) return current;
    const parent = cursor as Record<string, unknown>;
    const key = keys[i];
    const next = parent[key];
    if (!isPlainObject(next)) return current;
    parentChain.push({ parent, key });
    cursor = next;
  }

  if (!isPlainObject(cursor)) return current;

  const leafParent = cursor as Record<string, unknown>;
  const leafKey = keys[keys.length - 1];
  if (Object.is(leafParent[leafKey], value)) return current;

  let updatedNode: Record<string, unknown> = {
    ...leafParent,
    [leafKey]: value,
  };
  for (let i = parentChain.length - 1; i >= 0; i--) {
    const { parent, key } = parentChain[i];
    updatedNode = {
      ...parent,
      [key]: updatedNode,
    };
  }

  return updatedNode as unknown as WidgetSettings;
}
