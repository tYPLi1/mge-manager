import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Search, Coins, Snowflake, ShieldAlert, Gift, Upload, RotateCcw, Gavel, Play, Square, CheckCircle, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const ACTION_META = {
  dkp_manual_adjust: { color: "var(--dp-info)", bg: "rgba(107, 147, 201, 0.12)", border: "rgba(107, 147, 201, 0.25)", icon: Coins },
  dkp_penalty: { color: "var(--dp-danger)", bg: "rgba(201, 101, 101, 0.12)", border: "rgba(201, 101, 101, 0.25)", icon: ShieldAlert },
  dkp_compensation: { color: "var(--dp-success)", bg: "rgba(109, 185, 137, 0.12)", border: "rgba(109, 185, 137, 0.25)", icon: Gift },
  cooldown_set: { color: "#a78bfa", bg: "rgba(167, 139, 250, 0.12)", border: "rgba(167, 139, 250, 0.25)", icon: Snowflake },
  cooldown_cleared: { color: "#a78bfa", bg: "rgba(167, 139, 250, 0.12)", border: "rgba(167, 139, 250, 0.25)", icon: Snowflake },
  penalty_applied: { color: "var(--dp-danger)", bg: "rgba(201, 101, 101, 0.12)", border: "rgba(201, 101, 101, 0.25)", icon: ShieldAlert },
  penalty_reset: { color: "var(--dp-success)", bg: "rgba(109, 185, 137, 0.12)", border: "rgba(109, 185, 137, 0.25)", icon: RotateCcw },
  event_upload: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.25)", icon: Upload },
  auction_opened: { color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.25)", icon: Play },
  auction_closed: { color: "#f97316", bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.25)", icon: Square },
  auction_confirmed: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.25)", icon: CheckCircle },
  auction_deleted: { color: "var(--dp-danger)", bg: "rgba(201, 101, 101, 0.12)", border: "rgba(201, 101, 101, 0.25)", icon: Trash2 },
};

