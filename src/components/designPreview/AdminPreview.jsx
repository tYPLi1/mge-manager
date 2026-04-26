import React from "react";
import { Users, Gavel, TrendingUp, AlertTriangle, Settings2, Activity } from "lucide-react";

export default function AdminPreview() {
  const stats = [
    { icon: Users, label: "Players", value: "127", sub: "+3 this week", color: "var(--dp-info)" },
    { icon: Gavel, label: "Active Auctions", value: "2", sub: "1 closing soon", color: "var(--dp-accent)" },
    { icon: TrendingUp, label: "DKP (7d)", value: "+24.8k", sub: "across all events", color: "var(--dp-success)" },
    { icon: AlertTriangle, label: "Open Penalties", value: "4", sub: "2 Level 1, 2 Level 2", color: "var(--dp-danger)" },
  ];

  const recentActivity = [
    { type: "auction", text: "MGE #42 opened", time: "12 min ago", user: "Admin" },
    { type: "dkp", text: "DKP log imported: GEE Prep", time: "1 h ago", user: "Admin" },
    { type: "penalty", text: "Penalty issued to 'IronFist_88' (Level 1)", time: "3 h ago", user: "Admin" },
    { type: "player", text: "3 new players registered", time: "5 h ago", user: "System" },
    { type: "auction", text: "MGE #41 confirmed", time: "yesterday", user: "Admin" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="dp-heading" style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 4 }}>
          Admin Dashboard
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--dp-text-muted)", margin: 0 }}>
          Overview · Last updated 2 minutes ago
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="dp-card-elevated" style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {s.label}
                </div>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${s.color}15`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={15} style={{ color: s.color }} />
                </div>
              </div>
              <div className="dp-heading dp-mono" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, marginBottom: 6 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--dp-text-muted)" }}>{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="dp-grid-2">
        {/* Quick actions */}
        <div className="dp-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Settings2 size={14} style={{ color: "var(--dp-text-muted)" }} />
            <span className="dp-heading" style={{ fontSize: 14, fontWeight: 600 }}>Quick Actions</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {[
              "New Auction", "Import DKP Log", "Manage Players",
              "Issue Penalty", "Configure Event", "Send to Discord",
            ].map((a, i) => (
              <button key={i} className="dp-btn-ghost" style={{
                padding: "14px 12px",
                textAlign: "left",
                fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span>{a}</span>
                <span style={{ color: "var(--dp-text-dim)" }}>→</span>
              </button>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="dp-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dp-border)", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={14} style={{ color: "var(--dp-text-muted)" }} />
            <span className="dp-heading" style={{ fontSize: 14, fontWeight: 600 }}>Recent Activity</span>
          </div>
          <div>
            {recentActivity.map((a, i) => (
              <div key={i} style={{
                padding: "14px 20px",
                borderBottom: i < recentActivity.length - 1 ? "1px solid var(--dp-border)" : "none",
              }}>
                <div style={{ fontSize: 13, marginBottom: 4 }}>{a.text}</div>
                <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", display: "flex", gap: 8 }}>
                  <span>{a.time}</span>
                  <span>·</span>
                  <span>{a.user}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}