import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/dkp/PageHeader";
import DKPValue from "@/components/dkp/DKPValue";

export default function Transactions() {
  const [filterPlayer, setFilterPlayer] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.DKPTransaction.list("-created_date", 2500),
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players-list"],
    queryFn: () => base44.entities.Player.list("name", 500),
  });

  const queryClient = useQueryClient();
  useEffect(() => {
    const unsub1 = base44.entities.DKPTransaction.subscribe(() => queryClient.invalidateQueries({ queryKey: ["transactions"] }));
    const unsub2 = base44.entities.Player.subscribe(() => queryClient.invalidateQueries({ queryKey: ["players-list"] }));
    return () => { unsub1(); unsub2(); };
  }, [queryClient]);

  const sources = useMemo(() => {
    const s = new Set(transactions.map((t) => t.source).filter(Boolean));
    return Array.from(s).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterPlayer !== "all" && t.player_id !== filterPlayer) return false;
      if (filterSource !== "all" && t.source !== filterSource) return false;
      if (filterType !== "all" && t.type !== filterType) return false;
      return true;
    });
  }, [transactions, filterPlayer, filterSource, filterType]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div>
      <PageHeader title="DKP Transaction Log" subtitle={`${filtered.length} transactions`} icon={History} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select value={filterPlayer} onValueChange={(v) => { setFilterPlayer(v); setPage(0); }}>
            <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white text-sm">
              <SelectValue placeholder="All Players" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all">All Players</SelectItem>
              {players.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={filterSource} onValueChange={(v) => { setFilterSource(v); setPage(0); }}>
          <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white text-sm">
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
          <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white text-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="earn">Earn</SelectItem>
            <SelectItem value="bid">Bid</SelectItem>
            <SelectItem value="penalty">Penalty</SelectItem>
            <SelectItem value="bonus">Bonus</SelectItem>
            <SelectItem value="compensation">Compensation</SelectItem>
            <SelectItem value="king_allocation">King Allocation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-[#0d1117] border-b border-white/5">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Event</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Stage</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-4 w-16 bg-gray-700 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : (
                paged.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-xs text-gray-400 font-mono">{t.event_date}</td>
                    <td className="px-3 py-2 text-sm font-medium text-white">{t.player_name}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
                        {t.source}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{t.source_stage || "—"}</td>
                    <td className="px-3 py-2"><DKPValue value={t.amount} size="sm" showSign /></td>
                    <td className="px-3 py-2 text-xs text-gray-500">{t.type}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-xs text-gray-500">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-xs rounded bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 text-xs rounded bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}