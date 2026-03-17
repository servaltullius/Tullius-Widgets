import { getWidgetDefaultPositions, type WidgetGroupId } from './widgetRegistry';
import type {
  GroupPosition,
  WidgetItemLayout,
  WidgetLayout,
  WidgetSettings,
  WidgetSize,
} from '../types/settings';
import type { TranslationKey } from '../i18n/translations';
import { isPlainObject } from '../utils/normalize';

export type WidgetRendererKind = 'stat' | 'experience' | 'timed-effects-list';

export interface WidgetPlacementHint {
  groupId: WidgetGroupId;
  order: number;
}

export interface WidgetItemRegistryEntry {
  id: string;
  rendererKind: WidgetRendererKind;
  legacyGroupId: WidgetGroupId;
  visibilityPath: string;
  labelKey: TranslationKey;
  minScale: number;
  maxScale: number;
  defaultPlacementHint: WidgetPlacementHint;
}

export interface LegacyWidgetLayoutSource {
  general: Pick<WidgetSettings['general'], 'size'>;
  resistances: WidgetSettings['resistances'];
  defense: WidgetSettings['defense'];
  offense: WidgetSettings['offense'];
  equipped: WidgetSettings['equipped'];
  timedEffects: Pick<WidgetSettings['timedEffects'], 'enabled'>;
  movement: WidgetSettings['movement'];
  time: WidgetSettings['time'];
  experience: WidgetSettings['experience'];
  playerInfo: WidgetSettings['playerInfo'];
  positions: Record<string, GroupPosition>;
  layouts: Record<string, WidgetLayout>;
  groupScales: Record<string, number>;
}

const DEFAULT_MIN_SCALE = 0.7;
const DEFAULT_MAX_SCALE = 2.4;
const VERTICAL_ITEM_STEP = 54;
const HORIZONTAL_ITEM_STEP = 132;

const LEGACY_WIDGET_SIZE_SCALE_MAP: Record<WidgetSize, number> = {
  xsmall: 0.85,
  small: 1.0,
  medium: 1.3,
  large: 1.6,
};

