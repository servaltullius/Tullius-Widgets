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

function VignetteLayer({ color, opacity, pulse }: {
  color: string;
  opacity: number;
  pulse: boolean;
}) {
  if (opacity <= 0) return null;
  const maxOpacity = 0.4;
  const effectOpacity = opacity * maxOpacity;

  return (
    <div style={{ opacity: effectOpacity, transition: 'opacity 0.8s ease' }}>
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 500,
        background: `radial-gradient(ellipse 70% 60% at center, transparent 0%, ${color} 100%)`,
        animation: pulse ? 'vignetteBreath 2.5s ease-in-out infinite' : 'none',
      }} />
    </div>
  );
}

export function ScreenEffects({ alertData, settings }: ScreenEffectsProps) {
  const va = settings.visualAlerts;
  if (!va?.enabled || !alertData) return null;

  const healthI = va.lowHealth ? intensity(alertData.healthPct, va.lowHealthThreshold) : 0;
  const staminaI = va.lowStamina ? intensity(alertData.staminaPct, va.lowStaminaThreshold) : 0;
  const magickaI = va.lowMagicka ? intensity(alertData.magickaPct, va.lowMagickaThreshold) : 0;
  const carryI = va.overencumbered ? intensity(alertData.carryPct, 95, true) : 0;

  if (healthI <= 0 && staminaI <= 0 && magickaI <= 0 && carryI <= 0) return null;

  return (
    <>
      <style>{`
        @keyframes vignetteBreath {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
      <VignetteLayer color="rgba(180, 20, 20, 0.9)" opacity={healthI} pulse={alertData.healthPct < 15} />
      <VignetteLayer color="rgba(200, 160, 30, 0.7)" opacity={staminaI} pulse={false} />
      <VignetteLayer color="rgba(40, 60, 180, 0.7)" opacity={magickaI} pulse={false} />
      <VignetteLayer color="rgba(140, 100, 40, 0.6)" opacity={carryI} pulse={false} />
    </>
  );
}
