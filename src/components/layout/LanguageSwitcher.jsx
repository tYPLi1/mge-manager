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
  const [menuPos, setMenuPos] = useState(null);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const current = AVAILABLE_LOCALES.find((l) => l.code === locale) || AVAILABLE_LOCALES[0];

  useEffect(() => {
    const onClick = (e) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const isFullWidth = variant === "mobile";

  // Compute fixed position so the dropdown can escape any scroll container
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const update = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      const margin = 8;
      const vh = window.innerHeight;
      const spaceBelow = vh - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, Math.min(openUp ? spaceAbove : spaceBelow, vh * 0.7));
      setMenuPos({
        top: openUp ? null : rect.bottom + 4,
        bottom: openUp ? vh - rect.top + 4 : null,
        left: rect.left,
        width: isFullWidth ? rect.width : Math.max(rect.width, 200),
        maxHeight,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, isFullWidth]);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: isFullWidth ? "100%" : "auto" }}>
      <button
        ref={buttonRef}
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

      {open && menuPos && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: menuPos.top !== null ? menuPos.top : "auto",
            bottom: menuPos.bottom !== null ? menuPos.bottom : "auto",
            left: menuPos.left,
            width: menuPos.width,
            background: "var(--dp-bg-elevated)",
            border: "1px solid var(--dp-border)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 9999,
            padding: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            maxHeight: menuPos.maxHeight,
            overflowY: "auto",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
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