import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowUpDown } from "lucide-react";
import DKPValue from "@/components/dkp/DKPValue";
import StatusBadge from "@/components/dkp/StatusBadge";

// Event columns are now passed as props from Leaderboard page

function SortHeader({ field, sortField, sortDir, onSort, children, className = "", align = "left" }) {
  const isActive = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-2.5 py-2.5 text-${align} text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors select-none whitespace-nowrap ${className}`}
    >
      <div className={`flex items-center gap-1 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : ""}`}>
        {children}
        {isActive && <ArrowUpDown className="w-3 h-3 text-amber-400 shrink-0" />}
      </div>
    </th>
  );
}

function EventCell({ data }) {
  if (!data || data.count === 0) return <td className="px-2.5 py-2 text-center"><span className="text-gray-700">—</span></td>;
  return (
    <td className="px-2.5 py-2 text-center">
      <span className="text-xs">
        <span className="text-gray-400">{data.count}×</span>
        <span className={`ml-1 ${data.dkp >= 0 ? "text-amber-400" : "text-red-400"}`}>
          {data.dkp > 0 ? "+" : ""}{data.dkp}
        </span>
      </span>
    </td>
  );
}

export default function LeaderboardTable({ data, isLoading, sortField, sortDir, onSort, eventColumns = [] }) {
  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
      <div className="overflow-x-auto max-h-[calc(100vh-220px)]">
        <table className="w-full">
          <thead className="bg-[#0d1117] border-b border-white/5 sticky top-0 z-20">
            <tr>
              <SortHeader field="name" sortField={sortField} sortDir={sortDir} onSort={onSort} className="w-10">#</SortHeader>
              <SortHeader field="name" sortField={sortField} sortDir={sortDir} onSort={onSort} className="sticky left-0 bg-[#0d1117] z-30">Name</SortHeader>
              <SortHeader field="current_dkp" sortField={sortField} sortDir={sortDir} onSort={onSort}>DKP</SortHeader>
              <SortHeader field="total_dkp" sortField={sortField} sortDir={sortDir} onSort={onSort}>Earned</SortHeader>
              <SortHeader field="dkp_spent" sortField={sortField} sortDir={sortDir} onSort={onSort}>Spent</SortHeader>
              <SortHeader field="power" sortField={sortField} sortDir={sortDir} onSort={onSort} align="right">Power</SortHeader>
              <SortHeader field="powerRank" sortField={sortField} sortDir={sortDir} onSort={onSort} align="center">Rank</SortHeader>
              <SortHeader field="cooldown_until" sortField={sortField} sortDir={sortDir} onSort={onSort} align="center">Status</SortHeader>
              {eventColumns.map(col => (
                <SortHeader key={col.key} field={`evt_${col.key}`} sortField={sortField} sortDir={sortDir} onSort={onSort} align="center">
                  {col.label}
                </SortHeader>
              ))}
              <SortHeader field="activity_score" sortField={sortField} sortDir={sortDir} onSort={onSort} align="center">Activity</SortHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              Array(12).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array(9 + eventColumns.length).fill(0).map((_, j) => (
                    <td key={j} className="px-2.5 py-3"><div className="h-4 w-10 bg-gray-700/50 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : (
              data.map((p, idx) => (
                <tr key={p.id} className={`hover:bg-white/[0.02] transition-colors ${p.powerRank > 0 && p.powerRank <= 20 ? "bg-amber-500/[0.01]" : ""}`}>
                  <td className="px-2.5 py-2 text-sm">
                    {idx < 3 ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        idx === 0 ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30" :
                        idx === 1 ? "bg-gray-400/20 text-gray-300 ring-1 ring-gray-400/30" :
                        "bg-orange-600/20 text-orange-400 ring-1 ring-orange-500/30"
                      }`}>{idx + 1}</span>
                    ) : (
                      <span className="text-gray-500 text-xs font-mono pl-1">{idx + 1}</span>
                    )}
                  </td>
                  <td className="px-2.5 py-2 text-sm font-medium text-white sticky left-0 bg-[#111827] z-10">
                    <Link to={createPageUrl(`PlayerDetail?id=${p.id}`)} className="hover:text-amber-400 transition-colors">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-2.5 py-2"><DKPValue value={p.current_dkp} size="sm" /></td>
                  <td className="px-2.5 py-2 text-sm text-gray-400 font-mono">{(p.total_dkp || 0).toLocaleString()}</td>
                  <td className="px-2.5 py-2 text-sm text-gray-400 font-mono">{(p.dkp_spent || 0).toLocaleString()}</td>
                  <td className="px-2.5 py-2 text-right text-sm font-mono text-amber-400">
                    {p.power ? p.power.toLocaleString() : <span className="text-gray-700">—</span>}
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    {p.powerRank > 0 ? (
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                        p.powerRank <= 20 ? "bg-blue-500/15 text-blue-400" : "bg-gray-500/15 text-gray-500"
                      }`}>
                        #{p.powerRank}
                      </span>
                    ) : <span className="text-gray-700">—</span>}
                  </td>
                  <td className="px-2.5 py-2 text-center"><StatusBadge cooldownUntil={p.cooldown_until} /></td>
                  {eventColumns.map(col => (
                    <EventCell key={col.key} data={p[col.key]} />
                  ))}
                  <td className="px-2.5 py-2 text-center text-xs font-mono text-amber-400 font-medium">{(p.activity_score || 0).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!isLoading && data.length === 0 && (
        <div className="text-center py-12 text-gray-500">No players found</div>
      )}
    </div>
  );
}