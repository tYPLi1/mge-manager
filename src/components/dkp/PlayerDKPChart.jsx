import React, { useState, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";

const RANGE_OPTIONS = [
  { label: "4W", weeks: 4 },
  { label: "8W", weeks: 8 },
  { label: "3M", weeks: 13 },
  { label: "6M", weeks: 26 },
  { label: "All", weeks: null },
];

export default function PlayerDKPChart({ transactions }) {
  const [rangeIdx, setRangeIdx] = useState(2);
  const scrollRef = useRef(null);

  const chartData = useMemo(() => {
    if (!transactions.length) return [];

    const sorted = [...transactions].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    const range = RANGE_OPTIONS[rangeIdx];
    const cutoff = range.weeks
      ? new Date(Date.now() - range.weeks * 7 * 86400000)
      : null;

    const filtered = cutoff ? sorted.filter(t => new Date(t.event_date) >= cutoff) : sorted;

    // Group by date
    const byDate = {};
    filtered.forEach(t => {
      const d = t.event_date;
      if (!byDate[d]) byDate[d] = { date: d, earn: 0, loss: 0, sources: [] };
      if (t.amount >= 0) {
        byDate[d].earn += t.amount;
      } else {
        byDate[d].loss += t.amount;
      }
      byDate[d].sources.push(`${t.source}${t.source_stage ? ` (${t.source_stage})` : ""}: ${t.amount > 0 ? "+" : ""}${t.amount}`);
    });

    return Object.values(byDate).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [transactions, rangeIdx]);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
    }
  };

  const barWidth = Math.max(chartData.length * 50, 400);

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">DKP Activity</h3>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => setRangeIdx(i)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                i === rangeIdx
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
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
          <button
            onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-[#111827]/90 border border-white/10 rounded-full p-1 text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-[#111827]/90 border border-white/10 rounded-full p-1 text-gray-400 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div ref={scrollRef} className="overflow-x-auto scrollbar-thin px-6">
            <div style={{ width: barWidth, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "#1f2937" }}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#9ca3af" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const item = chartData.find(d => d.date === label);
                      return (
                        <div className="bg-[#1f2937] border border-white/10 rounded-lg p-3 text-xs">
                          <p className="text-gray-400 mb-1">{label}</p>
                          {item?.sources.map((s, i) => (
                            <p key={i} className="text-gray-300">{s}</p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="earn" stackId="a" radius={[3, 3, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="#10b981" />
                    ))}
                  </Bar>
                  <Bar dataKey="loss" stackId="a" radius={[0, 0, 3, 3]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="#ef4444" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}