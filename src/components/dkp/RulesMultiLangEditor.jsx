import React, { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { AVAILABLE_LOCALES } from "@/lib/i18n";
import RulesEditorToolbar from "@/components/dkp/RulesEditorToolbar";
import RulesSyntaxHelp from "@/components/dkp/RulesSyntaxHelp";

/**
 * Multi-language Rules editor.
 * Reads/writes form fields named `rules_text_<locale>` (e.g. rules_text_en, rules_text_de).
 * Also keeps legacy `rules_text` in sync with the English version for backwards compatibility.
 * Supports Markdown + inline HTML (bold, italic, underline, color via toolbar).
 */
export default function RulesMultiLangEditor({ form, setForm, placeholder }) {
  const [activeLocale, setActiveLocale] = useState("en");
  const textareaRefs = useRef({});

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

  const currentValue = valueFor(activeLocale);
  const taRef = (el) => { textareaRefs.current[activeLocale] = el; };

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

      <RulesEditorToolbar
        textareaRef={{ current: textareaRefs.current[activeLocale] }}
        value={currentValue}
        onChange={(v) => handleChange(activeLocale, v)}
      />

      <Textarea
        ref={taRef}
        value={currentValue}
        onChange={(e) => handleChange(activeLocale, e.target.value)}
        rows={14}
        placeholder={placeholder}
        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 font-mono text-sm"
      />

      <p className="text-xs text-gray-500 mt-2">
        Editing: <span className="text-gray-300">{AVAILABLE_LOCALES.find(l => l.code === activeLocale)?.name}</span>
        {" "}· Use the toolbar for <strong>bold</strong>, <em>italic</em>, <u>underline</u> and color. Languages without content fall back to English.
      </p>

      <RulesSyntaxHelp />
    </div>
  );
}