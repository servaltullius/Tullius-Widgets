import { createContext } from 'react';

// Where open select menus render. The panel provides an element inside itself so menus inherit
// its CSS variables, font and scale; without a panel (tests, other hosts) they fall back to body.
export const PanelPortalContext = createContext<HTMLElement | null>(null);
