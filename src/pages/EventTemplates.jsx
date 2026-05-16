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
      .map(p => ({ name: p.name, alliance: p.alliance || "", power: p.power || 0, merits: p.merits || 0 }));

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
        ["Name", "Alliance", "Power", "Merits", "Participated (Y/N)", "Note"],
        ...playerRows.map(p => [p.name, p.alliance, p.power || "", p.merits || "", "Y", ""]),
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
          ["Name", "Alliance", "Server Rank", "Power", "Merits", "Note"],
          ...playerRows.map(p => [p.name, p.alliance, "", p.power || "", p.merits || "", ""]),
        ]),
        "War Stage"
      );
    } else {
      const data = [
        ["Name", "Alliance", "Server Rank", "Power", "Merits", "Note"],
        ...playerRows.map(p => [p.name, p.alliance, "", p.power || "", p.merits || "", ""]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), selectedEventType.key);
    }

    const allianceSuffix = templateAlliance === "__all__" ? "ALL" : templateAlliance.replace(/[^a-z0-9]/gi, "_");
    XLSX.writeFile(wb, `Template_${selectedEventType.key}_${allianceSuffix}_${eventDate}.xlsx`);
  };

  const allianceSuffixForPlayers = () => {
    if (templateAlliance === "__all__") return "ALL";
    return templateAlliance.replace(/[^a-z0-9]/gi, "_");
  };

  const getPlayersForUpdate = () => {
    return players.filter(p => {
      if (templateAlliance === "__all__") return true;
      return (p.alliance || "") === templateAlliance;
    });
  };

  const downloadPlayerUpdate = () => {
    const wb = XLSX.utils.book_new();
    const filtered = getPlayersForUpdate();

    const sorted = [...filtered].sort((a, b) => {
      const aAll = (a.alliance || "").toLowerCase();
      const bAll = (b.alliance || "").toLowerCase();
      if (aAll === "" && bAll !== "") return 1;
      if (bAll === "" && aAll !== "") return -1;
      if (aAll !== bAll) return aAll.localeCompare(bAll);
      return (b.power || 0) - (a.power || 0);
    });

    const playerRows = sorted.map(p => [
      p.name,
      "",
      p.alliance || "",
      "",
      p.power || 0,
      p.merits || 0,
      p.updated_date || "",
      "",
    ]);
    const playerWs = XLSX.utils.aoa_to_sheet([
      ["Name", "New Name", "Alliance", "New Alliance", "Power", "Merits", "Last Updated", "Delete Player (TRUE = delete)"],
      ...playerRows,
    ]);
    playerWs["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, playerWs, "Players");

    const allianceRows = alliances.map(a => [a.name]);
    const allianceWs = XLSX.utils.aoa_to_sheet([
      ["Existing Alliances"],
      ...allianceRows,
    ]);
    allianceWs["!cols"] = [{ wch: 25 }];
    XLSX.utils.book_append_sheet(wb, allianceWs, "Available Alliances");

    XLSX.writeFile(wb, `Players-Update_${allianceSuffixForPlayers()}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const downloadNewPlayers = () => {
    const wb = XLSX.utils.book_new();

    // Empty template — same columns as the Update sheet so the same importer accepts it
    const headerRow = ["Name", "New Name", "Alliance", "New Alliance", "Power", "Merits", "Last Updated", "Delete Player (TRUE = delete)"];
    const emptyRows = Array.from({ length: 20 }, () => ["", "", "", "", "", "", "", ""]);
    const playerWs = XLSX.utils.aoa_to_sheet([headerRow, ...emptyRows]);
    playerWs["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, playerWs, "Players");

    const allianceRows = alliances.map(a => [a.name]);
    const allianceWs = XLSX.utils.aoa_to_sheet([
      ["Existing Alliances"],
      ...allianceRows,
    ]);
    allianceWs["!cols"] = [{ wch: 25 }];
    XLSX.utils.book_append_sheet(wb, allianceWs, "Available Alliances");

    XLSX.writeFile(wb, `Players-New_${new Date().toISOString().split("T")[0]}.xlsx`);
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

      {/* Shared alliance filter */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-4 mt-6 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
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
            <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/5 w-full">
              <Switch id="etSortByPower" checked={sortByPower} onCheckedChange={setSortByPower} />
              <Label htmlFor="etSortByPower" className="text-xs text-gray-300 cursor-pointer">
                {t("eventTemplates.sortByPower")}
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Event template section */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
        <h3 className="text-sm font-semibold text-white mb-1">{t("eventTemplates.sectionEvent")}</h3>
        <p className="text-xs text-gray-400 mb-4">{t("eventTemplates.sectionEventDesc")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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

        <p className="text-xs text-gray-500">
          {t("eventTemplates.hint")}
        </p>
      </div>

      {/* Player update template section */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mt-4">
        <h3 className="text-sm font-semibold text-white mb-1">{t("eventTemplates.sectionPlayerUpdate")}</h3>
        <p className="text-xs text-gray-400 mb-4">{t("eventTemplates.sectionPlayerUpdateDesc")}</p>
        <Button
          onClick={downloadPlayerUpdate}
          disabled={players.length === 0}
          className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
        >
          <Download className="w-4 h-4 mr-1" /> {t("eventTemplates.downloadPlayerUpdate")}
        </Button>
      </div>

      {/* New players template section */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mt-4">
        <h3 className="text-sm font-semibold text-white mb-1">{t("eventTemplates.sectionNewPlayers")}</h3>
        <p className="text-xs text-gray-400 mb-3">{t("eventTemplates.sectionNewPlayersDesc")}</p>
        <Button
          onClick={downloadNewPlayers}
          className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
        >
          <Download className="w-4 h-4 mr-1" /> {t("eventTemplates.downloadNewPlayers")}
        </Button>
        <p className="text-xs text-gray-500 mt-3">
          {t("eventTemplates.newPlayerHint")}
        </p>
      </div>
    </div>
  );
}