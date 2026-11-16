import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './vi';
import en from './en';

const saved = (() => {
  try { return localStorage.getItem('dt_lang'); } catch { return null; }
})();
const initial = saved || (navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'vi');

i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: initial,
  fallbackLng: 'vi',
  interpolation: { escapeValue: false }
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  try { localStorage.setItem('dt_lang', lng); } catch { /* bỏ qua */ }
});
document.documentElement.lang = initial;

export default i18n;
