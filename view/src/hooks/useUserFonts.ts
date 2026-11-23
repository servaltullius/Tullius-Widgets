import { createContext, useEffect, useState } from 'react';
import { BRIDGE_HANDLERS } from '../constants/bridge';
import { normalizeUserFonts, type UserFont } from '../data/userFonts';
import { registerDualBridgeHandler } from '../utils/bridge';
import type { UserFontStatus } from './useUserFontFace';

export const UserFontsContext = createContext<{ fonts: readonly UserFont[]; status: UserFontStatus }>({
  fonts: [],
  status: 'none',
});

export function useUserFontsBridge(): readonly UserFont[] {
  const [fonts, setFonts] = useState<readonly UserFont[]>([]);
  useEffect(() => registerDualBridgeHandler(BRIDGE_HANDLERS.updateUserFonts, (jsonString: string) => {
    setFonts(normalizeUserFonts(jsonString));
  }), []);
  return fonts;
}
