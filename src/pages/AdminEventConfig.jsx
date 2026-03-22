import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings2, ChevronDown, ChevronUp, Save, Plus, Minus, Trash2, PlusCircle, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/dkp/PageHeader";
import UnsavedChangesGuard from "@/components/dkp/UnsavedChangesGuard";

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

function EventEditor({ draft, onChange }) {
  const set = (key, val) => onChange({ ...draft, [key]: val });

  return (
    <div className="border-t border-white/5 p-4 space-y-5">
      {/* Name & Key editing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-white/5">
        <div>
          <Label className="text-gray-500 text-xs block mb-1">Display Name</Label>
          <Input
            value={draft.display_name}
            onChange={(e) => set("display_name", e.target.value)}
            className="bg-white/5 border-white/10 text-white h-8"
          />
        </div>
        <div>
          <Label className="text-gray-500 text-xs block mb-1">Key (Short Code)</Label>
          <Input
            value={draft.key}
            onChange={(e) => set("key", e.target.value)}
            className="bg-white/5 border-white/10 text-amber-400 font-mono h-8"
          />
        </div>
      </div>

      {draft.participation_type === "ranked" ? (
        <>
          {/* Stage toggles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label className="text-gray-500 text-xs block mb-1">Has Prep Stage</Label>
              <Switch checked={draft.has_prep_stage} onCheckedChange={(v) => set("has_prep_stage", v)} />
            </div>
            <div>
              <Label className="text-gray-500 text-xs block mb-1">Has War Stage</Label>
              <Switch checked={draft.has_war_stage} onCheckedChange={(v) => set("has_war_stage", v)} />
            </div>
          </div>

          {/* ── Prep Stage Config ── */}
          {draft.has_prep_stage && (
            <div className="space-y-4 p-4 rounded-lg border border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-purple-400">Prep Stage</h4>
                <div className="flex items-center gap-2">
                  <Label className="text-gray-500 text-xs">Top 20 Split</Label>
                  <Switch checked={draft.prep_top20_enabled ?? false} onCheckedChange={(v) => set("prep_top20_enabled", v)} />
                </div>
              </div>

              {draft.prep_top20_enabled ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500 text-xs block mb-1">Top 20 Fallback DKP</Label>
                      <Input type="number" value={draft.prep_top20_fallback ?? ""} onChange={(e) => set("prep_top20_fallback", Number(e.target.value))} className="bg-white/5 border-white/10 text-amber-400 font-mono h-8 w-24" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs block mb-1">Outside Fallback DKP</Label>
                      <Input type="number" value={draft.prep_outside_fallback ?? ""} onChange={(e) => set("prep_outside_fallback", Number(e.target.value))} className="bg-white/5 border-white/10 text-amber-400 font-mono h-8 w-24" />
                    </div>
                  </div>
                  <DkpRankEditor
                    label="Prep — Top 20 Power Players"
                    tableJson={draft.dkp_table_prep_top20 || "[]"}
                    color="text-amber-400"
                    onChange={(v) => set("dkp_table_prep_top20", v)}
                  />
                  <DkpRankEditor
                    label="Prep — Outside Top 20"
                    tableJson={draft.dkp_table_prep_outside || "[]"}
                    color="text-blue-400"
                    onChange={(v) => set("dkp_table_prep_outside", v)}
                  />
                </div>
              ) : (
                <DkpRankEditor
                  label="Prep Stage DKP (Rank 1–N, alle Spieler)"
                  tableJson={draft.dkp_table_prep || "[]"}
                  color="text-amber-400"
                  onChange={(v) => set("dkp_table_prep", v)}
                />
              )}
            </div>
          )}

          {/* ── War Stage Config ── */}
          {draft.has_war_stage && (
            <div className="space-y-4 p-4 rounded-lg border border-orange-500/20 bg-orange-500/5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-orange-400">War Stage</h4>
                <div className="flex items-center gap-2">
                  <Label className="text-gray-500 text-xs">Top 20 Split</Label>
                  <Switch checked={draft.war_top20_enabled ?? true} onCheckedChange={(v) => set("war_top20_enabled", v)} />
                </div>
              </div>

              {draft.war_top20_enabled !== false ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500 text-xs block mb-1">Top 20 Fallback DKP</Label>
                      <Input type="number" value={draft.war_top20_fallback ?? draft.dkp_top20_fallback ?? ""} onChange={(e) => set("war_top20_fallback", Number(e.target.value))} className="bg-white/5 border-white/10 text-amber-400 font-mono h-8 w-24" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs block mb-1">Outside Fallback DKP</Label>
                      <Input type="number" value={draft.war_outside_fallback ?? draft.dkp_outside_fallback ?? ""} onChange={(e) => set("war_outside_fallback", Number(e.target.value))} className="bg-white/5 border-white/10 text-amber-400 font-mono h-8 w-24" />
                    </div>
                  </div>
                  <DkpRankEditor
                    label="War — Top 20 Power Players"
                    tableJson={draft.dkp_table_war_top20 || "[]"}
                    color="text-amber-400"
                    onChange={(v) => set("dkp_table_war_top20", v)}
                  />
                  <DkpRankEditor
                    label="War — Outside Top 20"
                    tableJson={draft.dkp_table_war_outside || "[]"}
                    color="text-blue-400"
                    onChange={(v) => set("dkp_table_war_outside", v)}
                  />
                </div>
              ) : (
                <DkpRankEditor
                  label="War Stage DKP (Rank 1–N, alle Spieler)"
                  tableJson={draft.dkp_table_war_top20 || "[]"}
                  color="text-orange-400"
                  onChange={(v) => set("dkp_table_war_top20", v)}
                />
              )}
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-gray-500 text-xs block mb-1">DKP if Present (Y)</Label>
            <Input type="number" value={draft.dkp_yn_present ?? ""} onChange={(e) => set("dkp_yn_present", Number(e.target.value))} className="bg-white/5 border-white/10 text-emerald-400 font-mono font-bold w-28" />
          </div>
          <div>
            <Label className="text-gray-500 text-xs block mb-1">DKP if Absent (N)</Label>
            <Input type="number" value={draft.dkp_yn_absent ?? ""} onChange={(e) => set("dkp_yn_absent", Number(e.target.value))} className="bg-white/5 border-white/10 text-red-400 font-mono font-bold w-28" />
          </div>
        </div>
      )}
    </div>
  );
}

function CreateEventModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    display_name: "",
    key: "",
    participation_type: "ranked",
    sort_order: 99,
    active: true,
    has_prep_stage: false,
    has_war_stage: true,
    top20_enabled: true,
    prep_top20_enabled: false,
    war_top20_enabled: true,
    dkp_yn_present: 5,
    dkp_yn_absent: -5,
    prep_top20_fallback: 20,
    prep_outside_fallback: 0,
    war_top20_fallback: 20,
    war_outside_fallback: 0,
    war_ranking_cutoff: 100,
    dkp_table_prep: "[]",
    dkp_table_prep_top20: "[]",
    dkp_table_prep_outside: "[]",
    dkp_table_war_top20: "[]",
    dkp_table_war_outside: "[]",
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const isYN = form.participation_type === "yn";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
          <h2 className="text-white font-bold text-lg">Create New Event</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-500 text-xs block mb-1">Display Name</Label>
              <Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} placeholder="e.g. MEE" className="bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-gray-500 text-xs block mb-1">Key (Short Code)</Label>
              <Input value={form.key} onChange={(e) => set("key", e.target.value.toUpperCase())} placeholder="e.g. MEE" className="bg-white/5 border-white/10 text-amber-400 font-mono" />
            </div>
            <div>
              <Label className="text-gray-500 text-xs block mb-1">Type</Label>
              <Select value={form.participation_type} onValueChange={(v) => set("participation_type", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ranked">Ranked (Placement)</SelectItem>
                  <SelectItem value="yn">Y/N (Attendance)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-500 text-xs block mb-1">Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>

          {/* DKP Config */}
          {isYN ? (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div>
                <Label className="text-gray-500 text-xs block mb-1">DKP if Present (Y)</Label>
                <Input type="number" value={form.dkp_yn_present} onChange={(e) => set("dkp_yn_present", Number(e.target.value))} className="bg-white/5 border-white/10 text-emerald-400 font-mono font-bold" />
              </div>
              <div>
                <Label className="text-gray-500 text-xs block mb-1">DKP if Absent (N)</Label>
                <Input type="number" value={form.dkp_yn_absent} onChange={(e) => set("dkp_yn_absent", Number(e.target.value))} className="bg-white/5 border-white/10 text-red-400 font-mono font-bold" />
              </div>
            </div>
          ) : (
            <div className="space-y-5 pt-2 border-t border-white/5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-500 text-xs block mb-1">Prep Stage</Label>
                  <Switch checked={form.has_prep_stage} onCheckedChange={(v) => set("has_prep_stage", v)} />
                </div>
                <div>
                  <Label className="text-gray-500 text-xs block mb-1">War Stage</Label>
                  <Switch checked={form.has_war_stage} onCheckedChange={(v) => set("has_war_stage", v)} />
                </div>
              </div>

              {/* Prep Stage Config */}
              {form.has_prep_stage && (
                <div className="space-y-4 p-4 rounded-lg border border-purple-500/20 bg-purple-500/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-purple-400">Prep Stage</h4>
                    <div className="flex items-center gap-2">
                      <Label className="text-gray-500 text-xs">Top 20 Split</Label>
                      <Switch checked={form.prep_top20_enabled ?? false} onCheckedChange={(v) => set("prep_top20_enabled", v)} />
                    </div>
                  </div>
                  {form.prep_top20_enabled ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-500 text-xs block mb-1">Top 20 Fallback DKP</Label>
                          <Input type="number" value={form.prep_top20_fallback ?? 20} onChange={(e) => set("prep_top20_fallback", Number(e.target.value))} className="bg-white/5 border-white/10 text-amber-400 font-mono h-8" />
                        </div>
                        <div>
                          <Label className="text-gray-500 text-xs block mb-1">Outside Fallback DKP</Label>
                          <Input type="number" value={form.prep_outside_fallback ?? 0} onChange={(e) => set("prep_outside_fallback", Number(e.target.value))} className="bg-white/5 border-white/10 text-amber-400 font-mono h-8" />
                        </div>
                      </div>
                      <DkpRankEditor label="Prep — Top 20 Power Players" tableJson={form.dkp_table_prep_top20 || "[]"} color="text-amber-400" onChange={(v) => set("dkp_table_prep_top20", v)} />
                      <DkpRankEditor label="Prep — Outside Top 20" tableJson={form.dkp_table_prep_outside || "[]"} color="text-blue-400" onChange={(v) => set("dkp_table_prep_outside", v)} />
                    </div>
                  ) : (
                    <DkpRankEditor label="Prep Stage DKP (Rank 1–N, alle Spieler)" tableJson={form.dkp_table_prep || "[]"} color="text-amber-400" onChange={(v) => set("dkp_table_prep", v)} />
                  )}
                </div>
              )}

              {/* War Stage Config */}
              {form.has_war_stage && (
                <div className="space-y-4 p-4 rounded-lg border border-orange-500/20 bg-orange-500/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-orange-400">War Stage</h4>
                    <div className="flex items-center gap-2">
                      <Label className="text-gray-500 text-xs">Top 20 Split</Label>
                      <Switch checked={form.war_top20_enabled ?? true} onCheckedChange={(v) => set("war_top20_enabled", v)} />
                    </div>
                  </div>
                  {(form.war_top20_enabled ?? true) ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-500 text-xs block mb-1">Top 20 Fallback DKP</Label>
                          <Input type="number" value={form.war_top20_fallback ?? 20} onChange={(e) => set("war_top20_fallback", Number(e.target.value))} className="bg-white/5 border-white/10 text-amber-400 font-mono h-8" />
                        </div>
                        <div>
                          <Label className="text-gray-500 text-xs block mb-1">Outside Fallback DKP</Label>
                          <Input type="number" value={form.war_outside_fallback ?? 0} onChange={(e) => set("war_outside_fallback", Number(e.target.value))} className="bg-white/5 border-white/10 text-amber-400 font-mono h-8" />
                        </div>
                      </div>
                      <DkpRankEditor label="War — Top 20 Power Players" tableJson={form.dkp_table_war_top20 || "[]"} color="text-amber-400" onChange={(v) => set("dkp_table_war_top20", v)} />
                      <DkpRankEditor label="War — Outside Top 20" tableJson={form.dkp_table_war_outside || "[]"} color="text-blue-400" onChange={(v) => set("dkp_table_war_outside", v)} />
                    </div>
                  ) : (
                    <DkpRankEditor label="War Stage DKP (Rank 1–N, alle Spieler)" tableJson={form.dkp_table_war_top20 || "[]"} color="text-orange-400" onChange={(v) => set("dkp_table_war_top20", v)} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 pt-4 border-t border-white/5">
          <Button variant="outline" onClick={onClose} className="flex-1 border-white/10 text-gray-400 hover:text-white">Cancel</Button>
          <Button
            onClick={() => onCreate(form)}
            disabled={!form.display_name || !form.key}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

// Fields to compare for dirty detection (exclude built-in fields)
const COMPARE_KEYS = [
  "display_name", "key", "participation_type", "has_prep_stage", "has_war_stage",
  "prep_top20_enabled", "war_top20_enabled",
  "dkp_table_prep", "dkp_table_prep_top20", "dkp_table_prep_outside",
  "prep_top20_fallback", "prep_outside_fallback",
  "dkp_table_war_top20", "dkp_table_war_outside",
  "war_top20_fallback", "war_outside_fallback",
  "dkp_yn_present", "dkp_yn_absent", "war_ranking_cutoff",
  "active", "sort_order",
];

function isEventDirty(draft, original) {
  return COMPARE_KEYS.some(k => JSON.stringify(draft[k] ?? "") !== JSON.stringify(original[k] ?? ""));
}

export default function AdminEventConfig() {
  const [expanded, setExpanded] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savedSnapshot, setSavedSnapshot] = useState({});
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingNavigationRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: eventTypes = [] } = useQuery({
    queryKey: ["event-types"],
    queryFn: () => base44.entities.EventType.list("sort_order", 20),
  });

  // Sync drafts from server data
  useEffect(() => {
    const draftMap = {};
    const snapMap = {};
    eventTypes.forEach(et => {
      // Only set draft if not already modified by user
      if (!drafts[et.id] || !isEventDirty(drafts[et.id], savedSnapshot[et.id] || {})) {
        draftMap[et.id] = { ...et };
      } else {
        draftMap[et.id] = drafts[et.id];
      }
      snapMap[et.id] = { ...et };
    });
    setDrafts(draftMap);
    setSavedSnapshot(snapMap);
  }, [eventTypes]);

  const updateDraft = (id, newDraft) => {
    setDrafts(prev => ({ ...prev, [id]: newDraft }));
  };

  // Get list of dirty event IDs
  const getChangedIds = useCallback(() => {
    return Object.keys(drafts).filter(id => {
      const original = savedSnapshot[id];
      if (!original) return false;
      return isEventDirty(drafts[id], original);
    });
  }, [drafts, savedSnapshot]);

  const changedIds = getChangedIds();
  const hasChanges = changedIds.length > 0;

  // Intercept in-app navigation via link clicks
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e) => {
      const anchor = e.target.closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      e.preventDefault();
      e.stopPropagation();
      pendingNavigationRef.current = href;
      setShowUnsavedDialog(true);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [hasChanges]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const ids = getChangedIds();
      for (const id of ids) {
        const data = {};
        COMPARE_KEYS.forEach(k => { data[k] = drafts[id][k]; });
        await adminEntities.EventType.update(id, data);
      }
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ["event-types"] });
      if (ids.length === 0) {
        toast.info("No changes to save.");
      } else {
        const names = ids.map(id => drafts[id]?.display_name || id);
        toast.success(`Saved ${ids.length} event${ids.length > 1 ? "s" : ""}`, {
          description: names.join(", "),
          duration: 5000,
        });
      }
      if (pendingNavigationRef.current) {
        const target = pendingNavigationRef.current;
        pendingNavigationRef.current = null;
        navigate(target);
      }
    },
  });

  const handleSave = () => saveMutation.mutate();

  const handleDiscard = () => {
    setDrafts({ ...savedSnapshot });
    setShowUnsavedDialog(false);
    if (pendingNavigationRef.current) {
      const target = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      navigate(target);
    }
  };

  // Toggle active directly updates draft (will be saved with Save All)
  const toggleActive = (id) => {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], active: !prev[id]?.active } }));
  };

  const createMutation = useMutation({
    mutationFn: (data) => adminEntities.EventType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-types"] });
      setShowCreate(false);
      toast.success("Event created");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminEntities.EventType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-types"] });
      setDeleteConfirm(null);
      toast.success("Event deleted");
    },
  });

  return (
    <div>
      <UnsavedChangesGuard
        hasChanges={hasChanges}
        onSave={() => { setShowUnsavedDialog(false); handleSave(); }}
        onDiscard={handleDiscard}
        showDialog={showUnsavedDialog}
        setShowDialog={setShowUnsavedDialog}
      />
      <PageHeader title="Event Configuration" subtitle="DKP rules per event type" icon={Settings2}>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              {changedIds.length} unsaved change{changedIds.length > 1 ? "s" : ""}
            </span>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || saveMutation.isPending} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm h-8 gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save All
          </Button>
          <Button
            onClick={() => setShowCreate(true)}
            variant="outline"
            className="border-white/10 text-gray-300 hover:bg-white/5 text-sm h-8 gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> New Event
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-3">
        {eventTypes.map((et) => {
          const draft = drafts[et.id];
          if (!draft) return null;
          const isDirty = isEventDirty(draft, savedSnapshot[et.id] || {});
          return (
            <div key={et.id} className={`bg-[#111827] rounded-xl border ${isDirty ? "border-amber-500/30" : "border-white/5"}`}>
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={draft.active}
                    onCheckedChange={() => toggleActive(et.id)}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-sm">{draft.display_name}</h3>
                      {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {draft.key} · {draft.participation_type}
                      {draft.participation_type === "ranked" && ` · Cutoff Top ${draft.war_ranking_cutoff}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    draft.active
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-gray-500/15 text-gray-500 border border-gray-500/20"
                  }`}>
                    {draft.active ? "Active" : "Inactive"}
                  </span>
                  {deleteConfirm === et.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteMutation.mutate(et.id)}
                        className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(et.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
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
                  draft={draft}
                  onChange={(newDraft) => updateDraft(et.id, newDraft)}
                />
              )}
            </div>
          );
        })}
      </div>

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreate={(data) => createMutation.mutate(data)}
        />
      )}
    </div>
  );
}