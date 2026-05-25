import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowUpDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const thBase = {
  padding: "12px 14px",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--dp-text-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  whiteSpace: "nowrap",
  cursor: "pointer",
  userSelect: "none",
  position: "sticky",
  top: 0,
  zIndex: 10,
  background: "var(--dp-bg-elevated)",
  borderBottom: "1px solid var(--dp-border)",
};

function SortHeader({ field, sortField, sortDir, onSort, children, align = "left", sticky = false }) {
  const isActive = sortField === field;
  const style = sticky ? { ...thBase, textAlign: align, zIndex: 30, left: sticky === "name" ? 56 : 0 } : { ...thBase, textAlign: align };
  return (
    <th
      onClick={() => onSort(field)}
      style={style}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start" }}>
        {children}
        {isActive && <ArrowUpDown size={12} style={{ color: "var(--dp-accent)" }} />}
      </div>
    </th>
  );
}

function EventCell({ data }) {
  if (!data || data.count === 0) return <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--dp-text-dim)" }}>—</td>;
  return (
    <td style={{ padding: "12px 14px", textAlign: "center" }}>
      <span style={{ fontSize: 12 }}>
        <span style={{ color: "var(--dp-text-muted)" }}>{data.count}×</span>
        <span className="dp-mono" style={{ marginLeft: 4, color: data.dkp >= 0 ? "var(--dp-accent)" : "var(--dp-danger)" }}>
          {data.dkp > 0 ? "+" : ""}{data.dkp}
        </span>
      </span>
    </td>
  );
}

function StatusBadge({ cooldownUntil }) {
  const onCooldown = cooldownUntil && new Date(cooldownUntil) > new Date();
  if (onCooldown) {
    return (
      <span className="dp-badge" style={{ background: "rgba(201,101,101,0.12)", color: "var(--dp-danger)", border: "1px solid rgba(201,101,101,0.25)" }}>
        Cooldown
      </span>
    );
  }
  return (
    <span className="dp-badge" style={{ background: "rgba(109,185,137,0.12)", color: "var(--dp-success)", border: "1px solid rgba(109,185,137,0.25)" }}>
      Ready
    </span>
  );
}

