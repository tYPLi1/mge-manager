import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, CheckSquare, XSquare } from "lucide-react";

export default function ImportPreview({ preview, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(new Set(preview.map((_, i) => i)));

  const toggleAll = () => {
    if (selected.size === preview.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(preview.map((_, i) => i)));
    }
  };

  const toggleItem = (idx) => {
    const newSet = new Set(selected);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setSelected(newSet);
  };

  const handleConfirm = () => {
    const items = preview.filter((_, i) => selected.has(i));
    onConfirm(items);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[#111827] rounded-xl border border-white/10 max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {preview.some(p => p.type === "new") ? "New & Updated Players" : "Import Preview"}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleAll}
              className="text-gray-400 hover:text-white"
            >
              {selected.size === preview.length ? (
                <>
                  <XSquare className="w-4 h-4 mr-1" /> Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-1" /> Select All
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {preview.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                selected.has(idx)
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(idx)}
                  onChange={() => toggleItem(idx)}
                  className="mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      item.type === "new"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}>
                      {item.type === "new" ? "NEW" : "UPDATED"}
                    </span>
                    <span className="text-white font-medium">{item.name}</span>
                  </div>

                  {item.type === "update" && item.changes && (
                    <div className="space-y-1 text-xs ml-2">
                      {Object.entries(item.changes).map(([key, { old, new: newVal }]) => {
                        const labels = { total_dkp: "DKP Earned", dkp_spent: "DKP Spent", cooldown_until: "Cooldown", power: "Power" };
                        return (
                          <div key={key} className="text-gray-400">
                            <span className="text-gray-500">{labels[key] || key}:</span>{" "}
                            <span className="text-red-400 line-through">{formatValue(old)}</span>
                            {" → "}
                            <span className="text-green-400">{formatValue(newVal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {item.type === "new" && (
                    <div className="text-xs text-gray-400 ml-2">
                      DKP Earned: {item.total_dkp || 0} | Power: {item.power || 0}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} className="border-white/10 text-gray-300">
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          >
            <Check className="w-4 h-4 mr-1" /> Accept {selected.size}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatValue(val) {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Ja" : "Nein";
  return String(val);
}