const BASE_PANEL_VIEWPORT_WIDTH = 1920;
const BASE_PANEL_VIEWPORT_HEIGHT = 1080;
const MIN_PANEL_SCALE = 1;
const MAX_PANEL_SCALE = 1.6;

export function resolvePanelScale(viewportWidth: number, viewportHeight: number): number {
  const safeViewportWidth = Number.isFinite(viewportWidth) && viewportWidth > 0
    ? viewportWidth
    : BASE_PANEL_VIEWPORT_WIDTH;
  const safeViewportHeight = Number.isFinite(viewportHeight) && viewportHeight > 0
    ? viewportHeight
    : BASE_PANEL_VIEWPORT_HEIGHT;
  const rawScale = Math.min(
    safeViewportWidth / BASE_PANEL_VIEWPORT_WIDTH,
    safeViewportHeight / BASE_PANEL_VIEWPORT_HEIGHT,
  );

  return Number(Math.min(MAX_PANEL_SCALE, Math.max(MIN_PANEL_SCALE, rawScale)).toFixed(3));
}

export function scalePanelPixels(value: number, panelScale: number): string {
  return `${Number((value * panelScale).toFixed(3))}px`;
}
