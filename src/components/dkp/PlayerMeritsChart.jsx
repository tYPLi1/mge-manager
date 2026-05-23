import React, { useState, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const RANGE_OPTIONS = [
  { label: "4W", weeks: 4 },
  { label: "8W", weeks: 8 },
  { label: "3M", weeks: 13 },
  { label: "6M", weeks: 26 },
  { label: "All", weeks: null },
];

export default function PlayerMeritsChart({ meritsHistory, currentMerits }) {
  const { t } = useTranslation();
  const [rangeIdx, setRangeIdx] = useState(2);
  const scrollRef = useRef(null);

  const chartData = useMemo(() => {
    if (!meritsHistory.length && !currentMerits) return [];

    let data = [...meritsHistory].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

    if (data.length === 0 && currentMerits) {
      data = [{ recorded_at: new Date().toISOString().split("T")[0], merits: currentMerits }];
    }

    const range = RANGE_OPTIONS[rangeIdx];
    const cutoff = range.weeks
      ? new Date(Date.now() - range.weeks * 7 * 86400000)
      : null;

    const filtered = cutoff ? data.filter(h => new Date(h.recorded_at) >= cutoff) : data;

    return filtered.map(h => ({
      date: h.recorded_at,
      merits: h.merits,
    }));
  }, [meritsHistory, rangeIdx, currentMerits]);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
    }
  };

  const chartWidth = Math.max(chartData.length * 60, 400);
  const meritsLabel = t("playerDetail.merits") || "Contributions";

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          {t("playerDetail.meritsHistory") || "Contributions History"}
        </h3>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => setRangeIdx(i)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                i === rangeIdx
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-gray-500 hover:text-gray-300 border border-white/5 hover:border-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-8">
          {t("playerDetail.noMeritsHistory") || "No contributions history data"}
        </div>
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
            <div style={{ width: chartWidth, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
                    width={50}
                    tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                    formatter={(value) => [value?.toLocaleString(), meritsLabel]}
                    labelStyle={{ color: "#9ca3af" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="merits"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 3 }}
                    activeDot={{ r: 5, fill: "#34d399" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}