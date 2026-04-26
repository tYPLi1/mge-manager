import React from "react";
import { ArrowDownCircle, ArrowUpCircle, Filter, Download, Search } from "lucide-react";

const txs = [
  { date: "Apr 26", player: "ThunderKing", amount: -850, type: "bid", source: "MGE #42", note: "Weekly auction" },
  { date: "Apr 25", player: "ShadowHunter", amount: +120, type: "earn", source: "GEE", note: "War stage · Rank 12" },
  { date: "Apr 25", player: "IronFist_88", amount: +95, type: "earn", source: "GEE", note: "War stage · Rank 28" },
  { date: "Apr 24", player: "NightWolf", amount: -50, type: "penalty", source: "Penalty L1", note: "Missed prep stage" },
  { date: "Apr 24", player: "DragonSlayer", amount: +200, type: "earn", source: "MEE", note: "Top 5 finish" },
  { date: "Apr 23", player: "FrostBite", amount: +60, type: "earn", source: "DDE", note: "Y/N · present" },
  { date: "Apr 23", player: "SteelBlade", amount: +100, type: "bonus", source: "King allocation", note: "Weekly bonus" },
  { date: "Apr 22", player: "MoonReaper", amount: -400, type: "bid", source: "MGE #41", note: "Lost auction" },
];

const typeStyle = (type) => {
  if (type === "bid" || type === "penalty") {
    return { color: "var(--dp-danger)", bg: "rgba(201, 101, 101, 0.12)", border: "rgba(201, 101, 101, 0.25)" };
  }
  return { color: "var(--dp-success)", bg: "rgba(109, 185, 137, 0.12)", border: "rgba(109, 185, 137, 0.25)" };
};

export default function TransactionsPreview() {
  const totalEarn = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalSpent = Math.abs(txs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="dp-heading" style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 4 }}>
          DKP Transactions
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--dp-text-muted)", margin: 0 }}>
          Full ledger of all DKP movements
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <div className="dp-card-elevated" style={{ padding: 16 }}>
          <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Total Earned (30d)
          </div>
          <div className="dp-heading dp-mono dp-success-text" style={{ fontSize: 24, fontWeight: 600 }}>
            +{totalEarn.toLocaleString("en-US")}
          </div>
        </div>
        <div className="dp-card-elevated" style={{ padding: 16 }}>
          <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Total Spent (30d)
          </div>
          <div className="dp-heading dp-mono dp-danger-text" style={{ fontSize: 24, fontWeight: 600 }}>
            −{totalSpent.toLocaleString("en-US")}
          </div>
        </div>
        <div className="dp-card-elevated" style={{ padding: 16 }}>
          <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Transactions
          </div>
          <div className="dp-heading dp-mono" style={{ fontSize: 24, fontWeight: 600 }}>
            {txs.length}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="dp-card" style={{ padding: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--dp-text-dim)" }} />
          <input className="dp-input" placeholder="Search player or source…" style={{ paddingLeft: 34 }} />
        </div>
        <button className="dp-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Filter size={13} /> Type
        </button>
        <button className="dp-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Filter size={13} /> Date
        </button>
        <div style={{ flex: 1 }} />
        <button className="dp-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Download size={13} /> Export
        </button>
      </div>

      {/* Transactions table */}
      <div className="dp-card-elevated" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 720 }}>
            <thead>
              <tr style={{ background: "var(--dp-bg-elevated)", borderBottom: "1px solid var(--dp-border)" }}>
                {["Date", "Player", "Type", "Source", "Note", "Amount"].map((h, i) => (
                  <th key={i} style={{
                    textAlign: i === 5 ? "right" : "left",
                    padding: "12px 18px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--dp-text-dim)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txs.map((t, i) => {
                const ts = typeStyle(t.type);
                const positive = t.amount > 0;
                return (
                  <tr key={i} className="dp-hover-row" style={{ borderBottom: "1px solid var(--dp-border)" }}>
                    <td className="dp-mono" style={{ padding: "12px 18px", color: "var(--dp-text-muted)", fontSize: 12.5 }}>
                      {t.date}
                    </td>
                    <td style={{ padding: "12px 18px", fontWeight: 500 }}>{t.player}</td>
                    <td style={{ padding: "12px 18px" }}>
                      <span className="dp-badge" style={{ background: ts.bg, color: ts.color, border: `1px solid ${ts.border}` }}>
                        {t.type}
                      </span>
                    </td>
                    <td style={{ padding: "12px 18px", color: "var(--dp-text-muted)" }}>{t.source}</td>
                    <td style={{ padding: "12px 18px", fontSize: 12.5, color: "var(--dp-text-dim)" }}>{t.note}</td>
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
                          {positive ? "+" : "−"}{Math.abs(t.amount)}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}