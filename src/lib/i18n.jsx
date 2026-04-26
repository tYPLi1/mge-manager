import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import en from "@/locales/en.json";
import de from "@/locales/de.json";

const LOCALES = { en, de };
export const AVAILABLE_LOCALES = [
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
];
const DEFAULT_LOCALE = "en";

const I18nContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
});

function getNested(obj, path) {
  return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

function interpolate(str, vars) {
  if (typeof str !== "string" || !vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{{${k}}}`));
}

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("app_locale") || DEFAULT_LOCALE;
    }
    return DEFAULT_LOCALE;
  });

  const updateLocale = useCallback((next) => {
    if (LOCALES[next]) {
      setLocale(next);
      try { window.localStorage.setItem("app_locale", next); } catch (_) {}
    }
  }, []);

  const t = useCallback((key, vars) => {
    const dict = LOCALES[locale] || LOCALES[DEFAULT_LOCALE];
    const value = getNested(dict, key);
    if (value === undefined) {
      const fallback = getNested(LOCALES[DEFAULT_LOCALE], key);
      return interpolate(fallback ?? key, vars);
    }
    return interpolate(value, vars);
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale: updateLocale, t }), [locale, updateLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}