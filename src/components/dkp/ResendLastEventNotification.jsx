import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery } from "@tanstack/react-query";
import { Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DiscordPreviewModal from "@/components/dkp/DiscordPreviewModal";
import { buildEventEmbeds } from "@/components/dkp/buildEventEmbeds";

export default function ResendLastEventNotification() {
  const [sending, setSending] = useState(false);
  const [discordPreview, setDiscordPreview] = useState(null);

  // Get last transactions (by created_date descending)
  const { data: lastTransactions = [] } = useQuery({
    queryKey: ["lastEventTransactions"],
    queryFn: async () => {
      const txns = await base44.entities.DKPTransaction.list("-created_date", 200);
      return txns;
    },
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => adminEntities.AppSettings.list(),
  });

  const { data: eventTypes = [] } = useQuery({
    queryKey: ["eventTypes"],
    queryFn: () => base44.entities.EventType.list("sort_order", 20),
  });

  // Find last event by grouping transactions by event_date + source + source_stage
  const getLastEventUpload = () => {
    if (lastTransactions.length === 0) return null;

    // Group by event identifier
    const eventMap = new Map();
    for (const txn of lastTransactions) {
      if (!txn.source || !txn.event_date) continue;
      const key = `${txn.event_date}|${txn.source}|${txn.source_stage || ""}`;
      if (!eventMap.has(key)) {
        eventMap.set(key, {
          eventDate: txn.event_date,
          source: txn.source,
          sourceStage: txn.source_stage,
          transactions: [],
          createdAt: txn.created_date,
        });
      }
      eventMap.get(key).transactions.push(txn);
    }

    // Return most recent event
    if (eventMap.size === 0) return null;
    const events = Array.from(eventMap.values());
    events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return events[0];
  };

  const lastEvent = getLastEventUpload();

  const handleResend = async () => {
    if (!lastEvent) {
      toast.error("No event uploads found");
      return;
    }

    setSending(true);

    try {
      const eventType = eventTypes.find(e => e.key === lastEvent.source);
      const stageLabel = lastEvent.sourceStage === "prep" ? "Preparation" : "War Stage";
      const stageName = !lastEvent.sourceStage ? "" : ` - ${stageLabel}`;

      const toApply = lastEvent.transactions;
      const totalDkp = toApply.reduce((sum, e) => sum + e.amount, 0);

      // Map transactions to row format expected by buildEventEmbeds
      const rows = [...toApply]
        .sort((a, b) => b.amount - a.amount)
        .map((t) => ({
          playerName: t.player_name,
          alliance: t.alliance || "",
          dkp: t.amount,
          note: t.note,
        }));

      const leaderboardUrl = "https://mge.era003.com/Leaderboard";
      const embeds = buildEventEmbeds({
        title: "📊 Event Data Uploaded",
        description: `**${eventType?.display_name || lastEvent.source}${stageName}** - ${new Date(lastEvent.eventDate).toLocaleDateString("en-GB")}`,
        rows,
        totalDkp,
        playersUpdated: toApply.length,
        leaderboardUrl,
      });

      setDiscordPreview({ embeds, onSent: () => {}, notifType: "event_upload" });
    } catch (error) {
      console.error("Error preparing resend:", error);
      toast.error("Failed to prepare notification");
    }

    setSending(false);
  };

  if (!lastEvent) {
    return (
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mt-6">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <AlertCircle className="w-4 h-4" /> No recent event uploads found
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mt-6">
        <h3 className="text-sm font-semibold text-white mb-3">Resend Last Event Notification</h3>
        <p className="text-xs text-gray-400 mb-4">
          <strong>Event:</strong> {lastEvent.source} ({lastEvent.eventDate})
          <br />
          <strong>Transactions:</strong> {lastEvent.transactions.length} | <strong>Total DKP:</strong> {lastEvent.transactions.reduce((sum, e) => sum + e.amount, 0)}
        </p>

        {/* Transactions Table */}
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left py-2 px-2 text-gray-400 font-medium">Player</th>
                <th className="text-left py-2 px-2 text-gray-400 font-medium">DKP</th>
                <th className="text-left py-2 px-2 text-gray-400 font-medium">Type</th>
                <th className="text-left py-2 px-2 text-gray-400 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {lastEvent.transactions.map((txn, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 px-2 text-white">{txn.player_name}</td>
                  <td className={`py-2 px-2 font-semibold ${txn.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                    {txn.amount > 0 ? "+" : ""}{txn.amount}
                  </td>
                  <td className="py-2 px-2 text-gray-400">{txn.type}</td>
                  <td className="py-2 px-2 text-gray-500 truncate">{txn.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button
          onClick={handleResend}
          disabled={sending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Send className="w-4 h-4 mr-1" />
          {sending ? "Preparing..." : "Resend to Discord"}
        </Button>
      </div>

      {discordPreview && (
        <DiscordPreviewModal
          embeds={discordPreview.embeds}
          channelId={discordPreview.channelId}
          onClose={() => setDiscordPreview(null)}
          onSent={discordPreview.onSent}
          notifType={discordPreview.notifType}
        />
      )}
    </>
  );
}