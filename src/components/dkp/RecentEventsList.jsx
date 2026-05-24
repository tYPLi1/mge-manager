import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Trash2, Loader2, AlertTriangle, Calendar, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DiscordPreviewModal from "@/components/dkp/DiscordPreviewModal";

const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;

export default function RecentEventsList() {
  const [expandedKey, setExpandedKey] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // event object
  const [deleting, setDeleting] = useState(false);
  const [discordPreview, setDiscordPreview] = useState(null);
  const queryClient = useQueryClient();

  const { data: eventTypes = [] } = useQuery({
    queryKey: ["eventTypes"],
    queryFn: () => base44.entities.EventType.list("sort_order", 100),
  });

  // Load transactions from the last 4 weeks (with a generous cap)
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["recent-events-4w"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - FOUR_WEEKS_MS).toISOString().split("T")[0];
      // Fetch up to 10k recent transactions, then filter client-side by event_date
      const all = await base44.entities.DKPTransaction.list("-event_date", 10000);
      return all.filter(tx => tx.event_date && tx.event_date >= cutoff && tx.source);
    },
  });

  // Live updates: refetch when any DKPTransaction changes
  useEffect(() => {
    const unsub = base44.entities.DKPTransaction.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["recent-events-4w"] });
    });
    return () => unsub();
  }, [queryClient]);

  // Group by event_date + source + source_stage
  const events = useMemo(() => {
    const map = new Map();
    for (const tx of transactions) {
      const key = `${tx.event_date}|${tx.source}|${tx.source_stage || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          event_date: tx.event_date,
          source: tx.source,
          source_stage: tx.source_stage || null,
          transactions: [],
          total_dkp: 0,
        });
      }
      const ev = map.get(key);
      ev.transactions.push(tx);
      ev.total_dkp += tx.amount || 0;
    }
    // Newest first
    return Array.from(map.values()).sort((a, b) => {
      if (a.event_date !== b.event_date) return b.event_date.localeCompare(a.event_date);
      return a.source.localeCompare(b.source);
    });
  }, [transactions]);

  const stageLabel = (stage) =>
    stage === "prep" ? "Preparation" : stage === "war" ? "War Stage" : null;

  const handleResend = (event) => {
    const eventType = eventTypes.find(e => e.key === event.source);
    const stageName = !event.source_stage ? "" : ` - ${stageLabel(event.source_stage)}`;
    const toApply = event.transactions;
    const totalDkp = toApply.reduce((sum, e) => sum + (e.amount || 0), 0);

    const sortedByDkp = [...toApply].sort((a, b) => b.amount - a.amount);
    const leaderboardUrl = "https://mge002.base44.app/Leaderboard";
    const MAX_FIELD_LENGTH = 1000;
    const MAX_EMBED_LENGTH = 5500;

    const allLines = sortedByDkp.map((entry, idx) => {
      const rank = idx + 1;
      const dkpStr = entry.amount > 0 ? `+${entry.amount}` : `${entry.amount}`;
      let line = `**${rank}. ${entry.player_name}** — \`${dkpStr} DKP\``;
      if (entry.note && entry.note.trim()) line += ` — _${entry.note}_`;
      return line;
    });

    const resultChunks = [];
    let currentChunk = "";
    for (let i = 0; i < allLines.length; i++) {
      const tentative = currentChunk ? currentChunk + "\n" + allLines[i] : allLines[i];
      if (tentative.length > MAX_FIELD_LENGTH && currentChunk) {
        resultChunks.push(currentChunk);
        currentChunk = allLines[i];
      } else {
        currentChunk = tentative;
      }
    }
    if (currentChunk) resultChunks.push(currentChunk);

    const embeds = [];
    let currentFields = [
      { name: "Players Updated", value: String(toApply.length), inline: true },
      { name: "Total DKP Distributed", value: String(totalDkp), inline: true },
    ];
    let currentLength = 200;
    for (let i = 0; i < resultChunks.length; i++) {
      const fieldName = i === 0 ? "📋 Results" : `📋 Results (cont.)`;
      const fieldLength = fieldName.length + resultChunks[i].length;
      if (currentLength + fieldLength > MAX_EMBED_LENGTH || currentFields.length >= 24) {
        embeds.push({ color: 0x8b5cf6, fields: currentFields });
        currentFields = [];
        currentLength = 100;
      }
      currentFields.push({ name: fieldName, value: resultChunks[i], inline: false });
      currentLength += fieldLength;
    }
    if (currentFields.length > 0) embeds.push({ color: 0x8b5cf6, fields: currentFields });

    if (embeds.length > 0) {
      embeds[0].title = "📊 Event Data Uploaded";
      embeds[0].description = `**${eventType?.display_name || event.source}${stageName}** - ${new Date(event.event_date).toLocaleDateString("en-GB")}`;
      embeds[0].url = leaderboardUrl;
      embeds[embeds.length - 1].fields.push({ name: "🔗 Link", value: `[View Leaderboard](${leaderboardUrl})`, inline: false });
      embeds[embeds.length - 1].footer = { text: "DKP System" };
    }

    setDiscordPreview({ embeds, onSent: () => {}, notifType: "event_upload" });
  };

  const handleDelete = async (event) => {
    setDeleting(true);
    try {
      const txs = event.transactions;
      // 1) Calculate DKP reductions per player BEFORE deleting
      const affectedPlayerIds = [...new Set(txs.map(tx => tx.player_id).filter(Boolean))];
      const allPlayers = await base44.entities.Player.list("name", 100000);
      const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));

      const playerUpdates = [];
      for (const playerId of affectedPlayerIds) {
        const player = playerMap[playerId];
        if (!player) continue;
        const playerTxs = txs.filter(tx => tx.player_id === playerId);
        // Earn-type transactions affect total_dkp; bid-type affects dkp_spent
        let totalRemove = 0;
        let spentRestore = 0;
        for (const tx of playerTxs) {
          if (tx.type === "bid") {
            spentRestore += Math.abs(tx.amount || 0);
          } else {
            totalRemove += tx.amount || 0;
          }
        }
        const newTotal = (player.total_dkp || 0) - totalRemove;
        const newSpent = (player.dkp_spent || 0) + spentRestore;
        const update = {};
        if (totalRemove !== 0) update.total_dkp = newTotal;
        if (spentRestore !== 0) update.dkp_spent = newSpent;
        if (Object.keys(update).length > 0) {
          playerUpdates.push({ id: playerId, data: update });
        }
      }

      // 2) Delete all transactions in parallel
      await Promise.all(txs.map(tx => adminEntities.DKPTransaction.delete(tx.id)));

      // 3) Update player balances in parallel
      await Promise.all(
        playerUpdates.map(u => adminEntities.Player.update(u.id, u.data))
      );

      toast.success(`Event deleted`, {
        description: `${txs.length} transactions reverted · ${event.total_dkp > 0 ? "+" : ""}${event.total_dkp} DKP rolled back`,
      });

      setConfirmDelete(null);
      setExpandedKey(null);
      queryClient.invalidateQueries({ queryKey: ["recent-events-4w"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["all-transactions-by-date"] });
      queryClient.invalidateQueries({ queryKey: ["lastEventTransactions"] });
    } catch (err) {
      console.error("Delete event error:", err);
      toast.error("Failed to delete event: " + (err?.message || "Unknown error"));
    }
    setDeleting(false);
  };

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          Recent Events (last 4 weeks)
        </h3>
        <span className="text-xs text-gray-500">{events.length} event{events.length === 1 ? "" : "s"}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading events...
        </div>
      ) : events.length === 0 ? (
        <p className="text-xs text-gray-500 py-2">No events uploaded in the last 4 weeks.</p>
      ) : (
        <div className="space-y-2">
          {events.map(event => {
            const isOpen = expandedKey === event.key;
            const label = stageLabel(event.source_stage);
            return (
              <div key={event.key} className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
                <div className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors">
                  <button
                    onClick={() => setExpandedKey(isOpen ? null : event.key)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white font-medium truncate">
                        {event.source}
                        {label && <span className="text-gray-500 font-normal"> — {label}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(event.event_date).toLocaleDateString("en-GB")} ·{" "}
                        {event.transactions.length} player{event.transactions.length === 1 ? "" : "s"} ·{" "}
                        <span className={event.total_dkp >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {event.total_dkp > 0 ? "+" : ""}{event.total_dkp} DKP
                        </span>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleResend(event)}
                      className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs"
                    >
                      <Send className="w-3.5 h-3.5 mr-1" /> Resend
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setConfirmDelete(event)}
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-white/10 max-h-80 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#0d1117] sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase">Player</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase">DKP</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase">Type</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {event.transactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-white/[0.02]">
                            <td className="px-3 py-1.5 text-white">{tx.player_name}</td>
                            <td className={`px-3 py-1.5 font-mono font-semibold ${tx.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {tx.amount > 0 ? "+" : ""}{tx.amount}
                            </td>
                            <td className="px-3 py-1.5 text-gray-400">{tx.type}</td>
                            <td className="px-3 py-1.5 text-gray-500 truncate max-w-xs">{tx.note || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {discordPreview && (
        <DiscordPreviewModal
          embeds={discordPreview.embeds}
          channelId={discordPreview.channelId}
          onClose={() => setDiscordPreview(null)}
          onSent={discordPreview.onSent}
          notifType={discordPreview.notifType}
        />
      )}

      {/* Confirm-delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Delete Event?
              </h2>
              <button
                onClick={() => !deleting && setConfirmDelete(null)}
                className="text-gray-500 hover:text-white"
                disabled={deleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm">
                <p className="text-red-400 font-semibold mb-1">
                  {confirmDelete.source}
                  {stageLabel(confirmDelete.source_stage) && ` — ${stageLabel(confirmDelete.source_stage)}`}
                </p>
                <p className="text-gray-400 text-xs">
                  {new Date(confirmDelete.event_date).toLocaleDateString("en-GB")} ·{" "}
                  {confirmDelete.transactions.length} transactions ·{" "}
                  {confirmDelete.total_dkp > 0 ? "+" : ""}{confirmDelete.total_dkp} DKP total
                </p>
              </div>
              <p className="text-xs text-gray-400">
                All transactions will be permanently deleted and the DKP amounts will be reverted
                from each player's balance. <strong className="text-gray-200">This cannot be undone.</strong>
              </p>
            </div>
            <div className="p-5 border-t border-white/10 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 border-white/10 text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                {deleting ? "Deleting..." : "Delete Event"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}