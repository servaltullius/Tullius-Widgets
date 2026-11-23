import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { buildUserFontFaceCss, findUserFont, type UserFont } from '../data/userFonts';

export type UserFontStatus = 'none' | 'loading' | 'ready' | 'missing' | 'failed';

interface UserFontFaceResult {
  family: string | null;
  status: UserFontStatus;
}

const STYLE_ID = 'tw-user-font';
// Loading runs while the HUD keeps the preset font, so a generous limit costs nothing visible.
// Large CJK families (15-20MB per weight) can take seconds per file during a save load.
const LOAD_TIMEOUT_BASE_MS = 10000;
const LOAD_TIMEOUT_PER_FILE_MS = 5000;
const FALLBACK_RELAYOUT_DELAYS_MS = [300, 1500];
const HUD_FONT_WEIGHTS = [400, 500, 600, 700];

export function useUserFontFace(
  fonts: readonly UserFont[],
  savedFontId: string,
  relayoutHudText: () => void,
): UserFontFaceResult {
  const font = savedFontId ? findUserFont(fonts, savedFontId) : null;
  // A bridge refresh rebuilds the objects even when the selected files have not changed.
  const selection = font ? JSON.stringify(font) : null;
  const readFont = useEffectEvent(() => font);
  const generation = useRef(0);
  const [load, setLoad] = useState<{ selection: string | null; result: UserFontFaceResult | null }>({ selection, result: null });
  if (load.selection !== selection) setLoad({ selection, result: null });

  useEffect(() => {
    const selectedFont = readFont();
    if (!selection || !selectedFont) return;

    const family = `TW User Font ${++generation.current}`;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = buildUserFontFaceCss(selectedFont, family);
    document.head.appendChild(style);

    let active = true;
    let settled = false;
    const timers: number[] = [];
    function finish(ready: boolean) {
      if (!active || settled) return;
      settled = true;
      for (const timer of timers) window.clearTimeout(timer);
      if (!ready) style.remove();
      setLoad({ selection, result: ready ? { family, status: 'ready' } : { family: null, status: 'failed' } });
    }

    const fontSet = document.fonts;
    if (typeof fontSet?.load === 'function') {
      // Each weight settles on its own: one unreadable or slow file must not discard the weights
      // that loaded. A weight that loaded makes the font usable as soon as every weight has
      // settled, or when the time limit ends the wait. Promise.allSettled is avoided on purpose:
      // the view targets ES2019 engines.
      let loadedWeights = 0;
      let pendingWeights = HUD_FONT_WEIGHTS.length;
      const timeoutMs = LOAD_TIMEOUT_BASE_MS + LOAD_TIMEOUT_PER_FILE_MS * selectedFont.files.length;
      timers.push(window.setTimeout(() => finish(loadedWeights > 0), timeoutMs));
      const settleWeight = (loaded: boolean) => {
        if (loaded) loadedWeights++;
        pendingWeights--;
        if (pendingWeights === 0) finish(loadedWeights > 0);
      };
      for (const weight of HUD_FONT_WEIGHTS) {
        // Calling inside a promise also turns a synchronous throw from the engine into a failure
        // of this weight alone.
        Promise.resolve()
          .then(() => (active ? fontSet.load(`${weight} 16px "${family}"`, '가Aa1') : []))
          .then(faces => settleWeight(faces.length > 0), () => settleWeight(false));
      }
    } else {
      Promise.resolve().then(() => {
        if (!active) return;
        finish(true);
        for (const delay of FALLBACK_RELAYOUT_DELAYS_MS) {
          timers.push(window.setTimeout(relayoutHudText, delay));
        }
      });
    }

    return () => {
      active = false;
      for (const timer of timers) window.clearTimeout(timer);
      style.remove();
    };
  }, [selection, relayoutHudText]);

  if (!savedFontId) return { family: null, status: 'none' };
  if (!font) return { family: null, status: 'missing' };
  return (load.selection === selection && load.result) || { family: null, status: 'loading' };
}
