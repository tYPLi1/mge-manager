import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Mail, Bug } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import ReportModal from "@/components/reports/ReportModal";

/**
 * Inline button used inside the legal footer.
 * Variants:
 *   - "contact" → Mail icon, opens ReportModal with type="other"
 *   - "bug"     → Bug icon,  opens ReportModal with type="bug"
 */
export default function ContactButton({ variant = "contact" }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isBug = variant === "bug";
  const Icon = isBug ? Bug : Mail;
  const label = isBug ? t("report.openButton") : t("legal.contact.title");
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
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Icon size={12} />
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