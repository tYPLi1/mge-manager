import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useTranslation } from "@/lib/i18n";

const LINKS = [
  { key: "imprint", page: "Imprint" },
  { key: "privacy", page: "Privacy" },
  { key: "terms", page: "Terms" },
  { key: "kvkk", page: "KVKK" },
];

export default function LegalFooter() {
  const { t } = useTranslation();

  return (
    <>
      <style>{`
        .legal-footer-link {
          position: relative;
          z-index: 1;
          color: var(--dp-text-dim);
          text-decoration: none;
          font-size: 12px;
          line-height: 1;
          padding: 10px 12px;
          display: inline-block;
          border-radius: 6px;
          transition: color 0.15s ease, font-size 0.15s ease, background 0.15s ease;
          cursor: pointer;
        }
        .legal-footer-link:hover,
        .legal-footer-link:focus-visible {
          color: var(--dp-text);
          text-decoration: underline;
          text-underline-offset: 3px;
          font-size: 13px;
          background: rgba(255,255,255,0.04);
          outline: none;
        }
      `}</style>
      <footer style={{
        borderTop: "1px solid var(--dp-border)",
        background: "var(--dp-bg-elevated)",
        padding: "16px 24px",
        marginTop: 40,
        position: "relative",
        zIndex: 70,
      }}>
        <div style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", marginRight: 16 }}>
            © {new Date().getFullYear()} AOEM Server #ERA003
          </div>
          <nav style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: -10 }}>
            {LINKS.map(({ key, page }) => (
              <Link
                key={key}
                to={createPageUrl(page)}
                className="legal-footer-link"
              >
                {t(`legal.${key}.title`)}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </>
  );
}