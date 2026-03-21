import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "@/components/dkp/PageHeader";
import PenaltyConfigEditor from "@/components/dkp/PenaltyConfigEditor";
import DiscordNotificationPanel from "@/components/dkp/DiscordNotificationPanel";
import DiscordServerConfig from "@/components/dkp/DiscordServerConfig";
import UnsavedChangesGuard from "@/components/dkp/UnsavedChangesGuard";
import { useNavigate } from "react-router-dom";

const SETTING_LABELS = {
  friendly_zone_enabled: "Friendly Zone Enabled",
  friendly_zone_threshold: "Friendly Zone Threshold",
  wonder_dkp_enabled: "Wonder Contest DKP",
  dawn_dkp_enabled: "Battle of Dawn DKP",
  auction_tiebreaker: "Auction Tiebreaker",
  auction_tiebreaker_fallback: "Fallback Tiebreaker",
  last_event_dkp_sources: "Last Event DKP Sources",
  mge_targets: "MGE Targets",
  rules_text: "Rules Text",
  cooldown_table: "Cooldown Table",
  penalty_config: "Penalty Configuration",
  discord_servers: "Discord Server Config",
};

export default function AdminSettings() {
  const [form, setForm] = useState({});
  const [savedSnapshot, setSavedSnapshot] = useState({});
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingNavigationRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => adminEntities.AppSettings.list(),
  });

  const { data: eventTypes = [] } = useQuery({
    queryKey: ["event-types-settings"],
    queryFn: () => adminEntities.EventType.filter({ active: true }, "sort_order", 100),
  });

  useEffect(() => {
    const map = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    setForm(map);
    setSavedSnapshot(map);
  }, [settings]);

  // Detect changed keys
  const getChangedKeys = useCallback(() => {
    return Object.keys(form).filter(key => {
      const saved = savedSnapshot[key] ?? "";
      const current = form[key] ?? "";
      return String(saved) !== String(current);
    });
  }, [form, savedSnapshot]);

  const hasChanges = getChangedKeys().length > 0;

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
    mutationFn: async (updates) => {
      const changedKeys = getChangedKeys();
      for (const key of changedKeys) {
        const value = updates[key];
        const existing = settings.find((s) => s.key === key);
        if (existing) {
          await adminEntities.AppSettings.update(existing.id, { value: String(value) });
        } else {
          await adminEntities.AppSettings.create({ key, value: String(value) });
        }
      }
      return changedKeys;
    },
    onSuccess: (changedKeys) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      if (changedKeys.length === 0) {
        toast.info("No changes to save.");
      } else {
        const labels = changedKeys.map(k => SETTING_LABELS[k] || k);
        toast.success(`Saved ${changedKeys.length} setting${changedKeys.length > 1 ? "s" : ""}`, {
          description: labels.join(", "),
          duration: 5000,
        });
      }
      // Navigate if pending
      if (pendingNavigationRef.current) {
        const target = pendingNavigationRef.current;
        pendingNavigationRef.current = null;
        navigate(target);
      }
    },
  });

  const handleSave = () => saveMutation.mutate(form);

  const handleDiscard = () => {
    setForm({ ...savedSnapshot });
    setShowUnsavedDialog(false);
    if (pendingNavigationRef.current) {
      const target = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      navigate(target);
    }
  };

  const getBool = (key) => form[key] === "true";
  const setBool = (key, val) => setForm({ ...form, [key]: val ? "true" : "false" });

  // Parse the last_event_dkp_sources JSON array from settings
  const getLastEventSources = () => {
    try {
      return form.last_event_dkp_sources ? JSON.parse(form.last_event_dkp_sources) : [];
    } catch { return []; }
  };

  const toggleLastEventSource = (sourceKey) => {
    const current = getLastEventSources();
    const updated = current.includes(sourceKey)
      ? current.filter(s => s !== sourceKey)
      : [...current, sourceKey];
    setForm({ ...form, last_event_dkp_sources: JSON.stringify(updated) });
  };





  return (
    <div>
      <UnsavedChangesGuard
        hasChanges={hasChanges}
        onSave={() => { setShowUnsavedDialog(false); handleSave(); }}
        onDiscard={handleDiscard}
        showDialog={showUnsavedDialog}
        setShowDialog={setShowUnsavedDialog}
      />
      <PageHeader title="Settings" icon={Settings}>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              {getChangedKeys().length} unsaved change{getChangedKeys().length > 1 ? "s" : ""}
            </span>
          )}
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
            <Save className="w-4 h-4 mr-1" /> Save All
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-6">
        {/* Friendly Zone */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Friendly Zone</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Enabled</Label>
              <Switch checked={getBool("friendly_zone_enabled")} onCheckedChange={(v) => setBool("friendly_zone_enabled", v)} />
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">DKP Threshold</Label>
              <Input type="number" value={form.friendly_zone_threshold || ""} onChange={(e) => setForm({ ...form, friendly_zone_threshold: e.target.value })} className="bg-white/5 border-white/10 text-white w-32" />
            </div>
          </div>
        </div>

        {/* Event Toggles */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Event DKP Toggles</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Wonder Contest DKP</Label>
              <Switch checked={getBool("wonder_dkp_enabled")} onCheckedChange={(v) => setBool("wonder_dkp_enabled", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Battle of Dawn DKP</Label>
              <Switch checked={getBool("dawn_dkp_enabled")} onCheckedChange={(v) => setBool("dawn_dkp_enabled", v)} />
            </div>
          </div>
        </div>

        {/* Auction Tiebreaker */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Auction Tiebreaker</h3>
          <p className="text-xs text-gray-500 mb-3">When two players bid the same DKP, who gets the higher rank?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setForm({ ...form, auction_tiebreaker: "fcfs" })}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                (!form.auction_tiebreaker || form.auction_tiebreaker === "fcfs")
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              }`}
            >
              ⏱ First Come First Served
            </button>
            <button
              onClick={() => setForm({ ...form, auction_tiebreaker: "activity" })}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                form.auction_tiebreaker === "activity"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              }`}
            >
              📊 Activity Score
            </button>
            <button
              onClick={() => setForm({ ...form, auction_tiebreaker: "last_event_dkp" })}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                form.auction_tiebreaker === "last_event_dkp"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              }`}
            >
              🏅 Last Event DKP
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {(!form.auction_tiebreaker || form.auction_tiebreaker === "fcfs")
              ? "The player who bids first gets the higher rank when bids are equal."
              : form.auction_tiebreaker === "activity"
              ? "The player with the higher Activity Score gets the higher rank when bids are equal."
              : "The player who earned the most DKP in the last event (from selected sources) gets the higher rank."}
          </p>

          {/* Fallback Tiebreaker */}
          {form.auction_tiebreaker && form.auction_tiebreaker !== "fcfs" && (
            <div className="mt-4 bg-white/5 rounded-lg border border-white/10 p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Fallback Tiebreaker</p>
              <p className="text-xs text-gray-500 mb-3">If the primary tiebreaker is also equal (e.g. all 0), this rule decides.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { key: "fcfs", label: "⏱ First Come First Served" },
                  { key: "activity", label: "📊 Activity Score" },
                  { key: "last_event_dkp", label: "🏅 Last Event DKP" },
                ].filter(opt => opt.key !== form.auction_tiebreaker).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setForm({ ...form, auction_tiebreaker_fallback: opt.key })}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                      (form.auction_tiebreaker_fallback || "fcfs") === opt.key
                        ? "bg-purple-500/20 border-purple-500/40 text-purple-400"
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Last Event DKP source checkboxes */}
          {(form.auction_tiebreaker === "last_event_dkp" || form.auction_tiebreaker_fallback === "last_event_dkp") && (
            <div className="mt-4 bg-white/5 rounded-lg border border-white/10 p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Which event sources count?</p>
              {eventTypes.length === 0 && (
                <p className="text-xs text-gray-500">No active events found.</p>
              )}
              <div className="space-y-2">
                {eventTypes.map(et => {
                  const sources = [];
                  if (et.has_prep_stage) sources.push({ key: `${et.key}_prep`, label: `${et.display_name} — Prep` });
                  if (et.has_war_stage) sources.push({ key: `${et.key}_war`, label: `${et.display_name} — War` });
                  if (!et.has_prep_stage && !et.has_war_stage) sources.push({ key: et.key, label: et.display_name });
                  const selected = getLastEventSources();
                  return sources.map(src => (
                    <label key={src.key} className="flex items-center gap-2.5 cursor-pointer group">
                      <Checkbox
                        checked={selected.includes(src.key)}
                        onCheckedChange={() => toggleLastEventSource(src.key)}
                      />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{src.label}</span>
                    </label>
                  ));
                })}
              </div>
            </div>
          )}
        </div>

        {/* MGE Targets */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">MGE Targets (JSON)</h3>
          <p className="text-xs text-gray-500 mb-3">rank, medals, target score per rank 1–10</p>
          <Textarea
            value={form.mge_targets || ""}
            onChange={(e) => setForm({ ...form, mge_targets: e.target.value })}
            rows={6}
            className="bg-white/5 border-white/10 text-white font-mono text-xs"
          />
        </div>

        {/* Rules Text */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Rules Text (Markdown)</h3>
          <Textarea
            value={form.rules_text || ""}
            onChange={(e) => setForm({ ...form, rules_text: e.target.value })}
            rows={10}
            placeholder="Enter guild rules in markdown format..."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 font-mono text-sm"
          />
        </div>

        {/* Cooldown Table */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Cooldown Table (Tage pro Rang)</h3>
          <p className="text-xs text-gray-500 mb-3">JSON format: Rang → Anzahl Tage Cooldown</p>
          <Textarea
            value={form.cooldown_table || ""}
            onChange={(e) => setForm({ ...form, cooldown_table: e.target.value })}
            rows={3}
            className="bg-white/5 border-white/10 text-white font-mono text-sm"
          />
        </div>

        {/* Penalty Config */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-5">Penalty Configuration</h3>
          <PenaltyConfigEditor
            value={form.penalty_config}
            onChange={(val) => setForm({ ...form, penalty_config: val })}
          />
        </div>

        {/* Discord Integration */}
         <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
           <h3 className="text-sm font-semibold text-white mb-4">Discord Bot — Server & Channels</h3>
           <p className="text-xs text-gray-500 mb-4">
             Konfiguriere mehrere Discord Server. Pro Server kannst du festlegen, welche Nachrichten in welchen Channel gesendet werden. Der Bot sendet mit @everyone und einem Link zur App.
           </p>
           <p className="text-xs text-gray-500 mb-4">
             💡 Rechtsklick auf einen Channel → "ID kopieren" (Developer Mode in Discord aktivieren)
           </p>
           <DiscordServerConfig
             value={form.discord_servers}
             onChange={(val) => setForm({ ...form, discord_servers: val })}
           />
        </div>

        {/* Manual Message Component */}
        <DiscordNotificationPanel serversJson={form.discord_servers} />
      </div>
    </div>
  );
}