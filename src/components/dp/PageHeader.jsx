import React from "react";

export default function DPPageHeader({ title, subtitle, children }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      gap: 16, flexWrap: "wrap", marginBottom: 4,
    }}>
      <div>
        <h1 className="dp-heading" style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 4 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13.5, color: "var(--dp-text-muted)", margin: 0 }}>{subtitle}</p>
        )}
      </div>
      {children && <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{children}</div>}
    </div>
  );
}