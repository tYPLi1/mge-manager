import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { X, Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

const APP_URL = "https://mge002.base44.app/Results";

function getSession() {
  try {
    const raw = localStorage.getItem("adminSession");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function CompensationModal({ auction, bids, results, mgeTargets, divisor, onClose, onDone }) {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];

  // Eligible bidders = bids that are NOT deleted (active bids only). The admin manually picks who to compensate.
  const activeBids = useMemo(() => bids.filter(b => !b.is_deleted), [bids]);

  // Map: player_id -> won rank (from AuctionResult) — null if no rank won
  const wonRankByPlayer = useMemo(() => {
    const m = {};
    results.forEach(r => { m[r.player_id] = r.rank; });
    return m;
  }, [results]);

  // Per-row state: { [bidId]: { selected, achievedRank } }
  const [rowState, setRowState] = useState(() => {
    const init = {};
    activeBids.forEach(b => {
      init[b.id] = { selected: false, achievedRank: "" };
    });
    return init;
  });

  const [submitting, setSubmitting] = useState(false);

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
      const compDkp = divisor > 0 ? Math.floor((b.dkp_bid || 0) / divisor) : 0;
      const wonMedals = medalsForRank(wonRank);
      const achievedMedals = medalsForRank(achievedRank);
      const medalDiff = wonMedals - achievedMedals; // positive = lost medals
      return {
        bid: b,
        wonRank,
        achievedRank,
        achievedRaw,
        compDkp,
        medalDiff,
        selected: !!rs.selected,
      };
    });
  }, [activeBids, rowState, wonRankByPlayer, divisor]);

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

  const handleSubmit = async () => {
    if (selectedRows.length === 0) return;
    if (!divisor || divisor <= 0) {
      toast.error(t("compensation.divisorMissing"));
      return;
    }
    setSubmitting(true);
    try {
      // 1) Create DKPTransaction (type=compensation, positive amount) + update player.dkp_spent (refund)
      for (const r of selectedRows) {
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
        // Refund: dkp_spent is stored as negative; adding positive amount reduces the spent amount
        const player = await adminEntities.Player.get(r.bid.player_id).catch(() => null);
        if (player) {
          await adminEntities.Player.update(r.bid.player_id, {
            dkp_spent: (player.dkp_spent || 0) + r.compDkp,
          });
        }
      }

      // 2) Send single Discord notification via standard pipeline (notifType=compensation)
      const session = getSession();
      if (session) {
        try {
          await base44.functions.invoke("sendDiscordEmbed", {
            session: { userId: session.userId, username: session.username, expiresAt: session.expiresAt, token: session.token },
            embed: buildEmbed(),
            notifType: "compensation",
          });
        } catch (err) {
          console.error("Discord send failed:", err);
        }
      }

      toast.success(t("compensation.successToast", { count: selectedRows.length }));
      onDone?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to award compensations");
    } finally {
      setSubmitting(false);
    }
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
            ⚖ {divisor > 0 ? t("compensation.formula", { divisor }) : t("compensation.divisorMissing")}
          </p>
        </div>

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
                    <td className="px-2 py-2 text-sm text-amber-400 font-mono font-semibold">
                      {r.selected && r.compDkp > 0 ? `+${r.compDkp}` : "—"}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-400 hidden md:table-cell">
                      {r.medalDiff > 0 ? <span className="text-orange-400">−{r.medalDiff}</span> : <span className="text-gray-600">{t("compensation.discord.noMedals")}</span>}
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
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedRows.length === 0 || !divisor}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Coins className="w-4 h-4 mr-2" />}
            {submitting ? t("compensation.submitting") : t("compensation.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}