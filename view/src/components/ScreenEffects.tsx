import type { AlertData } from '../types/stats';
import type { WidgetSettings } from '../types/settings';

interface ScreenEffectsProps {
  alertData: AlertData;
  settings: WidgetSettings;
}

function intensity(current: number, threshold: number, invert = false): number {
  if (invert) {
    if (current <= threshold) return 0;
    return Math.min((current - threshold) / (100 - threshold), 1);
  }
  if (current >= threshold) return 0;
  return Math.min((threshold - current) / threshold, 1);
}

function buildShadow(color: string, intensity: number, spread: number): string {
  if (intensity <= 0) return '';
  const alpha = intensity * 0.45;
  return `inset 0 0 ${spread}px ${spread * 0.4}px ${color.replace(/[\d.]+\)$/, `${alpha})`)}`;
}

export function ScreenEffects({ alertData, settings }: ScreenEffectsProps) {
  const va = settings.visualAlerts;

  const shouldPulse = va?.enabled && va.lowHealth && alertData?.healthPct < 15;

  if (!va?.enabled || !alertData) return null;

  const healthI = va.lowHealth ? intensity(alertData.healthPct, va.lowHealthThreshold) : 0;
  const staminaI = va.lowStamina ? intensity(alertData.staminaPct, va.lowStaminaThreshold) : 0;
  const magickaI = va.lowMagicka ? intensity(alertData.magickaPct, va.lowMagickaThreshold) : 0;
  const carryI = va.overencumbered ? intensity(alertData.carryPct, 95, true) : 0;

  if (healthI <= 0 && staminaI <= 0 && magickaI <= 0 && carryI <= 0) return null;

  const healthShadow = buildShadow('rgba(180, 20, 20, 1)', healthI, 180);
  const secondaryShadows = [
    buildShadow('rgba(200, 160, 30, 1)', staminaI, 150),
    buildShadow('rgba(40, 60, 180, 1)', magickaI, 150),
    buildShadow('rgba(140, 100, 40, 1)', carryI, 130),
  ].filter(Boolean).join(', ');

  if (!healthShadow && !secondaryShadows) return null;

  return (
    <>
      {shouldPulse && healthShadow && (
        <style>{'@keyframes tw-health-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }'}</style>
      )}
      {secondaryShadows && (
        <div style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 500,
          boxShadow: secondaryShadows,
          transition: 'box-shadow 0.8s ease',
        }} />
      )}
      {healthShadow && (
        <div style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 501,
          boxShadow: healthShadow,
          transition: 'box-shadow 0.8s ease',
          animation: shouldPulse ? 'tw-health-pulse 1.3s ease-in-out infinite' : undefined,
        }} />
      )}
    </>
  );
}
