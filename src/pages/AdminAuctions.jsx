import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gavel, Plus, Play, Square, Eye, CheckCircle, Trash2, Edit2, X, Clock } from "lucide-react";
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

function DeleteModal({ auction, players, onClose, onDelete }) {
  const [refundDkp, setRefundDkp] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const isConfirmed = auction.status === "confirmed";

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(auction, refundDkp && isConfirmed);
    setDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Auktion löschen</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-white font-semibold text-sm mb-1">„{auction.title}"</p>
          <p className="text-gray-400 text-xs">Status: <span className="text-red-400 font-medium">{auction.status}</span></p>
        </div>

        {isConfirmed && (
          <div className="space-y-3">
            <p className="text-gray-300 text-sm">Diese Auktion wurde bereits bestätigt und DKP wurde abgezogen. Möchtest du die DKP zurückgeben?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setRefundDkp(true)}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  refundDkp
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                ✓ Ja, DKP zurückgeben
              </button>
              <button
                onClick={() => setRefundDkp(false)}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  !refundDkp
                    ? "bg-red-500/20 border-red-500/40 text-red-400"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                ✗ Nein, einfach löschen
              </button>
            </div>
            {refundDkp && (
              <p className="text-xs text-gray-500">
                DKP wird als „Compensation" zurückgebucht und der Betrag aus dkp_spent abgezogen.
              </p>
            )}
          </div>
        )}

        {!isConfirmed && (
          <p className="text-gray-400 text-sm">Die Auktion und alle zugehörigen Gebote werden dauerhaft gelöscht.</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 border-white/10 text-gray-400 hover:text-white">Abbrechen</Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {deleting ? "Löschen..." : "Löschen"}
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

  const previewRanking = useMemo(() => {
    if (!showPreview || !viewBids) return [];
    const activeBids = bids.filter((b) => !b.is_deleted);
    const sorted = [...activeBids].sort((a, b) => {
      if (b.dkp_bid !== a.dkp_bid) return b.dkp_bid - a.dkp_bid;
      // Bei gleichen Geboten: wer zuerst geboten hat, gewinnt (ältestes created_date = kleinerer Wert)
      return new Date(a.created_date) - new Date(b.created_date);
    });
    const top10 = sorted.slice(0, 10);

    if (friendlyZoneEnabled && top10.length >= 10) {
      const rank10Bid = top10[9];
      const rank10Player = players.find((p) => p.id === rank10Bid.player_id);
      const rank10Dkp = rank10Player ? (rank10Player.total_dkp - rank10Player.dkp_spent) : 999;
      // Rank 10 ist NICHT Friendly-Zone-berechtigt → suche einen opt-in Kandidaten ausserhalb Top 10
      if (rank10Dkp > friendlyZoneThreshold || !rank10Bid.want_friendly_zone) {
        const eligibleBid = sorted.slice(10).find((b) => {
          if (!b.want_friendly_zone) return false;
          const pl = players.find((p) => p.id === b.player_id);
          if (!pl) return false;
          return (pl.total_dkp - pl.dkp_spent) <= friendlyZoneThreshold;
        });
        if (eligibleBid) top10[9] = { ...eligibleBid, _friendlyZone: true };
      }
    }

    return top10.map((b, i) => ({
      ...b,
      rank: i + 1,
      target: mgeTargets[i]?.target,
      medals: mgeTargets[i]?.medals,
    }));
  }, [showPreview, bids, players, friendlyZoneEnabled, friendlyZoneThreshold, viewBids, mgeTargets]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Auction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      setTitle(""); setScheduledOpen(""); setScheduledClose(""); setPassword("");
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

      await base44.entities.Auction.update(viewBids.id, {
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      });

      for (const entry of previewRanking) {
        const cooldownRounds = cooldownTable[entry.rank] || 1;
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

  const handleDeleteAuction = async (auction, refundDkp) => {
    const today = new Date().toISOString().split("T")[0];

    // If confirmed and refund requested, reverse DKP
    if (refundDkp) {
      const results = await base44.entities.AuctionResult.filter({ auction_id: auction.id });
      for (const result of results) {
        const player = players.find((p) => p.id === result.player_id);
        // Create refund transaction
        await base44.entities.DKPTransaction.create({
          player_id: result.player_id,
          player_name: result.player_name,
          amount: result.dkp_bid,
          type: "compensation",
          source: "MGE",
          event_date: today,
          note: `Rückerstattung: ${auction.title}`,
        });
        // Restore dkp_spent
        if (player) {
          await base44.entities.Player.update(result.player_id, {
            dkp_spent: Math.max(0, (player.dkp_spent || 0) - result.dkp_bid),
          });
        }
      }
      // Delete auction results
      for (const result of results) {
        await base44.entities.AuctionResult.delete(result.id);
      }
    }

    // Delete all bids
    const auctionBids = await base44.entities.Bid.filter({ auction_id: auction.id });
    for (const bid of auctionBids) {
      await base44.entities.Bid.delete(bid.id);
    }

    // Delete auction
    await base44.entities.Auction.delete(auction.id);

    if (viewBids?.id === auction.id) {
      setViewBids(null);
      setShowPreview(false);
    }
    queryClient.invalidateQueries();
  };

  const handleCreate = () => {
    const data = {
      title,
      status: scheduledOpen ? "draft" : "draft",
      scheduled_open: scheduledOpen || null,
      scheduled_close: scheduledClose || null,
      bid_password: password || null,
      has_password: !!password,
    };
    createMutation.mutate(data);
  };

  const activeBids = bids.filter((b) => !b.is_deleted);
  const deletedBids = bids.filter((b) => b.is_deleted);

  return (
    <div>
      <PageHeader title="Auction Management" icon={Gavel} />

      {/* Create Auction */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Neue Auktion erstellen</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Titel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. MGE Round 15" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block flex items-center gap-1">
              <Clock className="w-3 h-3" /> Start (auto-öffnen)
            </Label>
            <Input type="datetime-local" value={scheduledOpen} onChange={(e) => setScheduledOpen(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Enddatum / -Zeit</Label>
            <Input type="datetime-local" value={scheduledClose} onChange={(e) => setScheduledClose(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Passwort (optional)</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leer = kein Passwort" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
        </div>
        {scheduledOpen && (
          <p className="text-xs text-amber-400/70 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Auktion wird automatisch geöffnet am {new Date(scheduledOpen).toLocaleString("de-CH")}
          </p>
        )}
        <Button onClick={handleCreate} disabled={!title || createMutation.isPending} className="mt-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Auktion erstellen
        </Button>
      </div>

      {/* Auction List */}
      <div className="space-y-3 mb-6">
        {auctions.map((a) => (
          <div key={a.id} className="bg-[#111827] rounded-xl border border-white/5 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-white text-sm">{a.title}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    a.status === "open" ? "bg-emerald-500/15 text-emerald-400" :
                    a.status === "closed" ? "bg-red-500/15 text-red-400" :
                    a.status === "confirmed" ? "bg-blue-500/15 text-blue-400" :
                    "bg-gray-500/15 text-gray-400"
                  }`}>
                    {a.status}
                  </span>
                  {a.scheduled_open && a.status === "draft" && (
                    <span className="text-xs text-amber-400/70 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Startet: {new Date(a.scheduled_open).toLocaleString("de-CH")}
                    </span>
                  )}
                  {a.scheduled_close && <span className="text-xs text-gray-500">Endet: {new Date(a.scheduled_close).toLocaleString("de-CH")}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {a.status === "draft" && (
                  <Button size="sm" onClick={() => statusMutation.mutate({ id: a.id, status: "open" })} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                    <Play className="w-3 h-3 mr-1" /> Öffnen
                  </Button>
                )}
                {a.status === "open" && (
                  <Button size="sm" onClick={() => statusMutation.mutate({ id: a.id, status: "closed" })} className="bg-red-600 hover:bg-red-700 text-white text-xs">
                    <Square className="w-3 h-3 mr-1" /> Schliessen
                  </Button>
                )}
                {(a.status === "open" || a.status === "closed") && (
                  <Button size="sm" variant="outline" onClick={() => { setViewBids(viewBids?.id === a.id ? null : a); setShowPreview(false); }} className="border-white/10 text-gray-300 text-xs hover:bg-white/5">
                    <Eye className="w-3 h-3 mr-1" /> {viewBids?.id === a.id ? "Ausblenden" : "Gebote"}
                  </Button>
                )}
                {a.status === "closed" && viewBids?.id === a.id && (
                  <Button size="sm" onClick={() => setShowPreview(!showPreview)} className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs hover:bg-amber-500/30">
                    {showPreview ? "Vorschau ausblenden" : "Ranking vorschau"}
                  </Button>
                )}
                {/* Delete Button */}
                <button
                  onClick={() => setDeleteModal(a)}
                  className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                  title="Auktion löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bid Table */}
            {viewBids?.id === a.id && !showPreview && (
              <div className="mt-4 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500">{activeBids.length} aktive Gebote{deletedBids.length > 0 ? ` · ${deletedBids.length} gelöscht` : ""}</p>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">#</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Spieler</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">DKP Gebot</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">MGE Score</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Friendly Zone</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Aktionen</th>
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
                          {b.want_friendly_zone
                            ? <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">✓ FZ</span>
                            : <span className="text-xs text-gray-600">—</span>}
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
                                const reason = prompt("Grund für das Löschen dieses Gebots:");
                                if (reason !== null) deleteBidMutation.mutate({ id: b.id, reason });
                              }}
                              className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {activeBids.length === 0 && <p className="text-center text-gray-500 text-xs py-4">Noch keine Gebote</p>}
              </div>
            )}

            {/* Preview Ranking */}
            {viewBids?.id === a.id && showPreview && (
              <div className="mt-4 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white">Vorschau: Top 10 Ranking</p>
                  {friendlyZoneEnabled && (
                    <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">
                      Friendly Zone aktiv (Schwelle: {friendlyZoneThreshold} DKP)
                    </span>
                  )}
                </div>
                <table className="w-full mb-4">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Rang</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Spieler</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">DKP Gebot</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">Medaillen</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">Ziel Score</th>
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
                          +{(cooldownTable[entry.rank] || 1) * 7} Tage
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
                  {confirmMutation.isPending ? "Bestätige..." : "Bestätigen & Ergebnisse publizieren"}
                </Button>
                <p className="text-xs text-gray-500 mt-2">DKP wird abgezogen, Cooldowns gesetzt und Ergebnisse öffentlich publiziert.</p>
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
    </div>
  );
}