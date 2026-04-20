import React from "react";
import { Search, TrendingUp, TrendingDown, Minus, Filter } from "lucide-react";

const mockPlayers = [
  { rank: 1, name: "ThunderKing", dkp: 4820, spent: 1200, power: "184M", activity: 98, trend: "up" },
  { rank: 2, name: "ShadowHunter", dkp: 4560, spent: 900, power: "171M", activity: 94, trend: "up" },
  { rank: 3, name: "IronFist_88", dkp: 4320, spent: 1500, power: "165M", activity: 91, trend: "down" },
  { rank: 4, name: "NightWolf", dkp: 3980, spent: 800, power: "158M", activity: 87, trend: "flat" },
  { rank: 5, name: "DragonSlayer", dkp: 3750, spent: 600, power: "152M", activity: 85, trend: "up" },
  { rank: 6, name: "FrostBite", dkp: 3540, spent: 1100, power: "148M", activity: 82, trend: "down" },
  { rank: 7, name: "SteelBlade", dkp: 3320, spent: 400, power: "144M", activity: 79, trend: "flat" },
  { rank: 8, name: "MoonReaper", dkp: 3180, spent: 700, power: "139M", activity: 76, trend: "up" },
];

const TrendIcon = ({ trend }) => {
  if (trend === "up") return <TrendingUp size={13} style={{ color: "var(--dp-success)" }} />;
  if (trend === "down") return <TrendingDown size={13} style={{ color: "var(--dp-danger)" }} />;
  return <Minus size={13} style={{ color: "var(--dp-text-dim)" }} />;
};

export default function LeaderboardPreview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page header */}
      <div>
        <h1 className="dp-heading" style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 4 }}>
          Leaderboard
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--dp-text-muted)", margin: 0 }}>
          Aktuelle DKP-Rangliste aller aktiven Spieler
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {[
          { label: "Aktive Spieler", value: "127", change: "+3 diese Woche" },
          { label: "Ø DKP", value: "2'840", change: "+120 vs. letzte Woche" },
          { label: "Events (30T)", value: "24", change: "18 Ranked · 6 Y/N" },
          { label: "Gesamt Macht", value: "18.4B", change: "+2.1% vs. letzte Woche" },
        ].map((s, i) => (
          <div key={i} className="dp-card-elevated" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              {s.label}
            </div>
            <div className="dp-heading dp-mono" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, marginBottom: 6 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--dp-text-muted)" }}>{s.change}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="dp-card" style={{ padding: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 360 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--dp-text-dim)" }} />
          <input className="dp-input" placeholder="Spieler suchen…" style={{ paddingLeft: 34 }} />
        </div>
        <button className="dp-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Filter size={13} /> Filter
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--dp-text-dim)" }}>Zeige 1–8 von 127</span>
      </div>

      {/* Table */}
      <div className="dp-card-elevated" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "var(--dp-bg-elevated)", borderBottom: "1px solid var(--dp-border)" }}>
                {["Rang", "Spieler", "DKP", "Ausgegeben", "Macht", "Aktivität", "Trend"].map((h, i) => (
                  <th key={i} style={{
                    textAlign: i === 0 || i === 1 ? "left" : "right",
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
              {mockPlayers.map((p) => {
                const rankClass = p.rank === 1 ? "dp-rank-1" : p.rank === 2 ? "dp-rank-2" : p.rank === 3 ? "dp-rank-3" : "";
                return (
                  <tr key={p.rank} className={`dp-hover-row ${rankClass}`} style={{
                    borderBottom: "1px solid var(--dp-border)",
                    transition: "background 0.15s ease",
                  }}>
                    <td style={{ padding: "14px 18px" }}>
                      <span className="dp-heading dp-mono" style={{
                        fontSize: 15, fontWeight: 600,
                        color: p.rank <= 3 ? "var(--dp-accent)" : "var(--dp-text)",
                      }}>
                        #{p.rank}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <span className="dp-mono dp-accent-text" style={{ fontWeight: 600 }}>
                        {p.dkp.toLocaleString("de-CH")}
                      </span>
                    </td>
                    <td className="dp-mono" style={{ padding: "14px 18px", textAlign: "right", color: "var(--dp-text-muted)" }}>
                      {p.spent.toLocaleString("de-CH")}
                    </td>
                    <td className="dp-mono" style={{ padding: "14px 18px", textAlign: "right" }}>{p.power}</td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 60, height: 4, background: "var(--dp-border)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{
                            width: `${p.activity}%`,
                            height: "100%",
                            background: p.activity > 85 ? "var(--dp-success)" : p.activity > 70 ? "var(--dp-accent)" : "var(--dp-text-dim)",
                          }} />
                        </div>
                        <span className="dp-mono" style={{ fontSize: 12, color: "var(--dp-text-muted)", minWidth: 28 }}>{p.activity}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <TrendIcon trend={p.trend} />
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