import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/dkp/PageHeader";
import PenaltyConfigEditor from "@/components/dkp/PenaltyConfigEditor";
import AllianceConfigEditor from "@/components/dkp/AllianceConfigEditor";
import RulesMultiLangEditor from "@/components/dkp/RulesMultiLangEditor";
import DiscordNotificationPanel from "@/components/dkp/DiscordNotificationPanel";
import DiscordServerConfig from "@/components/dkp/DiscordServerConfig";
import UnsavedChangesGuard from "@/components/dkp/UnsavedChangesGuard";
import CollapsibleSection from "@/components/dkp/CollapsibleSection";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useTranslation } from "@/lib/i18n";

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
  compensation_formula_divisor: "Compensation Formula Divisor",
  alliances: "Alliances",
  event_templates_enabled: "Event Templates Page Enabled",
  event_templates_password: "Event Templates Password",
};

export default function AdminSettings() {
  const { t } = useTranslation();
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
      <PageHeader title={t("admin.settings.title")} icon={Settings}>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              {getChangedKeys().length > 1
                ? t("admin.common.unsavedChangesPlural", { count: getChangedKeys().length })
                : t("admin.common.unsavedChanges", { count: getChangedKeys().length })}
            </span>
          )}
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
            <Save className="w-4 h-4 mr-1" /> {t("admin.common.saveAll")}
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-6">
        {/* Note about Auction Config */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <p className="text-xs text-amber-300">
            ℹ️ {t("admin.settings.movedNotice")}{" "}
            <Link to={createPageUrl("AdminAuctionConfig")} className="font-semibold underline hover:text-amber-200">
              {t("admin.settings.auctionConfigLink")}
            </Link>.
          </p>
        </div>

        {/* Event Toggles */}
        <CollapsibleSection
          storageKey="settings.eventToggles"
          title={t("admin.settings.eventToggles")}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">{t("admin.settings.wonderDkp")}</Label>
              <Switch checked={getBool("wonder_dkp_enabled")} onCheckedChange={(v) => setBool("wonder_dkp_enabled", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">{t("admin.settings.dawnDkp")}</Label>
              <Switch checked={getBool("dawn_dkp_enabled")} onCheckedChange={(v) => setBool("dawn_dkp_enabled", v)} />
            </div>
          </div>
        </CollapsibleSection>

        {/* Event Templates Page (public) */}
        <CollapsibleSection
          storageKey="settings.templates"
          title={t("admin.settings.templatesTitle")}
          description={t("admin.settings.templatesDesc")}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">{t("admin.settings.templatesEnabled")}</Label>
                <p className="text-xs text-gray-500 mt-0.5">{t("admin.settings.templatesEnabledHint")}</p>
              </div>
              <Switch
                checked={getBool("event_templates_enabled")}
                onCheckedChange={(v) => setBool("event_templates_enabled", v)}
              />
            </div>
            <div>
              <Label className="text-gray-300 text-sm">{t("admin.settings.templatesPassword")}</Label>
              <p className="text-xs text-gray-500 mb-2">{t("admin.settings.templatesPasswordHint")}</p>
              <Input
                type="text"
                value={form.event_templates_password || ""}
                onChange={(e) => setForm({ ...form, event_templates_password: e.target.value })}
                placeholder={t("admin.settings.templatesPasswordPlaceholder")}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Rules Text — multi language */}
        <CollapsibleSection
          storageKey="settings.rules"
          title={t("admin.settings.rulesText")}
        >
          <RulesMultiLangEditor
            form={form}
            setForm={setForm}
            placeholder={t("admin.settings.rulesPlaceholder")}
          />
        </CollapsibleSection>

        {/* Alliances */}
        <CollapsibleSection
          storageKey="settings.alliances"
          title={t("admin.alliances.title")}
        >
          <AllianceConfigEditor
            value={form.alliances}
            onChange={(val) => setForm({ ...form, alliances: val })}
          />
        </CollapsibleSection>

        {/* Penalty Config */}
        <CollapsibleSection
          storageKey="settings.penalty"
          title={t("admin.settings.penaltyConfig")}
        >
          <PenaltyConfigEditor
            value={form.penalty_config}
            onChange={(val) => setForm({ ...form, penalty_config: val })}
          />
        </CollapsibleSection>

        {/* Discord Integration */}
        <CollapsibleSection
          storageKey="settings.discord"
          title={t("admin.settings.discordTitle")}
          description={t("admin.settings.discordDesc")}
        >
          <p className="text-xs text-gray-500 mb-4">{t("admin.settings.discordHint")}</p>
          <DiscordServerConfig
            value={form.discord_servers}
            onChange={(val) => setForm({ ...form, discord_servers: val })}
          />
        </CollapsibleSection>

        {/* Manual Message Component */}
        <CollapsibleSection
          storageKey="settings.discordNotify"
          title={t("admin.settings.discordTitle")}
          defaultOpen={false}
        >
          <DiscordNotificationPanel serversJson={form.discord_servers} />
        </CollapsibleSection>
      </div>
    </div>
  );
}