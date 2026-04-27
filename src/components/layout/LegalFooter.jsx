import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useTranslation } from "@/lib/i18n";

export default function LegalFooter() {
  const { t } = useTranslation();
  const linkStyle = {
    color: "var(--dp-text-dim)",
    textDecoration: "none",
    fontSize: 12,
    transition: "color 0.15s ease",
    cursor: "pointer",
    padding: "8px 10px",
    display: "inline-block",
    lineHeight: 1,
    position: "relative",
    zIndex: 1,
  };
  return (
    <footer style={{
      borderTop: "1px solid var(--dp-border)",
      background: "var(--dp-bg-elevated)",
      padding: "16px 24px",
      marginTop: 40,
      position: "relative",
      zIndex: 70,
    }}>
      <div style={{
        maxWidth: 1400, margin: "0 auto",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
        paddingRight: 80,
      }}>
        <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)" }}>
          © {new Date().getFullYear()} AOEM Server #ERA003
        </div>
        <nav style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: -8 }}>
          <Link to={createPageUrl("Imprint")} style={linkStyle}>{t("legal.imprint.title")}</Link>
          <Link to={createPageUrl("Privacy")} style={linkStyle}>{t("legal.privacy.title")}</Link>
          <Link to={createPageUrl("Terms")} style={linkStyle}>{t("legal.terms.title")}</Link>
          <Link to={createPageUrl("KVKK")} style={linkStyle}>{t("legal.kvkk.title")}</Link>
        </nav>
      </div>
    </footer>
  );
}