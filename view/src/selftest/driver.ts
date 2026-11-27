// Drives the page from inside it, the way the browser tests (view/e2e) drive it from outside: the
// plugin's bridge functions for settings and stats, made-up mouse and keyboard events for input,
// and on-screen boxes for checks. Every wait has a time limit, and waits use timers rather than
// animation frames, which can stop while the game hides the view.

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export class ScenarioFailure extends Error {
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ScenarioFailure';
    this.details = details;
  }
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function check(condition: boolean, message: string, details?: Record<string, unknown>): asserts condition {
  if (!condition) throw new ScenarioFailure(message, details);
}

/**
 * `actual` within `tolerance` px of `expected`. One pixel covers the engine rounding a fractional
 * position differently; anything a list height or a snap away is far outside it.
 */
export function checkClose(actual: number, expected: number, label: string, tolerance = 1): void {
  check(
    Math.abs(actual - expected) <= tolerance,
    `${label}: ${round1(actual)} is not within ${tolerance} of ${round1(expected)}`,
    { actual: round1(actual), expected: round1(expected), tolerance },
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

const POLL_MS = 16;
export const DEFAULT_WAIT_MS = 3000;

export async function waitFor<T>(
  label: string,
  probe: () => T | null | undefined | false,
  timeoutMs = DEFAULT_WAIT_MS,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = probe();
    if (value) return value;
    if (Date.now() >= deadline) throw new ScenarioFailure(`timed out after ${timeoutMs} ms waiting for ${label}`);
    await sleep(POLL_MS);
  }
}

/** One painted frame, or a short wait when frames are not running. */
export function nextFrame(): Promise<void> {
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    window.requestAnimationFrame(() => finish());
    window.setTimeout(finish, 100);
  });
}

export function boxOf(element: Element): Box {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
}

export function roundBox(box: Box): Box {
  return {
    left: round1(box.left),
    top: round1(box.top),
    right: round1(box.right),
    bottom: round1(box.bottom),
    width: round1(box.width),
    height: round1(box.height),
  };
}

export function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** On screen: laid out with a size and not hidden by style (the browser tests' "visible"). */
export function isShown(element: Element | null | undefined): element is HTMLElement {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

export function query(selector: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(selector);
}

export function byTestId(testId: string): HTMLElement | null {
  return query(`[data-testid="${testId}"]`);
}

export function widget(itemId: string): HTMLElement | null {
  return query(`[data-widget-item-id="${itemId}"]`);
}

export function textOf(element: Element): string {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function centerOf(element: Element): Point {
  const box = boxOf(element);
  return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
}

function describe(element: Element | null): string {
  if (!element) return 'nothing';
  const id = element.getAttribute('data-testid') ?? element.getAttribute('data-widget-item-id');
  const className = typeof element.className === 'string' ? element.className.split(' ')[0] : '';
  return `${element.tagName.toLowerCase()}${id ? `[${id}]` : ''}${className ? `.${className}` : ''}`;
}

/**
 * What a real pointer at this spot would reach. Made-up events skip hit testing, so this keeps a
 * covered element from being "clicked" anyway.
 */
function targetAt(point: Point, expected: Element, label: string): Element {
  const hit = document.elementFromPoint(point.x, point.y);
  check(
    hit !== null && (hit === expected || expected.contains(hit)),
    `${label}: ${describe(hit)} is at (${round1(point.x)}, ${round1(point.y)}) instead`,
  );
  return hit;
}

function sendMouse(type: string, target: EventTarget, point: Point, buttons: number): void {
  target.dispatchEvent(new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: point.x,
    clientY: point.y,
    button: 0,
    buttons,
  }));
}

export async function clickAt(point: Point, expected: Element, label: string): Promise<void> {
  const target = targetAt(point, expected, label);
  sendMouse('mousedown', target, point, 1);
  sendMouse('mouseup', target, point, 0);
  sendMouse('click', target, point, 0);
  await nextFrame();
}

export function click(element: Element, label: string): Promise<void> {
  return clickAt(centerOf(element), element, label);
}

export function pathBetween(from: Point, to: Point, steps: number): Point[] {
  return Array.from({ length: steps }, (_, index) => ({
    x: from.x + ((to.x - from.x) * (index + 1)) / steps,
    y: from.y + ((to.y - from.y) * (index + 1)) / steps,
  }));
}

/** Presses on `expected` at `from`, moves along `path` a frame at a time, and lets go at its end. */
export async function drag(from: Point, path: Point[], expected: Element, label: string): Promise<void> {
  const target = targetAt(from, expected, label);
  sendMouse('mousedown', target, from, 1);
  await nextFrame();
  for (const point of path) {
    sendMouse('mousemove', document, point, 1);
    await nextFrame();
  }
  sendMouse('mouseup', document, path[path.length - 1] ?? from, 0);
  await nextFrame();
}

const KEY_CODES: Record<string, string> = {
  ArrowDown: 'ArrowDown',
  ArrowUp: 'ArrowUp',
  Enter: 'Enter',
  Escape: 'Escape',
  z: 'KeyZ',
};

/** Presses and releases a key; resolves to whether the page took the keydown (prevented its default). */
export async function press(key: string, options: { ctrlKey?: boolean; target?: Element } = {}): Promise<boolean> {
  const target = options.target ?? document.activeElement ?? document.body;
  const init = { key, code: KEY_CODES[key] ?? key, bubbles: true, cancelable: true, ctrlKey: options.ctrlKey ?? false };
  const taken = !target.dispatchEvent(new KeyboardEvent('keydown', init));
  target.dispatchEvent(new KeyboardEvent('keyup', init));
  await nextFrame();
  return taken;
}
