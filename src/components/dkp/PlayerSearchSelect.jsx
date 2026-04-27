import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import AllianceBadge from "@/components/dkp/AllianceBadge";
import { useTranslation } from "@/lib/i18n";

export default function PlayerSearchSelect({ players, value, onValueChange, placeholder }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const effectivePlaceholder = placeholder || t("playerSearch.placeholder");

  const selected = players.find((p) => p.id === value);

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (player) => {
    onValueChange(player.id);
    setOpen(false);
    setQuery("");
  };

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className={`truncate ${selected ? "text-white" : "text-gray-500"}`}>
            {selected ? selected.name : effectivePlaceholder}
          </span>
          {selected?.alliance && <AllianceBadge alliance={selected.alliance} />}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a2234] border border-white/10 rounded-lg shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
            <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("playerSearch.searchInputPlaceholder")}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-gray-500 text-center">
                {t("playerSearch.noResults")}
              </div>
            )}
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center justify-between gap-2 ${
                  p.id === value ? "text-amber-400 bg-amber-500/10" : "text-white"
                }`}
              >
                <span className="truncate">{p.name}</span>
                {p.alliance && <AllianceBadge alliance={p.alliance} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}