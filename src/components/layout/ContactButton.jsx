import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Mail } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import ReportModal from "@/components/reports/ReportModal";

/**
 * Inline "Contact" button used inside the legal footer.
 * Opens the same ReportModal as the floating ReportButton, so users have
 * an obvious way to reach the operator from the legal pages.
 */
export default function ContactButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();

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
        <Mail size={12} />
        {t("legal.contact.title")}
      </button>

      {open && (
        <ReportModal
          onClose={() => setOpen(false)}
          page={location.pathname}
        />
      )}
    </>
  );
}