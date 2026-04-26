import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, ArrowUpCircle, ArrowDownCircle, Search } from "lucide-react";
import DPPageHeader from "@/components/dp/PageHeader";
import StatCard from "@/components/dp/StatCard";
import { useTranslation } from "@/lib/i18n";

const typeStyle = (type) => {
  if (type === "bid" || type === "penalty") {
    return { color: "var(--dp-danger)", bg: "rgba(201, 101, 101, 0.12)", border: "rgba(201, 101, 101, 0.25)" };
  }
  return { color: "var(--dp-success)", bg: "rgba(109, 185, 137, 0.12)", border: "rgba(109, 185, 137, 0.25)" };
};

export default function Transactions() {
  const { t } = useTranslation();
  const [filterPlayer, setFilterPlayer] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.DKPTransaction.list("-created_date", 2500),
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players-list"],
    queryFn: () => base44.entities.Player.list("name", 500),
  });

  const queryClient = useQueryClient();
  useEffect(() => {
    const unsub1 = base44.entities.DKPTransaction.subscribe(() => queryClient.invalidateQueries({ queryKey: ["transactions"] }));
    const unsub2 = base44.entities.Player.subscribe(() => queryClient.invalidateQueries({ queryKey: ["players-list"] }));
    return () => { unsub1(); unsub2(); };
  }, [queryClient]);

  const sources = useMemo(() => {
    const s = new Set(transactions.map((tx) => tx.source).filter(Boolean));
    return Array.from(s).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filterPlayer !== "all" && tx.player_id !== filterPlayer) return false;
      if (filterSource !== "all" && tx.source !== filterSource) return false;
      if (filterType !== "all" && tx.type !== filterType) return false;
      if (q && !`${tx.player_name || ""} ${tx.source || ""} ${tx.note || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, filterPlayer, filterSource, filterType, searchQ]);

  const totalEarned = filtered.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const totalSpent = Math.abs(filtered.filter(tx => tx.amount < 0).reduce((s, tx) => s + tx.amount, 0));

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
    minWidth: 140,
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <DPPageHeader title={t("transactions.title")} subtitle={t("transactions.transactionsLabel", { count: filtered.length })} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <div className="dp-card-elevated" style={{ padding: 16 }}>
          <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            {t("transactions.totalEarned")}
          </div>
          <div className="dp-heading dp-mono dp-success-text" style={{ fontSize: 24, fontWeight: 600 }}>
            +{totalEarned.toLocaleString("en-US")}
          </div>
        </div>
        <div className="dp-card-elevated" style={{ padding: 16 }}>
          <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            {t("transactions.totalSpent")}
          </div>
          <div className="dp-heading dp-mono dp-danger-text" style={{ fontSize: 24, fontWeight: 600 }}>
            −{totalSpent.toLocaleString("en-US")}
          </div>
        </div>
        <StatCard label={t("transactions.transactionsCount")} value={filtered.length.toLocaleString("en-US")} />
      </div>

      <div className="dp-card" style={{ padding: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--dp-text-dim)" }} />
          <input
            className="dp-input"
            placeholder={t("transactions.searchPlaceholder")}
            style={{ paddingLeft: 34 }}
            value={searchQ}
            onChange={(e) => { setSearchQ(e.target.value); setPage(0); }}
          />
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Filter size={13} style={{ color: "var(--dp-text-dim)" }} />
          <select value={filterPlayer} onChange={(e) => { setFilterPlayer(e.target.value); setPage(0); }} style={selectStyle}>
            <option value="all">{t("transactions.filters.allPlayers")}</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterSource} onChange={(e) => { setFilterSource(e.target.value); setPage(0); }} style={selectStyle}>
            <option value="all">{t("transactions.filters.allEvents")}</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(0); }} style={selectStyle}>
            <option value="all">{t("transactions.filters.allTypes")}</option>
            <option value="earn">{t("transactions.types.earn")}</option>
            <option value="bid">{t("transactions.types.bid")}</option>
            <option value="penalty">{t("transactions.types.penalty")}</option>
            <option value="bonus">{t("transactions.types.bonus")}</option>
            <option value="compensation">{t("transactions.types.compensation")}</option>
            <option value="king_allocation">{t("transactions.types.king_allocation")}</option>
          </select>
        </div>
      </div>

      <div className="dp-card-elevated" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 720 }}>
            <thead>
              <tr style={{ background: "var(--dp-bg-elevated)", borderBottom: "1px solid var(--dp-border)" }}>
                {[
                  t("transactions.columns.date"),
                  t("transactions.columns.player"),
                  t("transactions.columns.event"),
                  t("transactions.columns.stage"),
                  t("transactions.columns.note"),
                  t("transactions.columns.amount"),
                  t("transactions.columns.type"),
                ].map((h, i) => (
                  <th key={i} style={{
                    textAlign: i === 5 ? "right" : "left",
                    padding: "12px 18px", fontSize: 11, fontWeight: 600,
                    color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--dp-border)" }}>
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} style={{ padding: "12px 18px" }}>
                        <div style={{ height: 12, width: 70, background: "var(--dp-border)", borderRadius: 4, opacity: 0.5 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                paged.map((tx) => {
                  const ts = typeStyle(tx.type);
                  const positive = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="dp-hover-row" style={{ borderBottom: "1px solid var(--dp-border)" }}>
                      <td className="dp-mono" style={{ padding: "12px 18px", color: "var(--dp-text-muted)", fontSize: 12.5 }}>
                        {tx.event_date}
                      </td>
                      <td style={{ padding: "12px 18px", fontWeight: 500 }}>{tx.player_name}</td>
                      <td style={{ padding: "12px 18px", color: "var(--dp-text-muted)" }}>
                        <span className="dp-badge" style={{ background: "rgba(107, 147, 201, 0.12)", color: "var(--dp-info)", border: "1px solid rgba(107, 147, 201, 0.25)" }}>
                          {tx.source}
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px", fontSize: 12, color: "var(--dp-text-dim)" }}>{tx.source_stage || "—"}</td>
                      <td style={{ padding: "12px 18px", fontSize: 12.5, color: "var(--dp-text-dim)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.note || "—"}
                      </td>
                      <td style={{ padding: "12px 18px", textAlign: "right" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {positive
                            ? <ArrowUpCircle size={13} style={{ color: "var(--dp-success)" }} />
                            : <ArrowDownCircle size={13} style={{ color: "var(--dp-danger)" }} />
                          }
                          <span className="dp-mono" style={{
                            fontWeight: 600,
                            color: positive ? "var(--dp-success)" : "var(--dp-danger)",
                          }}>
                            {positive ? "+" : "−"}{Math.abs(tx.amount)}
                          </span>
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <span className="dp-badge" style={{ background: ts.bg, color: ts.color, border: `1px solid ${ts.border}` }}>
                          {tx.type}
                        </span>
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