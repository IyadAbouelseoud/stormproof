import React from 'react';
import { useI18n } from '../i18n';
import { useNavigation } from '../navigation';

export function NavigationControls(): React.JSX.Element {
  const { t } = useI18n();
  const { currentIndex, screens, canGoBack, canGoNext, prevScreen, nextScreen } = useNavigation();

  return (
    <footer className="nav-controls-bar">
      <button
        type="button"
        className="sp-btn-nav type-label"
        onClick={prevScreen}
        disabled={!canGoBack}
        aria-disabled={!canGoBack}
      >
        <svg
          className="nav-btn-icon nav-btn-icon--back"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M10 3L5 8L10 13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{t('common.back')}</span>
      </button>

      <div className="nav-status type-data" aria-live="polite">
        {t('screens.step_counter', {
          current: currentIndex + 1,
          total: screens.length,
        })}
      </div>

      <button
        type="button"
        className="sp-btn-nav type-label"
        onClick={nextScreen}
        disabled={!canGoNext}
        aria-disabled={!canGoNext}
      >
        <span>{t('common.next')}</span>
        <svg
          className="nav-btn-icon nav-btn-icon--next"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M6 3L11 8L6 13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </footer>
  );
}
