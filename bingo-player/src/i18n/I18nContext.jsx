import { createContext, useContext, useEffect, useState } from "react";
import { FALLBACK_LANG, LANGUAGES } from "./languages";

const I18nContext = createContext();

const SUPPORTED_LANGS = LANGUAGES.map(l => l.code);

const detectLanguage = () => {
  const stored = localStorage.getItem("lang");
  if (stored && SUPPORTED_LANGS.includes(stored)) {
    return stored;
  }

  const browser = navigator.language.slice(0, 2);
  return SUPPORTED_LANGS.includes(browser)
    ? browser
    : FALLBACK_LANG;
};

const getLangConfig = (code) => {
  return LANGUAGES.find(l => l.code === code);
};

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(detectLanguage());
  const [dict, setDict] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ============================
     LAZY LOAD LANGUAGE
  ============================ */
  useEffect(() => {
    let active = true;
    setLoading(true);

    const langConfig = getLangConfig(lang) || getLangConfig(FALLBACK_LANG);

    // 🌍 HTML attributes (lang + dir)
    document.documentElement.lang = langConfig.code;
    document.documentElement.dir = langConfig.dir || "ltr";

    // 📦 Lazy load translations
    import(`./languages/${langConfig.code}.js`)
      .then((module) => {
        if (!active) return;
        setDict(module.default);
        setLoading(false);
      })
      .catch(() => {
        import(`./languages/${FALLBACK_LANG}.js`).then((module) => {
          if (!active) return;
          setDict(module.default);
          setLoading(false);
        });
      });

    return () => {
      active = false;
    };
  }, [lang]);

  const t = (key, vars = {}) => {
    if (!dict) return key;

    let text = dict[key] ?? key;

    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });

    return text;
  };

  const changeLang = (newLang) => {
    if (!SUPPORTED_LANGS.includes(newLang)) return;

    setLang(newLang);
    localStorage.setItem("lang", newLang);
  };


  return (
    <I18nContext.Provider value={{ lang, t, changeLang, loading }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
