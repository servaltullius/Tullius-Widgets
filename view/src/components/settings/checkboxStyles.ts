import type { CSSProperties } from 'react';
import { scalePanelPixels } from './panelScale';

const CHECKMARK_ICON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%230f1016' stroke-linecap='round' stroke-linejoin='round' stroke-width='2.2' d='M3.5 8.5 6.5 11.5 12.5 4.5'/%3E%3C/svg%3E")`;

export function createPanelCheckboxStyle(panelScale: number, checked: boolean, size = 30): CSSProperties {
  return {
    appearance: 'none',
    WebkitAppearance: 'none',
    margin: 0,
    width: scalePanelPixels(size, panelScale),
    height: scalePanelPixels(size, panelScale),
    minWidth: scalePanelPixels(size, panelScale),
    borderRadius: scalePanelPixels(6, panelScale),
    border: `1px solid ${checked ? 'rgba(255, 215, 0, 0.55)' : 'rgba(255, 255, 255, 0.28)'}`,
    backgroundColor: checked ? 'rgba(255, 215, 0, 0.92)' : 'rgba(12, 14, 22, 0.92)',
    backgroundImage: checked ? CHECKMARK_ICON : 'none',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: '72% 72%',
    boxShadow: checked
      ? '0 0 8px rgba(255, 215, 0, 0.18)'
      : 'inset 0 0 0 1px rgba(255, 255, 255, 0.04)',
    cursor: 'pointer',
    flexShrink: 0,
  };
}