export default function DPLeaderboardTable({ data, isLoading, sortField, sortDir, onSort, eventColumns = [], allianceColors = {} }) {
  const { t } = useTranslation();
  const c = (k) => t(`leaderboard.columns.${k}`);

  return (
    <div className="dp-card-elevated" style={{ overflow: "hidden" }}>
      <style>{`.dp-row-border > td { border-bottom: 1px solid var(--dp-border); }`}</style>
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
        <table className="dp-table-sticky-first" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13.5, minWidth: 720 }}>
          <thead>
            <tr style={{ background: "var(--dp-bg-elevated)", borderBottom: "1px solid var(--dp-border)" }}>
              <th style={{ ...thBase, width: 56, textAlign: "left", zIndex: 30, left: 0, position: "sticky" }}>#</th>
              <SortHeader field="name" sortField={sortField} sortDir={sortDir} onSort={onSort} sticky="name">{c("name")}</SortHeader>
              <SortHeader field="alliance" sortField={sortField} sortDir={sortDir} onSort={onSort}>{c("alliance")}</SortHeader>
              <SortHeader field="current_dkp" sortField={sortField} sortDir={sortDir} onSort={onSort} align="right">{c("dkp")}</SortHeader>
              <SortHeader field="total_dkp" sortField={sortField} sortDir={sortDir} onSort={onSort} align="right">{c("earned")}</SortHeader>
              <SortHeader field="dkp_spent" sortField={sortField} sortDir={sortDir} onSort={onSort} align="right">{c("spent")}</SortHeader>
              <SortHeader field="power" sortField={sortField} sortDir={sortDir} onSort={onSort} align="right">{c("power")}</SortHeader>
              <SortHeader field="powerRank" sortField={sortField} sortDir={sortDir} onSort={onSort} align="center">{c("powerRank")}</SortHeader>
              <SortHeader field="cooldown_until" sortField={sortField} sortDir={sortDir} onSort={onSort} align="center">{c("status")}</SortHeader>
              {eventColumns.map(col => (
                <SortHeader key={col.key} field={`evt_${col.key}`} sortField={sortField} sortDir={sortDir} onSort={onSort} align="center">
                  {col.label}
                </SortHeader>
              ))}
              <SortHeader field="activity_30d" sortField={sortField} sortDir={sortDir} onSort={onSort} align="center">{c("activity30d")}</SortHeader>
              <SortHeader field="activity_score" sortField={sortField} sortDir={sortDir} onSort={onSort} align="center">{c("activity")}</SortHeader>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array(10).fill(0).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--dp-border)" }}>
                  <td style={{ padding: "12px 14px", position: "sticky", left: 0, zIndex: 8, background: "var(--dp-bg)" }}>
                    <div style={{ height: 14, width: 60, background: "var(--dp-border)", borderRadius: 4, opacity: 0.5 }} />
                  </td>
                  <td style={{ padding: "12px 14px", position: "sticky", left: 56, zIndex: 8, background: "var(--dp-bg)" }}>
                    <div style={{ height: 14, width: 60, background: "var(--dp-border)", borderRadius: 4, opacity: 0.5 }} />
                  </td>
                  {Array(8 + eventColumns.length).fill(0).map((_, j) => (
                    <td key={j} style={{ padding: "12px 14px" }}>
                      <div style={{ height: 14, width: 60, background: "var(--dp-border)", borderRadius: 4, opacity: 0.5 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              data.map((p, idx) => {
                const rankClass = idx === 0 ? "dp-rank-1" : idx === 1 ? "dp-rank-2" : idx === 2 ? "dp-rank-3" : "";
                return (
                  <tr key={p.id} className={`dp-hover-row dp-row-border ${rankClass}`}>
                    <td style={{ padding: "12px 14px", position: "sticky", left: 0, zIndex: 8, background: "var(--dp-bg)" }}>
                      <span className="dp-heading dp-mono" style={{
                        fontSize: 14, fontWeight: 600,
                        color: idx <= 2 ? "var(--dp-accent)" : "var(--dp-text-muted)",
                      }}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 500, position: "sticky", left: 56, zIndex: 8, background: "var(--dp-bg)" }}>
                      <Link to={createPageUrl(`PlayerDetail?id=${p.id}`)} style={{ color: "var(--dp-text)", textDecoration: "none" }}>
                        {p.name}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {p.alliance ? (
                        <span style={{
                          display: "inline-flex",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11.5,
                          fontWeight: 500,
                          color: allianceColors[p.alliance] || "var(--dp-accent)",
                          border: `1px solid ${(allianceColors[p.alliance] || "#f59e0b")}40`,
                          background: `${(allianceColors[p.alliance] || "#f59e0b")}15`,
                        }}>
                          {p.alliance}
                        </span>
                      ) : (
                        <span style={{ color: "var(--dp-text-dim)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td className="dp-mono dp-accent-text" style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600 }}>
                      {(p.current_dkp || 0).toLocaleString("en-US")}
                    </td>
                    <td className="dp-mono" style={{ padding: "12px 14px", textAlign: "right", color: "var(--dp-text-muted)" }}>
                      {(p.total_dkp || 0).toLocaleString("en-US")}
                    </td>
                    <td className="dp-mono" style={{ padding: "12px 14px", textAlign: "right", color: "var(--dp-text-muted)" }}>
                      {Math.abs(p.dkp_spent || 0).toLocaleString("en-US")}
                    </td>
                    <td className="dp-mono" style={{ padding: "12px 14px", textAlign: "right", color: "var(--dp-accent)" }}>
                      {p.power ? p.power.toLocaleString("en-US") : <span style={{ color: "var(--dp-text-dim)" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      {p.powerRank > 0 ? (
                        <span className="dp-badge" style={{
                          background: p.powerRank <= 20 ? "rgba(107, 147, 201, 0.12)" : "rgba(155, 161, 172, 0.1)",
                          color: p.powerRank <= 20 ? "var(--dp-info)" : "var(--dp-text-dim)",
                          border: `1px solid ${p.powerRank <= 20 ? "rgba(107, 147, 201, 0.25)" : "var(--dp-border)"}`,
                        }}>
                          #{p.powerRank}
                        </span>
                      ) : <span style={{ color: "var(--dp-text-dim)" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <StatusBadge cooldownUntil={p.cooldown_until} />
                    </td>
                    {eventColumns.map(col => (
                      <EventCell key={col.key} data={p[col.key]} />
                    ))}
                    <td className="dp-mono" style={{ padding: "12px 14px", textAlign: "center", color: "var(--dp-accent)", fontWeight: 500 }}>
                      {(p.activity_30d || 0).toLocaleString("en-US")}
                    </td>
                    <td className="dp-mono" style={{ padding: "12px 14px", textAlign: "center", color: "var(--dp-accent)", fontWeight: 500 }}>
                      {(p.activity_score || 0).toLocaleString("en-US")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {!isLoading && data.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--dp-text-dim)" }}>
          {t("leaderboard.noPlayers")}
        </div>
      )}
    </div>
  );
}