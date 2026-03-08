import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/dkp/PageHeader";

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

  const renderDkpTable = (tableJson, label, color = "text-amber-400") => {
    if (!tableJson) return null;
    let parsed = [];
    try { parsed = JSON.parse(tableJson); } catch { return null; }
    return (
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</p>
        <div className="flex flex-wrap gap-1.5">
          {parsed.map((v, i) => (
            <div key={i} className="text-center bg-white/5 rounded px-2 py-1 min-w-[2.5rem]">
              <div className="text-[10px] text-gray-600">#{i + 1}</div>
              <div className={`text-sm font-mono font-bold ${color}`}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Event Configuration" subtitle="DKP rules per event type" icon={Settings2} />

      <div className="mb-6 bg-[#111827] rounded-xl border border-amber-500/20 p-4 text-sm text-amber-400">
        Toggle events active/inactive and view the DKP tables for each event type. To edit DKP values, contact your system administrator.
      </div>

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
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    et.active
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-gray-500/15 text-gray-500 border border-gray-500/20"
                  }`}
                >
                  {et.active ? "Active" : "Inactive"}
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
              <div className="border-t border-white/5 p-4 space-y-5">
                {et.participation_type === "ranked" ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs block mb-1">Has Prep Stage</span>
                        <span className={et.has_prep_stage ? "text-emerald-400" : "text-gray-600"}>
                          {et.has_prep_stage ? "Yes" : "No"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs block mb-1">Has War Stage</span>
                        <span className={et.has_war_stage ? "text-emerald-400" : "text-gray-600"}>
                          {et.has_war_stage ? "Yes" : "No"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs block mb-1">Top 20 Fallback DKP</span>
                        <span className="text-amber-400 font-mono">{et.dkp_top20_fallback}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs block mb-1">Outside Top 20 Fallback</span>
                        <span className="text-amber-400 font-mono">{et.dkp_outside_fallback}</span>
                      </div>
                    </div>
                    {et.has_prep_stage && renderDkpTable(et.dkp_table_prep, "Preparation Stage DKP (Ranks 1–30)")}
                    {et.has_war_stage && renderDkpTable(et.dkp_table_war_top20, "War Stage — Top 20 Power Players (Ranks 1–10)")}
                    {et.has_war_stage && renderDkpTable(et.dkp_table_war_outside, "War Stage — Outside Top 20 (Ranks 1–30)", "text-blue-400")}
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="text-gray-500 text-xs block mb-1">DKP if Present (Y)</span>
                      <span className="text-emerald-400 font-mono text-lg font-bold">+{et.dkp_yn_present}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs block mb-1">DKP if Absent (N)</span>
                      <span className="text-red-400 font-mono text-lg font-bold">{et.dkp_yn_absent}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}