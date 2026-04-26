import React from "react";

export default function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="dp-card-elevated" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </div>
        {Icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: accent ? `${accent}22` : "var(--dp-accent-soft)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={15} style={{ color: accent || "var(--dp-accent)" }} />
          </div>
        )}
      </div>
      <div className="dp-heading dp-mono" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--dp-text-muted)" }}>{sub}</div>}
    </div>
  );
}