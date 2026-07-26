import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { writeAuditLog } from "@/lib/auditLog";
import { useTranslation } from "@/lib/i18n";



export default function DeleteEventData() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [previewTransactions, setPreviewTransactions] = useState([]);
  const [frozenTransactionIds, setFrozenTransactionIds] = useState(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Get all transactions with event_date (all types: earn, bid, penalty, bonus, compensation, king_allocation)
  const { data: allTransactions = [], isLoading } = useQuery({
    queryKey: ["all-transactions-by-date"],
    queryFn: async () => {
      const txs = await base44.entities.DKPTransaction.list("-event_date", 5000);
      return txs;
    },
  });

  // Group events by date
  const eventsByDate = (() => {
    if (!selectedDate || allTransactions.length === 0) return [];
    const filtered = allTransactions.filter(tx => tx.event_date === selectedDate);
    const eventMap = {};
    for (const tx of filtered) {
      const key = `${tx.source}_${tx.source_stage || "none"}`;
      if (!eventMap[key]) {
        eventMap[key] = {
          source: tx.source,
          source_stage: tx.source_stage,
          event_date: tx.event_date,
          count: 0,
          total_dkp: 0,
          transactions: [],
        };
      }
      eventMap[key].count++;
      eventMap[key].total_dkp += tx.amount;
      eventMap[key].transactions.push(tx);
    }
    return Object.values(eventMap);
  })();

  const handlePreview = (event) => {
    setSelectedEvent(event);
    setPreviewTransactions(event.transactions);
    // Freeze transaction IDs to prevent data manipulation
    setFrozenTransactionIds(new Set(event.transactions.map(tx => tx.id)));
    setShowPreview(true);
  };

  const handleDelete = async () => {
    if (!selectedEvent || previewTransactions.length === 0) return;
    setDeleting(true);

    try {
      // FAILSAFE 1: Verify all transactions still match the frozen event
      const txsToDelete = previewTransactions.filter(tx => frozenTransactionIds.has(tx.id));
      
      if (txsToDelete.length === 0) {
        throw new Error("No valid transactions to delete. Selection may have changed.");
      }

      if (txsToDelete.length !== frozenTransactionIds.size) {
        throw new Error("Transaction count mismatch. Aborting deletion for safety.");
      }

      // FAILSAFE 2: Verify all transactions match event date and source
      const allValid = txsToDelete.every(tx => 
        tx.event_date === selectedEvent.event_date &&
        tx.source === selectedEvent.source &&
        (tx.source_stage || null) === (selectedEvent.source_stage || null)
      );

      if (!allValid) {
        throw new Error("Some transactions do not match the selected event. Aborting.");
      }

      // STEP 1: Fetch all affected players FIRST (before any deletes)
      const affectedPlayerIds = [...new Set(txsToDelete.map(tx => tx.player_id))];
      const allPlayers = await base44.entities.Player.list("name", 1000);
      const playerMap = Object.fromEntries(allPlayers.filter(p => affectedPlayerIds.includes(p.id)).map(p => [p.id, p]));

      // STEP 2: Calculate DKP reductions per player BEFORE deleting
      const playerUpdates = {};
      for (const playerId of affectedPlayerIds) {
        const player = playerMap[playerId];
        const totalRemove = txsToDelete.filter(tx => tx.player_id === playerId).reduce((sum, tx) => sum + tx.amount, 0);
        playerUpdates[playerId] = Math.max(0, (player.total_dkp || 0) - totalRemove);
      }

      // STEP 3: Delete all transactions (only the validated ones)
      for (const tx of txsToDelete) {
        await base44.entities.DKPTransaction.delete(tx.id);
      }

      // STEP 4: Update player DKP balances
      for (const [playerId, newDkp] of Object.entries(playerUpdates)) {
        await base44.entities.Player.update(playerId, { total_dkp: newDkp });
      }

      // Audit log — record event deletion
      const totalDkpRemoved = txsToDelete.reduce((s, tx) => s + (tx.amount || 0), 0);
      const stageLabel = selectedEvent.source_stage === "prep" ? "Preparation" : selectedEvent.source_stage === "war" ? "War Stage" : null;
      const eventDisplay = `${selectedEvent.source}${stageLabel ? ` - ${stageLabel}` : ""}`;
      await writeAuditLog({
        action_type: "event_deleted",
        source: selectedEvent.source,
        action_date: selectedEvent.event_date,
        amount: -totalDkpRemoved,
        summary: `${eventDisplay} — ${txsToDelete.length} transactions deleted, ${totalDkpRemoved >= 0 ? "-" : "+"}${Math.abs(totalDkpRemoved)} DKP removed`,
        details: {
          event_key: selectedEvent.source,
          stage: selectedEvent.source_stage || null,
          transactions_deleted: txsToDelete.length,
          dkp_removed: totalDkpRemoved,
          affected_players: affectedPlayerIds.length,
        },
      });

      toast.success(t("deleteEvent.deletedToast", { count: txsToDelete.length }), {
        description: `Event: ${selectedEvent.source}${selectedEvent.source_stage ? ` - ${selectedEvent.source_stage}` : ""}`
      });

      // Reset state
      setShowPreview(false);
      setSelectedEvent(null);
      setPreviewTransactions([]);
      setFrozenTransactionIds(new Set());
      setSelectedDate("");

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["all-transactions-by-date"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } catch (error) {
      toast.error(t("deleteEvent.deleteFailed", { error: error.message }));
      console.error("Delete error:", error);
    }

    setDeleting(false);
  };

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mt-6">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Trash2 className="w-4 h-4 text-red-400" /> {t("deleteEvent.title")}
      </h3>

      {/* Date Selection */}
      <div className="mb-4">
        <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">{t("deleteEvent.selectDate")}</Label>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setSelectedEvent(null);
            setShowPreview(false);
          }}
          className="bg-white/5 border-white/10 text-white max-w-xs"
        />
      </div>

      {/* Event List for Selected Date */}
      {selectedDate && eventsByDate.length > 0 && !showPreview && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-2">{t("deleteEvent.eventsFound", { count: eventsByDate.length, date: new Date(selectedDate).toLocaleDateString("en-GB") })}</p>
          {eventsByDate.map((event, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div>
                <p className="text-sm text-white font-medium">
                  {event.source}{event.source_stage ? ` — ${event.source_stage === "prep" ? t("eventTemplates.stagePrep") : t("eventTemplates.stageWar")}` : ""}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t("deleteEvent.txSummary", { count: event.count, dkp: `${event.total_dkp > 0 ? "+" : ""}${event.total_dkp}` })}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handlePreview(event)}
                className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs"
              >
                {t("deleteEvent.previewDelete")}
              </Button>
            </div>
          ))}
        </div>
      )}

      {selectedDate && eventsByDate.length === 0 && !showPreview && (
        <p className="text-xs text-gray-500">{t("deleteEvent.noEvents")}</p>
      )}

      {/* Preview Modal */}
      {showPreview && selectedEvent && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-white font-bold text-lg">{t("deleteEvent.confirmTitle")}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedEvent.source}{selectedEvent.source_stage ? ` - ${selectedEvent.source_stage === "prep" ? t("eventTemplates.stagePrep") : t("eventTemplates.stageWar")}` : ""} · {new Date(selectedEvent.event_date).toLocaleDateString("en-GB")}
                </p>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                <p className="text-red-400 font-semibold text-sm mb-1">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  {t("deleteEvent.willBeDeleted", { count: previewTransactions.length })}
                </p>
                <p className="text-gray-400 text-xs">{t("deleteEvent.totalRemove", { dkp: `${selectedEvent.total_dkp > 0 ? "+" : ""}${selectedEvent.total_dkp}` })}</p>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-lg border border-white/10">
                <table className="w-full">
                  <thead className="bg-[#0d1117] sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">{t("transactions.columns.player")}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">{t("transactions.columns.amount")}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">{t("transactions.columns.note")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {previewTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-sm text-white">{tx.player_name}</td>
                        <td className={`px-3 py-2 font-mono text-sm font-bold ${tx.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{tx.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                disabled={deleting}
                className="flex-1 border-white/10 text-gray-400 hover:text-white"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                {deleting ? t("deleteEvent.deleting") : t("deleteEvent.deleteButton")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}