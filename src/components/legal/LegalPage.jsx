import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import DPPageHeader from "@/components/dp/PageHeader";

/**
 * Reusable layout for legal pages (Privacy, Terms, KVKK).
 * Renders sections from i18n with a "last updated" line and back link.
 */
export default function LegalPage({ titleKey, subtitleKey, sectionsKey, lastUpdated }) {
  const { t } = useTranslation();
  const sections = t(sectionsKey);
  const sectionList = Array.isArray(sections) ? sections : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <DPPageHeader title={t(titleKey)} subtitle={subtitleKey ? t(subtitleKey) : undefined} />

      <div className="dp-card-elevated" style={{ padding: "28px 32px", maxWidth: 860, margin: "0 auto", width: "100%" }}>
        {lastUpdated && (
          <div style={{ fontSize: 12, color: "var(--dp-text-dim)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {t("legal.lastUpdated")}: {lastUpdated}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {sectionList.map((sec, i) => (
            <section key={i}>
              {sec.heading && (
                <h2 className="dp-heading" style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--dp-text)" }}>
                  {sec.heading}
                </h2>
              )}
              {sec.body && (
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--dp-text-muted)", margin: 0, whiteSpace: "pre-line" }}>
                  {sec.body}
                </p>
              )}
              {Array.isArray(sec.list) && sec.list.length > 0 && (
                <ul style={{ marginTop: 8, paddingLeft: 22, color: "var(--dp-text-muted)", fontSize: 14, lineHeight: 1.6 }}>
                  {sec.list.map((li, j) => <li key={j} style={{ marginBottom: 4 }}>{li}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--dp-border)", display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link to={createPageUrl("Leaderboard")} className="dp-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <ArrowLeft size={13} /> {t("common.back")}
          </Link>
        </div>
      </div>
    </div>
  );
}