const WIDGET_ITEM_REGISTRY_ENTRIES: WidgetItemRegistryEntry[] = [
  {
    id: 'experience.progress',
    rendererKind: 'experience',
    legacyGroupId: 'experience',
    visibilityPath: 'experience.enabled',
    labelKey: 'integratedProgressionWidget',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'experience', order: 0 },
  },
  {
    id: 'player.level',
    rendererKind: 'stat',
    legacyGroupId: 'playerInfo',
    visibilityPath: 'playerInfo.level',
    labelKey: 'level',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'playerInfo', order: 0 },
  },
  {
    id: 'player.gold',
    rendererKind: 'stat',
    legacyGroupId: 'playerInfo',
    visibilityPath: 'playerInfo.gold',
    labelKey: 'gold',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'playerInfo', order: 1 },
  },
  {
    id: 'player.carryWeight',
    rendererKind: 'stat',
    legacyGroupId: 'playerInfo',
    visibilityPath: 'playerInfo.carryWeight',
    labelKey: 'carryWeight',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'playerInfo', order: 2 },
  },
  {
    id: 'player.health',
    rendererKind: 'stat',
    legacyGroupId: 'playerInfo',
    visibilityPath: 'playerInfo.health',
    labelKey: 'health',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'playerInfo', order: 3 },
  },
  {
    id: 'player.magicka',
    rendererKind: 'stat',
    legacyGroupId: 'playerInfo',
    visibilityPath: 'playerInfo.magicka',
    labelKey: 'magicka',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'playerInfo', order: 4 },
  },
  {
    id: 'player.stamina',
    rendererKind: 'stat',
    legacyGroupId: 'playerInfo',
    visibilityPath: 'playerInfo.stamina',
    labelKey: 'stamina',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'playerInfo', order: 5 },
  },
  {
    id: 'resistance.magic',
    rendererKind: 'stat',
    legacyGroupId: 'resistances',
    visibilityPath: 'resistances.magic',
    labelKey: 'magic',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'resistances', order: 0 },
  },
  {
    id: 'resistance.fire',
    rendererKind: 'stat',
    legacyGroupId: 'resistances',
    visibilityPath: 'resistances.fire',
    labelKey: 'fire',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'resistances', order: 1 },
  },
  {
    id: 'resistance.frost',
    rendererKind: 'stat',
    legacyGroupId: 'resistances',
    visibilityPath: 'resistances.frost',
    labelKey: 'frost',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'resistances', order: 2 },
  },
  {
    id: 'resistance.shock',
    rendererKind: 'stat',
    legacyGroupId: 'resistances',
    visibilityPath: 'resistances.shock',
    labelKey: 'shock',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'resistances', order: 3 },
  },
  {
    id: 'resistance.poison',
    rendererKind: 'stat',
    legacyGroupId: 'resistances',
    visibilityPath: 'resistances.poison',
    labelKey: 'poison',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'resistances', order: 4 },
  },
  {
    id: 'resistance.disease',
    rendererKind: 'stat',
    legacyGroupId: 'resistances',
    visibilityPath: 'resistances.disease',
    labelKey: 'disease',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'resistances', order: 5 },
  },
  {
    id: 'defense.armorRating',
    rendererKind: 'stat',
    legacyGroupId: 'defense',
    visibilityPath: 'defense.armorRating',
    labelKey: 'armorRating',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'defense', order: 0 },
  },
  {
    id: 'defense.damageReduction',
    rendererKind: 'stat',
    legacyGroupId: 'defense',
    visibilityPath: 'defense.damageReduction',
    labelKey: 'damageReduction',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'defense', order: 1 },
  },
  {
    id: 'offense.rightHandDamage',
    rendererKind: 'stat',
    legacyGroupId: 'offense',
    visibilityPath: 'offense.rightHandDamage',
    labelKey: 'rightHandDamage',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'offense', order: 0 },
  },
  {
    id: 'offense.leftHandDamage',
    rendererKind: 'stat',
    legacyGroupId: 'offense',
    visibilityPath: 'offense.leftHandDamage',
    labelKey: 'leftHandDamage',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'offense', order: 1 },
  },
  {
    id: 'offense.critChance',
    rendererKind: 'stat',
    legacyGroupId: 'offense',
    visibilityPath: 'offense.critChance',
    labelKey: 'critChance',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'offense', order: 2 },
  },
  {
    id: 'equipped.rightHand',
    rendererKind: 'stat',
    legacyGroupId: 'equipped',
    visibilityPath: 'equipped.rightHand',
    labelKey: 'rightHandEquipped',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'equipped', order: 0 },
  },
  {
    id: 'equipped.leftHand',
    rendererKind: 'stat',
    legacyGroupId: 'equipped',
    visibilityPath: 'equipped.leftHand',
    labelKey: 'leftHandEquipped',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'equipped', order: 1 },
  },
  {
    id: 'time.game',
    rendererKind: 'stat',
    legacyGroupId: 'time',
    visibilityPath: 'time.gameDateTime',
    labelKey: 'gameDateTime',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'time', order: 0 },
  },
  {
    id: 'time.real',
    rendererKind: 'stat',
    legacyGroupId: 'time',
    visibilityPath: 'time.realDateTime',
    labelKey: 'realDateTime',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'time', order: 1 },
  },
  {
    id: 'movement.speedMult',
    rendererKind: 'stat',
    legacyGroupId: 'movement',
    visibilityPath: 'movement.speedMult',
    labelKey: 'speed',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'movement', order: 0 },
  },
  {
    id: 'timedEffects.list',
    rendererKind: 'timed-effects-list',
    legacyGroupId: 'timedEffects',
    visibilityPath: 'timedEffects.enabled',
    labelKey: 'timedEffects',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'timedEffects', order: 0 },
  },
];

