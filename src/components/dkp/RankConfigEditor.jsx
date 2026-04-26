import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus } from "lucide-react";

/**
 * Tabular editor for per-rank auction configuration.
 *
 * Inputs (all JSON strings stored in AppSettings):
 *  - maxRanks (string number)              -> number of ranks (rows)
 *  - mgeTargetsJson                        -> JSON array: [{ rank, medals, target }, ...]
 *  - cooldownTableJson                     -> JSON array OR object keyed by rank: cooldown days per rank
 *  - friendlyZoneRanksJson                 -> JSON array of rank numbers flagged as FZ
 *
 * onChange callbacks emit stringified JSON for the respective key.
 */
export default function RankConfigEditor({
  maxRanks,
  mgeTargetsJson,
  cooldownTableJson,
  friendlyZoneRanksJson,
  onChangeMaxRanks,
  onChangeMgeTargets,
  onChangeCooldownTable,
  onChangeFriendlyZoneRanks,
  t,
}) {
  // Fallback labels if no `t` provided (component still works standalone)
  const tr = t || ((_k, _v) => null);
  const L = {
    maxRanks: tr("admin.auctionConfig.maxRanks") || "Max Auction Ranks",
    maxRanksDesc: tr("admin.auctionConfig.maxRanksDesc") || "Only this many ranks will be awarded in auctions.",
    rank: tr("admin.auctionConfig.cols.rank") || "Rank",
    cooldown: tr("admin.auctionConfig.cols.cooldown") || "Cooldown (days)",
    medals: tr("admin.auctionConfig.cols.medals") || "Medals",
    target: tr("admin.auctionConfig.cols.target") || "Target Score",
    fz: tr("admin.auctionConfig.cols.fz") || "Friendly Zone",
    fzHint: tr("admin.auctionConfig.fzColumnHint") || "Tick the Friendly Zone column for any rank that should be reserved for Friendly Zone bidders.",
  };
  const numRanks = useMemo(() => {
    const n = parseInt(maxRanks, 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
  }, [maxRanks]);

  // Parse MGE targets: array of {rank, medals, target}
  const targets = useMemo(() => {
    try {
      const arr = JSON.parse(mgeTargetsJson || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }, [mgeTargetsJson]);

  // Parse cooldown table — accept object (canonical) OR array form (legacy) for backwards compat.
  // Internally we use an array indexed by rank-1 for editing convenience.
  const cooldowns = useMemo(() => {
    try {
      const parsed = JSON.parse(cooldownTableJson || "{}");
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") {
        const arr = [];
        for (let i = 1; i <= numRanks; i++) {
          arr[i - 1] = parsed[i] ?? parsed[String(i)] ?? 0;
        }
        return arr;
      }
      return [];
    } catch { return []; }
  }, [cooldownTableJson, numRanks]);

  const fzRanks = useMemo(() => {
    try {
      const arr = JSON.parse(friendlyZoneRanksJson || "[]");
      return Array.isArray(arr) ? arr.map(Number) : [];
    } catch { return []; }
  }, [friendlyZoneRanksJson]);

  // Helpers to read row values
  const getMedals = (rank) => {
    const row = targets.find(r => Number(r.rank) === rank);
    return row?.medals ?? "";
  };
  const getTarget = (rank) => {
    const row = targets.find(r => Number(r.rank) === rank);
    return row?.target ?? row?.target_score ?? "";
  };
  const getCooldown = (rank) => cooldowns[rank - 1] ?? 0;
  const isFZ = (rank) => fzRanks.includes(rank);

  // Update helpers
  const updateMgeRow = (rank, field, value) => {
    const next = [...targets];
    let idx = next.findIndex(r => Number(r.rank) === rank);
    const numVal = value === "" ? "" : Number(value);
    if (idx === -1) {
      next.push({ rank, medals: 0, target: 0, [field]: numVal });
    } else {
      next[idx] = { ...next[idx], rank, [field]: numVal };
    }
    next.sort((a, b) => Number(a.rank) - Number(b.rank));
    onChangeMgeTargets(JSON.stringify(next));
  };

  const updateCooldown = (rank, value) => {
    // Save as object keyed by rank number — this is the format
    // AdminAuctions and other consumers expect (cooldownTable[rank]).
    const obj = {};
    for (let i = 1; i <= numRanks; i++) {
      if (i === rank) {
        obj[i] = value === "" ? 0 : Number(value);
      } else {
        obj[i] = cooldowns[i - 1] ?? 0;
      }
    }
    onChangeCooldownTable(JSON.stringify(obj));
  };

  const toggleFZ = (rank) => {
    const next = isFZ(rank) ? fzRanks.filter(r => r !== rank) : [...fzRanks, rank];
    next.sort((a, b) => a - b);
    onChangeFriendlyZoneRanks(JSON.stringify(next));
  };

  const incrementMaxRanks = (delta) => {
    const next = Math.max(1, Math.min(50, numRanks + delta));
    onChangeMaxRanks(String(next));
  };

  return (
    <div className="space-y-4">
      {/* Max Ranks control */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-400 uppercase tracking-wider">{L.maxRanks}</label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => incrementMaxRanks(-1)}
            className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <Input
            type="number"
            min={1}
            max={50}
            value={numRanks}
            onChange={(e) => onChangeMaxRanks(e.target.value)}
            className="w-16 h-8 text-center bg-white/5 border-white/10 text-white font-mono"
          />
          <button
            type="button"
            onClick={() => incrementMaxRanks(1)}
            className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-xs text-gray-500">{L.maxRanksDesc}</span>
      </div>

      {/* Rank Table */}
      <div className="overflow-x-auto rounded-lg border border-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-3 py-2 text-left font-medium">{L.rank}</th>
              <th className="px-3 py-2 text-left font-medium">{L.cooldown}</th>
              <th className="px-3 py-2 text-left font-medium">{L.medals}</th>
              <th className="px-3 py-2 text-left font-medium">{L.target}</th>
              <th className="px-3 py-2 text-center font-medium">{L.fz}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numRanks }, (_, i) => i + 1).map((rank) => (
              <tr key={rank} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-2">
                  <span className="font-mono font-bold text-amber-400">#{rank}</span>
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    value={getCooldown(rank)}
                    onChange={(e) => updateCooldown(rank, e.target.value)}
                    className="h-8 w-24 bg-white/5 border-white/10 text-white font-mono"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    value={getMedals(rank)}
                    onChange={(e) => updateMgeRow(rank, "medals", e.target.value)}
                    className="h-8 w-24 bg-white/5 border-white/10 text-white font-mono"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    value={getTarget(rank)}
                    onChange={(e) => updateMgeRow(rank, "target", e.target.value)}
                    className="h-8 w-32 bg-white/5 border-white/10 text-white font-mono"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <Checkbox
                    checked={isFZ(rank)}
                    onCheckedChange={() => toggleFZ(rank)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">{L.fzHint}</p>
    </div>
  );
}