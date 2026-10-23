import { createContext, useEffect, useState } from 'react';
import { BRIDGE_HANDLERS } from '../constants/bridge';
import { normalizeIconPacks, type IconPack } from '../data/iconPacks';
import { registerDualBridgeHandler } from '../utils/bridge';

// Icon packs installed under PrismaUI/views/TulliusWidgets/icon-packs, as listed by the plugin.
export const IconPacksContext = createContext<readonly IconPack[]>([]);

export function useIconPacksBridge(): readonly IconPack[] {
  const [packs, setPacks] = useState<readonly IconPack[]>([]);
  useEffect(() => registerDualBridgeHandler(BRIDGE_HANDLERS.updateIconPacks, (jsonString: string) => {
    setPacks(normalizeIconPacks(jsonString));
  }), []);
  return packs;
}
