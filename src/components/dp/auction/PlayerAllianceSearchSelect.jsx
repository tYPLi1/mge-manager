import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

/**
 * Custom dropdown for selecting a player with:
 *  - Alliance filter (chips/buttons)
 *  - Name search input
 *
 * Styled in the DP design-system (var(--dp-*)).
 */
export default function PlayerAllianceSearchSelect({
  players,
  value,
  onValueChange,
  placeholder,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allianceFilter, setAllianceFilter] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const effectivePlaceholder =
    placeholder || (t ? t("auction.selectNamePlaceholder") : "Select your name...");

  const selected = useMemo(
    () => players.find((p) => p.id === value),
    [players, value]
  );

  const alliances = useMemo(() => {
    const set = new Set();
    let hasNone = false;
    players.forEach((p) => {
      if (p.alliance) set.add(p.alliance);
      else hasNone = true;
    });
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
    return { list: arr, hasNone };
  }, [players]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => {
        if (allianceFilter === "__none__") return !p.alliance;
        if (allianceFilter) return p.alliance === allianceFilter;
        return true;
      })
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [players, query, allianceFilter]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
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
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={handleOpen}
        className="dp-input"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          textAlign: "left",
          cursor: "pointer",
          width: "100%",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            flex: 1,
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: selected ? "var(--dp-text)" : "var(--dp-text-dim)",
            }}
          >
            {selected ? selected.name : effectivePlaceholder}
          </span>
          {selected?.alliance && (
            <span
              style={{
                fontSize: 10.5,
                padding: "2px 6px",
                borderRadius: 4,
                background: "var(--dp-accent-soft)",
                color: "var(--dp-accent)",
                border: "1px solid var(--dp-accent-border)",
                flexShrink: 0,
              }}
            >
              {selected.alliance}
            </span>
          )}
        </span>
        <ChevronDown size={14} style={{ color: "var(--dp-text-dim)", flexShrink: 0 }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--dp-card)",
            border: "1px solid var(--dp-border)",
            borderRadius: 8,
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderBottom: "1px solid var(--dp-border)",
            }}
          >
            <Search size={13} style={{ color: "var(--dp-text-dim)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t ? t("playerSearch.searchInputPlaceholder") : "Search..."}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--dp-text)",
                fontSize: 13,
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--dp-text-dim)",
                  cursor: "pointer",
                  padding: 2,
                  display: "flex",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Alliance filter chips */}
          {(alliances.list.length > 0 || alliances.hasNone) && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                padding: "8px 10px",
                borderBottom: "1px solid var(--dp-border)",
                background: "var(--dp-bg)",
              }}
            >
              <Chip
                active={allianceFilter === ""}
                onClick={() => setAllianceFilter("")}
                label={t ? t("auction.allAlliances") || "All" : "All"}
              />
              {alliances.list.map((a) => (
                <Chip
                  key={a}
                  active={allianceFilter === a}
                  onClick={() => setAllianceFilter(a)}
                  label={a}
                />
              ))}
              {alliances.hasNone && (
                <Chip
                  active={allianceFilter === "__none__"}
                  onClick={() => setAllianceFilter("__none__")}
                  label="—"
                />
              )}
            </div>
          )}

          {/* Player list */}
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div
                style={{
                  padding: "12px",
                  fontSize: 12,
                  color: "var(--dp-text-dim)",
                  textAlign: "center",
                }}
              >
                {t ? t("playerSearch.noResults") : "No players found"}
              </div>
            )}
            {filtered.map((p) => {
              const isSelected = p.id === value;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    background: isSelected ? "var(--dp-accent-soft)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--dp-border)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    color: isSelected ? "var(--dp-accent)" : "var(--dp-text)",
                    fontSize: 13,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "var(--dp-bg)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </span>
                  {p.alliance && (
                    <span
                      style={{
                        fontSize: 10.5,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "var(--dp-bg)",
                        color: "var(--dp-text-muted)",
                        border: "1px solid var(--dp-border)",
                        flexShrink: 0,
                      }}
                    >
                      {p.alliance}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 11,
        padding: "3px 8px",
        borderRadius: 12,
        cursor: "pointer",
        background: active ? "var(--dp-accent-soft)" : "var(--dp-card)",
        color: active ? "var(--dp-accent)" : "var(--dp-text-muted)",
        border: `1px solid ${active ? "var(--dp-accent-border)" : "var(--dp-border)"}`,
        fontWeight: active ? 600 : 400,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}