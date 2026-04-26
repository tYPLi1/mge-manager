import React, { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useTranslation, AVAILABLE_LOCALES } from "@/lib/i18n";

/**
 * Compact language switcher: a button that opens a dropdown with all
 * available languages. Shows flag + label of the current locale.
 */
export default function LanguageSwitcher({ variant = "header" }) {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const current = AVAILABLE_LOCALES.find((l) => l.code === locale) || AVAILABLE_LOCALES[0];

  useEffect(() => {
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const isFullWidth = variant === "mobile";

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: isFullWidth ? "100%" : "auto" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "transparent",
          border: "1px solid var(--dp-border)",
          borderRadius: 8,
          color: "var(--dp-text-muted)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          width: isFullWidth ? "100%" : "auto",
          justifyContent: isFullWidth ? "space-between" : "flex-start",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Globe size={14} />
          <span style={{ fontSize: 14 }}>{current.flag}</span>
          <span style={{ fontWeight: 600, letterSpacing: "0.05em" }}>{current.label}</span>
        </span>
        <ChevronDown
          size={13}
          style={{
            transition: "transform 0.15s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: isFullWidth ? "auto" : 0,
            left: isFullWidth ? 0 : "auto",
            minWidth: isFullWidth ? "100%" : 180,
            background: "var(--dp-bg-elevated)",
            border: "1px solid var(--dp-border)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 100,
            padding: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {AVAILABLE_LOCALES.map((l) => {
            const isActive = l.code === locale;
            return (
              <button
                key={l.code}
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  background: isActive ? "var(--dp-accent-soft)" : "transparent",
                  color: isActive ? "var(--dp-accent)" : "var(--dp-text)",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  textAlign: "left",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "var(--dp-bg-hover, rgba(255,255,255,0.04))";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 16 }}>{l.flag}</span>
                <span style={{ flex: 1 }}>{l.name}</span>
                {isActive && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}