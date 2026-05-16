import React, { useState } from "react";
import { Plus, Sparkles, AlertTriangle } from "lucide-react";

/**
 * Inline-editable preview table for event uploads.
 * Allows editing per-row: alliance, server rank (display only), groupRank (display), DKP, power, note.
 * Supports creating new alliances on-the-fly via the alliance dropdown.
 */
export default function EventUploadPreviewTable({
  rows = [],
  onChange,
  alliances = [],
  onCreateAlliance,
  isYN = false,
}) {
  const [creatingFor, setCreatingFor] = useState(null); // row index awaiting new alliance name
  const [newAllianceName, setNewAllianceName] = useState("");

  const updateRow = (idx, patch) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  };

  const handleAllianceChange = (idx, value) => {
    if (value === "__create__") {
      setCreatingFor(idx);
      setNewAllianceName("");
      return;
    }
    updateRow(idx, { alliance: value === "__none__" ? "" : value });
  };

  const submitNewAlliance = async (idx) => {
    const name = newAllianceName.trim();
    if (!name) {
      setCreatingFor(null);
      return;
    }
    if (onCreateAlliance) {
      await onCreateAlliance(name);
    }
    updateRow(idx, { alliance: name });
    setCreatingFor(null);
    setNewAllianceName("");
  };

  const allianceNames = alliances.map((a) => a.name);

  return (
    <div className="overflow-x-auto rounded-lg border border-white/5">
      <table className="w-full text-xs text-left">
        <thead className="bg-white/5 text-gray-400 uppercase tracking-wider text-[10px]">
          <tr>
            <th className="px-3 py-2">Player</th>
            <th className="px-3 py-2">Alliance</th>
            {!isYN && <th className="px-3 py-2">Server Rank</th>}
            {!isYN && <th className="px-3 py-2">Group / #</th>}
            <th className="px-3 py-2">DKP</th>
            {!isYN && <th className="px-3 py-2">Power</th>}
            {!isYN && <th className="px-3 py-2">Merits</th>}
            <th className="px-3 py-2">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row, idx) => {
            const allianceUnknown =
              row.alliance && !allianceNames.includes(row.alliance);
            const isCreating = creatingFor === idx;
            return (
              <tr key={idx} className="text-gray-200 hover:bg-white/[0.02]">
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span>{row.playerName}</span>
                    {row.isNewPlayer && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                        <Sparkles className="w-2.5 h-2.5" /> NEW
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 min-w-[180px]">
                  {isCreating ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={newAllianceName}
                        onChange={(e) => setNewAllianceName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitNewAlliance(idx);
                          if (e.key === "Escape") setCreatingFor(null);
                        }}
                        placeholder="New alliance..."
                        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white w-32"
                      />
                      <button
                        onClick={() => submitNewAlliance(idx)}
                        className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] hover:bg-emerald-500/30"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setCreatingFor(null)}
                        className="px-2 py-1 rounded bg-white/5 text-gray-400 text-[10px] hover:bg-white/10"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <select
                        value={row.alliance || "__none__"}
                        onChange={(e) => handleAllianceChange(idx, e.target.value)}
                        className={`bg-white/5 border rounded px-2 py-1 text-xs w-full ${
                          allianceUnknown
                            ? "border-yellow-500/40 text-yellow-300"
                            : "border-white/10 text-white"
                        }`}
                      >
                        <option value="__none__">— None —</option>
                        {alliances.map((a) => (
                          <option key={a.name} value={a.name}>
                            {a.name}
                          </option>
                        ))}
                        {allianceUnknown && (
                          <option value={row.alliance}>
                            {row.alliance} (unknown)
                          </option>
                        )}
                        <option value="__create__">+ Create new...</option>
                      </select>
                      {allianceUnknown && (
                        <AlertTriangle className="w-3 h-3 text-yellow-400 shrink-0" />
                      )}
                    </div>
                  )}
                </td>
                {!isYN && (
                  <td className="px-3 py-2 text-gray-400">
                    {row.serverRank ?? "—"}
                  </td>
                )}
                {!isYN && (
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                    {row.group}
                    {row.groupRank ? ` #${row.groupRank}` : ""}
                    {row.overrideApplied && (
                      <span className="ml-1 text-amber-400" title="Override">
                        ⚡
                      </span>
                    )}
                  </td>
                )}
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.dkp ?? 0}
                    onChange={(e) =>
                      updateRow(idx, { dkp: parseInt(e.target.value) || 0 })
                    }
                    className={`bg-white/5 border border-white/10 rounded px-2 py-1 text-xs w-20 text-right ${
                      row.dkp > 0
                        ? "text-emerald-400"
                        : row.dkp < 0
                        ? "text-red-400"
                        : "text-gray-400"
                    }`}
                  />
                </td>
                {!isYN && (
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.power ?? 0}
                      onChange={(e) =>
                        updateRow(idx, {
                          power: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs w-24 text-right text-gray-300"
                    />
                  </td>
                )}
                {!isYN && (
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.merits ?? 0}
                      onChange={(e) =>
                        updateRow(idx, {
                          merits: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs w-24 text-right text-gray-300"
                    />
                  </td>
                )}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.note || ""}
                    onChange={(e) => updateRow(idx, { note: e.target.value })}
                    placeholder="—"
                    className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 w-full min-w-[140px]"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}