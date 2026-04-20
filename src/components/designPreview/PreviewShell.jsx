import React from "react";
import { Link } from "react-router-dom";
import { Trophy, Gavel, Shield, ArrowLeft, Eye } from "lucide-react";
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
`;

export default function PreviewShell({ view, onViewChange, children }) {
  const tabs = [
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
    { id: "auction", label: "Auction", icon: Gavel },
    { id: "admin", label: "Admin", icon: Shield },
  ];

  return (
    <div className="dp-root">
      <style>{fontStyle}</style>
      <div className="dp-bg-grain" />

      {/* Preview notice bar */}
      <div style={{
        position: "relative",
        background: "linear-gradient(90deg, rgba(212, 168, 89, 0.12), rgba(212, 168, 89, 0.04))",
        borderBottom: "1px solid var(--dp-accent-border)",
        padding: "10px 24px",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--dp-text-muted)" }}>
            <Eye size={14} style={{ color: "var(--dp-accent)" }} />
            <span><strong style={{ color: "var(--dp-text)" }}>Design Preview Modus</strong> — Dies ist eine isolierte Vorschau. Die laufende App ist unverändert.</span>
          </div>
          <Link to={createPageUrl("Leaderboard")} style={{
            display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--dp-text-muted)", textDecoration: "none",
          }}>
            <ArrowLeft size={14} /> Zurück zur App
          </Link>
        </div>
      </div>

      {/* Header */}
      <header style={{
        position: "relative",
        borderBottom: "1px solid var(--dp-border)",
        background: "var(--dp-bg-elevated)",
        zIndex: 5,
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, #d9b068, #a67c38)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 0 rgba(255,255,255,0.2) inset, 0 4px 12px rgba(212, 168, 89, 0.25)",
            }}>
              <Trophy size={18} style={{ color: "#2a1f10" }} />
            </div>
            <div>
              <div className="dp-heading" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>DKP System</div>
              <div style={{ fontSize: 11, color: "var(--dp-text-dim)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Guild Management</div>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => {
              const Icon = t.icon;
              const active = view === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onViewChange(t.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: active ? "var(--dp-accent-soft)" : "transparent",
                    color: active ? "var(--dp-accent)" : "var(--dp-text-muted)",
                    border: active ? "1px solid var(--dp-accent-border)" : "1px solid transparent",
                    cursor: "pointer", transition: "all 0.15s ease",
                    fontFamily: "inherit",
                  }}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main style={{ position: "relative", maxWidth: 1400, margin: "0 auto", padding: "28px 24px", zIndex: 1 }}>
        {children}
      </main>
    </div>
  );
}