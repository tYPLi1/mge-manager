import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bug } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import ReportModal from "./ReportModal";

/**
 * Floating bottom-right button that opens the report modal.
 * Visible on every page (public + admin).
 */
export default function ReportButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("report.button")}
        aria-label={t("report.button")}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 60,
          height: 48,
          width: 48,
          borderRadius: 24,
          background: "linear-gradient(135deg, #d9b068, #a67c38)",
          color: "#2a1f10",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 6px 16px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.2) inset",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <Bug size={20} />
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