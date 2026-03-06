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
      background: 'rgba(80, 18, 18, 0.92)',
      border: '1px solid rgba(255, 120, 90, 0.85)',
      color: '#ffd8c9',
      borderRadius: '10px',
      padding: '10px 14px',
      zIndex: 1400,
      fontFamily: 'sans-serif',
      minWidth: '480px',
      maxWidth: '80vw',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
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
      background: 'rgba(88, 46, 10, 0.92)',
      border: '1px solid rgba(255, 191, 115, 0.8)',
      color: '#ffe2ba',
      borderRadius: '10px',
      padding: '10px 14px',
      zIndex: 1390,
      fontFamily: 'sans-serif',
      minWidth: '380px',
      maxWidth: '80vw',
      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
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
      background: 'rgba(16, 18, 26, 0.92)',
      border: '1px solid rgba(120, 175, 255, 0.45)',
      borderRadius: '14px',
      padding: '18px 20px',
      zIndex: 1300,
      color: '#e7eefc',
      fontFamily: 'sans-serif',
      width: 'clamp(420px, 30vw, 560px)',
      boxShadow: '0 10px 22px rgba(0,0,0,0.38)',
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
            borderRadius: '10px',
            border: '1px solid rgba(120,175,255,0.6)',
            background: 'rgba(80,140,255,0.2)',
            color: '#d7e6ff',
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
            borderRadius: '10px',
            border: '1px solid rgba(220,220,220,0.35)',
            background: 'rgba(255,255,255,0.06)',
            color: '#d3d9e6',
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