export default function AuditLogTab({ onJumpToTransactions }) {
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 2500),
  });

  const queryClient = useQueryClient();
  useEffect(() => {
    const unsub = base44.entities.AuditLog.subscribe(() => queryClient.invalidateQueries({ queryKey: ["audit-logs"] }));
    return () => unsub();
  }, [queryClient]);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return logs.filter((l) => {
      if (filterType !== "all" && l.action_type !== filterType) return false;
      if (q && !`${l.player_name || ""} ${l.source || ""} ${l.summary || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logs, filterType, searchQ]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const selectStyle = {
    background: "var(--dp-bg)",
    border: "1px solid var(--dp-border)",
    borderRadius: 8,
    padding: "8px 10px",
    color: "var(--dp-text)",
    fontSize: 13,
    fontFamily: "inherit",
    minWidth: 180,
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="dp-card" style={{ padding: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--dp-text-dim)", pointerEvents: "none" }} aria-hidden="true" />
          <input
            className="dp-input"
            placeholder={t("auditLog.searchPlaceholder")}
            style={{ paddingLeft: 34 }}
            value={searchQ}
            onChange={(e) => { setSearchQ(e.target.value); setPage(0); }}
          />
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Filter size={13} style={{ color: "var(--dp-text-dim)" }} />
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(0); }} style={selectStyle}>
            <option value="all">{t("auditLog.allActions")}</option>
            <option value="dkp_manual_adjust">{t("auditLog.actions.dkp_manual_adjust")}</option>
            <option value="dkp_penalty">{t("auditLog.actions.dkp_penalty")}</option>
            <option value="dkp_compensation">{t("auditLog.actions.dkp_compensation")}</option>
            <option value="cooldown_set">{t("auditLog.actions.cooldown_set")}</option>
            <option value="cooldown_cleared">{t("auditLog.actions.cooldown_cleared")}</option>
            <option value="penalty_applied">{t("auditLog.actions.penalty_applied")}</option>
            <option value="penalty_reset">{t("auditLog.actions.penalty_reset")}</option>
            <option value="event_upload">{t("auditLog.actions.event_upload")}</option>
            <option value="auction_opened">{t("auditLog.actions.auction_opened")}</option>
            <option value="auction_closed">{t("auditLog.actions.auction_closed")}</option>
            <option value="auction_confirmed">{t("auditLog.actions.auction_confirmed")}</option>
            <option value="auction_deleted">{t("auditLog.actions.auction_deleted")}</option>
          </select>
        </div>
      </div>

      <div className="dp-card-elevated" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 720 }}>
            <thead>
              <tr style={{ background: "var(--dp-bg-elevated)", borderBottom: "1px solid var(--dp-border)" }}>
                {[
                  t("auditLog.columns.date"),
                  t("auditLog.columns.action"),
                  t("auditLog.columns.player"),
                  t("auditLog.columns.summary"),
                  t("auditLog.columns.amount"),
                ].map((h, i) => (
                  <th key={i} style={{
                    textAlign: i === 4 ? "right" : "left",
                    padding: "12px 18px", fontSize: 11, fontWeight: 600,
                    color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--dp-border)" }}>
                    {Array(5).fill(0).map((_, j) => (
                      <td key={j} style={{ padding: "12px 18px" }}>
                        <div style={{ height: 12, width: 80, background: "var(--dp-border)", borderRadius: 4, opacity: 0.5 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "32px 18px", textAlign: "center", color: "var(--dp-text-dim)", fontSize: 13 }}>
                    {t("auditLog.empty")}
                  </td>
                </tr>
              ) : (
                paged.map((l) => {
                  const meta = ACTION_META[l.action_type] || { color: "var(--dp-text-dim)", bg: "rgba(255,255,255,0.05)", border: "var(--dp-border)", icon: Coins };
                  const Icon = meta.icon;
                  const dateStr = l.created_date ? new Date(l.created_date).toISOString().slice(0, 10) : l.action_date;
                  const isEvent = l.action_type === "event_upload" && l.source;
                  return (
                    <tr key={l.id} className="dp-hover-row" style={{ borderBottom: "1px solid var(--dp-border)" }}>
                      <td className="dp-mono" style={{ padding: "12px 18px", color: "var(--dp-text-muted)", fontSize: 12.5 }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <span className="dp-badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Icon size={11} />
                          {t(`auditLog.actions.${l.action_type}`)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px", fontWeight: 500 }}>{l.player_name || "—"}</td>
                      <td style={{ padding: "12px 18px", fontSize: 12.5, color: "var(--dp-text-muted)" }}>
                        {l.summary || "—"}
                        {isEvent && onJumpToTransactions && (
                          <button
                            onClick={() => onJumpToTransactions(l.source)}
                            style={{
                              marginLeft: 8, padding: "2px 8px", fontSize: 11,
                              background: "rgba(107, 147, 201, 0.12)", color: "var(--dp-info)",
                              border: "1px solid rgba(107, 147, 201, 0.25)", borderRadius: 4, cursor: "pointer",
                            }}
                          >
                            {t("auditLog.viewDetails")} →
                          </button>
                        )}
                      </td>
                      <td className="dp-mono" style={{ padding: "12px 18px", textAlign: "right", fontWeight: 600, color: l.amount > 0 ? "var(--dp-success)" : l.amount < 0 ? "var(--dp-danger)" : "var(--dp-text-dim)" }}>
                        {l.amount === undefined || l.amount === null ? "—" : `${l.amount > 0 ? "+" : ""}${l.amount}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 18px", borderTop: "1px solid var(--dp-border)",
          }}>
            <span style={{ fontSize: 12, color: "var(--dp-text-dim)" }}>
              {t("common.page")} {page + 1} {t("common.of")} {totalPages}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="dp-btn-ghost" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={{ opacity: page === 0 ? 0.4 : 1 }}>
                {t("common.previous")}
              </button>
              <button className="dp-btn-ghost" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} style={{ opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
                {t("common.next")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}