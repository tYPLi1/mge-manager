import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, ArrowLeft } from "lucide-react";
import PageHeader from "@/components/dkp/PageHeader";
import DKPValue from "@/components/dkp/DKPValue";
import StatusBadge from "@/components/dkp/StatusBadge";
import PlayerDKPChart from "@/components/dkp/PlayerDKPChart";
import PlayerPowerChart from "@/components/dkp/PlayerPowerChart";

export default function PlayerDetail() {
  const params = new URLSearchParams(window.location.search);
  const playerId = params.get("id");

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("name", 500),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", playerId],
    queryFn: () => base44.entities.DKPTransaction.filter({ player_id: playerId }, "-event_date", 500),
    enabled: !!playerId,
  });

  const { data: penalties = [] } = useQuery({
    queryKey: ["penalties-player", playerId],
    queryFn: () => base44.entities.Penalty.filter({ player_id: playerId }, "-offense_date", 50),
    enabled: !!playerId,
  });

  const { data: powerHistory = [] } = useQuery({
    queryKey: ["powerHistory", playerId],
    queryFn: () => base44.entities.PowerHistory.filter({ player_id: playerId }, "recorded_at", 500),
    enabled: !!playerId,
  });

  const { data: auctionResults = [] } = useQuery({
    queryKey: ["auctionResults-player", playerId],
    queryFn: () => base44.entities.AuctionResult.filter({ player_id: playerId }, "-created_date", 50),
    enabled: !!playerId,
  });

  if (!playerId) return <div className="text-gray-400 p-6">No player selected.</div>;
  if (isLoading) return <div className="text-gray-400 p-6 text-center">Loading...</div>;

  const player = players.find(p => p.id === playerId);
  if (!player) return <div className="text-gray-400 p-6">Player not found.</div>;

  const currentDkp = (player.total_dkp || 0) - (player.dkp_spent || 0);
  const playersWithPower = players.filter(p => p.power > 0);
  const sortedByPower = [...playersWithPower].sort((a, b) => (b.power || 0) - (a.power || 0));
  const powerRank = sortedByPower.findIndex(p => p.id === playerId) + 1;
  const isTop20 = powerRank > 0 && powerRank <= 20;

  return (
    <div>
      <div className="mb-4">
        <Link to={createPageUrl("Leaderboard")} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Leaderboard
        </Link>
      </div>

      <PageHeader title={player.name} subtitle="Player Profile" icon={Trophy} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111827] rounded-xl border border-white/5 p-4">
          <p className="text-xs text-gray-400 mb-1">Current DKP</p>
          <DKPValue value={currentDkp} size="lg" />
        </div>
        <div className="bg-[#111827] rounded-xl border border-white/5 p-4">
          <p className="text-xs text-gray-400 mb-1">Total Earned</p>
          <p className="text-lg font-bold font-mono text-white">{(player.total_dkp || 0).toLocaleString()}</p>
        </div>
        <div className="bg-[#111827] rounded-xl border border-white/5 p-4">
          <p className="text-xs text-gray-400 mb-1">DKP Spent</p>
          <p className="text-lg font-bold font-mono text-gray-400">{(player.dkp_spent || 0).toLocaleString()}</p>
        </div>
        <div className="bg-[#111827] rounded-xl border border-white/5 p-4">
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <StatusBadge cooldownUntil={player.cooldown_until} />
          {player.cooldown_until && new Date(player.cooldown_until) > new Date() && (
            <p className="text-xs text-gray-500 mt-1">Cooldown until {player.cooldown_until} (UTC)</p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#111827] rounded-xl border border-white/5 p-4">
          <p className="text-xs text-gray-400 mb-1">Power</p>
          <p className="font-mono text-white text-lg font-bold">{(player.power || 0).toLocaleString()}</p>
          {powerRank > 0 && (
            <span className={`inline-flex mt-1 px-2 py-0.5 rounded text-xs font-medium ${isTop20 ? "bg-amber-500/15 text-amber-400" : "bg-gray-500/15 text-gray-400"}`}>
              {isTop20 ? `Top 20 (#${powerRank})` : `Outside Top 20 (#${powerRank})`}
            </span>
          )}
        </div>
        <div className="bg-[#111827] rounded-xl border border-white/5 p-4">
          <p className="text-xs text-gray-400 mb-1">Auction Bans</p>
          <p className="font-mono text-white text-lg font-bold">{player.auction_ban_count || 0}</p>
        </div>
      </div>

      {/* Charts */}
      <PlayerDKPChart transactions={transactions} />
      <PlayerPowerChart powerHistory={powerHistory} currentPower={player.power} />

      {/* Transaction History */}
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Transaction History ({transactions.length})</h3>
      <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden mb-6">
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-[#0d1117] sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Source</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">DKP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2 text-xs text-gray-400">{t.event_date}</td>
                  <td className="px-3 py-2 text-sm text-white">{t.source}{t.source_stage ? ` (${t.source_stage})` : ""}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 hidden sm:table-cell">{t.type}</td>
                  <td className="px-3 py-2"><DKPValue value={t.amount} size="sm" showSign /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && <p className="text-center text-gray-500 text-sm py-6">No transactions</p>}
        </div>
      </div>

      {/* Auction History */}
      {auctionResults.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Auction History</h3>
          <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-[#0d1117]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">DKP Bid</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Target Score</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Medals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auctionResults.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-sm font-bold text-amber-400">#{r.rank}</td>
                    <td className="px-3 py-2"><DKPValue value={r.dkp_bid} size="sm" /></td>
                    <td className="px-3 py-2 text-xs text-gray-400 font-mono">{r.target_score?.toLocaleString() || "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-400">{r.hero_medals || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Penalty History */}
      {penalties.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Penalty History</h3>
          <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0d1117]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Level</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Offense #</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">DKP</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {penalties.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-xs text-gray-400">{p.offense_date}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${p.level === 1 ? "bg-yellow-500/15 text-yellow-400" : p.level === 2 ? "bg-orange-500/15 text-orange-400" : "bg-red-500/15 text-red-400"}`}>L{p.level}</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-300 font-mono">{p.offense_count}</td>
                    <td className="px-3 py-2">{p.dkp_deducted ? <DKPValue value={-p.dkp_deducted} size="sm" showSign /> : <span className="text-gray-600">—</span>}</td>
                    <td className="px-3 py-2"><span className={`text-xs px-1.5 py-0.5 rounded ${p.status === "probation" ? "bg-red-500/15 text-red-400" : "bg-gray-500/15 text-gray-400"}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}