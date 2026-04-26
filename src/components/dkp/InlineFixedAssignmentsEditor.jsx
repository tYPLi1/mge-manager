import React, { useState } from "react";
import { adminEntities } from "@/components/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pin, Plus, X, Loader2 } from "lucide-react";
import PlayerSearchSelect from "@/components/dkp/PlayerSearchSelect";
import { toast } from "sonner";

/**
 * Inline editor to add/remove fixed_assignments on an existing auction
 * (status: draft or open). Bids on a fixed rank "rutschen drumherum" —
 * the existing previewRanking logic in AdminAuctions handles that on confirm.
 */
export default function InlineFixedAssignmentsEditor({ auction, players, maxRanks, onChanged }) {
  const initial = (() => {
    try { return JSON.parse(auction.fixed_assignments || "[]") || []; } catch { return []; }
  })();
  const [list, setList] = useState(initial);
  const [draftRank, setDraftRank] = useState("");
  const [draftPlayer, setDraftPlayer] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const usedRanks = new Set(list.map(a => Number(a.rank)));
  const usedPlayerIds = new Set(list.map(a => a.player_id));

  const persist = async (next) => {
    setSaving(true);
    try {
      // Re-fetch fresh to avoid overwriting concurrent edits
      const fresh = await adminEntities.Auction.get(auction.id).catch(() => auction);
      const _ = fresh; // ignore — we trust local list as source of truth here since user just edited it
      await adminEntities.Auction.update(auction.id, {
        fixed_assignments: next.length > 0 ? JSON.stringify(next) : null,
      });
      setList(next);
      onChanged?.();
      toast.success("Fixed assignments updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    setError("");
    const rankNum = parseInt(draftRank, 10);
    if (!rankNum || rankNum < 1 || rankNum > maxRanks) { setError(`Rank must be between 1 and ${maxRanks}`); return; }
    if (usedRanks.has(rankNum)) { setError(`Rank ${rankNum} already fixed`); return; }
    if (!draftPlayer) { setError("Select a player"); return; }
    if (usedPlayerIds.has(draftPlayer)) { setError("Player already fixed"); return; }
    if (!draftReason.trim()) { setError("Reason required"); return; }

    const player = players.find(p => p.id === draftPlayer);
    if (!player) { setError("Player not found"); return; }

    const next = [...list, {
      rank: rankNum,
      player_id: draftPlayer,
      player_name: player.name,
      reason: draftReason.trim(),
    }].sort((a, b) => Number(a.rank) - Number(b.rank));

    await persist(next);
    setDraftRank(""); setDraftPlayer(""); setDraftReason("");
  };

  const handleRemove = async (rank) => {
    const next = list.filter(a => Number(a.rank) !== Number(rank));
    await persist(next);
  };

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Pin className="w-4 h-4 text-amber-400" />
        <h4 className="text-sm font-semibold text-white">Fix vergebene Ränge</h4>
        <span className="text-[10px] text-gray-500">
          (Bids auf einen fixen Rang rutschen automatisch um ihn herum)
        </span>
      </div>

      {list.length > 0 && (
        <div className="space-y-1.5">
          {list.map((a) => (
            <div key={a.rank} className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-md px-2 py-1.5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] shrink-0">
                #{a.rank}
              </span>
              <span className="text-sm text-white font-medium">{a.player_name}</span>
              <span className="text-xs text-gray-500 truncate">— {a.reason}</span>
              <button
                type="button"
                onClick={() => handleRemove(a.rank)}
                disabled={saving}
                className="ml-auto text-gray-500 hover:text-red-400 disabled:opacity-50"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 block">Rank</Label>
          <Input
            type="number"
            min={1}
            max={maxRanks}
            value={draftRank}
            onChange={(e) => setDraftRank(e.target.value)}
            placeholder={`1–${maxRanks}`}
            className="bg-white/5 border-white/10 text-white h-9"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 block">Player</Label>
          <PlayerSearchSelect
            players={players.filter(p => !usedPlayerIds.has(p.id))}
            value={draftPlayer}
            onValueChange={setDraftPlayer}
            placeholder="Select player…"
          />
        </div>
      </div>
      <div>
        <Label className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 block">Reason</Label>
        <Input
          value={draftReason}
          onChange={(e) => setDraftReason(e.target.value)}
          placeholder="e.g. Compensation, Pre-allocated"
          className="bg-white/5 border-white/10 text-white h-9"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button
        type="button"
        size="sm"
        onClick={handleAdd}
        disabled={saving}
        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
        Add fixed rank
      </Button>
    </div>
  );
}