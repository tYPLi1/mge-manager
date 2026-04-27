import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const DEFAULT_COLOR = "#f59e0b";

function parseAlliances(json) {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(a => a && typeof a.name === "string")
      .map(a => ({ name: a.name, color: typeof a.color === "string" ? a.color : DEFAULT_COLOR }));
  } catch { return []; }
}

export default function AllianceConfigEditor({ value, onChange }) {
  const { t } = useTranslation();
  const alliances = useMemo(() => parseAlliances(value), [value]);

  const update = (next) => onChange(JSON.stringify(next));

  const updateAt = (idx, patch) => {
    const next = alliances.map((a, i) => (i === idx ? { ...a, ...patch } : a));
    update(next);
  };

  const remove = (idx) => update(alliances.filter((_, i) => i !== idx));

  const add = () => update([...alliances, { name: "", color: DEFAULT_COLOR }]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">{t("admin.alliances.desc")}</p>

      <div className="space-y-2">
        {alliances.length === 0 && (
          <p className="text-xs text-gray-600 italic">{t("admin.alliances.empty")}</p>
        )}
        {alliances.map((a, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={a.name}
              onChange={(e) => updateAt(idx, { name: e.target.value })}
              placeholder={t("admin.alliances.namePlaceholder")}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 flex-1"
            />
            <input
              type="color"
              value={a.color || DEFAULT_COLOR}
              onChange={(e) => updateAt(idx, { color: e.target.value })}
              className="h-9 w-12 rounded border border-white/10 bg-white/5 cursor-pointer"
              title={t("admin.alliances.colorTitle")}
            />
            <button
              onClick={() => remove(idx)}
              className="p-2 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title={t("admin.alliances.remove")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={add}
        className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
        size="sm"
      >
        <Plus className="w-4 h-4 mr-1" /> {t("admin.alliances.addButton")}
      </Button>
    </div>
  );
}