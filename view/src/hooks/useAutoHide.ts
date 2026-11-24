import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  buildItemChangeSignatures,
  HIDDEN_HUD,
  resolveHudVisibility,
  type HudVisibility,
  type HudVisibilityHistory,
  type HudVisibilityInputs,
  type ItemPresenceContext,
} from '../utils/hudPresentation';

const NO_CHANGES: Readonly<Record<string, number>> = {};

interface HudPresentation {
  visibility: HudVisibility;
  nowMs: number;
  changeWindowMs: number;
  lastChangeAtByItem: Readonly<Record<string, number>>;
  nextItemExpiryAt: number;
}

function sameMask(a: ReadonlySet<string> | null, b: ReadonlySet<string> | null): boolean {
  return a === b || (a !== null && b !== null && a.size === b.size && [...a].every(id => b.has(id)));
}

export function useAutoHide({ visible, hasLiveStats, general, stats, settingsOpen, itemLayouts }: HudVisibilityInputs): {
  visibility: HudVisibility;
  itemPresence: ItemPresenceContext;
} {
  const itemSignatures = useMemo(() => buildItemChangeSignatures(stats, itemLayouts), [stats, itemLayouts]);
  const previousSignatures = useRef<Record<string, string> | null>(null);
  const lastChangeTimes = useRef(NO_CHANGES);
  const history = useRef<HudVisibilityHistory | null>(null);
  const changeWindowMs = general.changeDisplaySeconds * 1000;
  const [presentation, setPresentation] = useState<HudPresentation>({
    visibility: HIDDEN_HUD,
    nowMs: 0,
    changeWindowMs,
    lastChangeAtByItem: NO_CHANGES,
    nextItemExpiryAt: Number.POSITIVE_INFINITY,
  });
  useLayoutEffect(() => {
    const before = previousSignatures.current;
    let lastChangeAtByItem = lastChangeTimes.current;
    if (!hasLiveStats) {
      lastChangeAtByItem = NO_CHANGES;
    } else if (before) {
      // A widget that was just turned on has no earlier value to differ from; switching it on in
      // the settings panel is not a value change that should wake the HUD.
      const changed = Object.keys(itemSignatures)
        .filter(itemId => before[itemId] !== undefined && before[itemId] !== itemSignatures[itemId]);
      if (changed.length > 0) {
        const changedAt = Date.now();
        const updated = { ...lastChangeAtByItem };
        for (const itemId of changed) updated[itemId] = changedAt;
        lastChangeAtByItem = updated;
      }
    }
    // The first live sample establishes the baseline for later value changes.
    previousSignatures.current = hasLiveStats ? itemSignatures : null;
    lastChangeTimes.current = lastChangeAtByItem;

    let timer: number | undefined;
    const evaluate = () => {
      const nowMs = Date.now();
      const { lastActiveAt, changeExpiresAt, nextCheckAt, ...visibility } = resolveHudVisibility({
        visible, hasLiveStats, general, stats, settingsOpen, itemLayouts,
        nowMs, lastChangeAtByItem, previous: history.current,
      });
      history.current = hasLiveStats
        ? { visible, settingsOpen, freeCamera: stats.freeCamera, lastActiveAt, changeExpiresAt }
        : null;

      let nextItemExpiryAt = Number.POSITIVE_INFINITY;
      for (const [itemId, changedAt] of Object.entries(lastChangeAtByItem)) {
        if (!itemLayouts[itemId]?.visible) continue;
        // Per-item showWhen includes the end of its window.
        const expiresAt = Math.floor(changedAt + changeWindowMs) + 1;
        if (expiresAt > nowMs && expiresAt < nextItemExpiryAt) nextItemExpiryAt = expiresAt;
      }

      setPresentation(previous => {
        if (previous.visibility.render === visibility.render && previous.visibility.opacity === visibility.opacity
          && sameMask(previous.visibility.itemMask, visibility.itemMask)
          && sameMask(previous.visibility.bypassShowWhen, visibility.bypassShowWhen)
          && previous.changeWindowMs === changeWindowMs
          && previous.lastChangeAtByItem === lastChangeAtByItem && previous.nextItemExpiryAt === nextItemExpiryAt) {
          return previous;
        }
        return { visibility, nowMs, changeWindowMs, lastChangeAtByItem, nextItemExpiryAt };
      });

      const nextAt = Math.min(nextItemExpiryAt, nextCheckAt ?? Number.POSITIVE_INFINITY);
      if (Number.isFinite(nextAt)) timer = window.setTimeout(evaluate, Math.max(0, Math.ceil(nextAt - Date.now())));
    };

    evaluate();
    return () => window.clearTimeout(timer);
  }, [changeWindowMs, general, hasLiveStats, itemLayouts, itemSignatures, settingsOpen, stats, visible]);

  const { visibility, nowMs, lastChangeAtByItem, changeWindowMs: evaluatedWindowMs } = presentation;
  const itemPresence = useMemo(() => ({
    hudStyle: general.hudStyle, nowMs, lastChangeAtByItem, changeWindowMs: evaluatedWindowMs,
  }), [evaluatedWindowMs, general.hudStyle, lastChangeAtByItem, nowMs]);
  return { visibility, itemPresence };
}