export const WIDGET_ITEM_IDS = WIDGET_ITEM_REGISTRY_ENTRIES.map(entry => entry.id);

export const WIDGET_ITEM_REGISTRY = Object.fromEntries(
  WIDGET_ITEM_REGISTRY_ENTRIES.map(entry => [entry.id, entry]),
) as Record<string, WidgetItemRegistryEntry>;

export const WIDGET_ITEM_ID_BY_VISIBILITY_PATH = Object.fromEntries(
  WIDGET_ITEM_REGISTRY_ENTRIES.map(entry => [entry.visibilityPath, entry.id]),
) as Record<string, string>;

export function getWidgetItemRegistryEntry(itemId: string): WidgetItemRegistryEntry {
  const entry = WIDGET_ITEM_REGISTRY[itemId];
  if (!entry) {
    throw new Error(`Unknown widget item id: ${itemId}`);
  }
  return entry;
}

export function getWidgetItemIdByVisibilityPath(path: string): string | null {
  return WIDGET_ITEM_ID_BY_VISIBILITY_PATH[path] ?? null;
}

export function getWidgetItemDefaultZIndex(itemId: string): number {
  const index = WIDGET_ITEM_IDS.indexOf(itemId);
  return index >= 0 ? index : 0;
}

export function getLegacyEffectiveScale(size: WidgetSize, groupScale = 1): number {
  return Number((LEGACY_WIDGET_SIZE_SCALE_MAP[size] * groupScale).toFixed(3));
}

export function readLegacyGroupLayout(
  source: Pick<LegacyWidgetLayoutSource, 'layouts'>,
  groupId: WidgetGroupId,
): WidgetLayout {
  const layout = source.layouts[groupId];
  return layout === 'horizontal' ? 'horizontal' : 'vertical';
}

export function readLegacyGroupPositions(
  source: Pick<LegacyWidgetLayoutSource, 'general' | 'positions' | 'layouts'>,
  viewportWidth: number,
  viewportHeight: number,
): Record<WidgetGroupId, GroupPosition> {
  const defaults = getWidgetDefaultPositions(
    viewportWidth,
    viewportHeight,
    source.general.size,
    source.layouts,
  );

  return Object.fromEntries(
    Object.keys(defaults).map(groupId => {
      const position = source.positions[groupId];
      const next =
        position
        && Number.isFinite(position.x)
        && Number.isFinite(position.y)
          ? position
          : defaults[groupId as WidgetGroupId];
      return [groupId, next];
    }),
  ) as Record<WidgetGroupId, GroupPosition>;
}

function readVisibilityByPath(source: LegacyWidgetLayoutSource, path: string): boolean {
  const keys = path.split('.');
  let cursor: unknown = source;

  for (const key of keys) {
    if (!cursor || typeof cursor !== 'object' || !(key in cursor)) {
      return false;
    }
    cursor = (cursor as Record<string, unknown>)[key];
  }

  return cursor === true;
}

function getPlacementOffset(layout: WidgetLayout, order: number): GroupPosition {
  if (layout === 'horizontal') {
    return {
      x: order * HORIZONTAL_ITEM_STEP,
      y: 0,
    };
  }

  return {
    x: 0,
    y: order * VERTICAL_ITEM_STEP,
  };
}

export function buildItemLayoutsFromLegacySettings(
  source: LegacyWidgetLayoutSource,
  viewportWidth: number,
  viewportHeight: number,
): Record<string, WidgetItemLayout> {
  const groupPositions = readLegacyGroupPositions(source, viewportWidth, viewportHeight);

  return Object.fromEntries(
    WIDGET_ITEM_IDS.map(itemId => {
      const entry = getWidgetItemRegistryEntry(itemId);
      const layout = readLegacyGroupLayout(source, entry.legacyGroupId);
      const anchor = groupPositions[entry.legacyGroupId];
      const offset = getPlacementOffset(layout, entry.defaultPlacementHint.order);

      return [
        itemId,
        {
          visible: readVisibilityByPath(source, entry.visibilityPath),
          x: anchor.x + offset.x,
          y: anchor.y + offset.y,
          scale: getLegacyEffectiveScale(
            source.general.size,
            source.groupScales[entry.legacyGroupId] ?? 1,
          ),
          locked: false,
          zIndex: getWidgetItemDefaultZIndex(itemId),
        },
      ];
    }),
  );
}

