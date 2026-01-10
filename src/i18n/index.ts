import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

// Import all locale files
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

const resources = {
  en: { translation: en },
  de: { translation: de },
  es: { translation: es },
  fr: { translation: fr },
  it: { translation: it },
  ja: { translation: ja },
  ko: { translation: ko },
  pt: { translation: pt },
  ru: { translation: ru },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
};

// Get device language with fallback logic
function getDeviceLanguage(): LanguageCode {
  const locales = getLocales();
  const deviceLocale = locales[0]; // First locale is the preferred one
  const languageTag = deviceLocale?.languageTag || 'en';
  const languageCode = deviceLocale?.languageCode || 'en';
  const regionCode = deviceLocale?.regionCode || '';

  const supportedCodes = SUPPORTED_LANGUAGES.map(l => l.code);

  // Try exact match first (e.g., 'zh-CN' from 'zh-Hans-CN')
  const fullCode = `${languageCode}-${regionCode}`;
  if (supportedCodes.includes(fullCode as LanguageCode)) {
    return fullCode as LanguageCode;
  }

  // Try language code only (e.g., 'en', 'de', 'es')
  if (supportedCodes.includes(languageCode as LanguageCode)) {
    return languageCode as LanguageCode;
  }

  // Special case for Chinese variants
  if (languageCode === 'zh') {
    // Check for Traditional Chinese regions (Taiwan, Hong Kong, Macau)
    if (regionCode === 'TW' || regionCode === 'HK' || regionCode === 'MO' ||
        languageTag.includes('Hant')) {
      return 'zh-TW';
    }
    return 'zh-CN';
  }

  return 'en';
}

const defaultLanguage = getDeviceLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

export default i18n;
