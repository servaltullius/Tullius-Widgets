import { useSyncExternalStore } from 'react';
import { t } from '../i18n/translations';
import { getSelfTestProgress, subscribeSelfTestProgress } from './sessionState';

// The page has no saved settings in a self-test session, so the notice follows the default language.
const SESSION_LANGUAGE = '';

function fill(text: string, values: Record<string, number>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

/**
 * Shown for the whole self-test session: forgetting the marker file would otherwise drop every
 * change the player makes without a word. Pointer events pass through, so it never covers what
 * the scenarios click.
 */
export function SelfTestBanner() {
  const progress = useSyncExternalStore(subscribeSelfTestProgress, getSelfTestProgress);
  if (progress.phase === 'off') return null;

  const counts = { done: progress.done, total: progress.total, passed: progress.passed, failed: progress.failed };
  const status = progress.phase === 'waiting'
    ? t(SESSION_LANGUAGE, 'selfTestWaiting')
    : progress.phase === 'running'
      ? fill(t(SESSION_LANGUAGE, 'selfTestRunning'), counts)
      : fill(t(SESSION_LANGUAGE, 'selfTestFinished'), counts);

  // Low on the screen: the page's own notices use the top, and a scenario checks one of them.
  return (
    <div
      role="status"
      aria-live="polite"
      data-selftest-phase={progress.phase}
      style={{
        position: 'fixed',
        bottom: '18%',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--tw-color-runtime-bg)',
        border: '1px solid var(--tw-color-runtime-border)',
        color: 'var(--tw-color-runtime-text)',
        borderRadius: 'var(--tw-radius-md)',
        padding: '10px 14px',
        zIndex: 1410,
        fontFamily: 'var(--tw-font-ui)',
        minWidth: '420px',
        maxWidth: '80vw',
        boxShadow: 'var(--tw-shadow-overlay-strong)',
        pointerEvents: 'none',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>{status}</div>
      <div style={{ fontSize: '12px', opacity: 0.95 }}>{t(SESSION_LANGUAGE, 'selfTestSessionNotice')}</div>
    </div>
  );
}
