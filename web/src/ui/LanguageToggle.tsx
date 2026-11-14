import React from 'react';
import { useI18n } from '../i18n';

export interface LanguageToggleProps {
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = '' }) => {
  const { toggleLanguage, t } = useI18n();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`lang-toggle-btn type-label ${className}`.trim()}
      aria-label={t('common.language')}
    >
      {t('common.language_toggle')}
    </button>
  );
};
