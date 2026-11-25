import type { CompactAnchor, HudStyle } from '../../types/settings';
import type { WidgetBounds } from '../../utils/widgetBounds';
import type { PanelDockPreference } from './settingsPanelState';

export type PanelDockSide = 'left' | 'right';

export const SETTINGS_WINDOW_BASE_WIDTH_PX = 940;
export const SETTINGS_WINDOW_BASE_HEIGHT_PX = 720;
export const SETTINGS_WINDOW_EDGE_MARGIN_PX = 32;

export interface WindowRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Viewport {
  width: number;
  height: number;
}

// The settings window at one side of the screen, vertically centred, in whole pixels so text stays
// crisp. It keeps an edge margin on both sides; a screen too narrow for that gets a centred window.
export function resolveSettingsWindowRect(side: PanelDockSide, panelScale: number, viewport: Viewport): WindowRect {
  const margin = Math.round(SETTINGS_WINDOW_EDGE_MARGIN_PX * panelScale);
  const width = Math.max(0, Math.round(Math.min(SETTINGS_WINDOW_BASE_WIDTH_PX * panelScale, viewport.width - 2 * margin)));
  const height = Math.max(0, Math.round(Math.min(SETTINGS_WINDOW_BASE_HEIGHT_PX * panelScale, viewport.height - 2 * margin)));
  const top = Math.max(0, Math.round((viewport.height - height) / 2));
  const left = side === 'left' ? margin : Math.max(margin, viewport.width - margin - width);
  return { left, top, width, height };
}

function overlapArea(bounds: WidgetBounds, rect: WindowRect): number {
  const width = Math.min(bounds.right, rect.left + rect.width) - Math.max(bounds.left, rect.left);
  const height = Math.min(bounds.bottom, rect.top + rect.height) - Math.max(bounds.top, rect.top);
  return width > 0 && height > 0 ? width * height : 0;
}

interface AutoDockInput {
  hudStyle: HudStyle;
  compactAnchor: CompactAnchor;
  widgetBounds: readonly WidgetBounds[];
  panelScale: number;
  viewport: Viewport;
}

// The window opens on the side where it covers the least of the HUD. The compact HUD is one
// cluster pinned to a corner, so its anchor decides. Classic widgets can sit anywhere, so the
// measured widget boxes are compared against the two places the window could actually take;
// ties and an empty or unmeasured HUD keep the window on the right.
export function resolveAutoDockSide({ hudStyle, compactAnchor, widgetBounds, panelScale, viewport }: AutoDockInput): PanelDockSide {
  if (hudStyle === 'compact') {
    return compactAnchor === 'bottomRight' || compactAnchor === 'topRight' ? 'left' : 'right';
  }
  if (!(viewport.width > 0) || !(viewport.height > 0)) return 'right';
  const leftRect = resolveSettingsWindowRect('left', panelScale, viewport);
  const rightRect = resolveSettingsWindowRect('right', panelScale, viewport);
  let coveredOnLeft = 0;
  let coveredOnRight = 0;
  for (const bounds of widgetBounds) {
    coveredOnLeft += overlapArea(bounds, leftRect);
    coveredOnRight += overlapArea(bounds, rightRect);
  }
  return coveredOnRight > coveredOnLeft ? 'left' : 'right';
}

export function resolveDockSide(preference: PanelDockPreference, autoSide: PanelDockSide): PanelDockSide {
  return preference === 'auto' ? autoSide : preference;
}
