import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollText, ChevronRight, Medal } from "lucide-react";
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

export default function Results() {
  const [selectedAuction, setSelectedAuction] = useState(null);
  const queryClient = useQueryClient();

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ["auctions-confirmed"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPublicAuctions", {});
      const all = res.data?.auctions || [];
      return all.filter(a => a.status === "confirmed");
    },
  });

  const { data: results = [] } = useQuery({
    queryKey: ["results", selectedAuction?.id],
    queryFn: () => selectedAuction ? base44.entities.AuctionResult.filter({ auction_id: selectedAuction.id }, "rank", 10) : [],
    enabled: !!selectedAuction,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPublicSettings", {});
      return res.data?.settings || [];
    },
  });

  useEffect(() => {
    // Auction is admin-only, use polling for public pages
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["auctions-confirmed"] });
    }, 30000);
    
    const unsub = base44.entities.AuctionResult.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
    });
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [queryClient]);

  const mgeTargets = useMemo(() => {
    try {
      const raw = settings.find((s) => s.key === "mge_targets")?.value;
      return raw ? JSON.parse(raw) : DEFAULT_MGE_TARGETS;
    } catch { return DEFAULT_MGE_TARGETS; }
  }, [settings]);

  const tiebreaker = settings.find((s) => s.key === "auction_tiebreaker")?.value || "fcfs";
  const tiebreakerFallback = settings.find((s) => s.key === "auction_tiebreaker_fallback")?.value || "fcfs";

  // Detect if there are ties in this result set
  const hasTies = results.some((r, i) =>
    (i > 0 && r.dkp_bid === results[i - 1].dkp_bid) ||
    (i < results.length - 1 && r.dkp_bid === results[i + 1].dkp_bid)
  );

  const ruleLabel = (rule) => {
    if (rule === "activity") return "Activity Score";
    if (rule === "last_event_dkp") return "Last Event DKP";
    return "First Come First Served";
  };

  return (
    <div>
      <PageHeader title="Results Archive" subtitle="Past MGE auction results" icon={ScrollText} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Auction List */}
        <div className="space-y-2">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="bg-[#111827] rounded-xl border border-white/5 p-4 animate-pulse">
                <div className="h-4 w-32 bg-gray-700 rounded mb-2" />
                <div className="h-3 w-24 bg-gray-700 rounded" />
              </div>
            ))
          ) : auctions.length === 0 ? (
            <div className="bg-[#111827] rounded-xl border border-white/5 p-8 text-center">
              <p className="text-gray-500 text-sm">No confirmed auctions yet</p>
            </div>
          ) : (
            auctions.map((auction) => (
              <button
                key={auction.id}
                onClick={() => setSelectedAuction(auction)}
                className={`w-full text-left bg-[#111827] rounded-xl border p-4 transition-all ${
                  selectedAuction?.id === auction.id
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white text-sm">{auction.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {auction.confirmed_at ? new Date(auction.confirmed_at).toLocaleDateString("de-CH", { timeZone: "UTC" }) + " (UTC)" : ""}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-colors ${
                    selectedAuction?.id === auction.id ? "text-amber-400" : "text-gray-600"
                  }`} />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Results Table */}
        <div className="lg:col-span-2">
          {selectedAuction ? (
            <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <h3 className="font-semibold text-white">{selectedAuction.title}</h3>
                {hasTies && (
                  <div className="text-xs text-purple-400 mt-1 space-y-0.5">
                    <p>⚖ Tiebreaker: {ruleLabel(tiebreaker)}</p>
                    {tiebreaker !== "fcfs" && (
                      <p className="text-gray-500">↳ Fallback: {ruleLabel(tiebreakerFallback)}</p>
                    )}
                  </div>
                )}
              </div>
              <table className="w-full">
                <thead className="bg-[#0d1117]">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Rank</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">DKP Bid</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Medals</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Target Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {results.map((r, i) => {
                    const t = mgeTargets.find((m) => m.rank === r.rank);
                    const isTied = (i > 0 && r.dkp_bid === results[i - 1].dkp_bid) ||
                                   (i < results.length - 1 && r.dkp_bid === results[i + 1].dkp_bid);
                    return (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            r.rank <= 3 ? "bg-amber-500/20 text-amber-400" : "bg-gray-700/50 text-gray-400"
                          }`}>
                            {r.rank}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-sm font-medium text-white">{r.player_name}</span>
                          {r.is_friendly_zone && (
                            <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                              🤝 Friendly Zone
                            </span>
                          )}
                          {r.tiebreaker_note && (
                            <span className="ml-2 text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded px-1.5 py-0.5">
                              ⚖ {r.tiebreaker_note}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5"><DKPValue value={r.dkp_bid} size="sm" /></td>
                        <td className="px-3 py-2.5 hidden sm:table-cell">
                          <span className="flex items-center gap-1 text-sm text-gray-400">
                            <Medal className="w-3.5 h-3.5 text-amber-400" />
                            {r.hero_medals ?? t?.medals}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell text-sm text-gray-400 font-mono">
                          {(r.target_score ?? t?.target)?.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {results.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">No results found</div>
              )}
            </div>
          ) : (
            <div className="bg-[#111827] rounded-xl border border-white/5 p-12 text-center">
              <ScrollText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Select an auction to view results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}