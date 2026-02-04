export const LANGUAGES = [
  { code: "ca", label: "Català", dir: "ltr" },
  { code: "es", label: "Castellano", dir: "ltr" },
  { code: "gl", label: "Galego", dir: "ltr" },
  { code: "eu", label: "Euskera", dir: "ltr" },
  { code: "en", label: "English", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "de", label: "Deutsch", dir: "ltr" },
  { code: "it", label: "Italiano", dir: "ltr" },
  { code: "pt", label: "Português", dir: "ltr" },
  { code: "ru", label: "Русский", dir: "ltr" },
  { code: "zh", label: "中文", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

export const SUPPORTED_LANGS = LANGUAGES.map(l => l.code);

export const FALLBACK_LANG = "ca";
