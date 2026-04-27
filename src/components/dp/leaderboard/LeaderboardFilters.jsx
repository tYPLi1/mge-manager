import React from "react";
import { Search, Filter, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function DPLeaderboardFilters({
  search, setSearch, powerGroup, setPowerGroup,
  statusFilter, setStatusFilter, allianceFilter, setAllianceFilter, alliances = [],
  hasActiveFilters, onClearFilters,
}) {
  const { t } = useTranslation();

  const selectStyle = {
    background: "var(--dp-bg)",
    border: "1px solid var(--dp-border)",
    borderRadius: 8,
    padding: "8px 10px",
    color: "var(--dp-text)",
    fontSize: 13,
    fontFamily: "inherit",
    flex: "1 1 140px",
    minWidth: 0,
    cursor: "pointer",
  };

  return (
    <div className="dp-card" style={{ padding: 14, display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" }}>
      {/* Search — full width on mobile, capped on desktop */}
      <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360, minWidth: 200 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--dp-text-dim)" }} />
        <input
          className="dp-input"
          placeholder={t("leaderboard.searchPlaceholder")}
          style={{ paddingLeft: 34, width: "100%" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Alliance filter — own row priority on mobile, sits next to search on desktop */}
      {alliances.length > 0 && setAllianceFilter && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 200px", minWidth: 180 }}>
          <Filter size={13} style={{ color: "var(--dp-text-dim)", flexShrink: 0 }} />
          <select
            value={allianceFilter}
            onChange={(e) => setAllianceFilter(e.target.value)}
            style={{ ...selectStyle, flex: 1, minWidth: 0 }}
          >
            <option value="all">{t("leaderboard.filters.allAlliances")}</option>
            {alliances.map(a => (
              <option key={a.name} value={a.name}>{a.name}</option>
            ))}
            <option value="__none__">{t("leaderboard.filters.noAlliance")}</option>
          </select>
        </div>
      )}

      {/* Power + Status — wrap together on mobile */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 280px", minWidth: 0 }}>
        <select value={powerGroup} onChange={(e) => setPowerGroup(e.target.value)} style={selectStyle}>
          <option value="all">{t("leaderboard.filters.all")}</option>
          <option value="top20">{t("leaderboard.filters.top20")}</option>
          <option value="outside">{t("leaderboard.filters.outside")}</option>
          <option value="no_power">{t("leaderboard.filters.noPower")}</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">{t("leaderboard.filters.all")}</option>
          <option value="ready">{t("leaderboard.filters.ready")}</option>
          <option value="cooldown">{t("leaderboard.filters.cooldown")}</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button
          className="dp-btn-ghost"
          onClick={onClearFilters}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}
        >
          <X size={13} /> {t("common.reset")}
        </button>
      )}
    </div>
  );
}