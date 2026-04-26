import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_FORMULA, FORMULA_VARS, evalCompensationFormula } from "./compensationFormula";

const DEFAULT_CONFIG = {
  level1_offenses: [0, 5, 10, 20, 40, 80],
  level2_minimum: 50,
  compensation_formula: DEFAULT_FORMULA,
  level1_reset_days: null,
  level2_reset_days: null,
  level3_reset_days: null,
};

export default function PenaltyConfigEditor({ value, onChange }) {
  // Pure derivation from value — no local state, no effects, no sync bugs.
  const config = useMemo(() => {
    try {
      return value ? { ...DEFAULT_CONFIG, ...JSON.parse(value) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  }, [value]);

  const update = (newConfig) => {
    onChange(JSON.stringify(newConfig, null, 2));
  };

  const updateOffense = (index, val) => {
    const offenses = [...config.level1_offenses];
    offenses[index] = parseInt(val) || 0;
    update({ ...config, level1_offenses: offenses });
  };

  const addOffense = () => {
    const last = config.level1_offenses[config.level1_offenses.length - 1] || 0;
    update({ ...config, level1_offenses: [...config.level1_offenses, last * 2 || 5] });
  };

  const removeOffense = (index) => {
    const offenses = config.level1_offenses.filter((_, i) => i !== index);
    update({ ...config, level1_offenses: offenses });
  };

  return (
    <div className="space-y-7">

      {/* Level 1 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
          <h4 className="text-sm font-semibold text-yellow-400">Level 1 — DKP Deduction per Offense</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3 ml-4">
          Offense #1 = first value, Offense #2 = second value, etc.
        </p>
        <div className="flex flex-wrap gap-3 ml-4">
          {config.level1_offenses.map((val, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 min-w-[52px]">#{i + 1} Offense:</span>
              <Input
                type="number"
                min="0"
                value={val}
                onChange={(e) => updateOffense(i, e.target.value)}
                className="bg-white/5 border-white/10 text-white w-20 h-8 text-sm"
              />
              <span className="text-xs text-gray-600">DKP</span>
              {config.level1_offenses.length > 1 && (
                <button onClick={() => removeOffense(i)} className="text-gray-600 hover:text-red-400 transition-colors ml-0.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={addOffense}
            className="h-8 text-gray-400 hover:text-white border border-white/5">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Offense
          </Button>
        </div>
      </div>

      {/* Level 2 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />
          <h4 className="text-sm font-semibold text-orange-400">Level 2 — Minimum DKP Deduction</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3 ml-4">
          For stolen bid offenses. Deduction = max(stolen bid amount, minimum).
        </p>
        <div className="flex items-center gap-2 ml-4">
          <Input
            type="number"
            min="0"
            value={config.level2_minimum}
            onChange={(e) => update({ ...config, level2_minimum: parseInt(e.target.value) || 0 })}
            className="bg-white/5 border-white/10 text-white w-24"
          />
          <span className="text-xs text-gray-500">DKP minimum</span>
        </div>
      </div>

      {/* Level 3 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          <h4 className="text-sm font-semibold text-red-400">Level 3 — Critical (Fixed Behavior)</h4>
        </div>
        <div className="ml-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-xs text-red-300">
          Resets the player's total DKP to <strong>0</strong> and increments their auction ban count by 1.
          This behavior is fixed and cannot be changed.
        </div>
      </div>

      {/* Auto Reset */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
          <h4 className="text-sm font-semibold text-blue-400">Auto-Reset (Days after Offense)</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3 ml-4">
          Penalties are automatically reset after this many days. Leave empty to disable auto-reset for that level.
        </p>
        <div className="flex flex-wrap gap-5 ml-4">
          {[1, 2, 3].map((lvl) => {
            const key = `level${lvl}_reset_days`;
            const colors = { 1: "text-yellow-400", 2: "text-orange-400", 3: "text-red-400" };
            return (
              <div key={lvl} className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${colors[lvl]} min-w-[48px]`}>Level {lvl}:</span>
                <Input
                  type="number"
                  min="1"
                  placeholder="—"
                  value={config[key] ?? ""}
                  onChange={(e) => update({ ...config, [key]: e.target.value === "" ? null : parseInt(e.target.value) })}
                  className="bg-white/5 border-white/10 text-white w-20 h-8 text-sm placeholder:text-gray-600"
                />
                <span className="text-xs text-gray-500">days</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compensation Formula */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          <h4 className="text-sm font-semibold text-emerald-400">Compensation Formula</h4>
        </div>
        <p className="text-xs text-gray-500 mb-2 ml-4">
          Free-form arithmetic expression. Result is floored and clamped to ≥ 0.
        </p>
        <div className="ml-4 space-y-2">
          <Textarea
            value={config.compensation_formula ?? DEFAULT_FORMULA}
            onChange={(e) => update({ ...config, compensation_formula: e.target.value })}
            rows={2}
            placeholder={DEFAULT_FORMULA}
            className="bg-white/5 border-white/10 text-white font-mono text-sm"
          />
          <div className="text-[11px] text-gray-500 leading-relaxed">
            <div className="mb-1">Available variables:</div>
            <div className="flex flex-wrap gap-1.5">
              {FORMULA_VARS.map((v) => (
                <code key={v} className="text-amber-300 bg-amber-500/5 border border-amber-500/10 rounded px-1.5 py-0.5">{v}</code>
              ))}
              <code className="text-amber-300 bg-amber-500/5 border border-amber-500/10 rounded px-1.5 py-0.5">Math.*</code>
            </div>
            <div className="mt-2 text-gray-600">
              Examples:
              <code className="ml-1 text-gray-400">bid / 2</code>,
              <code className="ml-1 text-gray-400">bid * (medalDiff / wonMedals)</code>,
              <code className="ml-1 text-gray-400">Math.min(bid / 2, 500)</code>
            </div>
            <FormulaPreview formula={config.compensation_formula ?? DEFAULT_FORMULA} />
          </div>
        </div>
      </div>

    </div>
  );
}

function FormulaPreview({ formula }) {
  const sample = { bid: 1000, wonRank: 1, achievedRank: 3, wonMedals: 100, achievedMedals: 60, medalDiff: 40 };
  const result = evalCompensationFormula(formula, sample);
  return (
    <div className="mt-2 text-gray-500">
      Preview with sample (bid=1000, wonRank=1, achievedRank=3, wonMedals=100, achievedMedals=60, medalDiff=40):{" "}
      <span className="text-emerald-400 font-mono font-semibold">+{result} DKP</span>
    </div>
  );
}