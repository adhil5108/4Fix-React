import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/index.js';
import ml from './locales/ml/index.js';

// UI-only translation: static app text. User/database content (names, descriptions,
// addresses, service names, chat) is always rendered exactly as stored.
export const LANGUAGES = [
  { code: 'en', label: 'English', shortLabel: 'EN', dateLocale: 'en-IN' },
  { code: 'ml', label: 'മലയാളം', shortLabel: 'മല', dateLocale: 'ml-IN' },
];

export const LANGUAGE_STORAGE_KEY = '4fix.language';
const DEFAULT_LANGUAGE = 'en';
const SUPPORTED = LANGUAGES.map((language) => language.code);

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED.includes(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function applyLanguage(code) {
  document.documentElement.lang = code;

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this visit.
  }
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ml: { translation: ml } },
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED,
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.language;
i18n.on('languageChanged', applyLanguage);

export function setLanguage(code) {
  return i18n.changeLanguage(SUPPORTED.includes(code) ? code : DEFAULT_LANGUAGE);
}

// BCP 47 locale for Intl date/time formatting in the current UI language.
export function currentDateLocale() {
  return (LANGUAGES.find((language) => language.code === i18n.language) || LANGUAGES[0]).dateLocale;
}

export default i18n;
