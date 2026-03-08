import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import PageHeader from "@/components/dkp/PageHeader";

export default function Power() {
  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players-power"],
    queryFn: () => base44.entities.Player.list("-power", 500),
  });

  const playersWithPower = players.filter((p) => p.power > 0);

  return (
    <div>
      <PageHeader title="Power Ranking" subtitle="Ranked by Macht (Power)" icon={Zap} />
      <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0d1117] border-b border-white/5">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Rank</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Power (Macht)</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Group</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              Array(10).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array(4).fill(0).map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-4 w-16 bg-gray-700 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : playersWithPower.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-12 text-center text-gray-500 text-sm">
                  No power data entered yet. Update player power via Admin → Players.
                </td>
              </tr>
            ) : (
              playersWithPower.map((p, i) => (
                <tr
                  key={p.id}
                  className={`hover:bg-white/[0.02] ${i < 20 ? "bg-amber-500/[0.02]" : ""}`}
                >
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        i < 3
                          ? "bg-amber-500/20 text-amber-400"
                          : i < 20
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-gray-700/50 text-gray-400"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm font-medium text-white">{p.name}</td>
                  <td className="px-3 py-2.5 text-sm font-mono text-amber-400">
                    {p.power?.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5">
                    {i < 20 ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
                        Top 20
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">Outside Top 20</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}