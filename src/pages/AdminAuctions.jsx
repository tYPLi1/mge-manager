import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gavel, Plus, Play, Square, Eye, CheckCircle, Trash2, Edit2, X, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/dkp/PageHeader";
import DKPValue from "@/components/dkp/DKPValue";
import DiscordPreviewModal from "@/components/dkp/DiscordPreviewModal";

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

// Ensure datetime-local strings (no timezone) are treated as UTC
function ensureUTC(dateStr) {
  if (!dateStr) return dateStr;
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 11)) {
    return dateStr + 'Z';
  }
  return dateStr;
}

function formatUTCDate(dateStr) {
  if (!dateStr) return '';
  return new Date(ensureUTC(dateStr)).toLocaleString("en-GB", { timeZone: "UTC" }) + " (UTC)";
}

function DeleteModal({ auction, players, onClose, onDelete }) {
  const [refundDkp, setRefundDkp] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const isConfirmed = auction.status === "confirmed";

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(auction, refundDkp && isConfirmed);
      onClose();
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Delete Auction</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-white font-semibold text-sm mb-1">"{auction.title}"</p>
          <p className="text-gray-400 text-xs">Status: <span className="text-red-400 font-medium">{auction.status}</span></p>
        </div>

        {isConfirmed && (
          <div className="space-y-3">
            <p className="text-gray-300 text-sm">This auction has already been confirmed and DKP was deducted. Do you want to refund the DKP?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setRefundDkp(true)}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  refundDkp
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                ✓ Yes, refund DKP
              </button>
              <button
                onClick={() => setRefundDkp(false)}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  !refundDkp
                    ? "bg-red-500/20 border-red-500/40 text-red-400"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                ✗ No, just delete
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {refundDkp
                ? 'DKP will be refunded as "Compensation" and deducted from dkp_spent. Cooldowns will be cleared.'
                : 'Cooldowns will be cleared. DKP will not be refunded.'}
            </p>
          </div>
        )}

        {!isConfirmed && (
          <p className="text-gray-400 text-sm">The auction and all associated bids will be permanently deleted.</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 border-white/10 text-gray-400 hover:text-white">Cancel</Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAuctions() {
  const [title, setTitle] = useState("");
  const [scheduledOpen, setScheduledOpen] = useState("");
  const [scheduledClose, setScheduledClose] = useState("");
  const [password, setPassword] = useState("");
  const [viewBids, setViewBids] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editBid, setEditBid] = useState(null);
  const [editDkp, setEditDkp] = useState("");
  const [deleteModal, setDeleteModal] = useState(null);
  const [discordPreview, setDiscordPreview] = useState(null);
  const queryClient = useQueryClient();

  const { data: auctions = [], isLoading: auctionsLoading } = useQuery({
    queryKey: ["auctions"],
    queryFn: () => adminEntities.Auction.list("-created_date", 50),
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
    queryFn: () => adminEntities.AppSettings.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions-activity"],
    queryFn: () => base44.entities.DKPTransaction.list("-event_date", 5000),
  });

  const { data: eventTypes = [] } = useQuery({
    queryKey: ["event-types"],
    queryFn: () => base44.entities.EventType.filter({ active: true }, "sort_order", 100),
  });

  useEffect(() => {
    const unsub1 = adminEntities.Auction.subscribe(() => queryClient.invalidateQueries({ queryKey: ["auctions"] }));
    const unsub2 = base44.entities.Bid.subscribe(() => queryClient.invalidateQueries({ queryKey: ["bids"] }));
    const unsub3 = base44.entities.Player.subscribe(() => queryClient.invalidateQueries({ queryKey: ["players"] }));
    const unsub4 = base44.entities.DKPTransaction.subscribe(() => queryClient.invalidateQueries({ queryKey: ["transactions-activity"] }));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [queryClient]);

  const discordConfigured = !!settings.find((s) => s.key === "discord_webhook_url")?.value;
  const auctionEnabled = settings.find((s) => s.key === "discord_auction_enabled")?.value === "true";
  const resultsEnabled = settings.find((s) => s.key === "discord_results_enabled")?.value === "true";
  const channelId = settings.find((s) => s.key === "discord_auction_channel")?.value;
  const appUrl = ""; // URLs handled by embed only

  const friendlyZoneEnabled = settings.find((s) => s.key === "friendly_zone_enabled")?.value === "true";
  const friendlyZoneThreshold = parseInt(settings.find((s) => s.key === "friendly_zone_threshold")?.value || "50");

  const mgeTargets = useMemo(() => {
    try {
      const raw = settings.find((s) => s.key === "mge_targets")?.value;
      return raw ? JSON.parse(raw) : DEFAULT_MGE_TARGETS;
    } catch { return DEFAULT_MGE_TARGETS; }
  }, [settings]);

  const cooldownTable = useMemo(() => {
    try {
      const raw = settings.find((s) => s.key === "cooldown_table")?.value;
      return raw ? JSON.parse(raw) : DEFAULT_COOLDOWN_TABLE;
    } catch { return DEFAULT_COOLDOWN_TABLE; }
  }, [settings]);

  const tiebreaker = settings.find((s) => s.key === "auction_tiebreaker")?.value || "fcfs";
  const tiebreakerFallback = settings.find((s) => s.key === "auction_tiebreaker_fallback")?.value || "fcfs";

  const lastEventDkpSources = useMemo(() => {
    try {
      const raw = settings.find((s) => s.key === "last_event_dkp_sources")?.value;
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [settings]);

  // Activity score per player (same logic as Leaderboard)
  const activityScores = useMemo(() => {
    const activityKeys = new Set();
    eventTypes.forEach(et => {
      if (et.has_prep_stage) activityKeys.add(`${et.key}_prep`);
      if (et.has_war_stage) activityKeys.add(`${et.key}_war`);
      if (!et.has_prep_stage && !et.has_war_stage) activityKeys.add(et.key);
    });
    const scores = {};
    transactions.filter(t => t.type === "earn").forEach(t => {
      let key = t.source;
      if (t.source_stage) key = `${t.source}_${t.source_stage}`;
      if (activityKeys.has(key)) {
        scores[t.player_id] = (scores[t.player_id] || 0) + t.amount;
      }
    });
    return scores;
  }, [transactions, eventTypes]);

  // Last event DKP per player: find the most recent event_date for configured sources, sum DKP per player for that date
  const lastEventDkpScores = useMemo(() => {
    if (tiebreaker !== "last_event_dkp" || lastEventDkpSources.length === 0) return {};
    const sourceSet = new Set(lastEventDkpSources);
    // Filter relevant transactions
    const relevant = transactions.filter(t => {
      if (t.type !== "earn") return false;
      let key = t.source;
      if (t.source_stage) key = `${t.source}_${t.source_stage}`;
      return sourceSet.has(key);
    });
    if (relevant.length === 0) return {};
    // Find the latest event_date
    const latestDate = relevant.reduce((max, t) => t.event_date > max ? t.event_date : max, relevant[0].event_date);
    // Sum DKP per player for that date only
    const scores = {};
    relevant.filter(t => t.event_date === latestDate).forEach(t => {
      scores[t.player_id] = (scores[t.player_id] || 0) + t.amount;
    });
    return scores;
  }, [transactions, tiebreaker, lastEventDkpSources]);

  // Shared tiebreaker comparator
  const compareBids = (a, b, rule) => {
    if (rule === "activity") return (activityScores[b.player_id] || 0) - (activityScores[a.player_id] || 0);
    if (rule === "last_event_dkp") return (lastEventDkpScores[b.player_id] || 0) - (lastEventDkpScores[a.player_id] || 0);
    return new Date(a.created_date) - new Date(b.created_date); // fcfs
  };

  const sortBids = (list) => [...list].sort((a, b) => {
    if (b.dkp_bid !== a.dkp_bid) return b.dkp_bid - a.dkp_bid;
    const primary = compareBids(a, b, tiebreaker);
    if (primary !== 0) return primary;
    return compareBids(a, b, tiebreakerFallback);
  });

  // Helper: check if a bid is FZ-eligible (opted in + player DKP ≤ threshold)
  const isFzEligible = (bid) => {
    if (!bid.want_friendly_zone) return false;
    const pl = players.find((p) => p.id === bid.player_id);
    if (!pl) return false;
    return ((pl.total_dkp || 0) + (pl.dkp_spent || 0)) <= friendlyZoneThreshold;
  };

  const previewRanking = useMemo(() => {
    if (!showPreview || !viewBids) return [];
    const activeBids = bids.filter((b) => !b.is_deleted);
    const sorted = sortBids(activeBids);

    let top10;

    if (friendlyZoneEnabled) {
      // Find FZ-eligible bids (sorted by DKP + tiebreaker, same order as sorted)
      const fzBids = sorted.filter(b => isFzEligible(b));
      const nonFzBids = sorted.filter(b => !isFzEligible(b));

      if (fzBids.length > 0) {
        // Best FZ bidder gets Rank 10, rest of Top 9 filled by non-FZ bids
        // If an FZ bidder also made it into Top 9 by pure ranking, they stay there and next FZ bidder gets Rank 10
        const fzWinner = fzBids[0]; // best FZ bid (already sorted)
        const top9 = nonFzBids.slice(0, 9);
        // If less than 9 non-FZ bids, fill remaining spots from FZ bids (excluding the FZ winner)
        if (top9.length < 9) {
          const remainingFz = fzBids.filter(b => b.id !== fzWinner.id);
          top9.push(...remainingFz.slice(0, 9 - top9.length));
        }
        top10 = [...top9, { ...fzWinner, _friendlyZone: true }];
      } else {
        // No FZ bidders → all 10 ranks normal
        top10 = sorted.slice(0, 10);
      }
    } else {
      top10 = sorted.slice(0, 10);
    }

    // Detect tiebreaker situations
    const getRuleLabel = (rule, playerId) => {
      if (rule === "activity") return `Activity: ${activityScores[playerId] || 0}`;
      if (rule === "last_event_dkp") return `Last Event DKP: ${lastEventDkpScores[playerId] || 0}`;
      return "Earlier bid";
    };
    return top10.map((b, i) => {
      let _tiebreaker = null;
      // Only check tiebreakers within the same group (don't compare rank 9 vs rank 10 FZ)
      if (!b._friendlyZone) {
        const hasTie = (i > 0 && !top10[i - 1]._friendlyZone && top10[i].dkp_bid === top10[i - 1].dkp_bid) ||
                       (i < top10.length - 1 && !top10[i + 1]?._friendlyZone && top10[i].dkp_bid === top10[i + 1]?.dkp_bid);
        if (hasTie) {
          const tiedGroup = top10.filter(t => !t._friendlyZone && t.dkp_bid === b.dkp_bid);
          const allPrimarySame = tiebreaker !== "fcfs" && tiedGroup.every(t => {
            const score = tiebreaker === "activity" ? (activityScores[t.player_id] || 0) :
                          tiebreaker === "last_event_dkp" ? (lastEventDkpScores[t.player_id] || 0) : null;
            const firstScore = tiebreaker === "activity" ? (activityScores[tiedGroup[0].player_id] || 0) :
                               tiebreaker === "last_event_dkp" ? (lastEventDkpScores[tiedGroup[0].player_id] || 0) : null;
            return score === firstScore;
          });
          if (allPrimarySame && tiebreaker !== "fcfs") {
            _tiebreaker = `Fallback: ${getRuleLabel(tiebreakerFallback, b.player_id)}`;
          } else {
            _tiebreaker = getRuleLabel(tiebreaker, b.player_id);
          }
        }
      }
      return {
        ...b,
        rank: i + 1,
        target: mgeTargets[i]?.target,
        medals: mgeTargets[i]?.medals,
        _tiebreaker,
      };
    });
  }, [showPreview, bids, players, friendlyZoneEnabled, friendlyZoneThreshold, viewBids, mgeTargets, tiebreaker, tiebreakerFallback, activityScores, lastEventDkpScores]);

  const createMutation = useMutation({
    mutationFn: (data) => adminEntities.Auction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      setTitle(""); setScheduledOpen(""); setScheduledClose(""); setPassword("");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => adminEntities.Auction.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auctions"] }),
  });

  const getSession = () => {
    try {
      const raw = localStorage.getItem("adminSession");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const handleOpenAuction = async (auction) => {
    // Open the auction — Discord notification is handled by entity automation (notifyAuctionOpened)
    statusMutation.mutate({ id: auction.id, status: "open" });
  };

  const [deletingBidId, setDeletingBidId] = useState(null);
  const deleteBidMutation = useMutation({
    mutationFn: ({ id, reason }) => {
      setDeletingBidId(id);
      return adminEntities.Bid.update(id, { is_deleted: true, deleted_reason: reason });
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["bids", viewBids?.id] });
      toast.success("Bid deleted");
      setDeletingBidId(null);
    },
    onError: () => {
      toast.error("Failed to delete bid");
      setDeletingBidId(null);
    },
  });

  const updateBidMutation = useMutation({
    mutationFn: ({ id, dkp_bid }) => adminEntities.Bid.update(id, { dkp_bid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bids", viewBids?.id] });
      setEditBid(null);
    },
  });

  const [confirming, setConfirming] = useState(false);

  const doConfirm = async () => {
    if (!viewBids) return;

    // Prevent double-confirm: check status and use a lock
    if (confirming) return;
    setConfirming(true);

    // Re-fetch auction to verify it hasn't already been confirmed
    const freshAuctions = await adminEntities.Auction.filter({ id: viewBids.id });
    const freshAuction = freshAuctions[0];
    if (!freshAuction || freshAuction.status === "confirmed") {
      toast.error("This auction has already been confirmed!");
      setConfirming(false);
      setShowPreview(false);
      setViewBids(null);
      queryClient.invalidateQueries();
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    await adminEntities.Auction.update(viewBids.id, {
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    });

    for (const entry of previewRanking) {
      const cooldownDays = cooldownTable[entry.rank] || 7;
      const cooldownDate = addDays(today, cooldownDays);

      await adminEntities.AuctionResult.create({
        auction_id: viewBids.id,
        player_id: entry.player_id,
        player_name: entry.player_name,
        rank: entry.rank,
        bid_id: entry.id,
        dkp_bid: entry.dkp_bid,
        target_score: entry.target,
        hero_medals: entry.medals,
        tiebreaker_note: entry._tiebreaker || null,
        is_friendly_zone: !!entry._friendlyZone,
      });

      await adminEntities.DKPTransaction.create({
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
        await adminEntities.Player.update(entry.player_id, {
          dkp_spent: (player.dkp_spent || 0) - entry.dkp_bid,
          cooldown_until: cooldownDate,
        });
      }
    }

    queryClient.invalidateQueries();
    setShowPreview(false);
    setViewBids(null);
    setConfirming(false);
  };

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!viewBids) return;

      if (resultsEnabled && discordConfigured && previewRanking.length > 0) {
        const resultsText = previewRanking.map((r, i) => {
          let line = `${i + 1}. **${r.player_name}** — ${r.dkp_bid} DKP`;
          if (r.target) line += ` | Target: ${r.target.toLocaleString()}`;
          if (r.medals) line += ` | Medals: ${r.medals}`;
          if (r._friendlyZone) line += ` 🤝 _(Friendly Zone)_`;
          if (r._tiebreaker) line += ` _(${r._tiebreaker})_`;
          return line;
        }).join("\n");

        const hasTiebreakers = previewRanking.some(r => r._tiebreaker);
        const hasFzWinner = previewRanking.some(r => r._friendlyZone);
        const ruleLabel = (rule) => {
          if (rule === "activity") return "Higher Activity Score";
          if (rule === "last_event_dkp") return "Most DKP in last event";
          return "First to bid";
        };

        // Build tiebreaker explanation
        let tiebreakerNote = "";
        tiebreakerNote += `⚖ **Primary:** ${ruleLabel(tiebreaker)}`;
        if (tiebreaker !== "fcfs") {
          tiebreakerNote += `\n↳ **Backup:** ${ruleLabel(tiebreakerFallback)}`;
        }
        tiebreakerNote += `\n\n_Tiebreaker applies when 2+ players have the same DKP bid. The primary tiebreaker is checked first. If there is still a tie, the backup tiebreaker decides._`;

        const fields = [
          { name: "Winners (Top 10)", value: resultsText || "No results", inline: false },
          { name: "Total Participants", value: String(previewRanking.length), inline: true },
        ];
        if (hasFzWinner) {
          fields.push({ name: "🤝 Friendly Zone", value: `Rank 10 reserved for eligible FZ bidder (≤ ${friendlyZoneThreshold} DKP). Highest FZ bid wins.`, inline: false });
        }
        fields.push({ name: "⚖ Tiebreaker Rules", value: tiebreakerNote, inline: false });

        const auctionPageUrl = "https://mge002.base44.app/Auction";
        fields.push({ name: "🔗 Link", value: `[View Auction](${auctionPageUrl})`, inline: false });

        const embed = {
          title: "🏆 Auction Results Ready",
          description: viewBids.title,
          color: 0x10b981,
          url: auctionPageUrl,
          fields,
          footer: { text: "DKP System" },
        };
        setDiscordPreview({ embed, onSent: doConfirm });
      } else {
        await doConfirm();
      }
    },
  });

  const handleDeleteAuction = async (auction, refundDkp) => {
    const today = new Date().toISOString().split("T")[0];

    // If confirmed: clear cooldowns (always) and optionally refund DKP
    if (auction.status === "confirmed") {
      const results = await adminEntities.AuctionResult.filter({ auction_id: auction.id });
      for (const result of results) {
        const player = players.find((p) => p.id === result.player_id);
        if (refundDkp) {
          await adminEntities.DKPTransaction.create({
            player_id: result.player_id,
            player_name: result.player_name,
            amount: result.dkp_bid,
            type: "compensation",
            source: "MGE",
            event_date: today,
            note: `Refund: ${auction.title}`,
          });
        }
        if (player) {
          const updates = { cooldown_until: null }; // always clear cooldown when deleting auction
          if (refundDkp) updates.dkp_spent = (player.dkp_spent || 0) + result.dkp_bid;
          await adminEntities.Player.update(result.player_id, updates);
        }
      }
      for (const result of results) {
        await adminEntities.AuctionResult.delete(result.id);
      }
    }

    // Delete all bids (in parallel batches of 10 for speed)
    const auctionBids = await adminEntities.Bid.filter({ auction_id: auction.id });
    for (let i = 0; i < auctionBids.length; i += 10) {
      const batch = auctionBids.slice(i, i + 10);
      await Promise.all(batch.map(bid => adminEntities.Bid.delete(bid.id)));
    }

    // Delete auction
    await adminEntities.Auction.delete(auction.id);
    toast.success(`Auction "${auction.title}" deleted (${auctionBids.length} bids removed)`);

    if (viewBids?.id === auction.id) {
      setViewBids(null);
      setShowPreview(false);
    }
    queryClient.invalidateQueries();
  };

  const buildAuctionEmbed = () => {
    const auctionUrl = "https://mge002.base44.app/Auction";
    const embed = {
      title: "🔔 New Auction Opened!",
      description: title,
      color: 0xf59e0b,
      url: auctionUrl,
      fields: [
        { name: "Status", value: "OPEN", inline: true },
        { name: "Closes", value: scheduledClose ? new Date(ensureUTC(scheduledClose)).toLocaleString("en-GB", { timeZone: "UTC" }) + " (UTC)" : "TBD", inline: true },
      ],
      footer: { text: "DKP System" },
    };
    if (password) {
      embed.fields.push({ name: "Password", value: `||${password}||`, inline: false });
    }
    embed.fields.push({ name: "🔗 Link", value: `[View Auction](${auctionUrl})`, inline: false });
    return embed;
  };

  const handleCreate = () => {
    if (!title) return;

    if (auctionEnabled && discordConfigured) {
      // Show preview modal — save embed + extra text on auction when confirmed
      setDiscordPreview({
        embed: buildAuctionEmbed(),
        sendNow: false,
        onSent: (extraText) => {
          const embed = buildAuctionEmbed();
          createMutation.mutate({
            title,
            status: "draft",
            scheduled_open: scheduledOpen || null,
            scheduled_close: scheduledClose || null,
            bid_password: password || null,
            has_password: !!password,
            discord_embed: JSON.stringify(embed),
            discord_extra_text: extraText || "",
          });
        },
      });
    } else {
      createMutation.mutate({
        title,
        status: "draft",
        scheduled_open: scheduledOpen || null,
        scheduled_close: scheduledClose || null,
        bid_password: password || null,
        has_password: !!password,
      });
    }
  };

  const activeBids = bids.filter((b) => !b.is_deleted);
  const deletedBids = bids.filter((b) => b.is_deleted);

  // Ranked active bids with reason for each rank position (includes FZ logic)
  const rankedBids = useMemo(() => {
    if (activeBids.length === 0) return [];
    const sorted = sortBids(activeBids);
    const getRuleLabel = (rule, playerId) => {
      if (rule === "activity") return `Activity: ${activityScores[playerId] || 0}`;
      if (rule === "last_event_dkp") return `Last Event DKP: ${lastEventDkpScores[playerId] || 0}`;
      return "Earlier bid";
    };

    // Build the effective ranking with FZ logic applied
    let effectiveTop;
    let fzWinnerId = null;

    if (friendlyZoneEnabled) {
      const fzBids = sorted.filter(b => isFzEligible(b));
      const nonFzBids = sorted.filter(b => !isFzEligible(b));

      if (fzBids.length > 0) {
        const fzWinner = fzBids[0];
        fzWinnerId = fzWinner.id;
        const top9 = nonFzBids.slice(0, 9);
        if (top9.length < 9) {
          const remainingFz = fzBids.filter(b => b.id !== fzWinner.id);
          top9.push(...remainingFz.slice(0, 9 - top9.length));
        }
        // Rank 10 = FZ winner, ranks 1-9 = top9
        effectiveTop = [...top9, { ...fzWinner, _friendlyZone: true }];
        // Remaining bids after the top 10
        const usedIds = new Set(effectiveTop.map(b => b.id));
        const rest = sorted.filter(b => !usedIds.has(b.id));
        effectiveTop = [...effectiveTop, ...rest];
      } else {
        effectiveTop = sorted;
      }
    } else {
      effectiveTop = sorted;
    }

    return effectiveTop.map((b, i) => {
      let rankReason = b._friendlyZone ? "Friendly Zone (Platz 10)" : "Highest DKP bid";
      if (!b._friendlyZone && i > 0 && !effectiveTop[i - 1]._friendlyZone && b.dkp_bid === effectiveTop[i - 1].dkp_bid) {
        const tiedGroup = effectiveTop.filter(t => !t._friendlyZone && t.dkp_bid === b.dkp_bid);
        const allPrimarySame = tiebreaker !== "fcfs" && tiedGroup.every(t => {
          const score = tiebreaker === "activity" ? (activityScores[t.player_id] || 0) :
                        tiebreaker === "last_event_dkp" ? (lastEventDkpScores[t.player_id] || 0) : null;
          const firstScore = tiebreaker === "activity" ? (activityScores[tiedGroup[0].player_id] || 0) :
                             tiebreaker === "last_event_dkp" ? (lastEventDkpScores[tiedGroup[0].player_id] || 0) : null;
          return score === firstScore;
        });
        if (allPrimarySame) {
          rankReason = `Fallback: ${getRuleLabel(tiebreakerFallback, b.player_id)}`;
        } else {
          rankReason = `Tiebreak: ${getRuleLabel(tiebreaker, b.player_id)}`;
        }
      }
      return { ...b, _rank: i + 1, _rankReason: rankReason };
    });
  }, [activeBids, tiebreaker, tiebreakerFallback, activityScores, lastEventDkpScores, friendlyZoneEnabled, friendlyZoneThreshold, players]);

  // Compute effective status client-side
  const getEffectiveStatus = (auction) => {
    const now = new Date();
    if (auction.status === "draft" && auction.scheduled_open && new Date(ensureUTC(auction.scheduled_open)) <= now) {
      if (auction.scheduled_close && new Date(ensureUTC(auction.scheduled_close)) <= now) return "closed";
      return "open";
    }
    if (auction.status === "open" && auction.scheduled_close && new Date(ensureUTC(auction.scheduled_close)) <= now) {
      return "closed";
    }
    return auction.status;
  };

  // Auto-sync expired/overdue auctions to their correct status on the server
  useEffect(() => {
    auctions.forEach((a) => {
      const effective = getEffectiveStatus(a);
      if (effective !== a.status) {
        if (effective === "open" && a.status === "draft") {
          handleOpenAuction(a);
        } else if (effective === "closed" && a.status === "open") {
          statusMutation.mutate({ id: a.id, status: "closed" });
        }
      }
    });
  }, [auctions]);

  return (
    <div>
      <PageHeader title="Auction Management" icon={Gavel} />

      {/* Create Auction */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Create New Auction</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. MGE Round 15" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block flex items-center gap-1">
              <Clock className="w-3 h-3" /> Start UTC (auto-open)
            </Label>
            <Input type="datetime-local" value={scheduledOpen} onChange={(e) => setScheduledOpen(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">End Date / Time (UTC)</Label>
            <Input type="datetime-local" value={scheduledClose} onChange={(e) => setScheduledClose(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Password (optional)</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Empty = no password" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
        </div>
        {scheduledOpen && (
          <p className="text-xs text-amber-400/70 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Auction auto-opens on {formatUTCDate(scheduledOpen)}
          </p>
        )}
        <Button onClick={handleCreate} disabled={!title || createMutation.isPending} className="mt-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Create Auction
        </Button>
      </div>

      {/* Auction List */}
      <div className="space-y-3 mb-6">
        {auctionsLoading && (
          <div className="bg-[#111827] rounded-xl border border-white/5 p-8 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-700 border-t-amber-500 rounded-full animate-spin" />
          </div>
        )}
        {auctions.map((a) => (
          <div key={a.id} className="bg-[#111827] rounded-xl border border-white/5 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-white text-sm">{a.title}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    getEffectiveStatus(a) === "open" && a.status !== "open" ? "bg-amber-500/15 text-amber-400 animate-pulse" :
                    getEffectiveStatus(a) === "closed" && a.status !== "closed" ? "bg-orange-500/15 text-orange-400 animate-pulse" :
                    a.status === "open" ? "bg-emerald-500/15 text-emerald-400" :
                    a.status === "closed" ? "bg-red-500/15 text-red-400" :
                    a.status === "confirmed" ? "bg-blue-500/15 text-blue-400" :
                    "bg-gray-500/15 text-gray-400"
                  }`}>
                    {getEffectiveStatus(a) !== a.status ? "syncing..." : a.status}
                  </span>
                  {a.scheduled_open && a.status === "draft" && (
                    <span className="text-xs text-amber-400/70 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Opens: {formatUTCDate(a.scheduled_open)}
                    </span>
                  )}
                  {a.scheduled_close && <span className="text-xs text-gray-500">Closes: {formatUTCDate(a.scheduled_close)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {a.status === "draft" && (
                  <Button size="sm" onClick={() => handleOpenAuction(a)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
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
                    {showPreview ? "Hide Preview" : "Ranking Preview"}
                  </Button>
                )}
                {/* Delete Button */}
                <button
                  onClick={() => setDeleteModal(a)}
                  className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                  title="Delete auction"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bid Table */}
            {viewBids?.id === a.id && !showPreview && (
              <div className="mt-4 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-xs text-gray-500">{activeBids.length} active bids{deletedBids.length > 0 ? ` · ${deletedBids.length} deleted` : ""}</p>
                  {friendlyZoneEnabled && (
                    <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">
                      Friendly Zone active (≤ {friendlyZoneThreshold} DKP)
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Rank</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Player</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">DKP Bid</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Bid Time (UTC)</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">Rank Reason</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">FZ</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rankedBids.map((b) => (
                      <tr key={b.id} className={`${b._rank <= 10 ? "" : "opacity-50"} ${b._friendlyZone ? "bg-emerald-500/5" : ""}`}>
                        <td className="px-2 py-1.5">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            b._rank <= 3 ? "bg-amber-500/20 text-amber-400" :
                            b._rank <= 10 ? "bg-gray-700/50 text-gray-300" :
                            "bg-transparent text-gray-600"
                          }`}>
                            {b._rank}
                          </span>
                        </td>
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
                        <td className="px-2 py-1.5 text-xs text-gray-400 font-mono whitespace-nowrap">
                          {b.created_date ? new Date(b.created_date).toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                        </td>
                        <td className="px-2 py-1.5 hidden sm:table-cell">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            b._rankReason.startsWith("Tiebreak")
                              ? "text-purple-400 bg-purple-500/10 border border-purple-500/20"
                              : "text-gray-500"
                          }`}>
                            {b._rankReason}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          {b.want_friendly_zone ? (() => {
                            const pl = players.find(p => p.id === b.player_id);
                            const plDkp = pl ? (pl.total_dkp || 0) + (pl.dkp_spent || 0) : 0;
                            const eligible = friendlyZoneEnabled && plDkp <= friendlyZoneThreshold;
                            return eligible
                              ? <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5" title={`${plDkp} DKP ≤ ${friendlyZoneThreshold}`}>✓ {plDkp}</span>
                              : <span className="text-xs font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-1.5 py-0.5" title={`Opted in but ${plDkp} DKP > ${friendlyZoneThreshold}`}>⚠ {plDkp}</span>;
                          })() : <span className="text-xs text-gray-600">—</span>}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditBid(b.id); setEditDkp(String(b.dkp_bid)); }}
                              className="text-gray-500 hover:text-amber-400 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt("Reason for deleting this bid:");
                                if (reason !== null) deleteBidMutation.mutate({ id: b.id, reason });
                              }}
                              disabled={deletingBidId === b.id}
                              className="text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                            >
                              {deletingBidId === b.id
                                ? <Loader2 className="w-3 h-3 animate-spin text-red-400" />
                                : <Trash2 className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                {rankedBids.length === 0 && <p className="text-center text-gray-500 text-xs py-4">No bids yet</p>}
              </div>
            )}

            {/* Preview Ranking */}
            {viewBids?.id === a.id && showPreview && (
              <div className="mt-4 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white">Preview: Top 10 Ranking</p>
                  {friendlyZoneEnabled && (
                    <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">
                      Friendly Zone active (Threshold: {friendlyZoneThreshold} DKP)
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
                          {entry._tiebreaker && (
                            <span className="ml-2 text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded px-1.5 py-0.5">
                              ⚖ {entry._tiebreaker}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5"><DKPValue value={entry.dkp_bid} size="sm" /></td>
                        <td className="px-2 py-1.5 text-xs text-gray-400 hidden sm:table-cell">{entry.medals}</td>
                        <td className="px-2 py-1.5 text-xs text-gray-400 font-mono hidden sm:table-cell">{entry.target?.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-xs text-gray-400 hidden md:table-cell">
                          +{cooldownTable[entry.rank] || 7} days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending || confirming}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {confirmMutation.isPending || confirming ? "Confirming..." : "Confirm & Publish Results"}
                </Button>
                <p className="text-xs text-gray-500 mt-2">DKP will be deducted, cooldowns set and results published publicly.</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {deleteModal && (
        <DeleteModal
          auction={deleteModal}
          players={players}
          onClose={() => setDeleteModal(null)}
          onDelete={handleDeleteAuction}
        />
      )}

      {discordPreview && (
        <DiscordPreviewModal
          embed={discordPreview.embed}
          channelId={channelId}
          sendNow={discordPreview.sendNow !== undefined ? discordPreview.sendNow : true}
          onClose={() => setDiscordPreview(null)}
          onSent={discordPreview.onSent}
        />
      )}
    </div>
  );
}