import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const DEFAULT_COLOR = "#f59e0b";

function parseAlliances(json) {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter(a => a && typeof a.name === "string");
  } catch { return []; }
}

/**
 * Renders the alliance name as a colored badge.
 * Looks up the color from public app settings (cached). Falls back to amber if no color set.
 * Returns null if the player has no alliance assigned.
 *
 * Props:
 *  - alliance: string | undefined  — the alliance name on the player record
 *  - size: "sm" | "md"  — visual size (default sm)
 */
export default function AllianceBadge({ alliance, size = "sm" }) {
  const { data: publicSettings } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPublicSettings", {});
      return res.data || {};
    },
    staleTime: 60_000,
  });

  const color = useMemo(() => {
    if (!alliance) return DEFAULT_COLOR;
    const list = parseAlliances(publicSettings?.alliances);
    const match = list.find(a => a.name === alliance);
    return match?.color || DEFAULT_COLOR;
  }, [publicSettings, alliance]);

  if (!alliance) return null;

  const padding = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center rounded font-semibold ${padding}`}
      style={{
        backgroundColor: `${color}22`,
        color: color,
        border: `1px solid ${color}55`,
      }}
    >
      {alliance}
    </span>
  );
}