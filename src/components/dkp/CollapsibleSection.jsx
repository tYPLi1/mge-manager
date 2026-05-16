import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Collapsible section wrapper used on Admin Settings.
 * - Persists open/closed state in localStorage when `storageKey` is provided.
 * - Defaults to open.
 */
export default function CollapsibleSection({
  title,
  description,
  storageKey,
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined" || !storageKey) return defaultOpen;
    const saved = localStorage.getItem(`collapsible:${storageKey}`);
    if (saved === null) return defaultOpen;
    return saved === "true";
  });

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    localStorage.setItem(`collapsible:${storageKey}`, String(open));
  }, [open, storageKey]);

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-white/[0.02] transition-colors rounded-xl"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
        <ChevronDown
          size={16}
          className="text-gray-400 shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1">
          {children}
        </div>
      )}
    </div>
  );
}