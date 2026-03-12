import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/dkp/PageHeader";
import DKPValue from "@/components/dkp/DKPValue";

export default function Punishments() {
  const [statusFilter, setStatusFilter] = useState("active");

  const { data: penalties = [], isLoading } = useQuery({
    queryKey: ["penalties"],
    queryFn: () => base44.entities.Penalty.list("-offense_date", 200),
  });

  const queryClient = useQueryClient();
  useEffect(() => {
    const unsub = base44.entities.Penalty.subscribe(() => queryClient.invalidateQueries({ queryKey: ["penalties"] }));
    return () => unsub();
  }, [queryClient]);

  const filtered = useMemo(() => {
    if (statusFilter === "active") return penalties.filter((p) => p.status === "probation");
    if (statusFilter === "reset") return penalties.filter((p) => p.status === "reset");
    return penalties;
  }, [penalties, statusFilter]);

  return (
    <div>
      <PageHeader title="Punishment Log" subtitle={`${filtered.length} records`} icon={Shield}>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="reset">Reset Only</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0d1117] border-b border-white/5">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Level</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Offense #</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">DKP Deducted</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Reset Date</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array(8).fill(0).map((_, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-4 w-16 bg-gray-700 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5 text-sm font-medium text-white">{p.player_name}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                        p.level === 1 ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20" :
                        p.level === 2 ? "bg-orange-500/15 text-orange-400 border border-orange-500/20" :
                        "bg-red-500/15 text-red-400 border border-red-500/20"
                      }`}>
                        L{p.level}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-300 font-mono">{p.offense_count}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 font-mono hidden sm:table-cell">{p.offense_date}</td>
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      {p.dkp_deducted ? <DKPValue value={-p.dkp_deducted} size="sm" showSign /> : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {p.status === "probation" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                          Probation
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-500/15 text-gray-400 border border-gray-500/20">
                          Reset
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 font-mono hidden md:table-cell">{p.eligible_reset_date || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 hidden lg:table-cell max-w-[200px] truncate">{p.note || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">No penalties found</div>
        )}
      </div>
    </div>
  );
}