import { getWidgetDefaultPositions, type WidgetGroupId } from './widgetRegistry';
import type {
  GroupPosition,
  CompactAnchor,
  HudStyle,
  ItemShowWhen,
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
  general: Pick<WidgetSettings['general'], 'size'> & Partial<Pick<WidgetSettings['general'], 'compactAnchor' | 'iconTheme'>>;
  resistances: WidgetSettings['resistances'];
  defense: WidgetSettings['defense'];
  offense: WidgetSettings['offense'];
  equipped: WidgetSettings['equipped'];
  timedEffects: Pick<WidgetSettings['timedEffects'], 'enabled'> & Partial<Pick<WidgetSettings['timedEffects'], 'listLayout'>>;
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
export const DEFAULT_ITEM_LAYOUT_BASELINE_VIEWPORT = {
  width: 3840,
  height: 2160,
} as const;

const NORDIC_DEFAULT_ITEM_POSITIONS: Record<string, GroupPosition> = {
  'experience.progress': { x: 1530, y: 60 },
  'player.level': { x: 1380, y: 60 },
  'player.gold': { x: 1480, y: 145 },
  'player.carryWeight': { x: 1620, y: 145 },
  'player.health': { x: 1480, y: 630 },
  'player.magicka': { x: 1620, y: 630 },
  'player.stamina': { x: 1760, y: 630 },
  'resistance.magic': { x: 1480, y: 265 },
  'resistance.fire': { x: 1620, y: 265 },
  'resistance.frost': { x: 1760, y: 265 },
  'resistance.shock': { x: 1480, y: 325 },
  'resistance.poison': { x: 1620, y: 325 },
  'resistance.disease': { x: 1760, y: 325 },
  'defense.armorRating': { x: 1480, y: 390 },
  'defense.damageReduction': { x: 1620, y: 390 },
  'offense.rightHandDamage': { x: 1480, y: 450 },
  'offense.leftHandDamage': { x: 1620, y: 450 },
  'offense.critChance': { x: 1760, y: 450 },
  'equipped.rightHand': { x: 1480, y: 510 },
  'equipped.leftHand': { x: 1700, y: 510 },
  'equipped.voice': { x: 1480, y: 570 },
  'equipped.potion': { x: 1700, y: 570 },
  'time.game': { x: 1480, y: 205 },
  'time.real': { x: 1700, y: 205 },
  'time.weather': { x: 1760, y: 145 },
  'time.playtime': { x: 1480, y: 690 },
  'movement.speedMult': { x: 1760, y: 390 },
  'timedEffects.list': { x: 1100, y: 60 },
};

// Compact HUD: a bottom-left cluster that leaves room below for vanilla, TrueHUD or SkyHUD bars.
// Rows that hide while exploring (resistances, combat stats) sit on top so the cluster
// simply grows upward in combat instead of opening a gap in the middle.
const COMPACT_DEFAULT_ITEM_POSITIONS: Record<string, GroupPosition> = {
  'resistance.magic': { x: 34, y: 790 },
  'resistance.fire': { x: 98, y: 790 },
  'resistance.frost': { x: 162, y: 790 },
  'resistance.shock': { x: 226, y: 790 },
  'resistance.poison': { x: 290, y: 790 },
  'resistance.disease': { x: 354, y: 790 },
  'defense.armorRating': { x: 34, y: 825 },
  'defense.damageReduction': { x: 98, y: 825 },
  'offense.critChance': { x: 162, y: 825 },
  'movement.speedMult': { x: 226, y: 825 },
  // Move speed reads "100%" (wider than a 64px column), so the hand damages start further out.
  'offense.rightHandDamage': { x: 304, y: 825 },
  'offense.leftHandDamage': { x: 376, y: 825 },
  'player.gold': { x: 34, y: 858 },
  'player.carryWeight': { x: 150, y: 858 },
  'time.game': { x: 272, y: 858 },
  'time.real': { x: 378, y: 858 },
  'time.weather': { x: 504, y: 858 },
  'time.playtime': { x: 272, y: 760 },
  'experience.progress': { x: 34, y: 898 },
  'equipped.rightHand': { x: 222, y: 892 },
  'equipped.leftHand': { x: 306, y: 892 },
  'equipped.voice': { x: 390, y: 892 },
  'equipped.potion': { x: 474, y: 892 },
  'timedEffects.list': { x: 576, y: 790 },
  'player.level': { x: 576, y: 724 },
  'player.health': { x: 34, y: 724 },
  'player.magicka': { x: 34, y: 744 },
  'player.stamina': { x: 34, y: 764 },
};

// Compact HUD with the mini Dororong icons: the art is drawn 2x the line icons and
// the equipment slots are larger, so columns and rows get more room.
const COMPACT_DORORONG_ITEM_POSITIONS: Record<string, GroupPosition> = {
  ...COMPACT_DEFAULT_ITEM_POSITIONS,
  'resistance.magic': { x: 34, y: 770 },
  'resistance.fire': { x: 124, y: 770 },
  'resistance.frost': { x: 214, y: 770 },
  'resistance.shock': { x: 304, y: 770 },
  'resistance.poison': { x: 394, y: 770 },
  'resistance.disease': { x: 484, y: 770 },
  'defense.armorRating': { x: 34, y: 814 },
  'defense.damageReduction': { x: 124, y: 814 },
  'offense.critChance': { x: 214, y: 814 },
  'movement.speedMult': { x: 304, y: 814 },
  'offense.rightHandDamage': { x: 404, y: 814 },
  'offense.leftHandDamage': { x: 494, y: 814 },
  'player.gold': { x: 34, y: 858 },
  'player.carryWeight': { x: 170, y: 858 },
  'time.game': { x: 316, y: 858 },
  'time.real': { x: 436, y: 858 },
  'time.weather': { x: 560, y: 858 },
  'time.playtime': { x: 316, y: 734 },
  'experience.progress': { x: 34, y: 908 },
  'equipped.rightHand': { x: 214, y: 904 },
  'equipped.leftHand': { x: 300, y: 904 },
  'equipped.voice': { x: 386, y: 904 },
  'equipped.potion': { x: 472, y: 904 },
  'timedEffects.list': { x: 660, y: 770 },
  'player.level': { x: 660, y: 700 },
  'player.health': { x: 34, y: 676 },
  'player.magicka': { x: 34, y: 704 },
  'player.stamina': { x: 34, y: 732 },
};

function getCompactPositions(iconTheme: WidgetSettings['general']['iconTheme'] | undefined): Record<string, GroupPosition> {
  return iconTheme === 'dororong' ? COMPACT_DORORONG_ITEM_POSITIONS : COMPACT_DEFAULT_ITEM_POSITIONS;
}

// Per-style show-when defaults for items without an explicit choice. Every widget is shown
// always by default (players found widgets that come and go distracting); hiding in exploration
// is opt-in per widget.
const STYLE_DEFAULT_SHOW_WHEN: Record<HudStyle, Partial<Record<string, ItemShowWhen>>> = {
  compact: {},
  classic: {},
};

const COMPACT_CLUSTER_ANCHOR = { x: 34 } as const;
// Widest compact element: the timed-effect list (fixed widths in compact-theme.css).
export const COMPACT_EFFECT_COLUMN_WIDTH = 250;
export const COMPACT_EFFECT_ROW_WIDTH = 532;
const COMPACT_TOP_MARGIN = 72;

// Corner presets move the whole cluster, using its real bounds (hidden items included) at the
// current size scale so no item can land off-screen.
function getCompactAnchorOffset(
  anchor: CompactAnchor | undefined,
  scale: number,
  effectListLayout: WidgetSettings['timedEffects']['listLayout'] | undefined,
  table: Record<string, GroupPosition> = COMPACT_DEFAULT_ITEM_POSITIONS,
): GroupPosition {
  const right = anchor === 'bottomRight' || anchor === 'topRight';
  const top = anchor === 'topLeft' || anchor === 'topRight';
  const { width, height } = NORDIC_DEFAULT_BASELINE_VIEWPORT;
  const positions = Object.values(table);
  const effectWidth = effectListLayout === 'horizontal' ? COMPACT_EFFECT_ROW_WIDTH : COMPACT_EFFECT_COLUMN_WIDTH;
  const rightEdge = Math.max(...positions.map(position => position.x)) + effectWidth;
  const topEdge = Math.min(...positions.map(position => position.y));
  const scaledRight = COMPACT_CLUSTER_ANCHOR.x + (rightEdge - COMPACT_CLUSTER_ANCHOR.x) * scale;
  const scaledTop = height - (height - topEdge) * scale;
  return {
    x: right ? width - COMPACT_CLUSTER_ANCHOR.x - scaledRight : 0,
    y: top ? COMPACT_TOP_MARGIN - scaledTop : 0,
  };
}

export const ITEM_SHOW_WHEN_VALUES: readonly ItemShowWhen[] = ['always', 'combat', 'change', 'combatOrChange'];

// Clocks tick constantly and never count as a change, so change-driven policies make no sense.
const CHANGELESS_ITEMS = new Set(['time.game', 'time.real', 'time.playtime']);

export function getItemShowWhenOptions(itemId: string): readonly ItemShowWhen[] {
  return CHANGELESS_ITEMS.has(itemId) ? ['always', 'combat'] : ITEM_SHOW_WHEN_VALUES;
}

export function resolveItemShowWhen(itemId: string, layout: WidgetItemLayout | undefined, hudStyle: HudStyle): ItemShowWhen {
  const requested = layout?.showWhen
    ?? STYLE_DEFAULT_SHOW_WHEN[hudStyle][itemId]
    ?? 'always';
  if (CHANGELESS_ITEMS.has(itemId)) {
    if (requested === 'change') return 'always';
    if (requested === 'combatOrChange') return 'combat';
  }
  return requested;
}

export const NORDIC_DEFAULT_BASELINE_VIEWPORT = {
  width: 1920,
  height: 1080,
} as const;

const NORDIC_DEFAULT_SIZE_SCALE_MAP: Record<WidgetSize, number> = {
  xsmall: 0.78,
  small: 0.9,
  medium: 1,
  large: 1.18,
};

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
    id: 'equipped.voice',
    rendererKind: 'stat',
    legacyGroupId: 'equipped',
    visibilityPath: 'equipped.voice',
    labelKey: 'voiceEquipped',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'equipped', order: 2 },
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
  {
    id: 'time.weather',
    rendererKind: 'stat',
    legacyGroupId: 'time',
    visibilityPath: 'time.weather',
    labelKey: 'weather',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'time', order: 2 },
  },
  {
    id: 'equipped.potion',
    rendererKind: 'stat',
    legacyGroupId: 'equipped',
    visibilityPath: 'equipped.potion',
    labelKey: 'equippedPotion',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'equipped', order: 3 },
  },
  {
    id: 'time.playtime',
    rendererKind: 'stat',
    legacyGroupId: 'time',
    visibilityPath: 'time.playtime',
    labelKey: 'playtime',
    minScale: DEFAULT_MIN_SCALE,
    maxScale: DEFAULT_MAX_SCALE,
    defaultPlacementHint: { groupId: 'time', order: 3 },
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

export function buildNordicDefaultItemLayouts(
  source: LegacyWidgetLayoutSource,
): Record<string, WidgetItemLayout> {
  const scale = NORDIC_DEFAULT_SIZE_SCALE_MAP[source.general.size];

  return Object.fromEntries(
    WIDGET_ITEM_IDS.map(itemId => {
      const entry = getWidgetItemRegistryEntry(itemId);
      const position = NORDIC_DEFAULT_ITEM_POSITIONS[itemId] ?? { x: 0, y: 0 };
      return [
        itemId,
        {
          visible: readVisibilityByPath(source, entry.visibilityPath),
          x: position.x,
          y: position.y,
          scale,
          locked: false,
          zIndex: getWidgetItemDefaultZIndex(itemId),
          viewportWidth: NORDIC_DEFAULT_BASELINE_VIEWPORT.width,
          viewportHeight: NORDIC_DEFAULT_BASELINE_VIEWPORT.height,
        },
      ];
    }),
  );
}

export function buildCompactDefaultItemLayouts(
  source: LegacyWidgetLayoutSource,
): Record<string, WidgetItemLayout> {
  const scale = NORDIC_DEFAULT_SIZE_SCALE_MAP[source.general.size];
  const table = getCompactPositions(source.general.iconTheme);
  const offset = getCompactAnchorOffset(source.general.compactAnchor, scale, source.timedEffects.listLayout, table);

  return Object.fromEntries(
    WIDGET_ITEM_IDS.map(itemId => {
      const entry = getWidgetItemRegistryEntry(itemId);
      const position = table[itemId] ?? { x: 0, y: 0 };
      // Grow the cluster around its bottom-left anchor so larger sizes never overlap, then
      // move the whole cluster to the chosen corner.
      const anchorX = COMPACT_CLUSTER_ANCHOR.x;
      const anchorBottom = NORDIC_DEFAULT_BASELINE_VIEWPORT.height;
      return [
        itemId,
        {
          visible: readVisibilityByPath(source, entry.visibilityPath),
          x: Number((anchorX + (position.x - anchorX) * scale + offset.x).toFixed(3)),
          y: Number((anchorBottom - (anchorBottom - position.y) * scale + offset.y).toFixed(3)),
          scale,
          locked: false,
          zIndex: getWidgetItemDefaultZIndex(itemId),
          viewportWidth: NORDIC_DEFAULT_BASELINE_VIEWPORT.width,
          viewportHeight: NORDIC_DEFAULT_BASELINE_VIEWPORT.height,
        },
      ];
    }),
  );
}

export function hasLegacyWidgetPlacementOverrides(source: LegacyWidgetLayoutSource): boolean {
  return Object.keys(source.positions).length > 0
    || Object.keys(source.layouts).length > 0
    || Object.keys(source.groupScales).length > 0;
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

export function buildBaselineItemLayoutsFromLegacySettings(
  source: LegacyWidgetLayoutSource,
): Record<string, WidgetItemLayout> {
  const baselineLayouts = buildItemLayoutsFromLegacySettings(
    source,
    DEFAULT_ITEM_LAYOUT_BASELINE_VIEWPORT.width,
    DEFAULT_ITEM_LAYOUT_BASELINE_VIEWPORT.height,
  );

  return Object.fromEntries(
    Object.entries(baselineLayouts).map(([itemId, layout]) => [
      itemId,
      {
        ...layout,
        viewportWidth: DEFAULT_ITEM_LAYOUT_BASELINE_VIEWPORT.width,
        viewportHeight: DEFAULT_ITEM_LAYOUT_BASELINE_VIEWPORT.height,
      },
    ]),
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

    const showWhen = typeof rawLayout.showWhen === 'string'
      && (ITEM_SHOW_WHEN_VALUES as readonly string[]).includes(rawLayout.showWhen)
      ? rawLayout.showWhen as ItemShowWhen
      : undefined;

    out[itemId] = {
      visible,
      x,
      y,
      scale,
      locked,
      zIndex,
      ...(showWhen !== undefined ? { showWhen } : {}),
      ...(viewportWidth !== undefined ? { viewportWidth } : {}),
      ...(viewportHeight !== undefined ? { viewportHeight } : {}),
    };
  }

  return out;
}

type AxisAnchor = 'start' | 'end' | 'proportional';

interface LayoutAnchor {
  x: AxisAnchor;
  y: AxisAnchor;
}

const PROPORTIONAL_ANCHOR: LayoutAnchor = { x: 'proportional', y: 'proportional' };

// A layout that sits entirely on one side of the screen centre keeps its distance to that
// edge when the aspect ratio changes; one that spans the centre scales proportionally so
// no cluster is ever torn apart at the midline.
function resolveLayoutAnchor(layouts: WidgetItemLayout[]): LayoutAnchor {
  // Hidden items count too, so toggling one widget never shifts the others.
  const placed = layouts.filter(layout =>
    layout.viewportWidth !== undefined
    && layout.viewportHeight !== undefined
    && layout.viewportWidth > 0
    && layout.viewportHeight > 0);
  if (placed.length === 0) return PROPORTIONAL_ANCHOR;

  const axis = (ratios: number[]): AxisAnchor => {
    if (ratios.every(ratio => ratio < 0.5)) return 'start';
    if (ratios.every(ratio => ratio >= 0.5)) return 'end';
    return 'proportional';
  };
  return {
    x: axis(placed.map(layout => layout.x / layout.viewportWidth!)),
    y: axis(placed.map(layout => layout.y / layout.viewportHeight!)),
  };
}

// The compact cluster is pinned to its chosen corner; the midline test above would flip it to
// proportional when a large size pushes an edge item past the centre.
function resolveCompactCornerAnchor(anchor: CompactAnchor | undefined): LayoutAnchor {
  const right = anchor === 'bottomRight' || anchor === 'topRight';
  const top = anchor === 'topLeft' || anchor === 'topRight';
  return { x: right ? 'end' : 'start', y: top ? 'start' : 'end' };
}

// Items the player dragged clearly onto the other half of the screen keep the distance to
// their own edge. "Clearly" is measured from the screen centre or, when the item's default
// spot already lies past it (a wide cluster reaching over the midline), from that default, so
// the cluster's own items never tear away from it.
const OWN_EDGE_MARGIN = 0.1;

function resolveItemAxisAnchor(anchor: AxisAnchor, ratio: number, defaultRatio: number | undefined): AxisAnchor {
  if (anchor === 'start' && ratio >= Math.max(defaultRatio ?? 0, 0.5) + OWN_EDGE_MARGIN) return 'end';
  if (anchor === 'end' && ratio < Math.min(defaultRatio ?? 1, 0.5) - OWN_EDGE_MARGIN) return 'start';
  return anchor;
}

function resolveItemAnchor(
  layout: WidgetItemLayout,
  anchor: LayoutAnchor,
  defaultLayout: WidgetItemLayout | undefined,
): LayoutAnchor {
  if (!layout.viewportWidth || !layout.viewportHeight) return anchor;
  const hasDefault = Boolean(defaultLayout?.viewportWidth && defaultLayout.viewportHeight);
  return {
    x: resolveItemAxisAnchor(
      anchor.x,
      layout.x / layout.viewportWidth,
      hasDefault ? defaultLayout!.x / defaultLayout!.viewportWidth! : undefined,
    ),
    y: resolveItemAxisAnchor(
      anchor.y,
      layout.y / layout.viewportHeight,
      hasDefault ? defaultLayout!.y / defaultLayout!.viewportHeight! : undefined,
    ),
  };
}

function resolveCanonicalLayoutForViewport(
  itemId: string,
  layout: WidgetItemLayout,
  viewportWidth: number,
  viewportHeight: number,
  anchor: LayoutAnchor = PROPORTIONAL_ANCHOR,
): WidgetItemLayout {
  if (
    layout.viewportWidth === undefined
    || layout.viewportHeight === undefined
    || layout.viewportWidth <= 0
    || layout.viewportHeight <= 0
  ) {
    return layout;
  }

  const registryEntry = getWidgetItemRegistryEntry(itemId);
  const viewportScale = Math.min(
    viewportWidth / layout.viewportWidth,
    viewportHeight / layout.viewportHeight,
  );
  const scaledScale = Number((layout.scale * viewportScale).toFixed(3));
  const nextScale = registryEntry
    ? Number(Math.min(registryEntry.maxScale, Math.max(registryEntry.minScale, scaledScale)).toFixed(3))
    : scaledScale;

  const anchoredX = anchor.x === 'start'
    ? layout.x * viewportScale
    : anchor.x === 'end'
      ? viewportWidth - (layout.viewportWidth - layout.x) * viewportScale
      : (layout.x * viewportWidth) / layout.viewportWidth;
  const anchoredY = anchor.y === 'start'
    ? layout.y * viewportScale
    : anchor.y === 'end'
      ? viewportHeight - (layout.viewportHeight - layout.y) * viewportScale
      : (layout.y * viewportHeight) / layout.viewportHeight;

  return {
    ...layout,
    x: Number(anchoredX.toFixed(3)),
    y: Number(anchoredY.toFixed(3)),
    scale: nextScale,
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
  const canonicalLayouts = sanitizeWidgetItemLayouts(settings.itemLayouts);
  const useNordicDefaults = !hasLegacyWidgetPlacementOverrides(settings);
  const baselineLayouts = !useNordicDefaults
    ? buildBaselineItemLayoutsFromLegacySettings(settings)
    : settings.general.hudStyle === 'compact'
      ? buildCompactDefaultItemLayouts(settings)
      : buildNordicDefaultItemLayouts(settings);
  // The anchor comes from the style's default arrangement only, so dragging a widget can
  // never re-anchor (and visibly shift) the rest of the HUD.
  const layoutAnchor = useNordicDefaults && settings.general.hudStyle === 'compact'
    ? resolveCompactCornerAnchor(settings.general.compactAnchor)
    : resolveLayoutAnchor(Object.values(baselineLayouts));
  const fallbackLayouts = Object.fromEntries(
    Object.entries(baselineLayouts).map(([itemId, layout]) => [
      itemId,
      resolveCanonicalLayoutForViewport(itemId, layout, viewportWidth, viewportHeight, layoutAnchor),
    ]),
  ) as Record<string, WidgetItemLayout>;

  if (Object.keys(canonicalLayouts).length === 0) {
    return fallbackLayouts;
  }

  const resolvedCanonicalLayouts = Object.fromEntries(
    Object.entries(canonicalLayouts).map(([itemId, layout]) => [
      itemId,
      resolveCanonicalLayoutForViewport(
        itemId,
        layout,
        viewportWidth,
        viewportHeight,
        resolveItemAnchor(layout, layoutAnchor, baselineLayouts[itemId]),
      ),
    ]),
  ) as Record<string, WidgetItemLayout>;

  return {
    ...fallbackLayouts,
    ...resolvedCanonicalLayouts,
  };
}
