import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Mail, Bug } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import ReportModal from "@/components/reports/ReportModal";
import ContactModal from "@/components/contact/ContactModal";

/**
 * Inline button used inside the legal footer.
 * Styled identically to the legal-footer-link <Link>s so it matches in size.
 * Variants:
 *   - "contact" → Mail icon, opens ContactModal (sends email with sender's reply-to)
 *   - "bug"     → Bug icon,  opens ReportModal (bug report)
 */
export default function ContactButton({ variant = "contact" }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isBug = variant === "bug";
  const Icon = isBug ? Bug : Mail;
  const label = isBug ? t("report.shortButton") : t("legal.contact.title");

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
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Icon size={12} />
        {label}
      </button>

      {open && (
        isBug ? (
          <ReportModal
            onClose={() => setOpen(false)}
            page={location.pathname}
            initialType="bug"
          />
        ) : (
          <ContactModal
            onClose={() => setOpen(false)}
            page={location.pathname}
          />
        )
      )}
    </>
  );
}