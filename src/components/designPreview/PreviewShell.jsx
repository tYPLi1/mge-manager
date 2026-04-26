import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Trophy, Gavel, Shield, ArrowLeft, Eye, Monitor, Smartphone,
  ScrollText, History, AlertTriangle, Menu, X,
} from "lucide-react";
import { createPageUrl } from "@/utils";

const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  .dp-root {
    --dp-bg: #12151c;
    --dp-bg-elevated: #1a1e27;
    --dp-bg-card: #1f232e;
    --dp-bg-hover: #252a36;
    --dp-border: #2a2f3c;
    --dp-border-strong: #353b4a;
    --dp-text: #e8eaed;
    --dp-text-muted: #9ba1ac;
    --dp-text-dim: #6b7280;
    --dp-accent: #d4a859;
    --dp-accent-soft: rgba(212, 168, 89, 0.12);
    --dp-accent-border: rgba(212, 168, 89, 0.25);
    --dp-success: #6db989;
    --dp-danger: #c96565;
    --dp-info: #6b93c9;

    background: var(--dp-bg);
    color: var(--dp-text);
    font-family: 'Inter', system-ui, sans-serif;
    min-height: 100vh;
    font-feature-settings: 'ss01', 'cv11';
  }

  .dp-root * { box-sizing: border-box; }

  .dp-heading { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }
  .dp-mono { font-family: 'IBM Plex Mono', monospace; font-feature-settings: 'zero'; }

  .dp-bg-grain {
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.35;
    background-image:
      radial-gradient(circle at 15% 20%, rgba(212, 168, 89, 0.04), transparent 50%),
      radial-gradient(circle at 85% 70%, rgba(107, 147, 201, 0.04), transparent 50%);
    z-index: 0;
  }

  .dp-card {
    background: var(--dp-bg-card);
    border: 1px solid var(--dp-border);
    border-radius: 14px;
    position: relative;
  }

  .dp-card-elevated {
    background: linear-gradient(180deg, var(--dp-bg-card) 0%, var(--dp-bg-elevated) 100%);
    border: 1px solid var(--dp-border);
    border-radius: 14px;
    box-shadow: 0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 32px -12px rgba(0,0,0,0.4);
  }

  .dp-btn-primary {
    background: linear-gradient(180deg, #d9b068 0%, #c99a4c 100%);
    color: #1a1410;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    border: 1px solid rgba(0,0,0,0.2);
    box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 2px 4px rgba(0,0,0,0.15);
    transition: all 0.15s ease;
    cursor: pointer;
  }
  .dp-btn-primary:hover { filter: brightness(1.08); transform: translateY(-1px); }

  .dp-btn-ghost {
    background: transparent;
    color: var(--dp-text-muted);
    font-weight: 500;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 13px;
    border: 1px solid var(--dp-border);
    transition: all 0.15s ease;
    cursor: pointer;
  }
  .dp-btn-ghost:hover { background: var(--dp-bg-hover); color: var(--dp-text); border-color: var(--dp-border-strong); }

  .dp-input {
    background: var(--dp-bg);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    padding: 8px 12px;
    color: var(--dp-text);
    font-size: 13px;
    font-family: inherit;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    width: 100%;
  }
  .dp-input:focus {
    outline: none;
    border-color: var(--dp-accent);
    box-shadow: 0 0 0 3px var(--dp-accent-soft);
  }

  .dp-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  .dp-accent-text { color: var(--dp-accent); }
  .dp-success-text { color: var(--dp-success); }
  .dp-danger-text { color: var(--dp-danger); }

  .dp-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--dp-border), transparent);
  }

  .dp-hover-row:hover { background: var(--dp-bg-hover); }

  .dp-rank-1 { background: linear-gradient(135deg, rgba(212, 168, 89, 0.18), rgba(212, 168, 89, 0.04)); border-left: 2px solid var(--dp-accent); }
  .dp-rank-2 { background: linear-gradient(135deg, rgba(192, 192, 192, 0.1), transparent); border-left: 2px solid #c0c0c0; }
  .dp-rank-3 { background: linear-gradient(135deg, rgba(205, 127, 50, 0.1), transparent); border-left: 2px solid #cd7f32; }

  /* Mobile frame */
  .dp-mobile-frame {
    width: 390px;
    max-width: 100%;
    margin: 24px auto;
    border: 1px solid var(--dp-border-strong);
    border-radius: 36px;
    overflow: hidden;
    background: var(--dp-bg);
    box-shadow: 0 30px 80px -20px rgba(0,0,0,0.6), 0 0 0 8px #0a0c11;
    position: relative;
  }
  .dp-mobile-frame::before {
    content: '';
    position: absolute;
    top: 8px; left: 50%;
    transform: translateX(-50%);
    width: 110px; height: 22px;
    background: #0a0c11;
    border-radius: 0 0 14px 14px;
    z-index: 20;
  }
  .dp-mobile-content {
    height: 780px;
    overflow-y: auto;
    padding-top: 36px;
  }

  /* Responsive helpers */
  .dp-grid-2 { display: grid; grid-template-columns: 1fr 380px; gap: 20px; }
  @media (max-width: 900px) {
    .dp-grid-2 { grid-template-columns: 1fr; }
  }
  .dp-hide-mobile { }
  @media (max-width: 640px) {
    .dp-hide-mobile { display: none !important; }
  }
`;

const tabs = [
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "auction", label: "Auction", icon: Gavel },
  { id: "results", label: "Results", icon: ScrollText },
  { id: "transactions", label: "Transactions", icon: History },
  { id: "punishments", label: "Punishments", icon: AlertTriangle },
  { id: "admin", label: "Admin", icon: Shield },
];

export default function PreviewShell({ view, onViewChange, children }) {
  const [device, setDevice] = useState("desktop");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isMobile = device === "mobile";
  const activeTab = tabs.find(t => t.id === view);

  const navButtons = (
    <>
      {tabs.map(t => {
        const Icon = t.icon;
        const active = view === t.id;
        return (
          <button
            key={t.id}
            onClick={() => { onViewChange(t.id); setMobileNavOpen(false); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: active ? "var(--dp-accent-soft)" : "transparent",
              color: active ? "var(--dp-accent)" : "var(--dp-text-muted)",
              border: active ? "1px solid var(--dp-accent-border)" : "1px solid transparent",
              cursor: "pointer", transition: "all 0.15s ease",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            <Icon size={14} />
            {t.label}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="dp-root">
      <style>{fontStyle}</style>
      <div className="dp-bg-grain" />

      {/* Preview notice bar */}
      <div style={{
        position: "relative",
        background: "linear-gradient(90deg, rgba(212, 168, 89, 0.12), rgba(212, 168, 89, 0.04))",
        borderBottom: "1px solid var(--dp-accent-border)",
        padding: "10px 16px",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1400, margin: "0 auto", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--dp-text-muted)" }}>
            <Eye size={14} style={{ color: "var(--dp-accent)" }} />
            <span>
              <strong style={{ color: "var(--dp-text)" }}>Design Preview Mode</strong>
              <span className="dp-hide-mobile"> — Isolated preview. The live app is unchanged.</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Device toggle */}
            <div style={{
              display: "inline-flex",
              background: "var(--dp-bg)",
              border: "1px solid var(--dp-border)",
              borderRadius: 8,
              padding: 3,
            }}>
              <button
                onClick={() => setDevice("desktop")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 10px", fontSize: 12, fontWeight: 500,
                  background: !isMobile ? "var(--dp-accent-soft)" : "transparent",
                  color: !isMobile ? "var(--dp-accent)" : "var(--dp-text-muted)",
                  border: "none", borderRadius: 6, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Monitor size={13} /> Desktop
              </button>
              <button
                onClick={() => setDevice("mobile")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 10px", fontSize: 12, fontWeight: 500,
                  background: isMobile ? "var(--dp-accent-soft)" : "transparent",
                  color: isMobile ? "var(--dp-accent)" : "var(--dp-text-muted)",
                  border: "none", borderRadius: 6, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Smartphone size={13} /> Mobile
              </button>
            </div>

            <Link to={createPageUrl("Leaderboard")} style={{
              display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--dp-text-muted)", textDecoration: "none",
            }}>
              <ArrowLeft size={14} /> <span className="dp-hide-mobile">Back to App</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top control bar with tabs (always visible) */}
      <header style={{
        position: "relative",
        borderBottom: "1px solid var(--dp-border)",
        background: "var(--dp-bg-elevated)",
        zIndex: 5,
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, #d9b068, #a67c38)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 0 rgba(255,255,255,0.2) inset, 0 4px 12px rgba(212, 168, 89, 0.25)",
              flexShrink: 0,
            }}>
              <Trophy size={18} style={{ color: "#2a1f10" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="dp-heading" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>DKP System</div>
              <div style={{ fontSize: 11, color: "var(--dp-text-dim)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Guild Management</div>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none" }} className="dp-hide-mobile">
            {navButtons}
          </nav>

          {/* Mobile-screen tab toggle (for narrow viewport of preview itself) */}
          <button
            onClick={() => setMobileNavOpen(v => !v)}
            style={{
              display: "none",
              padding: 8, background: "transparent", border: "1px solid var(--dp-border)",
              borderRadius: 8, color: "var(--dp-text-muted)", cursor: "pointer",
            }}
            className="dp-show-mobile-only"
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Horizontal scrollable tabs on mobile viewport */}
        <div style={{
          display: "none",
          padding: "0 16px 12px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }} className="dp-show-mobile-tabs">
          <div style={{ display: "flex", gap: 4 }}>
            {navButtons}
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .dp-show-mobile-tabs { display: block !important; }
          }
        `}</style>
      </header>

      {/* Content area: either full-width desktop or mobile frame */}
      {isMobile ? (
        <div style={{ position: "relative", zIndex: 1, padding: "0 16px" }}>
          <div className="dp-mobile-frame">
            <div className="dp-mobile-content">
              {/* Mobile in-app top bar (simulating real app) */}
              <div style={{
                position: "sticky", top: 0, zIndex: 10,
                background: "var(--dp-bg-elevated)",
                borderBottom: "1px solid var(--dp-border)",
                padding: "10px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: "linear-gradient(135deg, #d9b068, #a67c38)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Trophy size={14} style={{ color: "#2a1f10" }} />
                  </div>
                  <span className="dp-heading" style={{ fontSize: 14, fontWeight: 700 }}>
                    {activeTab?.label || "DKP"}
                  </span>
                </div>
                <button
                  onClick={() => setMobileNavOpen(v => !v)}
                  style={{
                    padding: 6, background: "transparent", border: "1px solid var(--dp-border)",
                    borderRadius: 6, color: "var(--dp-text-muted)", cursor: "pointer",
                  }}
                >
                  {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
                </button>
              </div>

              {mobileNavOpen && (
                <div style={{
                  background: "var(--dp-bg-elevated)",
                  borderBottom: "1px solid var(--dp-border)",
                  padding: 12,
                  display: "flex", flexDirection: "column", gap: 4,
                }}>
                  {tabs.map(t => {
                    const Icon = t.icon;
                    const active = view === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { onViewChange(t.id); setMobileNavOpen(false); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px", borderRadius: 8, fontSize: 13,
                          background: active ? "var(--dp-accent-soft)" : "transparent",
                          color: active ? "var(--dp-accent)" : "var(--dp-text-muted)",
                          border: "none", textAlign: "left", cursor: "pointer",
                          fontFamily: "inherit", fontWeight: 500,
                        }}
                      >
                        <Icon size={14} /> {t.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ padding: 16 }}>
                {children}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <main style={{ position: "relative", maxWidth: 1400, margin: "0 auto", padding: "28px 24px", zIndex: 1 }}>
          {children}
        </main>
      )}
    </div>
  );
}