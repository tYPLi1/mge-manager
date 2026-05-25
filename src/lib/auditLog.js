import { adminEntities } from "@/components/adminApi";

/**
 * Write an entry to the public AuditLog.
 * Failures are swallowed so they never break the primary admin action.
 */
export async function writeAuditLog(entry) {
  try {
    await adminEntities.AuditLog.create({
      action_date: new Date().toISOString().split("T")[0],
      ...entry,
      details: entry.details ? (typeof entry.details === "string" ? entry.details : JSON.stringify(entry.details)) : undefined,
    });
  } catch (e) {
    console.warn("AuditLog write failed:", e);
  }
}