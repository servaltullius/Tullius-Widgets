import { BRIDGE_CALLBACKS } from '../constants/bridge';
import { callNative } from './nativeCalls';

// Things on the page that answer Esc themselves: a hotkey button waiting for a key stops waiting,
// an open select menu closes, a selected widget or group is deselected, the layout editing mode
// is cancelled. While any of them exists the page tells the plugin, whose own Esc handler (close
// the settings panel) then stands aside and hands the key press to the page instead.
//
// One press does one step, the strongest owner first, whatever order the owners were claimed in.
// The press can reach the page two ways: as a keydown event, and from the plugin, which hears Esc
// even when the game does not pass the key on to the view. When both arrive for the same press,
// only the first one acts.
export type EscapeOwnerKind = 'hotkeyCapture' | 'selectMenu' | 'selection' | 'layoutMode';

const KIND_ORDER: readonly EscapeOwnerKind[] = ['hotkeyCapture', 'selectMenu', 'selection', 'layoutMode'];

/**
 * How long after one route delivered a press the other route's copy of it is ignored. Generous,
 * because the game can stall for a few frames between the two copies; each copy is matched once,
 * so quick separate presses still count.
 */
export const ESCAPE_DUPLICATE_WINDOW_MS = 1000;

interface EscapeOwner {
  kind: EscapeOwnerKind;
  onEscape: () => void;
}

const owners = new Map<symbol, EscapeOwner>();
let reportedOwned = false;
let keydownRouteInstalled = false;
// Presses one route delivered whose copy from the other route has not come yet, oldest first. Each
// copy cancels exactly one waiting press, so presses stay paired however the copies interleave.
const keydownPressesAwaitingCopy: number[] = [];
const pluginPressesAwaitingCopy: number[] = [];

// The page took the last step from its own keydown at this time; see reportToPlugin.
let lastKeydownStepAt: number | null = null;

/**
 * '1' while the page owns Esc. On release, '0e' when the page's own Esc keydown just took the last
 * step: the plugin may not have handled that same press yet and briefly stands aside so it does not
 * also close the panel. A plain '0' (a click, or a press the plugin passed on) lets the very next
 * Esc close the panel at once.
 */
export type EscapeOwnerReport = '1' | '0' | '0e';

// The reported state only advances once the plugin took it, so a report lost while the bridge
// was missing or failing is sent again on the next change.
function reportToPlugin(): void {
  const owned = owners.size > 0;
  if (owned === reportedOwned) return;
  const releasedByKeydown = !owned && lastKeydownStepAt !== null && isWithinWindow(lastKeydownStepAt);
  try {
    if (!callNative(BRIDGE_CALLBACKS.onEscapeOwner, owned ? '1' : releasedByKeydown ? '0e' : '0')) return;
    reportedOwned = owned;
  } catch (error) {
    console.error('[TulliusWidgets] Failed to report Esc ownership:', error);
  }
}

/** Esc as the browser reports it, or as an engine that only fills in the older fields does. */
export function isEscapeKey(event: Pick<KeyboardEvent, 'key' | 'code' | 'keyCode'>): boolean {
  return event.key === 'Escape' || event.key === 'Esc' || event.code === 'Escape' || event.keyCode === 27;
}

function now(): number {
  return performance.now();
}

function isWithinWindow(at: number): boolean {
  const elapsed = now() - at;
  return elapsed >= 0 && elapsed < ESCAPE_DUPLICATE_WINDOW_MS;
}

// Drops presses whose copy is overdue (it was never coming), then takes the oldest one left.
function takeAwaitingCopy(presses: number[]): boolean {
  while (presses.length > 0 && !isWithinWindow(presses[0])) {
    presses.shift();
  }
  if (presses.length === 0) return false;
  presses.shift();
  return true;
}

// Runs the strongest owner's step; among owners of the same kind the latest claim answers.
function runEscapeStep(): boolean {
  let chosen: EscapeOwner | null = null;
  let chosenRank = KIND_ORDER.length;
  for (const owner of owners.values()) {
    const rank = KIND_ORDER.indexOf(owner.kind);
    if (rank <= chosenRank) {
      chosen = owner;
      chosenRank = rank;
    }
  }
  if (!chosen) return false;
  chosen.onEscape();
  return true;
}

function handleKeydown(event: KeyboardEvent): void {
  if (!isEscapeKey(event)) return;
  // A held key is never a new press: swallowed while the page owns Esc, left alone otherwise.
  if (event.repeat) {
    if (owners.size > 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    return;
  }
  if (takeAwaitingCopy(pluginPressesAwaitingCopy)) {
    // The plugin already delivered this press; its keydown copy must not take a second step or
    // fall through to the panel's own Esc close.
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  if (owners.size === 0) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  keydownPressesAwaitingCopy.push(now());
  lastKeydownStepAt = now();
  runEscapeStep();
}

// Registered on first use, on the window in the capture phase, so it sees Esc before anything else
// on the page and ahead of the panel's Esc close, which listens in the bubble phase.
function ensureKeydownRoute(): void {
  if (keydownRouteInstalled || typeof window === 'undefined') return;
  window.addEventListener('keydown', handleKeydown, true);
  keydownRouteInstalled = true;
}

/** Claims Esc for the page until the returned release function runs (safe to call twice). */
export function claimEscape(kind: EscapeOwnerKind, onEscape: () => void): () => void {
  ensureKeydownRoute();
  const token = Symbol(kind);
  owners.set(token, { kind, onEscape });
  reportToPlugin();
  return () => {
    if (!owners.delete(token)) return;
    // With nothing left to answer Esc the plugin closes the panel instead of passing presses on,
    // so a keydown still waiting for its plugin copy will not get one.
    if (owners.size === 0) keydownPressesAwaitingCopy.length = 0;
    reportToPlugin();
  };
}

/** An Esc press the plugin passed on because the page owns the key. */
export function handleEscapeFromPlugin(): void {
  if (takeAwaitingCopy(keydownPressesAwaitingCopy)) return;
  pluginPressesAwaitingCopy.push(now());
  lastKeydownStepAt = null;
  runEscapeStep();
}

export function hasEscapeOwner(kind: EscapeOwnerKind): boolean {
  for (const owner of owners.values()) {
    if (owner.kind === kind) return true;
  }
  return false;
}

export function isSelectMenuOpen(): boolean {
  return hasEscapeOwner('selectMenu');
}
