import type { ReactNode } from 'react';
import type { Language } from '../../types/settings';
import { t, type TranslationKey } from '../../i18n/translations';

// Three small pictures that show how layout editing works, for players opening it the first time.
// Drawn with strokes in the text color and gold for the thing being acted on, so they follow the
// panel palette and scale with the panel.

function DragPicture() {
  return (
    <svg viewBox="0 0 120 64" aria-hidden="true">
      <rect x="10" y="12" width="34" height="22" rx="5" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="3 3" />
      <rect x="66" y="28" width="34" height="22" rx="5" fill="var(--p-gold)" fillOpacity="0.18" stroke="var(--p-gold)" />
      <path d="M46 26 L62 36" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M57 37 L62 36 L60 31" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M86 40 L86 56 L90 52 L94 59 L97 57 L93 50 L99 50 Z" fill="currentColor" />
    </svg>
  );
}

function WheelPicture() {
  return (
    <svg viewBox="0 0 120 64" aria-hidden="true">
      <rect x="12" y="16" width="44" height="30" rx="6" fill="var(--p-gold)" fillOpacity="0.18" stroke="var(--p-gold)" />
      <rect x="51" y="41" width="8" height="8" rx="2" fill="var(--p-gold)" />
      <rect x="76" y="12" width="26" height="40" rx="13" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M89 12 L89 28" stroke="currentColor" strokeOpacity="0.5" />
      <rect x="86.5" y="17" width="5" height="9" rx="2.5" fill="var(--p-gold)" />
      <path d="M110 18 L114 13 L118 18 M110 46 L114 51 L118 46" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ApplyPicture() {
  return (
    <svg viewBox="0 0 120 64" aria-hidden="true">
      <rect x="8" y="20" width="50" height="24" rx="6" fill="var(--p-gold)" fillOpacity="0.18" stroke="var(--p-gold)" />
      <path d="M24 32 L30 38 L42 26" fill="none" stroke="var(--p-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="66" y="20" width="46" height="24" rx="6" fill="none" stroke="currentColor" strokeOpacity="0.5" />
      <text x="89" y="36.5" textAnchor="middle" fontSize="12" fill="currentColor" fontFamily="inherit">Esc</text>
    </svg>
  );
}

interface GuideStep {
  picture: ReactNode;
  titleKey: TranslationKey;
  textKey: TranslationKey;
}

const STEPS: readonly GuideStep[] = [
  { picture: <DragPicture />, titleKey: 'layoutGuideDragTitle', textKey: 'layoutGuideDragText' },
  { picture: <WheelPicture />, titleKey: 'layoutGuideWheelTitle', textKey: 'layoutGuideWheelText' },
  { picture: <ApplyPicture />, titleKey: 'layoutGuideApplyTitle', textKey: 'layoutGuideApplyText' },
];

export function LayoutEditGuide({ lang }: { lang: Language }) {
  return (
    <ol className="tw-guide" data-layout-edit-guide="true">
      {STEPS.map((step, index) => (
        <li key={step.titleKey} className="tw-guide-step">
          <div className="tw-guide-picture">{step.picture}</div>
          <div className="tw-guide-title">{index + 1}. {t(lang, step.titleKey)}</div>
          <p className="tw-guide-text">{t(lang, step.textKey)}</p>
        </li>
      ))}
    </ol>
  );
}
