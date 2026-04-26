import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { X, Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { evalCompensationFormula } from "./compensationFormula";
import DiscordPreviewModal from "./DiscordPreviewModal";

const APP_URL = "https://mge002.base44.app/Results";

export default function CompensationModal({ auction, bids, results, mgeTargets, formula, onClose, onDone }) {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];

  // Available target auctions for reservation (draft + open, excluding current)
  const [reservableAuctions, setReservableAuctions] = useState([]);
  const [reservationTargetId, setReservationTargetId] = useState("");

  React.useEffect(() => {
    let mounted = true;
    adminEntities.Auction.list("-created_date", 200)
      .then((all) => {
        if (!mounted) return;
        const list = (all || [])
          .filter((a) => a.id !== auction.id && (a.status === "draft" || a.status === "open"))
          .sort((a, b) => {
            const ta = a.scheduled_open ? new Date(a.scheduled_open).getTime() : Infinity;
            const tb = b.scheduled_open ? new Date(b.scheduled_open).getTime() : Infinity;
            return ta - tb;
          });
        setReservableAuctions(list);
        if (list.length > 0) setReservationTargetId(list[0].id);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [auction.id]);

  // Map: player_id -> won rank (from AuctionResult) — null if no rank won
  const wonRankByPlayer = useMemo(() => {
    const m = {};
    results.forEach(r => { m[r.player_id] = r.rank; });
    return m;
  }, [results]);

  // Eligible = winners only (players with a rank in AuctionResult). Exclude deleted bids.
  const activeBids = useMemo(
    () => bids.filter(b => !b.is_deleted && wonRankByPlayer[b.player_id]),
    [bids, wonRankByPlayer]
  );

  // Per-row state: { [bidId]: { selected, achievedRank, reserveNext } }
  const [rowState, setRowState] = useState(() => {
    const init = {};
    activeBids.forEach(b => {
      init[b.id] = { selected: false, achievedRank: "", reserveNext: false };
    });
    return init;
  });

  const [submitting, setSubmitting] = useState(false);
  const [discordPreview, setDiscordPreview] = useState(null);

  const updateRow = (bidId, patch) => {
    setRowState(prev => ({ ...prev, [bidId]: { ...prev[bidId], ...patch } }));
  };

  const toggleAll = (checked) => {
    setRowState(prev => {
      const next = { ...prev };
      activeBids.forEach(b => { next[b.id] = { ...next[b.id], selected: checked }; });
      return next;
    });
  };

  const medalsForRank = (rank) => {
    if (!rank) return 0;
    const entry = mgeTargets[rank - 1];
    return entry?.medals || 0;
  };

  // Compute per-row enriched data
  const rows = useMemo(() => {
    return activeBids.map(b => {
      const rs = rowState[b.id] || {};
      const wonRank = wonRankByPlayer[b.player_id] || null;
      const achievedRaw = String(rs.achievedRank || "").trim();
      const achievedRank = achievedRaw ? parseInt(achievedRaw, 10) : null;
      const wonMedals = medalsForRank(wonRank);
      const achievedMedals = medalsForRank(achievedRank);
      const medalDiff = wonMedals - achievedMedals; // positive = lost medals
      const reserveNext = !!rs.reserveNext;
      // No DKP compensation if the player is being reserved for the next auction
      const compDkp = reserveNext ? 0 : (formula ? evalCompensationFormula(formula, {
        bid: b.dkp_bid || 0,
        wonRank: wonRank || 0,
        achievedRank: achievedRank || 0,
        wonMedals,
        achievedMedals,
        medalDiff,
      }) : 0);
      return {
        bid: b,
        wonRank,
        achievedRank,
        achievedRaw,
        compDkp,
        medalDiff,
        selected: !!rs.selected,
        reserveNext,
      };
    });
  }, [activeBids, rowState, wonRankByPlayer, formula]);

  const selectedRows = rows.filter(r => r.selected);
  const totalDkp = selectedRows.reduce((s, r) => s + r.compDkp, 0);
  const allSelected = activeBids.length > 0 && selectedRows.length === activeBids.length;

  const buildEmbed = () => {
    const lines = selectedRows.map(r => {
      const achievedLabel = r.achievedRank ? `#${r.achievedRank}` : t("compensation.noRank");
      const line = t("compensation.discord.lineFormat", {
        player: r.bid.player_name,
        dkp: r.compDkp,
        bid: r.bid.dkp_bid,
        achieved: achievedLabel,
      });
      const medalNote = r.medalDiff > 0 ? ` 🏅 -${r.medalDiff}` : "";
      return line + medalNote;
    });
    return {
      title: t("compensation.discord.title"),
      description: t("compensation.discord.description", { auction: auction.title }),
      color: 0xd4a859,
      url: APP_URL,
      fields: [
        { name: t("compensation.discord.fieldLabel"), value: lines.join("\n") || "-", inline: false },
        { name: "🔗 Link", value: `[View Results](${APP_URL})`, inline: false },
      ],
      footer: { text: "DKP System" },
    };
  };

  const doSubmit = async () => {
    const reservations = selectedRows.filter(r => r.reserveNext && r.wonRank && !r.achievedRank);
    setSubmitting(true);
    try {
      // 1) For DKP rows only: create DKPTransaction + update player.dkp_spent (refund)
      for (const r of selectedRows) {
        if (r.reserveNext) continue; // skip — no DKP for reserved players
        const note = t("compensation.txNote", {
          auction: auction.title,
          achieved: r.achievedRank ? `#${r.achievedRank}` : t("compensation.noRank"),
          won: r.wonRank ? `#${r.wonRank}` : t("compensation.noRank"),
        });
        await adminEntities.DKPTransaction.create({
          player_id: r.bid.player_id,
          player_name: r.bid.player_name,
          amount: r.compDkp,
          type: "compensation",
          source: "MGE",
          event_date: today,
          note,
        });
        const player = await adminEntities.Player.get(r.bid.player_id).catch(() => null);
        if (player) {
          await adminEntities.Player.update(r.bid.player_id, {
            dkp_spent: (player.dkp_spent || 0) + r.compDkp,
          });
        }
      }

      // 1b) Reserve fixed ranks in chosen target auction (draft or open)
      if (reservations.length > 0) {
        const target = reservableAuctions.find(a => a.id === reservationTargetId);
        if (!target) {
          toast.warning(t("compensation.reservationTargetUnavailable"));
        } else {
          // Re-fetch fresh to avoid overwriting concurrent edits
          const fresh = await adminEntities.Auction.get(target.id).catch(() => target);
          let existing = [];
          try { existing = JSON.parse(fresh.fixed_assignments || "[]") || []; } catch { existing = []; }
          const usedRanks = new Set(existing.map(a => Number(a.rank)));
          const usedPlayers = new Set(existing.map(a => a.player_id));
          const skipped = [];
          for (const r of reservations) {
            if (usedRanks.has(r.wonRank) || usedPlayers.has(r.bid.player_id)) {
              skipped.push(r.bid.player_name);
              continue;
            }
            existing.push({
              rank: r.wonRank,
              player_id: r.bid.player_id,
              player_name: r.bid.player_name,
              reason: `Compensation from ${auction.title}`,
            });
            usedRanks.add(r.wonRank);
            usedPlayers.add(r.bid.player_id);
          }
          existing.sort((a, b) => Number(a.rank) - Number(b.rank));
          await adminEntities.Auction.update(target.id, {
            fixed_assignments: JSON.stringify(existing),
          });
          if (skipped.length > 0) {
            toast.warning(t("compensation.reservationSkipped", { names: skipped.join(", ") }));
          }
        }
      }

      toast.success(t("compensation.successToast", { count: selectedRows.length }));
      onDone?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || t("compensation.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (selectedRows.length === 0) return;
    const hasDkpRows = selectedRows.some(r => !r.reserveNext);
    if (hasDkpRows && !formula) {
      toast.error(t("compensation.divisorMissing"));
      return;
    }
    const reservations = selectedRows.filter(r => r.reserveNext && r.wonRank && !r.achievedRank);
    if (reservations.length > 0 && !reservationTargetId) {
      toast.error(t("compensation.reservationTargetMissing"));
      return;
    }
    // Show Discord preview first — user decides whether to send DC, then we run doSubmit
    setDiscordPreview({ embed: buildEmbed() });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" /> {t("compensation.title")}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-400">{t("compensation.subtitle")}</p>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
          <p className="text-xs text-amber-300">
            ⚖ {formula ? <>Formula: <code className="font-mono">{formula}</code></> : t("compensation.divisorMissing")}
          </p>
          <p className="text-[11px] text-amber-300/70 mt-1">
            {t("compensation.reserveNextHint")}
          </p>
        </div>

        {/* Reservation target selector */}
        {reservableAuctions.length > 0 && (
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
              {t("compensation.reservationTarget")}
            </label>
            <select
              value={reservationTargetId}
              onChange={(e) => setReservationTargetId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-md px-2 py-1.5 dark-select"
            >
              {reservableAuctions.map((a) => {
                const statusLabel = t(`compensation.auctionStatus.${a.status}`);
                const opensLabel = a.scheduled_open ? ` · ${t("compensation.opensLabel")} ${new Date(a.scheduled_open).toLocaleString("en-GB", { timeZone: "UTC" })} UTC` : "";
                return (
                  <option key={a.id} value={a.id} className="bg-[#111827]">
                    {a.title} — {statusLabel}{opensLabel}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {activeBids.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">{t("compensation.noEligible")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-400 uppercase">
                    <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} className="accent-amber-500" />
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-400 uppercase">{t("compensation.columns.player")}</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-400 uppercase">{t("compensation.columns.bid")}</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-400 uppercase">{t("compensation.columns.wonRank")}</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-400 uppercase">{t("compensation.columns.achievedRank")}</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-400 uppercase">{t("compensation.columns.compensationDkp")}</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">{t("compensation.columns.medalDiff")}</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-400 uppercase">{t("compensation.columns.reserveNext")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map(r => (
                  <tr key={r.bid.id} className={r.selected ? "bg-amber-500/5" : ""}>
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={r.selected}
                        onChange={(e) => updateRow(r.bid.id, { selected: e.target.checked })}
                        className="accent-amber-500"
                      />
                    </td>
                    <td className="px-2 py-2 text-sm text-white">{r.bid.player_name}</td>
                    <td className="px-2 py-2 text-sm text-gray-300 font-mono">{r.bid.dkp_bid}</td>
                    <td className="px-2 py-2 text-xs">
                      {r.wonRank ? (
                        <span className="text-emerald-400 font-semibold">#{r.wonRank}</span>
                      ) : (
                        <span className="text-gray-500">{t("compensation.noRank")}</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={r.achievedRaw}
                        onChange={(e) => updateRow(r.bid.id, { achievedRank: e.target.value })}
                        placeholder={t("compensation.noRank")}
                        title={t("compensation.achievedHint")}
                        className="bg-white/5 border-white/10 text-white h-8 w-24 text-sm"
                      />
                    </td>
                    <td className={`px-2 py-2 text-sm font-mono font-semibold ${r.selected ? "text-amber-400" : "text-gray-500"}`}>
                      {r.reserveNext ? <span className="text-blue-400 text-xs">{t("compensation.reservedLabel")}</span> : (r.compDkp > 0 ? `+${r.compDkp}` : "—")}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-400 hidden md:table-cell">
                      {r.medalDiff > 0 ? <span className="text-orange-400">−{r.medalDiff}</span> : <span className="text-gray-600">{t("compensation.discord.noMedals")}</span>}
                    </td>
                    <td className="px-2 py-2">
                      {r.wonRank && !r.achievedRank ? (
                        <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={r.reserveNext}
                            onChange={(e) => updateRow(r.bid.id, { reserveNext: e.target.checked })}
                            className="accent-amber-500"
                          />
                          <span>#{r.wonRank}</span>
                        </label>
                      ) : (
                        <span className="text-[11px] text-gray-600" title={t("compensation.reserveNextOnlyIfNoRank")}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedRows.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-300">
            {t("compensation.summary", { count: selectedRows.length, dkp: totalDkp })}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 border-white/10 text-gray-400 hover:text-white">
            {t("compensation.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedRows.length === 0 || (selectedRows.some(r => !r.reserveNext) && !formula)}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Coins className="w-4 h-4 mr-2" />}
            {submitting ? t("compensation.submitting") : t("compensation.submit")}
          </Button>
        </div>
      </div>

      {discordPreview && (
        <DiscordPreviewModal
          embed={discordPreview.embed}
          notifType="compensation"
          onClose={() => setDiscordPreview(null)}
          onSent={() => { setDiscordPreview(null); doSubmit(); }}
        />
      )}
    </div>
  );
}