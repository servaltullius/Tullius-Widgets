import { createContext } from 'react';
import type { IconTheme } from '../../types/settings';

// Which icon set the compact widgets draw; provided once per compact item.
export const CompactIconThemeContext = createContext<IconTheme>('standard');
