import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gavel, Save } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/dkp/PageHeader";
import RankConfigEditor from "@/components/dkp/RankConfigEditor";
import UnsavedChangesGuard from "@/components/dkp/UnsavedChangesGuard";
import { useTranslation } from "@/lib/i18n";

const SETTING_LABELS = {
  friendly_zone_enabled: "Friendly Zone Enabled",
  friendly_zone_threshold: "Friendly Zone Threshold",
  friendly_zone_ranks: "Friendly Zone Ranks",
  auction_tiebreaker: "Auction Tiebreaker",
  auction_tiebreaker_fallback: "Fallback Tiebreaker",
  last_event_dkp_sources: "Last Event DKP Sources",
  mge_targets: "MGE Targets",
  cooldown_table: "Cooldown Table",
  auction_max_ranks: "Max Auction Ranks",
  reserve_next_mge_ranks: "Reserve Next MGE Ranks",
  delayed_cooldown_start_ranks: "Delayed Cooldown Ranks",
};

// Only the keys this page manages — used to scope dirty detection / save.
const MANAGED_KEYS = Object.keys(SETTING_LABELS);

export default function AdminAuctionConfig() {
  const { t } = useTranslation();
  const [form, setForm] = useState({});
  const [savedSnapshot, setSavedSnapshot] = useState({});
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingNavigationRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const settingsLookup = useMemo(() => {
    const map = {};
    settings.forEach(s => { map[s.key] = s.id; });
    return map;
  }, [settings]);
  const settingsLookupRef = useRef(settingsLookup);
  settingsLookupRef.current = settingsLookup;

  const { data: eventTypes = [] } = useQuery({
    queryKey: ["event-types-settings"],
    queryFn: () => adminEntities.EventType.filter({ active: true }, "sort_order", 100),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  // Initialize form once with only the keys this page manages
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    if (settings.length === 0) return;
    const snap = {};
    MANAGED_KEYS.forEach(k => {
      const found = settings.find(s => s.key === k);
      snap[k] = found?.value ?? "";
    });
    setSavedSnapshot(snap);
    setForm(snap);
    initializedRef.current = true;
  }, [settings]);

  const getChangedKeys = useCallback(() => {
    return MANAGED_KEYS.filter(key => {
      const saved = savedSnapshot[key] ?? "";
      const current = form[key] ?? "";
      return String(saved) !== String(current);
    });
  }, [form, savedSnapshot]);

  const hasChanges = getChangedKeys().length > 0;

  // Intercept in-app navigation
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
      const changedKeys = MANAGED_KEYS.filter(key => {
        const saved = savedSnapshotRef.current[key] ?? "";
        const current = currentForm[key] ?? "";
        return String(saved) !== String(current);
      });
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
      const currentForm = formRef.current;
      const newSnap = { ...savedSnapshotRef.current };
      changedKeys.forEach(k => { newSnap[k] = String(currentForm[k] ?? ""); });
      setSavedSnapshot(newSnap);
      queryClient.invalidateQueries({ queryKey: ["settings"] });

      if (changedKeys.length === 0) {
        toast.info(t("admin.common.noChanges"));
      } else {
        const labels = changedKeys.map(k => SETTING_LABELS[k] || k);
        const msg = changedKeys.length > 1
          ? t("admin.common.savedToastPlural", { count: changedKeys.length })
          : t("admin.common.savedToast", { count: changedKeys.length });
        toast.success(msg, {
          description: labels.join(", "),
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

  const changedKeys = getChangedKeys();

  return (
    <div>
      <UnsavedChangesGuard
        hasChanges={hasChanges}
        onSave={() => { setShowUnsavedDialog(false); handleSave(); }}
        onDiscard={handleDiscard}
        showDialog={showUnsavedDialog}
        setShowDialog={setShowUnsavedDialog}
      />
      <PageHeader title={t("admin.auctionConfig.title")} subtitle={t("admin.auctionConfig.subtitle")} icon={Gavel}>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              {changedKeys.length > 1
                ? t("admin.common.unsavedChangesPlural", { count: changedKeys.length })
                : t("admin.common.unsavedChanges", { count: changedKeys.length })}
            </span>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || saveMutation.isPending} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
            <Save className="w-4 h-4 mr-1" /> {t("admin.common.saveAll")}
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-6">
        {/* Rank Configuration Table */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-1">{t("admin.auctionConfig.rankTable")}</h3>
          <p className="text-xs text-gray-500 mb-4">{t("admin.auctionConfig.rankTableDesc")}</p>
          <RankConfigEditor
            maxRanks={form.auction_max_ranks || "10"}
            mgeTargetsJson={form.mge_targets || "[]"}
            cooldownTableJson={form.cooldown_table || "{}"}
            friendlyZoneRanksJson={form.friendly_zone_ranks || "[]"}
            reserveNextRanksJson={form.reserve_next_mge_ranks || "[]"}
            delayedCooldownRanksJson={form.delayed_cooldown_start_ranks || "[]"}
            onChangeMaxRanks={(v) => setForm(f => ({ ...f, auction_max_ranks: v }))}
            onChangeMgeTargets={(v) => setForm(f => ({ ...f, mge_targets: v }))}
            onChangeCooldownTable={(v) => setForm(f => ({ ...f, cooldown_table: v }))}
            onChangeFriendlyZoneRanks={(v) => setForm(f => ({ ...f, friendly_zone_ranks: v }))}
            onChangeReserveNextRanks={(v) => setForm(f => ({ ...f, reserve_next_mge_ranks: v }))}
            onChangeDelayedCooldownRanks={(v) => setForm(f => ({ ...f, delayed_cooldown_start_ranks: v }))}
            t={t}
          />
        </div>

        {/* Friendly Zone */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">{t("admin.auctionConfig.fzTitle")}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">{t("admin.auctionConfig.fzEnabled")}</Label>
              <Switch checked={getBool("friendly_zone_enabled")} onCheckedChange={(v) => setBool("friendly_zone_enabled", v)} />
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">{t("admin.auctionConfig.fzThreshold")}</Label>
              <Input
                type="number"
                value={form.friendly_zone_threshold || ""}
                onChange={(e) => setForm({ ...form, friendly_zone_threshold: e.target.value })}
                className="bg-white/5 border-white/10 text-white w-32"
              />
              <p className="text-xs text-gray-500 mt-1.5">{t("admin.auctionConfig.fzThresholdDesc")}</p>
            </div>
          </div>
        </div>

        {/* Auction Tiebreaker */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">{t("admin.auctionConfig.tbTitle")}</h3>
          <p className="text-xs text-gray-500 mb-3">{t("admin.auctionConfig.tbDesc")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setForm({ ...form, auction_tiebreaker: "fcfs" })}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                (!form.auction_tiebreaker || form.auction_tiebreaker === "fcfs")
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              }`}
            >
              {t("admin.auctionConfig.tbFcfs")}
            </button>
            <button
              onClick={() => setForm({ ...form, auction_tiebreaker: "activity" })}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                form.auction_tiebreaker === "activity"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              }`}
            >
              {t("admin.auctionConfig.tbActivity")}
            </button>
            <button
              onClick={() => setForm({ ...form, auction_tiebreaker: "last_event_dkp" })}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                form.auction_tiebreaker === "last_event_dkp"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              }`}
            >
              {t("admin.auctionConfig.tbLastEvent")}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {(!form.auction_tiebreaker || form.auction_tiebreaker === "fcfs")
              ? t("admin.auctionConfig.tbExplainFcfs")
              : form.auction_tiebreaker === "activity"
              ? t("admin.auctionConfig.tbExplainActivity")
              : t("admin.auctionConfig.tbExplainLastEvent")}
          </p>

          {/* Fallback Tiebreaker */}
          {form.auction_tiebreaker && form.auction_tiebreaker !== "fcfs" && (
            <div className="mt-4 bg-white/5 rounded-lg border border-white/10 p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">{t("admin.auctionConfig.fallbackTitle")}</p>
              <p className="text-xs text-gray-500 mb-3">{t("admin.auctionConfig.fallbackDesc")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { key: "fcfs", label: t("admin.auctionConfig.tbFcfs") },
                  { key: "activity", label: t("admin.auctionConfig.tbActivity") },
                  { key: "last_event_dkp", label: t("admin.auctionConfig.tbLastEvent") },
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

          {/* Final fallback notice — always applies when primary + fallback are inconclusive */}
          {form.auction_tiebreaker && form.auction_tiebreaker !== "fcfs" && (
            <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-300 font-semibold mb-1">
                {t("admin.auctionConfig.finalFallbackTitle")}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                {t("admin.auctionConfig.finalFallbackDesc")}
              </p>
            </div>
          )}

          {/* Last Event DKP source checkboxes */}
          {(form.auction_tiebreaker === "last_event_dkp" || form.auction_tiebreaker_fallback === "last_event_dkp") && (
            <div className="mt-4 bg-white/5 rounded-lg border border-white/10 p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">{t("admin.auctionConfig.sourcesTitle")}</p>
              {eventTypes.length === 0 && (
                <p className="text-xs text-gray-500">{t("admin.auctionConfig.sourcesEmpty")}</p>
              )}
              <div className="space-y-2">
                {eventTypes.map(et => {
                  const sources = [];
                  if (et.has_prep_stage) sources.push({ key: `${et.key}_prep`, label: `${et.display_name} — ${t("admin.auctionConfig.stagePrep")}` });
                  if (et.has_war_stage) sources.push({ key: `${et.key}_war`, label: `${et.display_name} — ${t("admin.auctionConfig.stageWar")}` });
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
      </div>
    </div>
  );
}