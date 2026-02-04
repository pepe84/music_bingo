import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "./languages";

export default function I18nLanguageSelector({
  className="form-select w-auto"
}) {
  const { i18n } = useTranslation();

  const getLangConfig = (code) => {
    return LANGUAGES.find(l => l.code === code);
  };

  useEffect(() => {
    const cfg = getLangConfig(i18n.language);
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = cfg?.dir || "ltr";
  }, [i18n.language]);
  
  return (
    <select
      className={className}
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      id="languageSelector"
    >
      {LANGUAGES.map(l => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
