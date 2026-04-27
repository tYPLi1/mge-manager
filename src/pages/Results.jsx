import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, Calendar, Award, ChevronRight, ScrollText } from "lucide-react";
import DPPageHeader from "@/components/dp/PageHeader";
import EmptyState from "@/components/dp/EmptyState";
import { useTranslation } from "@/lib/i18n";

const DEFAULT_MGE_TARGETS = [
  { rank: 1, medals: 100, target: 30000000 },
  { rank: 2, medals: 80, target: 28000000 },
  { rank: 3, medals: 60, target: 26000000 },
  { rank: 4, medals: 40, target: 24000000 },
  { rank: 5, medals: 20, target: 22000000 },
  { rank: 6, medals: 15, target: 20000000 },
  { rank: 7, medals: 15, target: 18000000 },
  { rank: 8, medals: 10, target: 16000000 },
  { rank: 9, medals: 10, target: 14000000 },
  { rank: 10, medals: 10, target: 12000000 },
];

const PAGE_SIZE = 8;

export default function Results() {
  const { t } = useTranslation();
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [pastPage, setPastPage] = useState(0);
  const queryClient = useQueryClient();

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ["auctions-confirmed"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPublicAuctions", {});
      const all = res.data?.auctions || [];
      return all.filter(a => a.status === "confirmed");
    },
  });

  const { data: results = [] } = useQuery({
    queryKey: ["results", selectedAuction?.id],
    queryFn: () => selectedAuction ? base44.entities.AuctionResult.filter({ auction_id: selectedAuction.id }, "rank", 50) : [],
    enabled: !!selectedAuction,
  });

  // Compensations awarded for this auction (matched via DKPTransaction.note containing auction title)
  const { data: compensations = [] } = useQuery({
    queryKey: ["compensations", selectedAuction?.id],
    queryFn: async () => {
      if (!selectedAuction) return [];
      const all = await base44.entities.DKPTransaction.filter({ type: "compensation" }, "-event_date", 500);
      return all.filter(tx => typeof tx.note === "string" && tx.note.includes(selectedAuction.title));
    },
    enabled: !!selectedAuction,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPublicSettings", {});
      return res.data?.settings || [];
    },
  });

  // Auto-select latest
  useEffect(() => {
    if (!selectedAuction && auctions.length > 0) setSelectedAuction(auctions[0]);
  }, [auctions, selectedAuction]);

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["auctions-confirmed"] });
    }, 30000);
    const unsub = base44.entities.AuctionResult.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
    });
    return () => { clearInterval(interval); unsub(); };
  }, [queryClient]);

  const mgeTargets = useMemo(() => {
    try {
      const raw = settings.find((s) => s.key === "mge_targets")?.value;
      return raw ? JSON.parse(raw) : DEFAULT_MGE_TARGETS;
    } catch { return DEFAULT_MGE_TARGETS; }
  }, [settings]);

  const tiebreaker = settings.find((s) => s.key === "auction_tiebreaker")?.value || "fcfs";
  const tiebreakerFallback = settings.find((s) => s.key === "auction_tiebreaker_fallback")?.value || "fcfs";

  const nonFixedResults = results.filter(r => !(typeof r.tiebreaker_note === "string" && r.tiebreaker_note.startsWith("Fixed:")));
  const hasTies = nonFixedResults.some((r, i) =>
    (i > 0 && r.dkp_bid === nonFixedResults[i - 1].dkp_bid) ||
    (i < nonFixedResults.length - 1 && r.dkp_bid === nonFixedResults[i + 1].dkp_bid)
  );

  const ruleLabel = (rule) => {
    const key = `results.tiebreakerRule.${rule}`;
    const val = t(key);
    return val === key ? t("results.tiebreakerRule.fcfs") : val;
  };

  const totalDkp = results.reduce((s, r) => s + (r.dkp_bid || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <DPPageHeader title={t("results.title")} subtitle={t("results.subtitle")} />

      {selectedAuction ? (
        <div className="dp-card-elevated" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                <span className="dp-badge" style={{
                  background: "var(--dp-accent-soft)",
                  color: "var(--dp-accent)",
                  border: "1px solid var(--dp-accent-border)",
                }}>
                  <Trophy size={11} /> {t("results.confirmed")}
                </span>
                {selectedAuction.confirmed_at && (
                  <span style={{ fontSize: 11.5, color: "var(--dp-text-dim)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={11} /> {new Date(selectedAuction.confirmed_at).toLocaleDateString("en-US", { timeZone: "UTC" })}
                  </span>
                )}
              </div>
              <h2 className="dp-heading" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{selectedAuction.title}</h2>
              {hasTies && (
                <div style={{ fontSize: 11.5, color: "#a96fce", marginTop: 6 }}>
                  ⚖ {t("results.tiebreaker")}: {ruleLabel(tiebreaker)}
                  {tiebreaker !== "fcfs" && (
                    <div style={{ color: "var(--dp-text-dim)" }}>↳ {t("results.fallback")}: {ruleLabel(tiebreakerFallback)}</div>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t("results.slots")}</div>
                <div className="dp-heading dp-mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{results.length}</div>
              </div>
              <div style={{ width: 1, height: 36, background: "var(--dp-border)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t("results.totalDkp")}</div>
                <div className="dp-heading dp-mono dp-accent-text" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{totalDkp.toLocaleString("en-US")}</div>
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto", margin: "0 -20px -20px", borderTop: "1px solid var(--dp-border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 560 }}>
              <thead>
                <tr style={{ background: "var(--dp-bg-elevated)" }}>
                  {[
                    t("results.columns.rank"),
                    t("results.columns.player"),
                    t("results.columns.dkpBid"),
                    t("results.columns.score"),
                    t("results.columns.medals"),
                    t("results.columns.notes"),
                  ].map((h, i) => (
                    <th key={i} style={{
                      textAlign: i <= 1 ? "left" : i === 5 ? "left" : "right",
                      padding: "10px 18px",
                      fontSize: 11, fontWeight: 600,
                      color: "var(--dp-text-dim)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const tg = mgeTargets.find((m) => m.rank === r.rank);
                  const rankClass = r.rank === 1 ? "dp-rank-1" : r.rank === 2 ? "dp-rank-2" : r.rank === 3 ? "dp-rank-3" : "";
                  const isFixed = typeof r.tiebreaker_note === "string" && r.tiebreaker_note.startsWith("Fixed:");
                  const fixedReason = isFixed ? r.tiebreaker_note.replace(/^Fixed:\s*/, "") : null;
                  return (
                    <tr key={r.id} className={`dp-hover-row ${rankClass}`} style={{ borderBottom: "1px solid var(--dp-border)", background: isFixed ? "rgba(212, 168, 89, 0.05)" : undefined }}>
                      <td style={{ padding: "12px 18px" }}>
                        <span className="dp-heading dp-mono" style={{
                          fontSize: 14, fontWeight: 600,
                          color: r.rank <= 3 ? "var(--dp-accent)" : "var(--dp-text)",
                        }}>
                          #{r.rank}
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px", fontWeight: 500 }}>
                        {r.player_name}
                        {isFixed && (
                          <span style={{ marginLeft: 8, fontSize: 10.5, color: "var(--dp-accent)" }}>· 📌 {t("fixedRanks.fixBadge")}</span>
                        )}
                        {r.is_friendly_zone && (
                          <span style={{ marginLeft: 8, fontSize: 10.5, color: "var(--dp-info)" }}>· FZ</span>
                        )}
                      </td>
                      <td className="dp-mono dp-accent-text" style={{ padding: "12px 18px", textAlign: "right", fontWeight: 600 }}>
                        {isFixed ? <span style={{ color: "var(--dp-text-dim)" }}>—</span> : r.dkp_bid}
                      </td>
                      <td className="dp-mono" style={{ padding: "12px 18px", textAlign: "right", color: "var(--dp-text-muted)" }}>
                        {(r.target_score ?? tg?.target)?.toLocaleString("en-US") || "—"}
                      </td>
                      <td style={{ padding: "12px 18px", textAlign: "right" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--dp-text-muted)" }}>
                          <Award size={12} style={{ color: "var(--dp-accent)" }} />
                          <span className="dp-mono">{r.hero_medals ?? tg?.medals ?? "—"}</span>
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px", fontSize: 11.5, color: "var(--dp-text-dim)" }}>
                        {isFixed ? <span style={{ color: "var(--dp-accent)" }}>📌 {fixedReason}</span> : (r.tiebreaker_note ? `⚖ ${r.tiebreaker_note}` : "—")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {results.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: "var(--dp-text-dim)", fontSize: 13 }}>
                {t("results.noResults")}
              </div>
            )}
          </div>

          {compensations.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--dp-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Award size={14} style={{ color: "var(--dp-accent)" }} />
                <h3 className="dp-heading" style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                  {t("results.compensations.title")}
                </h3>
                <span style={{ fontSize: 11, color: "var(--dp-text-dim)" }}>
                  ({compensations.length})
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 480 }}>
                  <thead>
                    <tr style={{ background: "var(--dp-bg-elevated)" }}>
                      {[t("results.compensations.player"), t("results.compensations.dkp"), t("results.compensations.date"), t("results.compensations.note")].map((h, i) => (
                        <th key={i} style={{
                          textAlign: i === 1 ? "right" : "left",
                          padding: "8px 14px",
                          fontSize: 10.5, fontWeight: 600,
                          color: "var(--dp-text-dim)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compensations.map((c) => (
                      <tr key={c.id} className="dp-hover-row" style={{ borderBottom: "1px solid var(--dp-border)" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 500 }}>{c.player_name}</td>
                        <td className="dp-mono" style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: c.amount >= 0 ? "var(--dp-success, #10b981)" : "var(--dp-text)" }}>
                          {c.amount >= 0 ? "+" : ""}{c.amount}
                        </td>
                        <td className="dp-mono" style={{ padding: "10px 14px", color: "var(--dp-text-muted)", fontSize: 12 }}>
                          {c.event_date}
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: 11.5, color: "var(--dp-text-dim)" }}>
                          {c.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="dp-card" style={{ padding: 60, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid var(--dp-border)", borderTopColor: "var(--dp-accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      ) : auctions.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={t("results.noConfirmed")}
          description={t("results.subtitle")}
        />
      ) : null}

      {auctions.length > 1 && (() => {
        const totalPages = Math.ceil(auctions.length / PAGE_SIZE);
        const safePage = Math.min(pastPage, totalPages - 1);
        const slice = auctions.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <h2 className="dp-heading" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                {t("results.pastAuctions")} <span style={{ color: "var(--dp-text-dim)", fontWeight: 400 }}>({auctions.length})</span>
              </h2>
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    className="dp-btn-ghost dp-touch-target"
                    onClick={() => setPastPage(p => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    style={{ opacity: safePage === 0 ? 0.4 : 1, padding: "6px 10px" }}
                    aria-label={t("common.previous")}
                  >
                    {t("common.previous")}
                  </button>
                  <span style={{ fontSize: 12, color: "var(--dp-text-dim)" }}>
                    {safePage + 1} / {totalPages}
                  </span>
                  <button
                    className="dp-btn-ghost dp-touch-target"
                    onClick={() => setPastPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage >= totalPages - 1}
                    style={{ opacity: safePage >= totalPages - 1 ? 0.4 : 1, padding: "6px 10px" }}
                    aria-label={t("common.next")}
                  >
                    {t("common.next")}
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {slice.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAuction(a)}
                  className="dp-card dp-hover-row"
                  aria-pressed={selectedAuction?.id === a.id}
                  style={{
                    padding: "14px 18px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer", gap: 12, flexWrap: "wrap",
                    background: selectedAuction?.id === a.id ? "var(--dp-accent-soft)" : "var(--dp-bg-card)",
                    borderColor: selectedAuction?.id === a.id ? "var(--dp-accent-border)" : "var(--dp-border)",
                    textAlign: "left", color: "var(--dp-text)", fontFamily: "inherit",
                    width: "100%", minHeight: 44,
                  }}
                >
                  <div className="dp-truncate" style={{ flex: 1 }}>
                    <div className="dp-truncate" style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }} title={a.title}>{a.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)" }}>
                      {a.confirmed_at ? new Date(a.confirmed_at).toLocaleDateString("en-US", { timeZone: "UTC" }) : ""}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: selectedAuction?.id === a.id ? "var(--dp-accent)" : "var(--dp-text-dim)" }} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}