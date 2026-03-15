export interface WidgetBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export function toWidgetBounds(rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height' | 'right' | 'bottom'>): WidgetBounds {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
    centerX: rect.left + (rect.width / 2),
    centerY: rect.top + (rect.height / 2),
  };
}

export function measureWidgetBounds(element: Element | null): WidgetBounds | null {
  if (!element) {
    return null;
  }

  return toWidgetBounds(element.getBoundingClientRect());
}

export function measureWidgetBoundsMap(
  elements: Record<string, Element | null>,
): Record<string, WidgetBounds> {
  const out: Record<string, WidgetBounds> = {};

  for (const [itemId, element] of Object.entries(elements)) {
    const bounds = measureWidgetBounds(element);
    if (!bounds) {
      continue;
    }

    out[itemId] = bounds;
  }

  return out;
}
