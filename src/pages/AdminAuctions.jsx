import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gavel, Plus, Play, Square, Eye, CheckCircle, Trash2, Edit2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/dkp/PageHeader";
import DKPValue from "@/components/dkp/DKPValue";

const DEFAULT_MGE_TARGETS = [
  { rank: 1, medals: 100, target: 30000000 },
  { rank: 2, medals: 80, target: 28000000 },
  { rank: 3, medals: 60, target: 26000000 },
  { rank: 4, medals: 40, target: 24000000 },
  { rank: 5, medals: 20, target: 22000000 },
  { rank: 6, medals: 15, target: 20000000 },
  { rank: 7, medals: 15, target: 18000000 },
  { rank: 8, medals: 10, target: 16000000 },
  { rank: 9, medals: 10, target: 14000000 },
  { rank: 10, medals: 10, target: 12000000 },
];
const DEFAULT_COOLDOWN_TABLE = { 1: 4, 2: 4, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1, 10: 1 };

function addDays(dateStr, days) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function AdminAuctions() {
  const [title, setTitle] = useState("");
  const [scheduledClose, setScheduledClose] = useState("");
  const [password, setPassword] = useState("");
  const [viewBids, setViewBids] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editBid, setEditBid] = useState(null);
  const [editDkp, setEditDkp] = useState("");
  const queryClient = useQueryClient();

  const { data: auctions = [] } = useQuery({
    queryKey: ["auctions"],
    queryFn: () => base44.entities.Auction.list("-created_date", 50),
  });

  const { data: bids = [] } = useQuery({
    queryKey: ["bids", viewBids?.id],
    queryFn: () => viewBids ? base44.entities.Bid.filter({ auction_id: viewBids.id }, "-dkp_bid", 200) : [],
    enabled: !!viewBids,
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("name", 500),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const friendlyZoneEnabled = settings.find((s) => s.key === "friendly_zone_enabled")?.value === "true";
  const friendlyZoneThreshold = parseInt(settings.find((s) => s.key === "friendly_zone_threshold")?.value || "50");

  // Compute auction preview ranking
  const previewRanking = useMemo(() => {
    if (!showPreview || !viewBids) return [];
    const activeBids = bids.filter((b) => !b.is_deleted);

    // Sort by dkp_bid desc, then mge_score desc for tiebreak
    const sorted = [...activeBids].sort((a, b) => {
      if (b.dkp_bid !== a.dkp_bid) return b.dkp_bid - a.dkp_bid;
      return (b.mge_score || 0) - (a.mge_score || 0);
    });

    const top10 = sorted.slice(0, 10);

    // Friendly Zone: Rank 10 → only players with current_dkp < threshold
    if (friendlyZoneEnabled && top10.length >= 10) {
      const rank10Bid = top10[9];
      const rank10Player = players.find((p) => p.id === rank10Bid.player_id);
      const currentDkp = rank10Player ? (rank10Player.total_dkp - rank10Player.dkp_spent) : 999;

      if (currentDkp >= friendlyZoneThreshold) {
        // Find a friendly zone eligible player from outside top 10
        const eligibleBid = sorted.slice(10).find((b) => {
          const pl = players.find((p) => p.id === b.player_id);
          if (!pl) return false;
          return (pl.total_dkp - pl.dkp_spent) < friendlyZoneThreshold;
        });
        if (eligibleBid) {
          top10[9] = { ...eligibleBid, _friendlyZone: true };
        }
      }
    }

    return top10.map((b, i) => ({
      ...b,
      rank: i + 1,
      target: MGE_TARGETS[i]?.target,
      medals: MGE_TARGETS[i]?.medals,
    }));
  }, [showPreview, bids, players, friendlyZoneEnabled, friendlyZoneThreshold, viewBids]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Auction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      setTitle(""); setScheduledClose(""); setPassword("");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Auction.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auctions"] }),
  });

  const deleteBidMutation = useMutation({
    mutationFn: ({ id, reason }) => base44.entities.Bid.update(id, { is_deleted: true, deleted_reason: reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bids", viewBids?.id] }),
  });

  const updateBidMutation = useMutation({
    mutationFn: ({ id, dkp_bid }) => base44.entities.Bid.update(id, { dkp_bid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bids", viewBids?.id] });
      setEditBid(null);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!viewBids || previewRanking.length === 0) return;
      const today = new Date().toISOString().split("T")[0];

      // Update auction status + confirmed_at
      await base44.entities.Auction.update(viewBids.id, {
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      });

      // For each winner: create AuctionResult, DKPTransaction (bid), set cooldown
      for (const entry of previewRanking) {
        const cooldownRounds = COOLDOWN_TABLE[entry.rank] || 1;
        const cooldownDate = addDays(today, cooldownRounds * 7);

        await base44.entities.AuctionResult.create({
          auction_id: viewBids.id,
          player_id: entry.player_id,
          player_name: entry.player_name,
          rank: entry.rank,
          bid_id: entry.id,
          dkp_bid: entry.dkp_bid,
          target_score: entry.target,
          hero_medals: entry.medals,
        });

        await base44.entities.DKPTransaction.create({
          player_id: entry.player_id,
          player_name: entry.player_name,
          amount: -entry.dkp_bid,
          type: "bid",
          source: "MGE",
          event_date: today,
          note: `${viewBids.title} — Rank ${entry.rank}`,
        });

        const player = players.find((p) => p.id === entry.player_id);
        if (player) {
          await base44.entities.Player.update(entry.player_id, {
            dkp_spent: (player.dkp_spent || 0) + entry.dkp_bid,
            cooldown_until: cooldownDate,
          });
        }
      }

      queryClient.invalidateQueries();
      setShowPreview(false);
      setViewBids(null);
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      title,
      status: "draft",
      scheduled_close: scheduledClose || null,
      bid_password: password || null,
      has_password: !!password,
    });
  };

  const activeBids = bids.filter((b) => !b.is_deleted);
  const deletedBids = bids.filter((b) => b.is_deleted);

  return (
    <div>
      <PageHeader title="Auction Management" icon={Gavel} />

      {/* Create Auction */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Create New Auction</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. MGE Round 15" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Close Date/Time (UTC)</Label>
            <Input type="datetime-local" value={scheduledClose} onChange={(e) => setScheduledClose(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Password (Optional)</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave empty for none" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
        </div>
        <Button onClick={handleCreate} disabled={!title || createMutation.isPending} className="mt-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Create Auction
        </Button>
      </div>

      {/* Auction List */}
      <div className="space-y-3 mb-6">
        {auctions.map((a) => (
          <div key={a.id} className="bg-[#111827] rounded-xl border border-white/5 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-white text-sm">{a.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    a.status === "open" ? "bg-emerald-500/15 text-emerald-400" :
                    a.status === "closed" ? "bg-red-500/15 text-red-400" :
                    a.status === "confirmed" ? "bg-blue-500/15 text-blue-400" :
                    "bg-gray-500/15 text-gray-400"
                  }`}>
                    {a.status}
                  </span>
                  {a.scheduled_close && <span className="text-xs text-gray-500">Close: {new Date(a.scheduled_close).toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {a.status === "draft" && (
                  <Button size="sm" onClick={() => statusMutation.mutate({ id: a.id, status: "open" })} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                    <Play className="w-3 h-3 mr-1" /> Open
                  </Button>
                )}
                {a.status === "open" && (
                  <Button size="sm" onClick={() => statusMutation.mutate({ id: a.id, status: "closed" })} className="bg-red-600 hover:bg-red-700 text-white text-xs">
                    <Square className="w-3 h-3 mr-1" /> Close
                  </Button>
                )}
                {(a.status === "open" || a.status === "closed") && (
                  <Button size="sm" variant="outline" onClick={() => { setViewBids(viewBids?.id === a.id ? null : a); setShowPreview(false); }} className="border-white/10 text-gray-300 text-xs hover:bg-white/5">
                    <Eye className="w-3 h-3 mr-1" /> {viewBids?.id === a.id ? "Hide" : "Bids"}
                  </Button>
                )}
                {a.status === "closed" && viewBids?.id === a.id && (
                  <Button size="sm" onClick={() => setShowPreview(!showPreview)} className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs hover:bg-amber-500/30">
                    {showPreview ? "Hide Preview" : "Preview Ranking"}
                  </Button>
                )}
              </div>
            </div>

            {/* Bid Table */}
            {viewBids?.id === a.id && !showPreview && (
              <div className="mt-4 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500">{activeBids.length} active bids{deletedBids.length > 0 ? ` · ${deletedBids.length} deleted` : ""}</p>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">#</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Player</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">DKP Bid</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">MGE Score</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {activeBids.map((b, i) => (
                      <tr key={b.id}>
                        <td className="px-2 py-1.5 text-xs text-gray-500">{i + 1}</td>
                        <td className="px-2 py-1.5 text-sm text-white">{b.player_name}</td>
                        <td className="px-2 py-1.5">
                          {editBid === b.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editDkp}
                                onChange={(e) => setEditDkp(e.target.value)}
                                className="w-20 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-white text-xs"
                              />
                              <button onClick={() => updateBidMutation.mutate({ id: b.id, dkp_bid: parseInt(editDkp) })} className="text-emerald-400 hover:text-emerald-300 text-xs">✓</button>
                              <button onClick={() => setEditBid(null)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                            </div>
                          ) : (
                            <DKPValue value={b.dkp_bid} size="sm" />
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-sm text-gray-400 hidden sm:table-cell">{b.mge_score || "—"}</td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditBid(b.id); setEditDkp(String(b.dkp_bid)); }}
                              className="text-gray-500 hover:text-amber-400 transition-colors"
                              title="Edit bid"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt("Reason for deleting this bid:");
                                if (reason !== null) deleteBidMutation.mutate({ id: b.id, reason });
                              }}
                              className="text-gray-500 hover:text-red-400 transition-colors"
                              title="Delete bid"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {activeBids.length === 0 && <p className="text-center text-gray-500 text-xs py-4">No bids yet</p>}
              </div>
            )}

            {/* Preview Ranking */}
            {viewBids?.id === a.id && showPreview && (
              <div className="mt-4 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white">Preview: Top 10 Ranking</p>
                  {friendlyZoneEnabled && (
                    <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">
                      Friendly Zone Active (threshold: {friendlyZoneThreshold} DKP)
                    </span>
                  )}
                </div>
                <table className="w-full mb-4">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Rank</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Player</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">DKP Bid</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">Medals</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">Target Score</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">Cooldown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {previewRanking.map((entry) => (
                      <tr key={entry.id} className={entry._friendlyZone ? "bg-emerald-500/5" : ""}>
                        <td className="px-2 py-1.5">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            entry.rank <= 3 ? "bg-amber-500/20 text-amber-400" : "bg-gray-700/50 text-gray-400"
                          }`}>
                            {entry.rank}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-sm text-white">
                          {entry.player_name}
                          {entry._friendlyZone && <span className="ml-2 text-xs text-emerald-400">(Friendly Zone)</span>}
                        </td>
                        <td className="px-2 py-1.5"><DKPValue value={entry.dkp_bid} size="sm" /></td>
                        <td className="px-2 py-1.5 text-xs text-gray-400 hidden sm:table-cell">{entry.medals}</td>
                        <td className="px-2 py-1.5 text-xs text-gray-400 font-mono hidden sm:table-cell">{entry.target?.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-xs text-gray-400 hidden md:table-cell">
                          +{(COOLDOWN_TABLE[entry.rank] || 1) * 7} days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending || previewRanking.length === 0}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {confirmMutation.isPending ? "Confirming..." : "Confirm & Publish Results"}
                </Button>
                <p className="text-xs text-gray-500 mt-2">This will deduct DKP from all winners, set cooldowns, and publish results publicly.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}