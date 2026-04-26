import React from "react";
import { Shield, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

const penalties = [
  { player: "IronFist_88", level: 1, status: "probation", date: "Apr 24, 2026", reset: "May 24, 2026", offense: 1, dkp: -50, note: "Missed prep stage" },
  { player: "FrostBite", level: 2, status: "probation", date: "Apr 18, 2026", reset: "Jun 18, 2026", offense: 2, dkp: -150, note: "Repeated absence" },
  { player: "BlazeFury", level: 1, status: "probation", date: "Apr 15, 2026", reset: "May 15, 2026", offense: 1, dkp: -50, note: "Late submission" },
  { player: "VoidWalker", level: 3, status: "probation", date: "Apr 10, 2026", reset: "Jul 10, 2026", offense: 3, dkp: -300, note: "Major rule violation" },
  { player: "MoonReaper", level: 1, status: "reset", date: "Mar 20, 2026", reset: "Apr 20, 2026", offense: 1, dkp: -50, note: "Resolved" },
  { player: "SteelBlade", level: 2, status: "reset", date: "Feb 28, 2026", reset: "Apr 28, 2026", offense: 2, dkp: -150, note: "Resolved" },
];

const levelStyle = (level) => {
  if (level === 1) return { color: "#e6c171", bg: "rgba(230, 193, 113, 0.12)", border: "rgba(230, 193, 113, 0.3)", label: "Level 1" };
  if (level === 2) return { color: "#e89556", bg: "rgba(232, 149, 86, 0.12)", border: "rgba(232, 149, 86, 0.3)", label: "Level 2" };
  return { color: "var(--dp-danger)", bg: "rgba(201, 101, 101, 0.12)", border: "rgba(201, 101, 101, 0.3)", label: "Level 3" };
};

export default function PunishmentsPreview() {
  const open = penalties.filter(p => p.status === "probation");
  const closed = penalties.filter(p => p.status === "reset");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="dp-heading" style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 4 }}>
          Punishments
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--dp-text-muted)", margin: 0 }}>
          Active probations and reset history
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <div className="dp-card-elevated" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Open</div>
            <AlertTriangle size={14} style={{ color: "var(--dp-danger)" }} />
          </div>
          <div className="dp-heading dp-mono" style={{ fontSize: 24, fontWeight: 600 }}>{open.length}</div>
        </div>
        <div className="dp-card-elevated" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Resolved</div>
            <CheckCircle2 size={14} style={{ color: "var(--dp-success)" }} />
          </div>
          <div className="dp-heading dp-mono" style={{ fontSize: 24, fontWeight: 600 }}>{closed.length}</div>
        </div>
        <div className="dp-card-elevated" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>DKP Deducted</div>
            <Shield size={14} style={{ color: "var(--dp-text-muted)" }} />
          </div>
          <div className="dp-heading dp-mono dp-danger-text" style={{ fontSize: 24, fontWeight: 600 }}>
            −{Math.abs(penalties.reduce((s, p) => s + p.dkp, 0)).toLocaleString("en-US")}
          </div>
        </div>
      </div>

      {/* Active section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <h2 className="dp-heading" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Active Probations</h2>
          <span className="dp-badge" style={{ background: "rgba(201, 101, 101, 0.12)", color: "var(--dp-danger)", border: "1px solid rgba(201, 101, 101, 0.25)" }}>
            {open.length}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {open.map((p, i) => {
            const ls = levelStyle(p.level);
            return (
              <div key={i} className="dp-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{p.player}</span>
                      <span className="dp-badge" style={{ background: ls.bg, color: ls.color, border: `1px solid ${ls.border}` }}>
                        <Shield size={11} /> {ls.label}
                      </span>
                      <span className="dp-badge" style={{ background: "var(--dp-bg)", color: "var(--dp-text-muted)", border: "1px solid var(--dp-border)" }}>
                        Offense #{p.offense}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--dp-text-muted)", marginBottom: 8 }}>
                      {p.note}
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "var(--dp-text-dim)", flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Clock size={11} /> Issued: {p.date}
                      </span>
                      <span>Eligible reset: <span style={{ color: "var(--dp-text-muted)" }}>{p.reset}</span></span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                      DKP Deducted
                    </div>
                    <div className="dp-heading dp-mono dp-danger-text" style={{ fontSize: 18, fontWeight: 600 }}>
                      {p.dkp}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resolved section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <h2 className="dp-heading" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Resolved</h2>
          <span className="dp-badge" style={{ background: "rgba(109, 185, 137, 0.12)", color: "var(--dp-success)", border: "1px solid rgba(109, 185, 137, 0.25)" }}>
            {closed.length}
          </span>
        </div>

        <div className="dp-card" style={{ padding: 0, overflow: "hidden" }}>
          {closed.map((p, i) => {
            const ls = levelStyle(p.level);
            return (
              <div key={i} style={{
                padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 14,
                borderBottom: i < closed.length - 1 ? "1px solid var(--dp-border)" : "none",
                opacity: 0.75,
              }}>
                <CheckCircle2 size={14} style={{ color: "var(--dp-success)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 500 }}>{p.player}</span>
                    <span className="dp-badge" style={{ background: ls.bg, color: ls.color, border: `1px solid ${ls.border}`, fontSize: 10.5 }}>
                      {ls.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", marginTop: 2 }}>
                    {p.date} → {p.reset}
                  </div>
                </div>
                <div className="dp-mono" style={{ fontSize: 13, color: "var(--dp-text-muted)" }}>{p.dkp}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}