import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/dkp/PageHeader";
import PlayerDKPChart from "@/components/dkp/PlayerDKPChart";
import PlayerPowerChart from "@/components/dkp/PlayerPowerChart";
import PlayerDKPCumulativeChart from "@/components/dkp/PlayerDKPCumulativeChart";
import EmptyState from "@/components/dp/EmptyState";
import { useTranslation } from "@/lib/i18n";

export default function Charts() {
  const { t } = useTranslation();
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [search, setSearch] = useState("");

  const { data: players = [], isLoading: pLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("name", 500),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions-chart", selectedPlayerId],
    queryFn: () => base44.entities.DKPTransaction.filter({ player_id: selectedPlayerId }, "-event_date", 500),
    enabled: !!selectedPlayerId,
  });

  const { data: powerHistory = [] } = useQuery({
    queryKey: ["powerHistory-chart", selectedPlayerId],
    queryFn: () => base44.entities.PowerHistory.filter({ player_id: selectedPlayerId }, "recorded_at", 500),
    enabled: !!selectedPlayerId,
  });

  const queryClient = useQueryClient();
  useEffect(() => {
    const unsub1 = base44.entities.Player.subscribe(() => queryClient.invalidateQueries({ queryKey: ["players"] }));
    const unsub2 = base44.entities.DKPTransaction.subscribe(() => queryClient.invalidateQueries({ queryKey: ["transactions-chart"] }));
    const unsub3 = base44.entities.PowerHistory.subscribe(() => queryClient.invalidateQueries({ queryKey: ["powerHistory-chart"] }));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [queryClient]);

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const filteredPlayers = search
    ? players.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    : players;

  return (
    <div>
      <PageHeader title={t("charts.title")} subtitle={t("charts.subtitle")} icon={BarChart3} />

      {/* Player Selector */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <p className="text-sm font-medium text-gray-400">{t("charts.selectPlayer")}</p>
          {selectedPlayer && (
            <span className="text-sm text-amber-400 font-semibold">{selectedPlayer.name}</span>
          )}
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder={t("charts.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <div className="max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
          {pLoading ? (
            Array(10).fill(0).map((_, i) => (
              <div key={i} className="h-8 bg-gray-700/50 rounded animate-pulse" />
            ))
          ) : (
            filteredPlayers.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedPlayerId(p.id); setSearch(""); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left truncate transition-colors ${
                  p.id === selectedPlayerId
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-white/5"
                }`}
              >
                {p.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Charts */}
      {selectedPlayerId ? (
        <div className="space-y-6">
          <PlayerDKPChart transactions={transactions} />
          <PlayerDKPCumulativeChart transactions={transactions} />
          <PlayerPowerChart powerHistory={powerHistory} currentPower={selectedPlayer?.power} />
        </div>
      ) : (
        <EmptyState
          icon={BarChart3}
          title={t("charts.selectPlayer")}
          description={t("charts.selectPrompt")}
        />
      )}
    </div>
  );
}