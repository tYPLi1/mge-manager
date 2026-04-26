import React from "react";
import { Trophy, Calendar, Award, ChevronRight } from "lucide-react";

const winners = [
  { rank: 1, player: "ThunderKing", bid: 850, score: 9200, medals: 24, tiebreaker: null, friendly: false },
  { rank: 2, player: "ShadowHunter", bid: 780, score: 8900, medals: 22, tiebreaker: null, friendly: false },
  { rank: 3, player: "IronFist_88", bid: 720, score: 8500, medals: 19, tiebreaker: null, friendly: true },
  { rank: 4, player: "NightWolf", bid: 650, score: 8100, medals: 18, tiebreaker: null, friendly: false },
  { rank: 5, player: "DragonSlayer", bid: 600, score: 7800, medals: 17, tiebreaker: null, friendly: false },
  { rank: 6, player: "FrostBite", bid: 550, score: 7600, medals: 15, tiebreaker: "Activity: 450", friendly: false },
  { rank: 7, player: "SteelBlade", bid: 550, score: 7400, medals: 14, tiebreaker: "Activity: 380", friendly: false },
  { rank: 8, player: "MoonReaper", bid: 500, score: 7200, medals: 13, tiebreaker: null, friendly: false },
  { rank: 9, player: "BlazeFury", bid: 450, score: 6900, medals: 12, tiebreaker: null, friendly: false },
  { rank: 10, player: "VoidWalker", bid: 400, score: 6700, medals: 10, tiebreaker: null, friendly: false },
];

const pastAuctions = [
  { id: 41, title: "MGE #41 — Weekly Auction", date: "Apr 19, 2026", winners: 10, total: "6,250 DKP" },
  { id: 40, title: "MGE #40 — Weekly Auction", date: "Apr 12, 2026", winners: 10, total: "5,890 DKP" },
  { id: 39, title: "MGE #39 — Special Event", date: "Apr 05, 2026", winners: 10, total: "7,100 DKP" },
];

export default function ResultsPreview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="dp-heading" style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 4 }}>
          Auction Results
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--dp-text-muted)", margin: 0 }}>
          Confirmed winners and bid history
        </p>
      </div>

      {/* Latest result hero */}
      <div className="dp-card-elevated" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span className="dp-badge" style={{
                background: "var(--dp-accent-soft)",
                color: "var(--dp-accent)",
                border: "1px solid var(--dp-accent-border)",
              }}>
                <Trophy size={11} /> CONFIRMED
              </span>
              <span style={{ fontSize: 11.5, color: "var(--dp-text-dim)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Calendar size={11} /> Apr 26, 2026
              </span>
            </div>
            <h2 className="dp-heading" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
              MGE #42 — Weekly Auction
            </h2>
          </div>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Slots</div>
              <div className="dp-heading dp-mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>10</div>
            </div>
            <div style={{ width: 1, height: 36, background: "var(--dp-border)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Total DKP</div>
              <div className="dp-heading dp-mono dp-accent-text" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>6,050</div>
            </div>
          </div>
        </div>

        {/* Winners table */}
        <div style={{ overflowX: "auto", margin: "0 -20px -20px", borderTop: "1px solid var(--dp-border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 560 }}>
            <thead>
              <tr style={{ background: "var(--dp-bg-elevated)" }}>
                {["Rank", "Player", "DKP Bid", "Score", "Medals", "Notes"].map((h, i) => (
                  <th key={i} style={{
                    textAlign: i <= 1 ? "left" : i === 5 ? "left" : "right",
                    padding: "10px 18px",
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
              {winners.map((w) => {
                const rankClass = w.rank === 1 ? "dp-rank-1" : w.rank === 2 ? "dp-rank-2" : w.rank === 3 ? "dp-rank-3" : "";
                return (
                  <tr key={w.rank} className={`dp-hover-row ${rankClass}`} style={{ borderBottom: "1px solid var(--dp-border)" }}>
                    <td style={{ padding: "12px 18px" }}>
                      <span className="dp-heading dp-mono" style={{
                        fontSize: 14, fontWeight: 600,
                        color: w.rank <= 3 ? "var(--dp-accent)" : "var(--dp-text)",
                      }}>
                        #{w.rank}
                      </span>
                    </td>
                    <td style={{ padding: "12px 18px", fontWeight: 500 }}>
                      {w.player}
                      {w.friendly && (
                        <span style={{ marginLeft: 8, fontSize: 10.5, color: "var(--dp-info)" }}>· FZ</span>
                      )}
                    </td>
                    <td className="dp-mono dp-accent-text" style={{ padding: "12px 18px", textAlign: "right", fontWeight: 600 }}>
                      {w.bid}
                    </td>
                    <td className="dp-mono" style={{ padding: "12px 18px", textAlign: "right", color: "var(--dp-text-muted)" }}>
                      {w.score.toLocaleString("en-US")}
                    </td>
                    <td style={{ padding: "12px 18px", textAlign: "right" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--dp-text-muted)" }}>
                        <Award size={12} style={{ color: "var(--dp-accent)" }} />
                        <span className="dp-mono">{w.medals}</span>
                      </span>
                    </td>
                    <td style={{ padding: "12px 18px", fontSize: 11.5, color: "var(--dp-text-dim)" }}>
                      {w.tiebreaker || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Past auctions */}
      <div>
        <h2 className="dp-heading" style={{ fontSize: 16, fontWeight: 600, margin: "8px 0 12px" }}>
          Past Auctions
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pastAuctions.map((a) => (
            <div key={a.id} className="dp-card dp-hover-row" style={{
              padding: "14px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              cursor: "pointer", transition: "background 0.15s ease", gap: 12, flexWrap: "wrap",
            }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>{a.date}</span>
                  <span>·</span>
                  <span>{a.winners} winners</span>
                  <span>·</span>
                  <span className="dp-mono">{a.total}</span>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "var(--dp-text-dim)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}