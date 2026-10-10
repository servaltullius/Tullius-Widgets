import { useEffect, useState } from 'react';

// The plugin reports the remaining shout cooldown with each stats push; count down locally
// between pushes and remember the starting value to draw the recovery fill.
export function useCooldown(cooldownSec: number): { remaining: number; fraction: number } {
  const [state, setState] = useState(() => ({ receivedAt: Date.now(), value: cooldownSec, total: cooldownSec }));
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setState(prev => {
        if (prev.value === cooldownSec) return prev;
        const now = Date.now();
        const started = cooldownSec > prev.value - (now - prev.receivedAt) / 1000 + 0.5;
        return { receivedAt: now, value: cooldownSec, total: started || prev.total <= 0 ? cooldownSec : prev.total };
      });
      setNowMs(Date.now());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [cooldownSec]);

  const remaining = Math.max(0, state.value - (nowMs - state.receivedAt) / 1000);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setNowMs(Date.now()), 250);
    return () => window.clearTimeout(timer);
  }, [nowMs, remaining]);

  return { remaining, fraction: state.total > 0 ? Math.min(1, remaining / state.total) : 0 };
}
