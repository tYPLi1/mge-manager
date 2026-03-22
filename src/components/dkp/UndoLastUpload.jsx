import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Undo2, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function getSession() {
  try {
    const raw = localStorage.getItem("adminSession");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export default function UndoLastUpload() {
  const [confirmId, setConfirmId] = useState(null);
  const [undoing, setUndoing] = useState(false);
  const queryClient = useQueryClient();

  // Find the most recent upload batch
  const { data: recentTx = [], isLoading } = useQuery({
    queryKey: ["last-upload-batch"],
    queryFn: async () => {
      // Get the most recent transaction that has an upload_batch_id
      const txs = await base44.entities.DKPTransaction.list("-created_date", 50);
      return txs.filter(tx => tx.upload_batch_id);
    },
  });

  // Group by batch and find the latest one
  const lastBatch = (() => {
    if (recentTx.length === 0) return null;
    const batchMap = {};
    for (const tx of recentTx) {
      if (!batchMap[tx.upload_batch_id]) {
        batchMap[tx.upload_batch_id] = {
          id: tx.upload_batch_id,
          source: tx.source,
          source_stage: tx.source_stage,
          event_date: tx.event_date,
          created_date: tx.created_date,
          count: 0,
          total_dkp: 0,
        };
      }
      batchMap[tx.upload_batch_id].count++;
      batchMap[tx.upload_batch_id].total_dkp += tx.amount;
    }
    // Return the batch with the most recent created_date
    const batches = Object.values(batchMap);
    batches.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    return batches[0];
  })();

  const handleUndo = async () => {
    if (!lastBatch) return;
    setUndoing(true);
    const session = getSession();
    if (!session) {
      toast.error("No admin session found");
      setUndoing(false);
      return;
    }

    const response = await base44.functions.invoke("undoLastUpload", {
      session: {
        userId: session.userId,
        username: session.username,
        expiresAt: session.expiresAt,
        token: session.token,
      },
      upload_batch_id: lastBatch.id,
    });

    if (response.data?.error) {
      toast.error("Error: " + response.data.error);
    } else {
      toast.success(`${response.data.undone_count} transactions undone`, {
        description: `${response.data.players_affected} players affected`,
      });
      // Force refetch all related queries immediately
      await queryClient.invalidateQueries({ queryKey: ["last-upload-batch"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["players"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["transactions"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["leaderboard"], refetchType: "all" });
    }
    setConfirmId(null);
    setUndoing(false);
  };

  if (isLoading) return null;
  if (!lastBatch) {
    return (
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mt-6">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Undo2 className="w-4 h-4 text-gray-500" /> Undo Last Upload
        </h3>
        <p className="text-xs text-gray-500">No upload with batch ID found. Only new uploads can be undone.</p>
      </div>
    );
  }

  const stageLabel = lastBatch.source_stage === "prep" ? "Prep" : lastBatch.source_stage === "war" ? "War" : "";
  const dateLabel = lastBatch.event_date ? new Date(lastBatch.event_date).toLocaleDateString("en-US") : "";

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mt-6">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Undo2 className="w-4 h-4 text-orange-400" /> Undo Last Upload
      </h3>

      <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-white/5 border border-white/10">
        <div>
          <p className="text-sm text-white font-medium">
            {lastBatch.source}{stageLabel ? ` — ${stageLabel}` : ""}{dateLabel ? ` — ${dateLabel}` : ""}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {lastBatch.count} transactions · {lastBatch.total_dkp > 0 ? "+" : ""}{lastBatch.total_dkp} DKP total
          </p>
        </div>

        {confirmId === lastBatch.id ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Are you sure?
            </span>
            <Button
              size="sm"
              onClick={handleUndo}
              disabled={undoing}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 px-3"
            >
              {undoing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yes, undo"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmId(null)}
              disabled={undoing}
              className="border-white/10 text-gray-400 text-xs h-7 px-3"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmId(lastBatch.id)}
            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs h-7 px-3 shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5 mr-1" /> Undo
          </Button>
        )}
      </div>
    </div>
  );
}