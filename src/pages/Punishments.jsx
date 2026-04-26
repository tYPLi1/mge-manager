import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, AlertTriangle, CheckCircle2, Clock, Filter } from "lucide-react";
import DPPageHeader from "@/components/dp/PageHeader";
import { useTranslation } from "@/lib/i18n";

const levelStyle = (level) => {
  if (level === 1) return { color: "#e6c171", bg: "rgba(230, 193, 113, 0.12)", border: "rgba(230, 193, 113, 0.3)" };
  if (level === 2) return { color: "#e89556", bg: "rgba(232, 149, 86, 0.12)", border: "rgba(232, 149, 86, 0.3)" };
  return { color: "var(--dp-danger)", bg: "rgba(201, 101, 101, 0.12)", border: "rgba(201, 101, 101, 0.3)" };
};

export default function Punishments() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState("active");

  const { data: penalties = [], isLoading } = useQuery({
    queryKey: ["penalties"],
    queryFn: () => base44.entities.Penalty.list("-offense_date", 200),
  });

  const queryClient = useQueryClient();
  useEffect(() => {
    const unsub = base44.entities.Penalty.subscribe(() => queryClient.invalidateQueries({ queryKey: ["penalties"] }));
    return () => unsub();
  }, [queryClient]);

  const filtered = useMemo(() => {
    if (statusFilter === "active") return penalties.filter((p) => p.status === "probation");
    if (statusFilter === "reset") return penalties.filter((p) => p.status === "reset");
    return penalties;
  }, [penalties, statusFilter]);

  const open = penalties.filter(p => p.status === "probation");
  const closed = penalties.filter(p => p.status === "reset");
  const totalDeducted = penalties.reduce((s, p) => s + (p.dkp_deducted || 0), 0);

  const showOpen = statusFilter === "active" || statusFilter === "all";
  const showClosed = statusFilter === "reset" || statusFilter === "all";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <DPPageHeader title={t("punishments.title")} subtitle={t("punishments.recordsCount", { count: filtered.length })}>
        <Filter size={13} style={{ color: "var(--dp-text-dim)" }} />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: "var(--dp-bg)", border: "1px solid var(--dp-border)",
            borderRadius: 8, padding: "8px 10px", color: "var(--dp-text)",
            fontSize: 13, fontFamily: "inherit", cursor: "pointer",
          }}
        >
          <option value="active">{t("punishments.filters.active")}</option>
          <option value="reset">{t("punishments.filters.reset")}</option>
          <option value="all">{t("punishments.filters.all")}</option>
        </select>
      </DPPageHeader>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <div className="dp-card-elevated" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("punishments.open")}</div>
            <AlertTriangle size={14} style={{ color: "var(--dp-danger)" }} />
          </div>
          <div className="dp-heading dp-mono" style={{ fontSize: 24, fontWeight: 600 }}>{open.length}</div>
        </div>
        <div className="dp-card-elevated" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("punishments.resolved")}</div>
            <CheckCircle2 size={14} style={{ color: "var(--dp-success)" }} />
          </div>
          <div className="dp-heading dp-mono" style={{ fontSize: 24, fontWeight: 600 }}>{closed.length}</div>
        </div>
        <div className="dp-card-elevated" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("punishments.dkpDeducted")}</div>
            <Shield size={14} style={{ color: "var(--dp-text-muted)" }} />
          </div>
          <div className="dp-heading dp-mono dp-danger-text" style={{ fontSize: 24, fontWeight: 600 }}>
            −{Math.abs(totalDeducted).toLocaleString("en-US")}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="dp-card" style={{ padding: 60, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid var(--dp-border)", borderTopColor: "var(--dp-accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {showOpen && open.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <h2 className="dp-heading" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{t("punishments.activeProbations")}</h2>
            <span className="dp-badge" style={{ background: "rgba(201, 101, 101, 0.12)", color: "var(--dp-danger)", border: "1px solid rgba(201, 101, 101, 0.25)" }}>
              {open.length}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {open.map((p) => {
              const ls = levelStyle(p.level);
              return (
                <div key={p.id} className="dp-card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{p.player_name}</span>
                        <span className="dp-badge" style={{ background: ls.bg, color: ls.color, border: `1px solid ${ls.border}` }}>
                          <Shield size={11} /> {t("punishments.level", { n: p.level })}
                        </span>
                        <span className="dp-badge" style={{ background: "var(--dp-bg)", color: "var(--dp-text-muted)", border: "1px solid var(--dp-border)" }}>
                          {t("punishments.offense", { n: p.offense_count })}
                        </span>
                      </div>
                      {p.note && (
                        <div style={{ fontSize: 12.5, color: "var(--dp-text-muted)", marginBottom: 8 }}>{p.note}</div>
                      )}
                      <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "var(--dp-text-dim)", flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} /> {t("punishments.issued")}: {p.offense_date}
                        </span>
                        {p.eligible_reset_date && (
                          <span>{t("punishments.eligibleReset")}: <span style={{ color: "var(--dp-text-muted)" }}>{p.eligible_reset_date}</span></span>
                        )}
                      </div>
                    </div>
                    {p.dkp_deducted ? (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                          {t("punishments.dkpDeducted")}
                        </div>
                        <div className="dp-heading dp-mono dp-danger-text" style={{ fontSize: 18, fontWeight: 600 }}>
                          −{p.dkp_deducted}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showClosed && closed.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <h2 className="dp-heading" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{t("punishments.resolved")}</h2>
            <span className="dp-badge" style={{ background: "rgba(109, 185, 137, 0.12)", color: "var(--dp-success)", border: "1px solid rgba(109, 185, 137, 0.25)" }}>
              {closed.length}
            </span>
          </div>
          <div className="dp-card" style={{ padding: 0, overflow: "hidden" }}>
            {closed.map((p, i) => {
              const ls = levelStyle(p.level);
              return (
                <div key={p.id} style={{
                  padding: "12px 16px",
                  display: "flex", alignItems: "center", gap: 14,
                  borderBottom: i < closed.length - 1 ? "1px solid var(--dp-border)" : "none",
                  opacity: 0.75,
                }}>
                  <CheckCircle2 size={14} style={{ color: "var(--dp-success)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 500 }}>{p.player_name}</span>
                      <span className="dp-badge" style={{ background: ls.bg, color: ls.color, border: `1px solid ${ls.border}`, fontSize: 10.5 }}>
                        {t("punishments.level", { n: p.level })}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", marginTop: 2 }}>
                      {p.offense_date}{p.eligible_reset_date ? ` → ${p.eligible_reset_date}` : ""}
                    </div>
                  </div>
                  {p.dkp_deducted ? (
                    <div className="dp-mono" style={{ fontSize: 13, color: "var(--dp-text-muted)" }}>−{p.dkp_deducted}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="dp-card-elevated" style={{ padding: 40, textAlign: "center", color: "var(--dp-text-dim)", fontSize: 13 }}>
          {t("punishments.noPenalties")}
        </div>
      )}
    </div>
  );
}