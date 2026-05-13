import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { base44 } from "@/api/base44Client";
import { Download, Lock, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/dkp/PageHeader";
import { useTranslation } from "@/lib/i18n";

function parseAlliances(json) {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter(a => a && typeof a.name === "string" && a.name.trim()).map(a => ({
      name: a.name,
      color: typeof a.color === "string" ? a.color : "#f59e0b",
    }));
  } catch { return []; }
}

export default function EventTemplates() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");
  const [enabledChecked, setEnabledChecked] = useState(false);
  const [pageEnabled, setPageEnabled] = useState(false);

  // After successful auth
  const [players, setPlayers] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [alliances, setAlliances] = useState([]);

  // Template selection state
  const [eventTypeId, setEventTypeId] = useState(undefined);
  const [templateAlliance, setTemplateAlliance] = useState("__all__");
  const [sortByPower, setSortByPower] = useState(true);
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);

  // Check whether the page is enabled (public setting)
  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("getPublicSettings", {});
        const settings = res?.data?.settings || [];
        const enabled = settings.find(s => s.key === "event_templates_enabled")?.value === "true";
        setPageEnabled(enabled);
      } catch (_) {
        setPageEnabled(false);
      } finally {
        setEnabledChecked(true);
      }
    })();
  }, []);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!password) return;
    setAuthenticating(true);
    setAuthError("");
    try {
      const res = await base44.functions.invoke("getTemplateData", { password });
      const data = res?.data;
      if (data?.success) {
        setPlayers(data.players || []);
        setEventTypes(data.eventTypes || []);
        setAlliances(parseAlliances(data.alliances));
      } else {
        setAuthError(t("eventTemplates.invalidPassword"));
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) setAuthError(t("eventTemplates.invalidPassword"));
      else if (status === 403) setAuthError(t("eventTemplates.disabledOrNotConfigured"));
      else setAuthError(t("eventTemplates.loginFailed"));
    } finally {
      setAuthenticating(false);
    }
  };

  const isAuthenticated = players.length > 0 || eventTypes.length > 0;
  const selectedEventType = eventTypes.find(e => e.id === eventTypeId);
  const isYN = selectedEventType?.participation_type === "yn";
  const hasMultipleStages = selectedEventType?.has_prep_stage && selectedEventType?.has_war_stage;

  const allianceOptions = [...alliances].map(a => a.name).sort((a, b) => a.localeCompare(b));

  const downloadTemplate = () => {
    if (!selectedEventType) return;

    let playerRows = players
      .filter(p => p && p.name)
      .filter(p => {
        if (templateAlliance === "__all__") return true;
        return (p.alliance || "") === templateAlliance;
      })
      .map(p => ({ name: p.name, alliance: p.alliance || "", power: p.power || 0 }));

    if (templateAlliance === "__all__") {
      playerRows.sort((a, b) => {
        const allianceCmp = (a.alliance || "zzz").localeCompare(b.alliance || "zzz");
        if (allianceCmp !== 0) return allianceCmp;
        if (sortByPower) return (b.power || 0) - (a.power || 0);
        return a.name.localeCompare(b.name);
      });
    } else if (sortByPower) {
      playerRows.sort((a, b) => (b.power || 0) - (a.power || 0));
    } else {
      playerRows.sort((a, b) => a.name.localeCompare(b.name));
    }

    const wb = XLSX.utils.book_new();

    if (isYN) {
      const data = [
        ["Name", "Alliance", "Participated (Y/N)", "Note"],
        ...playerRows.map(p => [p.name, p.alliance, "Y", ""]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), selectedEventType.key);
    } else if (hasMultipleStages) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ["Name", "Alliance", "Server Rank", "Note"],
          ...playerRows.map(p => [p.name, p.alliance, "", ""]),
        ]),
        "Preparation"
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ["Name", "Alliance", "Server Rank", "Power", "Note"],
          ...playerRows.map(p => [p.name, p.alliance, "", p.power || "", ""]),
        ]),
        "War Stage"
      );
    } else {
      const data = [
        ["Name", "Alliance", "Server Rank", "Power", "Note"],
        ...playerRows.map(p => [p.name, p.alliance, "", p.power || "", ""]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), selectedEventType.key);
    }

    const allianceSuffix = templateAlliance === "__all__" ? "ALL" : templateAlliance.replace(/[^a-z0-9]/gi, "_");
    XLSX.writeFile(wb, `Template_${selectedEventType.key}_${allianceSuffix}_${eventDate}.xlsx`);
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (!enabledChecked) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!pageEnabled) {
    return (
      <div>
        <PageHeader title={t("eventTemplates.title")} icon={FileSpreadsheet} />
        <div className="bg-[#111827] rounded-xl border border-white/5 p-10 text-center max-w-md mx-auto mt-8">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-white font-semibold mb-2">{t("eventTemplates.disabledTitle")}</h3>
          <p className="text-sm text-gray-400">{t("eventTemplates.disabledDesc")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader title={t("eventTemplates.title")} icon={FileSpreadsheet} subtitle={t("eventTemplates.subtitle")} />
        <div className="bg-[#111827] rounded-xl border border-white/5 p-6 max-w-md mx-auto mt-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{t("eventTemplates.lockTitle")}</h3>
              <p className="text-xs text-gray-400">{t("eventTemplates.lockDesc")}</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
                {t("eventTemplates.passwordLabel")}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("eventTemplates.passwordPlaceholder")}
                className="bg-white/5 border-white/10 text-white"
                autoFocus
              />
            </div>
            {authError && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {authError}
              </div>
            )}
            <Button
              type="submit"
              disabled={!password || authenticating}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white"
            >
              {authenticating ? t("eventTemplates.unlocking") : t("eventTemplates.unlock")}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated UI
  return (
    <div>
      <PageHeader title={t("eventTemplates.title")} icon={FileSpreadsheet} subtitle={t("eventTemplates.subtitle")} />

      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mt-6">
        <h3 className="text-sm font-semibold text-white mb-4">{t("eventTemplates.downloadTitle")}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
              {t("eventTemplates.eventType")}
            </Label>
            <Select value={eventTypeId} onValueChange={setEventTypeId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder={t("eventTemplates.selectEvent")} />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.filter(e => e && e.id && e.active !== false).map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
              {t("eventTemplates.eventDate")}
            </Label>
            <Input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
              {t("eventTemplates.allianceFilter")}
            </Label>
            <Select value={templateAlliance} onValueChange={setTemplateAlliance}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("eventTemplates.allPlayersOption")}</SelectItem>
                {allianceOptions.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={downloadTemplate}
              disabled={!selectedEventType}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white w-full"
            >
              <Download className="w-4 h-4 mr-1" /> {t("eventTemplates.download")}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <Switch id="etSortByPower" checked={sortByPower} onCheckedChange={setSortByPower} />
          <Label htmlFor="etSortByPower" className="text-xs text-gray-300 cursor-pointer">
            {t("eventTemplates.sortByPower")}
          </Label>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          {t("eventTemplates.hint")}
        </p>
      </div>
    </div>
  );
}