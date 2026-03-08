import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Activity, ChevronRight, ArrowLeft } from "lucide-react";
import PageHeader from "@/components/dkp/PageHeader";
import DKPValue from "@/components/dkp/DKPValue";

export default function ActivityPage() {
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions-activity"],
    queryFn: () => base44.entities.DKPTransaction.list("-event_date", 5000),
  });

  const { data: players = [], isLoading: pLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("name", 500),
  });

  const isLoading = txLoading || pLoading;

  const playerSummary = useMemo(() => {
    const map = {};
    players.forEach((p) => {
      map[p.id] = {
        id: p.id,
        name: p.name,
        current_dkp: p.total_dkp - p.dkp_spent,
        MEE_prep: { count: 0, dkp: 0 },
        MEE_war: { count: 0, dkp: 0 },
        GEE: { count: 0, dkp: 0 },
        DDE: { count: 0, dkp: 0 },
        Wonder: { count: 0, dkp: 0 },
        Dawn: { count: 0, dkp: 0 },
        total_earn: 0,
      };
    });

    transactions
      .filter((t) => t.type === "earn")
      .forEach((t) => {
        const p = map[t.player_id];
        if (!p) return;
        let key = t.source;
        if (t.source === "MEE" && t.source_stage) key = `MEE_${t.source_stage}`;
        if (p[key] !== undefined) {
          p[key].count++;
          p[key].dkp += t.amount;
        }
        p.total_earn += t.amount;
      });

    return Object.values(map)
      .filter((p) => p.total_earn > 0)
      .sort((a, b) => b.current_dkp - a.current_dkp);
  }, [players, transactions]);

  const playerTransactions = useMemo(() => {
    if (!selectedPlayer) return [];
    return transactions
      .filter((t) => t.player_id === selectedPlayer.id)
      .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
  }, [transactions, selectedPlayer]);

  if (selectedPlayer) {
    return (
      <div>
        <PageHeader title={selectedPlayer.name} subtitle="Event history" icon={Activity}>
          <button
            onClick={() => setSelectedPlayer(null)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </PageHeader>
        <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0d1117] border-b border-white/5">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Event</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Stage</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {playerTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2 text-xs text-gray-400 font-mono">{t.event_date}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
                      {t.source}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 hidden sm:table-cell">{t.source_stage || "—"}</td>
                  <td className="px-3 py-2"><DKPValue value={t.amount} size="sm" showSign /></td>
                  <td className="px-3 py-2 text-xs text-gray-500 hidden md:table-cell">{t.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {playerTransactions.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">No transactions found</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Activity Tracker" subtitle="Per-player event participation" icon={Activity} />
      <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0d1117] border-b border-white/5">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">MEE Prep</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">MEE War</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">GEE</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">DDE</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Wonder</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Dawn</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Total DKP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array(8).fill(0).map((_, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-4 w-12 bg-gray-700 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : (
                playerSummary.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() => setSelectedPlayer(p)}
                  >
                    <td className="px-3 py-2.5 text-sm font-medium text-white">
                      <span className="flex items-center gap-1">
                        {p.name}
                        <ChevronRight className="w-3 h-3 text-gray-600" />
                      </span>
                    </td>
                    {["MEE_prep", "MEE_war", "GEE", "DDE", "Wonder", "Dawn"].map((key, ki) => (
                      <td key={key} className={`px-3 py-2.5 text-center ${ki >= 4 ? "hidden sm:table-cell" : ""}`}>
                        {p[key]?.count > 0 ? (
                          <span className="text-xs">
                            <span className="text-gray-400">{p[key].count}×</span>
                            <span className="text-amber-400 ml-1">+{p[key].dkp}</span>
                          </span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right"><DKPValue value={p.current_dkp} size="sm" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && playerSummary.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">No activity data available yet</div>
        )}
      </div>
    </div>
  );
}