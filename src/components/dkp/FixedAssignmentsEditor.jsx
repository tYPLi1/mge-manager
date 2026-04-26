import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, X, Pin } from "lucide-react";
import PlayerSearchSelect from "@/components/dkp/PlayerSearchSelect";
import { useTranslation } from "@/lib/i18n";

/**
 * Editor for pre-assigning specific ranks to specific players when
 * creating an auction. Each fixed assignment requires a reason.
 *
 * Props:
 *  - value: array of { rank, player_id, player_name, reason }
 *  - onChange: (newArray) => void
 *  - players: array of Player entities
 *  - maxRanks: total ranks available in this auction
 */
export default function FixedAssignmentsEditor({ value = [], onChange, players = [], maxRanks = 10 }) {
  const { t } = useTranslation();
  const [draftRank, setDraftRank] = useState("");
  const [draftPlayer, setDraftPlayer] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [error, setError] = useState("");

  const usedRanks = new Set(value.map(a => Number(a.rank)));
  const usedPlayerIds = new Set(value.map(a => a.player_id));

  const handleAdd = () => {
    setError("");
    const rankNum = parseInt(draftRank, 10);
    if (!rankNum || rankNum < 1 || rankNum > maxRanks) {
      setError(t("fixedRanks.errors.rankRange", { max: maxRanks }));
      return;
    }
    if (usedRanks.has(rankNum)) {
      setError(t("fixedRanks.errors.rankUsed", { rank: rankNum }));
      return;
    }
    if (!draftPlayer) {
      setError(t("fixedRanks.errors.selectPlayer"));
      return;
    }
    if (usedPlayerIds.has(draftPlayer)) {
      setError(t("fixedRanks.errors.playerUsed"));
      return;
    }
    if (!draftReason.trim()) {
      setError(t("fixedRanks.errors.reasonRequired"));
      return;
    }

    const player = players.find(p => p.id === draftPlayer);
    if (!player) { setError(t("fixedRanks.errors.playerNotFound")); return; }

    const next = [...value, {
      rank: rankNum,
      player_id: draftPlayer,
      player_name: player.name,
      reason: draftReason.trim(),
    }].sort((a, b) => Number(a.rank) - Number(b.rank));

    onChange(next);
    setDraftRank("");
    setDraftPlayer("");
    setDraftReason("");
  };

  const handleRemove = (rank) => {
    onChange(value.filter(a => Number(a.rank) !== Number(rank)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Pin className="w-4 h-4 text-amber-400" />
        <h4 className="text-sm font-semibold text-white">{t("fixedRanks.title")}</h4>
        <span className="text-xs text-gray-500">{t("fixedRanks.optional")}</span>
      </div>
      <p className="text-xs text-gray-500">
        {t("fixedRanks.description")}
      </p>

      {/* Existing assignments */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((a) => (
            <div key={a.rank} className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs shrink-0">
                #{a.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium">{a.player_name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{a.reason}</div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(a.rank)}
                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                title={t("fixedRanks.remove")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <Label className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 block">{t("fixedRanks.rank")}</Label>
            <Input
              type="number"
              min={1}
              max={maxRanks}
              value={draftRank}
              onChange={(e) => setDraftRank(e.target.value)}
              placeholder={t("fixedRanks.rankPlaceholder")}
              className="bg-white/5 border-white/10 text-white h-9"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 block">{t("fixedRanks.player")}</Label>
            <PlayerSearchSelect
              players={players.filter(p => !usedPlayerIds.has(p.id))}
              value={draftPlayer}
              onValueChange={setDraftPlayer}
              placeholder={t("fixedRanks.playerPlaceholder")}
            />
          </div>
        </div>
        <div>
          <Label className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 block">{t("fixedRanks.reason")}</Label>
          <Input
            value={draftReason}
            onChange={(e) => setDraftReason(e.target.value)}
            placeholder={t("fixedRanks.reasonPlaceholder")}
            className="bg-white/5 border-white/10 text-white h-9"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> {t("fixedRanks.addButton")}
        </Button>
      </div>
    </div>
  );
}