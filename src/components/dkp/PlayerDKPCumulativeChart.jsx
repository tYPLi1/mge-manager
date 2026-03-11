import React, { useState, useMemo, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";

const RANGE_OPTIONS = [
  { label: "4W", weeks: 4 },
  { label: "8W", weeks: 8 },
  { label: "3M", weeks: 13 },
  { label: "6M", weeks: 26 },
  { label: "All", weeks: null },
];

export default function PlayerDKPCumulativeChart({ transactions }) {
  const [rangeIdx, setRangeIdx] = useState(4);
  const scrollRef = useRef(null);

  const chartData = useMemo(() => {
    if (!transactions.length) return [];

    const sorted = [...transactions].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    const range = RANGE_OPTIONS[rangeIdx];
    const cutoff = range.weeks ? new Date(Date.now() - range.weeks * 7 * 86400000) : null;
    const filtered = cutoff ? sorted.filter(t => new Date(t.event_date) >= cutoff) : sorted;

    let cumulative = 0;
    // Calculate starting cumulative if we're filtering
    if (cutoff) {
      sorted.filter(t => new Date(t.event_date) < cutoff).forEach(t => { cumulative += t.amount; });
    }

    const byDate = {};
    filtered.forEach(t => {
      cumulative += t.amount;
      byDate[t.event_date] = cumulative;
    });

    return Object.entries(byDate).map(([date, total]) => ({ date, total }));
  }, [transactions, rangeIdx]);

  const scroll = (dir) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  const chartWidth = Math.max(chartData.length * 60, 400);

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">DKP Cumulative</h3>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => setRangeIdx(i)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                i === rangeIdx
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "text-gray-500 hover:text-gray-300 border border-white/5 hover:border-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-8">No data for this period</div>
      ) : (
        <div className="relative">
          <button onClick={() => scroll(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-[#111827]/90 border border-white/10 rounded-full p-1 text-gray-400 hover:text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-[#111827]/90 border border-white/10 rounded-full p-1 text-gray-400 hover:text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div ref={scrollRef} className="overflow-x-auto scrollbar-thin px-6">
            <div style={{ width: chartWidth, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="dkpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#1f2937" }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                    formatter={(value) => [value?.toLocaleString(), "Total DKP"]}
                    labelStyle={{ color: "#9ca3af" }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#a855f7" strokeWidth={2} fill="url(#dkpGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}