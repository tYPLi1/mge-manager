import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { AVAILABLE_LOCALES } from "@/lib/i18n";

/**
 * Multi-language Rules editor.
 * Reads/writes form fields named `rules_text_<locale>` (e.g. rules_text_en, rules_text_de).
 * Also keeps legacy `rules_text` in sync with the English version for backwards compatibility.
 */
export default function RulesMultiLangEditor({ form, setForm, placeholder }) {
  const [activeLocale, setActiveLocale] = useState("en");

  const fieldKey = (loc) => `rules_text_${loc}`;

  const handleChange = (loc, val) => {
    const next = { ...form, [fieldKey(loc)]: val };
    // Keep legacy key mirrored to English so older consumers still work.
    if (loc === "en") next.rules_text = val;
    setForm(next);
  };

  // Seed English from legacy `rules_text` if the per-locale field is empty.
  const valueFor = (loc) => {
    const v = form[fieldKey(loc)];
    if (v !== undefined && v !== "") return v;
    if (loc === "en" && form.rules_text) return form.rules_text;
    return "";
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3 border-b border-white/5 pb-3">
        {AVAILABLE_LOCALES.map((loc) => {
          const isActive = activeLocale === loc.code;
          const hasContent = (valueFor(loc.code) || "").trim().length > 0;
          return (
            <button
              key={loc.code}
              type="button"
              onClick={() => setActiveLocale(loc.code)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <span>{loc.flag}</span>
              <span>{loc.label}</span>
              {hasContent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
            </button>
          );
        })}
      </div>

      <Textarea
        value={valueFor(activeLocale)}
        onChange={(e) => handleChange(activeLocale, e.target.value)}
        rows={12}
        placeholder={placeholder}
        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 font-mono text-sm"
      />

      <p className="text-xs text-gray-500 mt-2">
        Editing: <span className="text-gray-300">{AVAILABLE_LOCALES.find(l => l.code === activeLocale)?.name}</span>
        {" "}· Languages without content will fall back to English on the public Rules page.
      </p>
    </div>
  );
}