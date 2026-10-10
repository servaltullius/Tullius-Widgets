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

// A radial gradient edge instead of a huge blurred inset shadow: Prisma renders on the CPU,
// and a full-screen box-shadow blur is the most expensive thing this view could repaint.
function buildVignette(color: string, inner: number): string {
  return `radial-gradient(ellipse 78% 74% at 50% 50%, rgba(0, 0, 0, 0) ${inner}%, ${color} 100%)`;
}

export function ScreenEffects({ alertData, settings }: ScreenEffectsProps) {
  const va = settings.visualAlerts;

  const shouldPulse = va?.enabled && va.lowHealth && alertData?.healthPct < va.lowHealthThreshold;

  if (!va?.enabled || !alertData) return null;

  const healthI = va.lowHealth ? intensity(alertData.healthPct, va.lowHealthThreshold) : 0;
  const staminaI = va.lowStamina ? intensity(alertData.staminaPct, va.lowStaminaThreshold) : 0;
  const magickaI = va.lowMagicka ? intensity(alertData.magickaPct, va.lowMagickaThreshold) : 0;
  const carryI = va.overencumbered ? intensity(alertData.carryPct, 95, true) : 0;

  if (healthI <= 0 && staminaI <= 0 && magickaI <= 0 && carryI <= 0) return null;

  const hasSecondary = staminaI > 0 || magickaI > 0 || carryI > 0;
  const secondaryShadows = hasSecondary
    ? [
        staminaI > 0 ? buildVignette('rgba(200, 160, 30, 0.5)', 62) : '',
        magickaI > 0 ? buildVignette('rgba(40, 60, 180, 0.5)', 62) : '',
        carryI > 0 ? buildVignette('rgba(140, 100, 40, 0.5)', 66) : '',
      ].filter(Boolean).join(', ')
    : '';

  const secondaryOpacity = Math.max(staminaI, magickaI, carryI) * 0.45;
  const healthOpacity = healthI * 0.45;

  if (healthI <= 0 && !secondaryShadows) return null;

  return (
    <>
      {secondaryShadows && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 500,
          backgroundImage: secondaryShadows,
          opacity: secondaryOpacity,
          transition: 'opacity 0.8s ease',
          willChange: 'opacity',
        }} />
      )}
      {healthI > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 501,
          backgroundImage: buildVignette('rgba(180, 20, 20, 0.55)', 55),
          opacity: healthOpacity,
          transition: 'opacity 0.8s ease',
          willChange: 'opacity',
          animation: shouldPulse ? 'tw-health-pulse 1.3s ease-in-out infinite' : undefined,
        }} />
      )}
    </>
  );
}
