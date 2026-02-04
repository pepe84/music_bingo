import { useI18n } from "./I18nContext";
import { LANGUAGES } from "./languages";

export default function I18nLanguageSelector({
  className="form-select w-auto"
}) {
  const { lang, changeLang } = useI18n();

  return (
    <select
      className={className}
      value={lang}
      onChange={(e) => changeLang(e.target.value)}
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
