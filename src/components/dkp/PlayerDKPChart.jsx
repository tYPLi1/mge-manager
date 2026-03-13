import React, { useState, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";

const RANGE_OPTIONS = [
  { label: "4W", weeks: 4 },
  { label: "8W", weeks: 8 },
  { label: "3M", weeks: 13 },
  { label: "6M", weeks: 26 },
  { label: "All", weeks: null },
];

const LINE_COLORS = ["#f59e0b", "#f97316", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#8b5cf6", "#f43f5e", "#06b6d4"];

function getEventKey(t) {
  if (t.source_stage) return `${t.source}_${t.source_stage}`;
  return t.source;
}

export default function PlayerDKPChart({ transactions }) {
  const { data: eventTypes = [] } = useQuery({
    queryKey: ["event-types"],
    queryFn: () => base44.entities.EventType.filter({ active: true }, "sort_order", 100),
  });

  // Build dynamic event lines from EventType entity
  const eventLines = useMemo(() => {
    const lines = [];
    let colorIdx = 0;
    eventTypes.forEach(et => {
      if (et.has_prep_stage) {
        lines.push({ key: `${et.key}_prep`, label: `${et.display_name} Prep`, color: LINE_COLORS[colorIdx % LINE_COLORS.length] });
        colorIdx++;
      }
      if (et.has_war_stage) {
        lines.push({ key: `${et.key}_war`, label: `${et.display_name} War`, color: LINE_COLORS[colorIdx % LINE_COLORS.length] });
        colorIdx++;
      }
      if (!et.has_prep_stage && !et.has_war_stage) {
        lines.push({ key: et.key, label: et.display_name, color: LINE_COLORS[colorIdx % LINE_COLORS.length] });
        colorIdx++;
      }
    });
    lines.push({ key: "earn_total", label: "Total Earned", color: "#22d3ee" });
    lines.push({ key: "balance", label: "Kontostand", color: "#a78bfa" });
    return lines;
  }, [eventTypes]);

  const [rangeIdx, setRangeIdx] = useState(2);
  const [visibleLines, setVisibleLines] = useState({});
  const scrollRef = useRef(null);

  // Keep visibleLines in sync when eventLines change
  useMemo(() => {
    setVisibleLines(prev => {
      const next = {};
      eventLines.forEach(e => { next[e.key] = prev[e.key] !== undefined ? prev[e.key] : true; });
      return next;
    });
  }, [eventLines]);

  const chartData = useMemo(() => {
    if (!transactions.length || !eventLines.length) return [];

    const sorted = [...transactions].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    const range = RANGE_OPTIONS[rangeIdx];
    const cutoff = range.weeks ? new Date(Date.now() - range.weeks * 7 * 86400000) : null;
    const filtered = cutoff ? sorted.filter(t => new Date(t.event_date) >= cutoff) : sorted;

    // Group by date, accumulate per event
    const byDate = {};
    filtered.forEach(t => {
      const d = t.event_date;
      if (!byDate[d]) {
        const point = { date: d, earn_total: 0, _net: 0 };
        eventLines.forEach(e => { if (e.key !== "earn_total" && e.key !== "balance") point[e.key] = null; });
        byDate[d] = point;
      }
      const evtKey = getEventKey(t);
      if (byDate[d][evtKey] !== undefined && t.amount > 0) {
        byDate[d][evtKey] = (byDate[d][evtKey] || 0) + t.amount;
      }
      if (t.amount >= 0) {
        byDate[d].earn_total += t.amount;
      }
      byDate[d]._net += t.amount;
    });

    const dates = Object.values(byDate).sort((a, b) => new Date(a.date) - new Date(b.date));
    // Calculate cumulative balance and clean up earn_total nulls
    let runningBalance = 0;
    // Include transactions before cutoff for correct starting balance
    if (cutoff) {
      sorted.filter(t => new Date(t.event_date) < cutoff).forEach(t => { runningBalance += t.amount; });
    }
    dates.forEach(d => {
      runningBalance += d._net;
      d.balance = runningBalance;
      if (d.earn_total === 0) d.earn_total = null;
      delete d._net;
    });

    // Insert zero-points when gap between consecutive dates > 14 days
    const TWO_WEEKS = 14 * 86400000;
    const result = [];
    for (let i = 0; i < dates.length; i++) {
      if (i > 0) {
        const prev = new Date(dates[i - 1].date).getTime();
        const curr = new Date(dates[i].date).getTime();
        if (curr - prev > TWO_WEEKS) {
          // Insert a zero point one day after the last known date
          const zeroDate = new Date(prev + 86400000).toISOString().split("T")[0];
          const zeroPoint = { date: zeroDate };
          eventLines.forEach(e => { zeroPoint[e.key] = e.key === "balance" ? result[result.length - 1]?.balance ?? 0 : 0; });
          result.push(zeroPoint);
        }
      }
      result.push(dates[i]);
    }
    return result;
  }, [transactions, rangeIdx, eventLines]);

  const toggleLine = (key) => {
    setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const scroll = (dir) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  const chartWidth = Math.max(chartData.length * 60, 500);

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

      {/* Event toggle checkboxes */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
        {eventLines.map(e => (
          <label key={e.key} className="flex items-center gap-1.5 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={visibleLines[e.key]}
              onChange={() => toggleLine(e.key)}
              className="sr-only"
            />
            <span
              className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center transition-all ${
                visibleLines[e.key] ? "border-transparent" : "border-gray-600"
              }`}
              style={{ backgroundColor: visibleLines[e.key] ? e.color : "transparent" }}
            >
              {visibleLines[e.key] && (
                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className={`text-xs font-medium transition-colors ${visibleLines[e.key] ? "text-gray-200" : "text-gray-600"}`}>
              {e.label}
            </span>
          </label>
        ))}
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
            <div style={{ width: chartWidth, minHeight: 220 }}>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
                    width={40}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-[#1f2937] border border-white/10 rounded-lg p-3 text-xs">
                          <p className="text-gray-400 mb-1.5 font-medium">{label}</p>
                          {payload.filter(p => p.value > 0).map((p, i) => (
                            <div key={i} className="flex items-center gap-2 py-0.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                              <span className="text-gray-300">{p.name}:</span>
                              <span className="font-mono font-medium" style={{ color: p.color }}>{p.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {visibleLines["loss_total"] && (
                    <Bar
                      dataKey="loss_total"
                      fill="#ef4444"
                      fillOpacity={0.25}
                      stroke="#ef4444"
                      strokeOpacity={0.4}
                      name="Deductions"
                      radius={[3, 3, 0, 0]}
                    />
                  )}
                  {eventLines.filter(e => e.key !== "loss_total").map(e =>
                    visibleLines[e.key] && (
                      <Line
                        key={e.key}
                        type="monotone"
                        dataKey={e.key}
                        stroke={e.color}
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: e.color, stroke: e.color }}
                        activeDot={{ r: 4, fill: e.color }}
                        name={e.label}
                        connectNulls
                      />
                    )
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}