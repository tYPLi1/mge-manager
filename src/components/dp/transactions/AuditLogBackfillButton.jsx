import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQueryClient } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { writeAuditLog } from "@/lib/auditLog";

/**
 * Admin-only button that retroactively writes `player_created` audit log entries
 * for every existing player that doesn't have one yet. Idempotent — safe to run multiple times.
 */
export default function AuditLogBackfillButton() {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const queryClient = useQueryClient();

  // Only show to admins
  const adminSession = (() => {
    try { return JSON.parse(localStorage.getItem("adminSession") || "null"); }
    catch { return null; }
  })();
  if (!adminSession) return null;

  const handleBackfill = async () => {
    if (!confirm(t("auditLog.backfillConfirm"))) return;
    setRunning(true);
    try {
      const [players, existingLogs] = await Promise.all([
        base44.entities.Player.list("name", 100000),
        base44.entities.AuditLog.filter({ action_type: "player_created" }, "-created_date", 100000),
      ]);
      const alreadyLogged = new Set(existingLogs.map(l => l.player_id).filter(Boolean));
      const todo = players.filter(p => !alreadyLogged.has(p.id));

      if (todo.length === 0) {
        alert(t("auditLog.backfillNone"));
        return;
      }

      const entries = todo.map(p => ({
        action_type: "player_created",
        player_id: p.id,
        player_name: p.name,
        source: "backfill",
        action_date: (p.created_date ? new Date(p.created_date) : new Date()).toISOString().split("T")[0],
        summary: `Player created${p.alliance ? ` (alliance: ${p.alliance})` : ""} — retroactive`,
        details: JSON.stringify({ alliance: p.alliance || null, backfilled: true, created_date: p.created_date }),
      }));

      // Bulk create if available, otherwise sequential
      if (typeof adminEntities.AuditLog.bulkCreate === "function") {
        for (let i = 0; i < entries.length; i += 100) {
          await adminEntities.AuditLog.bulkCreate(entries.slice(i, i + 100));
        }
      } else {
        for (const entry of entries) {
          await writeAuditLog(entry);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      alert(t("auditLog.backfillDone").replace("{{count}}", entries.length));
    } catch (e) {
      console.error("Backfill failed:", e);
      alert("Backfill failed: " + e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <button
      onClick={handleBackfill}
      disabled={running}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        fontSize: 12.5,
        fontWeight: 500,
        background: "rgba(167, 139, 250, 0.12)",
        color: "#a78bfa",
        border: "1px solid rgba(167, 139, 250, 0.25)",
        borderRadius: 8,
        cursor: running ? "default" : "pointer",
        opacity: running ? 0.6 : 1,
      }}
      title={t("auditLog.backfillTooltip")}
    >
      {running ? <Loader2 size={13} className="animate-spin" /> : <History size={13} />}
      {running ? t("auditLog.backfillRunning") : t("auditLog.backfillButton")}
    </button>
  );
}