export function sanitizeWidgetItemLayouts(incoming: unknown): Record<string, WidgetItemLayout> {
  if (!isPlainObject(incoming)) {
    return {};
  }

  const out: Record<string, WidgetItemLayout> = {};

  for (const [itemId, rawLayout] of Object.entries(incoming)) {
    const entry = WIDGET_ITEM_REGISTRY[itemId];
    if (!entry || !isPlainObject(rawLayout)) {
      continue;
    }

    const { visible, x, y, scale } = rawLayout;
    const locked = typeof rawLayout.locked === 'boolean' ? rawLayout.locked : false;
    const zIndex = typeof rawLayout.zIndex === 'number' && Number.isFinite(rawLayout.zIndex)
      ? Math.trunc(rawLayout.zIndex)
      : getWidgetItemDefaultZIndex(itemId);
    const viewportWidth = typeof rawLayout.viewportWidth === 'number'
      && Number.isFinite(rawLayout.viewportWidth)
      && rawLayout.viewportWidth > 0
      ? Math.trunc(rawLayout.viewportWidth)
      : undefined;
    const viewportHeight = typeof rawLayout.viewportHeight === 'number'
      && Number.isFinite(rawLayout.viewportHeight)
      && rawLayout.viewportHeight > 0
      ? Math.trunc(rawLayout.viewportHeight)
      : undefined;
    if (
      typeof visible !== 'boolean'
      || typeof x !== 'number'
      || typeof y !== 'number'
      || typeof scale !== 'number'
      || !Number.isFinite(x)
      || !Number.isFinite(y)
      || !Number.isFinite(scale)
      || scale < entry.minScale
      || scale > entry.maxScale
    ) {
      continue;
    }

    out[itemId] = {
      visible,
      x,
      y,
      scale,
      locked,
      zIndex,
      ...(viewportWidth !== undefined ? { viewportWidth } : {}),
      ...(viewportHeight !== undefined ? { viewportHeight } : {}),
    };
  }

  return out;
}

function resolveCanonicalLayoutForViewport(
  layout: WidgetItemLayout,
  viewportWidth: number,
  viewportHeight: number,
): WidgetItemLayout {
  if (
    layout.viewportWidth === undefined
    || layout.viewportHeight === undefined
    || layout.viewportWidth <= 0
    || layout.viewportHeight <= 0
  ) {
    return layout;
  }

  return {
    ...layout,
    x: Number(((layout.x * viewportWidth) / layout.viewportWidth).toFixed(3)),
    y: Number(((layout.y * viewportHeight) / layout.viewportHeight).toFixed(3)),
    viewportWidth,
    viewportHeight,
  };
}

export function resolveWidgetItemLayouts(params: {
  settings: WidgetSettings;
  viewportWidth: number;
  viewportHeight: number;
}): Record<string, WidgetItemLayout> {
  const { settings, viewportWidth, viewportHeight } = params;
  const fallbackLayouts = buildItemLayoutsFromLegacySettings(settings, viewportWidth, viewportHeight);
  const canonicalLayouts = sanitizeWidgetItemLayouts(settings.itemLayouts);

  if (Object.keys(canonicalLayouts).length === 0) {
    return fallbackLayouts;
  }

  const resolvedCanonicalLayouts = Object.fromEntries(
    Object.entries(canonicalLayouts).map(([itemId, layout]) => [
      itemId,
      resolveCanonicalLayoutForViewport(layout, viewportWidth, viewportHeight),
    ]),
  ) as Record<string, WidgetItemLayout>;

  return {
    ...fallbackLayouts,
    ...resolvedCanonicalLayouts,
  };
}
