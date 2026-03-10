import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings2, ChevronDown, ChevronUp, Save, Plus, Minus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/dkp/PageHeader";

function DkpRankEditor({ label, tableJson, color = "text-amber-400", onChange }) {
  const [values, setValues] = useState([]);

  useEffect(() => {
    try { setValues(JSON.parse(tableJson) || []); } catch { setValues([]); }
  }, [tableJson]);

  const update = (i, val) => {
    const next = [...values];
    next[i] = Number(val);
    setValues(next);
    onChange(JSON.stringify(next));
  };

  const addRank = () => {
    const next = [...values, 0];
    setValues(next);
    onChange(JSON.stringify(next));
  };

  const removeRank = () => {
    if (values.length === 0) return;
    const next = values.slice(0, -1);
    setValues(next);
    onChange(JSON.stringify(next));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <div className="flex gap-1">
          <button onClick={removeRank} className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center">
            <Minus className="w-3 h-3" />
          </button>
          <button onClick={addRank} className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((v, i) => (
          <div key={i} className="text-center bg-white/5 rounded px-2 py-1.5 min-w-[3.5rem]">
            <div className="text-[10px] text-gray-600 mb-1">#{i + 1}</div>
            <input
              type="number"
              value={v}
              onChange={(e) => update(i, e.target.value)}
              className={`w-12 bg-transparent border-b border-white/20 text-center font-mono font-bold text-sm focus:outline-none focus:border-amber-400 ${color}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function EventEditor({ et, onSave, isSaving }) {
  const [draft, setDraft] = useState({ ...et });

  useEffect(() => { setDraft({ ...et }); }, [et.id]);

  const set = (key, val) => setDraft((d) => ({ ...d, [key]: val }));
  const isDirty = JSON.stringify(draft) !== JSON.stringify(et);

  return (
    <div className="border-t border-white/5 p-4 space-y-5">
      {draft.participation_type === "ranked" ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label className="text-gray-500 text-xs block mb-1">Has Prep Stage</Label>
              <Switch checked={draft.has_prep_stage} onCheckedChange={(v) => set("has_prep_stage", v)} />
            </div>
            <div>
              <Label className="text-gray-500 text-xs block mb-1">Has War Stage</Label>
              <Switch checked={draft.has_war_stage} onCheckedChange={(v) => set("has_war_stage", v)} />
            </div>
            <div>
              <Label className="text-gray-500 text-xs block mb-1">Top 20 Fallback DKP</Label>
              <Input type="number" value={draft.dkp_top20_fallback ?? ""} onChange={(e) => set("dkp_top20_fallback", Number(e.target.value))} className="bg-white/5 border-white/10 text-amber-400 font-mono h-8 w-24" />
            </div>
            <div>
              <Label className="text-gray-500 text-xs block mb-1">Outside Fallback DKP</Label>
              <Input type="number" value={draft.dkp_outside_fallback ?? ""} onChange={(e) => set("dkp_outside_fallback", Number(e.target.value))} className="bg-white/5 border-white/10 text-amber-400 font-mono h-8 w-24" />
            </div>
          </div>

          {draft.has_prep_stage && (
            <DkpRankEditor
              label="Prep Stage DKP (Rang 1–N)"
              tableJson={draft.dkp_table_prep || "[]"}
              color="text-amber-400"
              onChange={(v) => set("dkp_table_prep", v)}
            />
          )}
          {draft.has_war_stage && (
            <DkpRankEditor
              label="War — Top 20 Power Players"
              tableJson={draft.dkp_table_war_top20 || "[]"}
              color="text-amber-400"
              onChange={(v) => set("dkp_table_war_top20", v)}
            />
          )}
          {draft.has_war_stage && (
            <DkpRankEditor
              label="War — Outside Top 20"
              tableJson={draft.dkp_table_war_outside || "[]"}
              color="text-blue-400"
              onChange={(v) => set("dkp_table_war_outside", v)}
            />
          )}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-gray-500 text-xs block mb-1">DKP wenn Anwesend (Y)</Label>
            <Input type="number" value={draft.dkp_yn_present ?? ""} onChange={(e) => set("dkp_yn_present", Number(e.target.value))} className="bg-white/5 border-white/10 text-emerald-400 font-mono font-bold w-28" />
          </div>
          <div>
            <Label className="text-gray-500 text-xs block mb-1">DKP wenn Abwesend (N)</Label>
            <Input type="number" value={draft.dkp_yn_absent ?? ""} onChange={(e) => set("dkp_yn_absent", Number(e.target.value))} className="bg-white/5 border-white/10 text-red-400 font-mono font-bold w-28" />
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          onClick={() => onSave(et.id, draft)}
          disabled={!isDirty || isSaving}
          className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm h-8 gap-1.5"
        >
          <Save className="w-3.5 h-3.5" /> Speichern
        </Button>
      </div>
    </div>
  );
}

export default function AdminEventConfig() {
  const [expanded, setExpanded] = useState(null);
  const queryClient = useQueryClient();

  const { data: eventTypes = [] } = useQuery({
    queryKey: ["event-types"],
    queryFn: () => base44.entities.EventType.list("sort_order", 20),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EventType.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event-types"] }),
  });

  return (
    <div>
      <PageHeader title="Event Configuration" subtitle="DKP-Regeln pro Event-Typ" icon={Settings2} />

      <div className="space-y-3">
        {eventTypes.map((et) => (
          <div key={et.id} className="bg-[#111827] rounded-xl border border-white/5">
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={et.active}
                  onCheckedChange={(v) => updateMutation.mutate({ id: et.id, data: { active: v } })}
                />
                <div>
                  <h3 className="font-semibold text-white text-sm">{et.display_name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {et.key} · {et.participation_type}
                    {et.participation_type === "ranked" && ` · Cutoff Top ${et.war_ranking_cutoff}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  et.active
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-gray-500/15 text-gray-500 border border-gray-500/20"
                }`}>
                  {et.active ? "Aktiv" : "Inaktiv"}
                </span>
                <button
                  onClick={() => setExpanded(expanded === et.id ? null : et.id)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {expanded === et.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {expanded === et.id && (
              <EventEditor
                et={et}
                onSave={(id, data) => updateMutation.mutate({ id, data })}
                isSaving={updateMutation.isPending}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}