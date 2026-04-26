import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

  // Refs to avoid stale closures
  const formRef = useRef(form);
  const savedSnapshotRef = useRef(savedSnapshot);
  formRef.current = form;
  savedSnapshotRef.current = savedSnapshot;

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => adminEntities.AppSettings.list(),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  // Build a stable lookup map from settings: key -> id
  const settingsLookup = useMemo(() => {
    const map = {};
    settings.forEach(s => { map[s.key] = s.id; });
    return map;
  }, [settings]);
  const settingsLookupRef = useRef(settingsLookup);
  settingsLookupRef.current = settingsLookup;

  // Initialize form once from server settings. After that, the local form is
  // source-of-truth — server refetches never overwrite user edits.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    if (settings.length === 0) return;
    const snap = {};
    settings.forEach((s) => { snap[s.key] = s.value; });
    setSavedSnapshot(snap);
    setForm(snap);
    initializedRef.current = true;
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
    mutationFn: async () => {
      const currentForm = formRef.current;
      const changedKeys = getChangedKeys();
      const lookup = settingsLookupRef.current;
      for (const key of changedKeys) {
        const value = String(currentForm[key] ?? "");
        const existingId = lookup[key];
        if (existingId) {
          await adminEntities.AppSettings.update(existingId, { value });
        } else {
          await adminEntities.AppSettings.create({ key, value });
        }
      }
      return changedKeys;
    },
    onSuccess: (changedKeys) => {
      // Immediately update snapshot so dirty state clears
      const currentForm = formRef.current;
      const newSnap = { ...savedSnapshotRef.current };
      changedKeys.forEach(k => { newSnap[k] = String(currentForm[k] ?? ""); });
      setSavedSnapshot(newSnap);

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

  const handleSave = () => saveMutation.mutate();

  const handleDiscard = () => {
    setForm({ ...savedSnapshotRef.current });
    setShowUnsavedDialog(false);
    if (pendingNavigationRef.current) {
      const target = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      navigate(target);
    }
  };

  const getBool = (key) => form[key] === "true";
  const setBool = (key, val) => setForm({ ...form, [key]: val ? "true" : "false" });


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
        {/* Note about Auction Config */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <p className="text-xs text-amber-300">
            ℹ️ Auction-related settings (Friendly Zone, Tiebreaker, MGE Targets, Cooldown Table, Max Ranks)
            have moved to <span className="font-semibold">Auction Config</span>.
          </p>
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