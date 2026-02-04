import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { FALLBACK_LANG, SUPPORTED_LANGS } from "./languages";

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: FALLBACK_LANG,
    supportedLngs: SUPPORTED_LANGS,
    interpolation: {
      escapeValue: false, // React ja escapa
    },
    react: {
      useSuspense: false,
    },
    backend: {
      loadPath: "/locales/{{lng}}/translation.json",
    },
  });

export default i18n;
