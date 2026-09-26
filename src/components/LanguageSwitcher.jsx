import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage } from '../i18n/index.js';

// Two-option segmented control; the active language is filled. Switching re-renders
// in place (no reload) and the choice is persisted by the i18n module.
function LanguageSwitcher({ className = '' }) {
  const { t, i18n } = useTranslation();

  return (
    <div className={`lang-switch ${className}`.trim()} role="group" aria-label={t('common.language.label')}>
      {LANGUAGES.map((language) => {
        const active = i18n.language === language.code;

        return (
          <button
            key={language.code}
            type="button"
            lang={language.code}
            className={`lang-switch__option${active ? ' is-active' : ''}`}
            aria-pressed={active}
            aria-label={active ? language.label : t('common.language.switchTo', { language: language.label })}
            onClick={() => setLanguage(language.code)}
          >
            <span className="lang-switch__full">{language.label}</span>
            <span className="lang-switch__short" aria-hidden="true">
              {language.shortLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default LanguageSwitcher;
