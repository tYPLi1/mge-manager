import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "@/lib/i18n";
import ReportModal from "@/components/reports/ReportModal";

/**
 * Inline button used inside the legal footer.
 * Styled identically to the legal-footer-link <Link>s so it matches in size.
 * Variants:
 *   - "contact" → opens ReportModal with type="other"
 *   - "bug"     → opens ReportModal with type="bug"
 */
export default function ContactButton({ variant = "contact" }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isBug = variant === "bug";
  const label = isBug ? t("report.shortButton") : t("legal.contact.title");
  const initialType = isBug ? "bug" : "other";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="legal-footer-link"
        style={{
          background: "transparent",
          border: "none",
          font: "inherit",
          cursor: "pointer",
        }}
      >
        {label}
      </button>

      {open && (
        <ReportModal
          onClose={() => setOpen(false)}
          page={location.pathname}
          initialType={initialType}
        />
      )}
    </>
  );
}