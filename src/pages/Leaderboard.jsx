import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Search, ArrowUpDown } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/dkp/StatusBadge";
import DKPValue from "@/components/dkp/DKPValue";
import PageHeader from "@/components/dkp/PageHeader";

export default function Leaderboard() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("current_dkp");
  const [sortDir, setSortDir] = useState("desc");

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("-total_dkp", 500),
  });

  const sorted = useMemo(() => {
    const withDkp = players.map((p) => ({
      ...p,
      current_dkp: (p.total_dkp || 0) - (p.dkp_spent || 0),
    }));

    const filtered = search
      ? withDkp.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()))
      : withDkp;

    return filtered.sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [players, search, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortHeader = ({ field, children, className = "" }) => (
    <th
      onClick={() => toggleSort(field)}
      className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors select-none ${className}`}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <ArrowUpDown className="w-3 h-3 text-amber-400" />
        )}
      </div>
    </th>
  );

  return (
    <div>
      <PageHeader title="DKP Leaderboard" subtitle={`${players.length} Players`} icon={Trophy}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search player..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 w-64"
          />
        </div>
      </PageHeader>

      <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0d1117] border-b border-white/5">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <SortHeader field="current_dkp">Current DKP</SortHeader>
                <SortHeader field="total_dkp" className="hidden sm:table-cell">Total Earned</SortHeader>
                <SortHeader field="dkp_spent" className="hidden sm:table-cell">DKP Spent</SortHeader>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3 py-3"><div className="h-4 w-6 bg-gray-700 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-32 bg-gray-700 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-16 bg-gray-700 rounded" /></td>
                    <td className="px-3 py-3 hidden sm:table-cell"><div className="h-4 w-16 bg-gray-700 rounded" /></td>
                    <td className="px-3 py-3 hidden sm:table-cell"><div className="h-4 w-16 bg-gray-700 rounded" /></td>
                    <td className="px-3 py-3 hidden md:table-cell"><div className="h-4 w-20 bg-gray-700 rounded" /></td>
                  </tr>
                ))
              ) : (
                sorted.map((player, idx) => (
                  <tr key={player.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-2.5 text-sm">
                      {idx < 3 ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          idx === 0 ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30" :
                          idx === 1 ? "bg-gray-400/20 text-gray-300 ring-1 ring-gray-400/30" :
                          "bg-orange-600/20 text-orange-400 ring-1 ring-orange-500/30"
                        }`}>
                          {idx + 1}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs font-mono pl-1">{idx + 1}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-sm font-medium text-white">{player.name}</td>
                    <td className="px-3 py-2.5"><DKPValue value={player.current_dkp} size="sm" /></td>
                    <td className="px-3 py-2.5 hidden sm:table-cell text-sm text-gray-400 font-mono">{player.total_dkp?.toLocaleString()}</td>
                    <td className="px-3 py-2.5 hidden sm:table-cell text-sm text-gray-400 font-mono">{player.dkp_spent?.toLocaleString()}</td>
                    <td className="px-3 py-2.5 hidden md:table-cell"><StatusBadge cooldownUntil={player.cooldown_until} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && sorted.length === 0 && (
          <div className="text-center py-12 text-gray-500">No players found</div>
        )}
      </div>
    </div>
  );
}