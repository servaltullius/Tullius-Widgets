import type { Language } from '../types/settings';
import type { RuntimeDiagnostics } from '../types/runtime';
import { t } from '../i18n/translations';

interface RuntimeWarningBannerProps {
  text: string;
  runtimeDiagnostics: RuntimeDiagnostics;
  lang: Language;
}

export function RuntimeWarningBanner({
  text,
  runtimeDiagnostics,
  lang,
}: RuntimeWarningBannerProps) {
  return (
    <div style={{
      position: 'fixed',
      top: '14px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--tw-color-runtime-bg)',
      border: '1px solid var(--tw-color-runtime-border)',
      color: 'var(--tw-color-runtime-text)',
      borderRadius: 'var(--tw-radius-md)',
      padding: '10px 14px',
      zIndex: 1400,
      fontFamily: 'var(--tw-font-ui)',
      minWidth: '480px',
      maxWidth: '80vw',
      boxShadow: 'var(--tw-shadow-overlay-strong)',
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>{text}</div>
      <div style={{ fontSize: '12px', opacity: 0.95, wordBreak: 'break-all' }}>
        {t(lang, 'runtimeWarningDetails')}: runtime {runtimeDiagnostics.runtimeVersion}, SKSE {runtimeDiagnostics.skseVersion}, {runtimeDiagnostics.addressLibraryPath}
      </div>
    </div>
  );
}

interface SettingsSyncWarningBannerProps {
  text: string;
  hasRuntimeWarning: boolean;
}

export function SettingsSyncWarningBanner({
  text,
  hasRuntimeWarning,
}: SettingsSyncWarningBannerProps) {
  return (
    <div style={{
      position: 'fixed',
      top: hasRuntimeWarning ? '84px' : '14px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--tw-color-sync-bg)',
      border: '1px solid var(--tw-color-sync-border)',
      color: 'var(--tw-color-sync-text)',
      borderRadius: 'var(--tw-radius-md)',
      padding: '10px 14px',
      zIndex: 1390,
      fontFamily: 'var(--tw-font-ui)',
      minWidth: '380px',
      maxWidth: '80vw',
      boxShadow: 'var(--tw-shadow-overlay-soft)',
      pointerEvents: 'none',
      fontSize: '13px',
      fontWeight: 600,
      textAlign: 'center',
    }}>
      {text}
    </div>
  );
}

interface OnboardingPanelProps {
  lang: Language;
  onOpenSettings: () => void;
  onDismiss: () => void;
}

export function OnboardingPanel({
  lang,
  onOpenSettings,
  onDismiss,
}: OnboardingPanelProps) {
  return (
    <div style={{
      position: 'fixed',
      top: '28px',
      right: '28px',
      background: 'var(--tw-color-onboarding-bg)',
      border: '1px solid var(--tw-color-onboarding-border)',
      borderRadius: 'var(--tw-radius-lg)',
      padding: '18px 20px',
      zIndex: 1300,
      color: 'var(--tw-color-onboarding-text)',
      fontFamily: 'var(--tw-font-ui)',
      width: 'clamp(420px, 30vw, 560px)',
      boxShadow: 'var(--tw-shadow-overlay-panel)',
    }}>
      <div style={{ fontSize: '19px', fontWeight: 700, marginBottom: '10px' }}>
        {t(lang, 'onboardingTitle')}
      </div>
      <div style={{ fontSize: '15px', lineHeight: 1.55, opacity: 0.96 }}>
        <div>{t(lang, 'onboardingLine1')}</div>
        <div>{t(lang, 'onboardingLine2')}</div>
        <div>{t(lang, 'onboardingLine3')}</div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
        <button
          onClick={onOpenSettings}
          style={{
            flex: 1,
            borderRadius: 'var(--tw-radius-md)',
            border: '1px solid var(--tw-color-onboarding-primary-border)',
            background: 'var(--tw-color-onboarding-primary-bg)',
            color: 'var(--tw-color-onboarding-primary-text)',
            fontSize: '14px',
            fontWeight: 600,
            padding: '10px 12px',
            cursor: 'pointer',
          }}
        >
          {t(lang, 'onboardingOpenSettings')}
        </button>
        <button
          onClick={onDismiss}
          style={{
            flex: 1,
            borderRadius: 'var(--tw-radius-md)',
            border: '1px solid var(--tw-color-onboarding-secondary-border)',
            background: 'var(--tw-color-onboarding-secondary-bg)',
            color: 'var(--tw-color-onboarding-secondary-text)',
            fontSize: '14px',
            fontWeight: 600,
            padding: '10px 12px',
            cursor: 'pointer',
          }}
        >
          {t(lang, 'onboardingDismiss')}
        </button>
      </div>
    </div>
  );
}
