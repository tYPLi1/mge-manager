import React from "react";
import { Lock, Users, Gavel, CheckCircle2 } from "lucide-react";

const mockBids = [
  { player: "ThunderKing", dkp: 850, mge: 9200, friendly: false },
  { player: "ShadowHunter", dkp: 780, mge: 8900, friendly: false },
  { player: "IronFist_88", dkp: 720, mge: 8500, friendly: true },
  { player: "NightWolf", dkp: 650, mge: 8100, friendly: false },
  { player: "DragonSlayer", dkp: 600, mge: 7800, friendly: false },
];

export default function AuctionPreview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="dp-heading" style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 4 }}>
          Active Auction
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--dp-text-muted)", margin: 0 }}>
          Bid on MGE slots · Live updates
        </p>
      </div>

      {/* Hero auction card */}
      <div className="dp-card-elevated" style={{ padding: 20, position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: 0, right: 0, width: 240, height: 240,
          background: "radial-gradient(circle, rgba(212, 168, 89, 0.08), transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", position: "relative" }}>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              <span className="dp-badge" style={{
                background: "rgba(109, 185, 137, 0.15)",
                color: "var(--dp-success)",
                border: "1px solid rgba(109, 185, 137, 0.3)",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--dp-success)", boxShadow: "0 0 8px var(--dp-success)" }} />
                LIVE
              </span>
              <span className="dp-badge" style={{ background: "var(--dp-bg)", color: "var(--dp-text-muted)", border: "1px solid var(--dp-border)" }}>
                <Lock size={11} /> Password required
              </span>
            </div>
            <h2 className="dp-heading" style={{ fontSize: 22, fontWeight: 600, margin: 0, marginBottom: 6 }}>
              MGE #42 — Weekly Auction
            </h2>
            <p style={{ fontSize: 13.5, color: "var(--dp-text-muted)", margin: 0 }}>
              10 slots available · Closes today 20:00 UTC
            </p>
          </div>

          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Remaining</div>
              <div className="dp-heading dp-mono dp-accent-text" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                2:47:12
              </div>
            </div>
            <div style={{ width: 1, height: 48, background: "var(--dp-border)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Bids</div>
              <div className="dp-heading dp-mono" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                23
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two column layout - responsive via dp-grid-2 */}
      <div className="dp-grid-2">
        {/* Current bids */}
        <div className="dp-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dp-border)", display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={14} style={{ color: "var(--dp-text-muted)" }} />
            <span className="dp-heading" style={{ fontSize: 14, fontWeight: 600 }}>Top Bids</span>
            <span style={{ fontSize: 11, color: "var(--dp-text-dim)", marginLeft: "auto" }}>Live</span>
          </div>
          <div>
            {mockBids.map((b, i) => (
              <div key={i} className="dp-hover-row" style={{
                padding: "14px 20px",
                display: "flex", alignItems: "center", gap: 14,
                borderBottom: i < mockBids.length - 1 ? "1px solid var(--dp-border)" : "none",
              }}>
                <div className="dp-mono dp-heading" style={{
                  fontSize: 14, fontWeight: 600, width: 28,
                  color: i === 0 ? "var(--dp-accent)" : "var(--dp-text-muted)",
                }}>
                  #{i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{b.player}</div>
                  {b.friendly && (
                    <div style={{ fontSize: 11, color: "var(--dp-info)", marginTop: 2 }}>
                      Friendly Zone
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="dp-mono dp-accent-text" style={{ fontSize: 15, fontWeight: 600 }}>
                    {b.dkp} DKP
                  </div>
                  <div className="dp-mono" style={{ fontSize: 11, color: "var(--dp-text-dim)", marginTop: 2 }}>
                    MGE {b.mge.toLocaleString("en-US")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bid form */}
        <div className="dp-card-elevated" style={{ padding: 20, height: "fit-content" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Gavel size={14} style={{ color: "var(--dp-accent)" }} />
            <span className="dp-heading" style={{ fontSize: 14, fontWeight: 600 }}>Place a Bid</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                Player Name
              </label>
              <input className="dp-input" placeholder="Your name" />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                DKP Bid
              </label>
              <input className="dp-input dp-mono" placeholder="0" />
              <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", marginTop: 6 }}>
                Available: <span className="dp-mono">2,340 DKP</span>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                MGE Score (optional)
              </label>
              <input className="dp-input dp-mono" placeholder="0" />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", padding: "8px 0" }}>
              <input type="checkbox" style={{ accentColor: "var(--dp-accent)" }} />
              <span>Join Friendly Zone</span>
            </label>

            <button className="dp-btn-primary" style={{ width: "100%", padding: "10px 16px", fontSize: 13.5, marginTop: 4 }}>
              <CheckCircle2 size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
              Confirm Bid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}