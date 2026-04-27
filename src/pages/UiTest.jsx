import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Search, TrendingUp, Trophy, Users, Activity, ChevronUp, ChevronDown,
} from "lucide-react";

/**
 * UI/UX Test Page — applies the priority-ordered UI/UX guide:
 * accessibility (contrast, focus rings, labels), touch (44px targets),
 * responsive layout, tabular-nums, typography hierarchy.
 */
export default function UiTest() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "total_dkp", dir: "desc" });

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["ui-test-leaderboard"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPublicLeaderboard", {});
      return res?.data?.players || res?.data || [];
    },
  });

  const stats = useMemo(() => {
    const total = players.length;
    const totalDkp = players.reduce((s, p) => s + (p.total_dkp || 0), 0);
    const top = players.reduce((m, p) => Math.max(m, p.total_dkp || 0), 0);
    return { total, totalDkp, top };
  }, [players]);

  const filtered = useMemo(() => {
    let list = [...players];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => (p.name || "").toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const va = a[sort.key] ?? 0;
      const vb = b[sort.key] ?? 0;
      if (typeof va === "string") {
        return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sort.dir === "asc" ? va - vb : vb - va;
    });
    return list;
  }, [players, query, sort]);

  const toggleSort = (key) => {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .ui-test { font-family: 'Inter', system-ui, sans-serif; }
        .tabular { font-variant-numeric: tabular-nums; }
      `}</style>

      <div className="ui-test">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-3 h-11 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              aria-label="Back to leaderboard"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="text-sm font-semibold text-slate-900">UI/UX Test</div>
            <div className="w-[64px]" aria-hidden="true" />
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Hero */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900" style={{ textWrap: "balance" }}>
              Player Leaderboard
            </h1>
            <p className="mt-2 text-slate-600 text-base sm:text-lg max-w-2xl">
              A modern UI/UX preview built on accessible patterns — adequate contrast, 44px touch targets, and tabular numerals.
            </p>
          </div>

          {/* Stat cards */}
          <section
            aria-label="Summary statistics"
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
            <StatCard
              icon={<Users className="w-5 h-5" aria-hidden="true" />}
              label="Total Players"
              value={stats.total.toLocaleString()}
              tone="indigo"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" aria-hidden="true" />}
              label="Total DKP"
              value={stats.totalDkp.toLocaleString()}
              tone="emerald"
            />
            <StatCard
              icon={<Trophy className="w-5 h-5" aria-hidden="true" />}
              label="Top Player DKP"
              value={stats.top.toLocaleString()}
              tone="amber"
            />
          </section>

          {/* Search */}
          <div className="mb-4 relative">
            <label htmlFor="ui-test-search" className="sr-only">
              Search players
            </label>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="ui-test-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full h-11 pl-10 pr-3 rounded-lg bg-white border border-gray-200 text-slate-900 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent transition-colors duration-150"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {isLoading ? (
              <SkeletonRows />
            ) : filtered.length === 0 ? (
              <EmptyState query={query} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-gray-200">
                    <tr>
                      <Th className="w-12 text-center">#</Th>
                      <Th
                        sortable
                        active={sort.key === "name"}
                        dir={sort.dir}
                        onClick={() => toggleSort("name")}
                      >
                        Player
                      </Th>
                      <Th
                        sortable
                        align="right"
                        active={sort.key === "total_dkp"}
                        dir={sort.dir}
                        onClick={() => toggleSort("total_dkp")}
                      >
                        Total DKP
                      </Th>
                      <Th
                        sortable
                        align="right"
                        active={sort.key === "dkp_spent"}
                        dir={sort.dir}
                        onClick={() => toggleSort("dkp_spent")}
                        className="hidden sm:table-cell"
                      >
                        Spent
                      </Th>
                      <Th
                        sortable
                        align="right"
                        active={sort.key === "power"}
                        dir={sort.dir}
                        onClick={() => toggleSort("power")}
                        className="hidden md:table-cell"
                      >
                        Power
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <tr
                        key={p.id || p.name}
                        className="border-b border-gray-100 last:border-0 hover:bg-slate-50 transition-colors duration-150"
                      >
                        <td className="px-4 py-3 text-center text-slate-500 tabular">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={p.name} />
                            <span className="font-medium text-slate-900 truncate">
                              {p.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular">
                          {(p.total_dkp ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 tabular hidden sm:table-cell">
                          {(p.dkp_spent ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 tabular hidden md:table-cell">
                          {(p.power ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" aria-hidden="true" />
            Showing {filtered.length} of {players.length} players
          </p>
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {label}
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular truncate">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({ children, sortable, active, dir, onClick, align = "left", className = "" }) {
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  if (!sortable) {
    return (
      <th className={`px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide ${alignCls} ${className}`}>
        {children}
      </th>
    );
  }
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${alignCls} ${className}`}>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 h-8 px-1 rounded cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          active ? "text-indigo-700" : "text-slate-600 hover:text-slate-900"
        } ${align === "right" ? "ml-auto" : ""}`}
        aria-label={`Sort by ${children}`}
      >
        {children}
        {active &&
          (dir === "asc" ? (
            <ChevronUp className="w-3 h-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-3 h-3" aria-hidden="true" />
          ))}
      </button>
    </th>
  );
}

function Avatar({ name }) {
  const initials = (name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0"
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="p-4 space-y-3" aria-busy="true" aria-label="Loading players">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          <div className="flex-1 h-4 bg-slate-200 rounded animate-pulse" />
          <div className="w-20 h-4 bg-slate-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ query }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <Search className="w-5 h-5 text-slate-400" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">No players found</h3>
      <p className="text-sm text-slate-600">
        {query ? `No matches for "${query}". Try another search.` : "There are no players to display yet."}
      </p>
    </div>
  );
}