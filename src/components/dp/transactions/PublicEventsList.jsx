import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Search, Calendar, Upload } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import PlayerLink from "@/components/dp/PlayerLink";

/**
 * Public, read-only events list — groups DKPTransactions by event_date + source + source_stage,
 * exactly like the admin RecentEventsList. Searchable & paginated (no time window).
 */
export default function PublicEventsList() {
  const { t } = useTranslation();
  const [expandedKey, setExpandedKey] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["events-all-transactions"],
    queryFn: () => base44.entities.DKPTransaction.list("-event_date", 10000),
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players-for-events"],
    queryFn: () => base44.entities.Player.list("name", 5000),
  });

  const playerMap = useMemo(
    () => Object.fromEntries(players.map(p => [p.id, p])),
    [players]
  );

  const queryClient = useQueryClient();
  useEffect(() => {
    const unsub = base44.entities.DKPTransaction.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["events-all-transactions"] });
    });
    return () => unsub();
  }, [queryClient]);

  // Group by event_date + source + source_stage — only "earn" type counts as event upload.
  // We include all non-bid types so manual bonuses tied to a source/date also show up grouped.
  const events = useMemo(() => {
    const map = new Map();
    for (const tx of transactions) {
      if (!tx.source || !tx.event_date) continue;
      if (tx.type === "bid") continue; // bids belong to auctions, not events
      const key = `${tx.event_date}|${tx.source}|${tx.source_stage || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          event_date: tx.event_date,
          source: tx.source,
          source_stage: tx.source_stage || null,
          transactions: [],
          total_dkp: 0,
        });
      }
      const ev = map.get(key);
      ev.transactions.push(tx);
      ev.total_dkp += tx.amount || 0;
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.event_date !== b.event_date) return b.event_date.localeCompare(a.event_date);
      return a.source.localeCompare(b.source);
    });
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return events;
    return events.filter(ev => {
      if (`${ev.source} ${ev.source_stage || ""} ${ev.event_date}`.toLowerCase().includes(q)) return true;
      // Also search inside transactions (player names)
      return ev.transactions.some(tx => (tx.player_name || "").toLowerCase().includes(q));
    });
  }, [events, searchQ]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const stageLabel = (stage) =>
    stage === "prep" ? t("eventTemplates.stagePrep") : stage === "war" ? t("eventTemplates.stageWar") : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Search bar */}
      <div className="dp-card" style={{ padding: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 420 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--dp-text-dim)", pointerEvents: "none" }} aria-hidden="true" />
          <input
            className="dp-input"
            placeholder={t("eventsList.searchPlaceholder")}
            style={{ paddingLeft: 34 }}
            value={searchQ}
            onChange={(e) => { setSearchQ(e.target.value); setPage(0); }}
          />
        </div>
        <span style={{ fontSize: 12, color: "var(--dp-text-dim)" }}>
          {t("eventsList.eventsCount", { count: filtered.length })}
        </span>
      </div>

      {/* Events */}
      <div className="dp-card-elevated" style={{ padding: 14 }}>
        {isLoading ? (
          <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--dp-text-dim)", fontSize: 13 }}>
            {t("common.loading")}
          </div>
        ) : paged.length === 0 ? (
          <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--dp-text-dim)", fontSize: 13 }}>
            {t("eventsList.empty")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {paged.map(event => {
              const isOpen = expandedKey === event.key;
              const label = stageLabel(event.source_stage);
              return (
                <div
                  key={event.key}
                  style={{
                    borderRadius: 8,
                    border: "1px solid var(--dp-border)",
                    background: "var(--dp-bg)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => setExpandedKey(isOpen ? null : event.key)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "inherit",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--dp-bg-elevated)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {isOpen ? (
                      <ChevronDown size={16} style={{ color: "var(--dp-accent)", flexShrink: 0 }} />
                    ) : (
                      <ChevronRight size={16} style={{ color: "var(--dp-text-dim)", flexShrink: 0 }} />
                    )}
                    <Upload size={14} style={{ color: "var(--dp-accent)", flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--dp-text)" }}>
                        {event.source}
                        {label && <span style={{ color: "var(--dp-text-dim)", fontWeight: 400 }}> — {label}</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", marginTop: 2 }}>
                        <span className="dp-mono">{event.event_date}</span> ·{" "}
                        {t("eventsList.playersCount", { count: event.transactions.length })} ·{" "}
                        <span
                          className="dp-mono"
                          style={{
                            fontWeight: 600,
                            color: event.total_dkp >= 0 ? "var(--dp-success)" : "var(--dp-danger)",
                          }}
                        >
                          {event.total_dkp > 0 ? "+" : ""}{event.total_dkp} DKP
                        </span>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div style={{ borderTop: "1px solid var(--dp-border)", maxHeight: 360, overflow: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ background: "var(--dp-bg-elevated)" }}>
                            {[
                              t("transactions.columns.player"),
                              t("transactions.columns.alliance"),
                              t("transactions.columns.amount"),
                              t("transactions.columns.type"),
                              t("transactions.columns.note"),
                            ].map((h, i) => (
                              <th
                                key={i}
                                style={{
                                  textAlign: "left",
                                  padding: "8px 12px",
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  color: "var(--dp-text-dim)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.06em",
                                  position: "sticky",
                                  top: 0,
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {event.transactions.map(tx => {
                            const alliance = playerMap[tx.player_id]?.alliance || "";
                            return (
                              <tr key={tx.id} style={{ borderTop: "1px solid var(--dp-border)" }}>
                                <td style={{ padding: "6px 12px", color: "var(--dp-text)", fontWeight: 500 }}>
                                  <PlayerLink playerId={tx.player_id} playerName={tx.player_name} />
                                </td>
                                <td style={{ padding: "6px 12px", color: "var(--dp-text-muted)", fontSize: 11.5 }}>
                                  {alliance || <span style={{ color: "var(--dp-text-dim)" }}>—</span>}
                                </td>
                                <td
                                  className="dp-mono"
                                  style={{
                                    padding: "6px 12px",
                                    fontWeight: 600,
                                    color: tx.amount > 0 ? "var(--dp-success)" : "var(--dp-danger)",
                                  }}
                                >
                                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                                </td>
                                <td style={{ padding: "6px 12px", color: "var(--dp-text-dim)", fontSize: 11.5 }}>{tx.type}</td>
                                <td style={{ padding: "6px 12px", color: "var(--dp-text-dim)", fontSize: 11.5, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {tx.note || "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 4px 0", marginTop: 8, borderTop: "1px solid var(--dp-border)",
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