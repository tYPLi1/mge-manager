import React from "react";

/**
 * Reusable empty state with icon, title, description, optional CTA.
 * Used across pages for "no X yet" scenarios.
 */
export default function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  return (
    <div
      className="dp-card-elevated"
      style={{
        padding: compact ? "32px 20px" : "56px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
      role="status"
    >
      {Icon && (
        <div
          aria-hidden="true"
          style={{
            width: compact ? 48 : 64,
            height: compact ? 48 : 64,
            borderRadius: "50%",
            background: "var(--dp-accent-soft)",
            border: "1px solid var(--dp-accent-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--dp-accent)",
            marginBottom: 4,
          }}
        >
          <Icon size={compact ? 22 : 28} strokeWidth={1.6} />
        </div>
      )}
      {title && (
        <h3 className="dp-heading" style={{ fontSize: compact ? 15 : 17, fontWeight: 600, margin: 0, color: "var(--dp-text)" }}>
          {title}
        </h3>
      )}
      {description && (
        <p style={{ fontSize: 13, color: "var(--dp-text-muted)", margin: 0, maxWidth: 360, lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}