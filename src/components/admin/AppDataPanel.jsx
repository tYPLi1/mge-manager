import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Download, Upload, Trash2, AlertTriangle, Loader2, Lock, Eye, EyeOff, ShieldAlert, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

// Whitelist — must match WIPE_ENTITIES in functions/appDataManagement.js.
// Order shown in the UI (independent of backend safe-delete order).
const WIPE_ENTITY_OPTIONS = [
  "Player",
  "DKPTransaction",
  "Bid",
  "Auction",
  "AuctionResult",
  "Penalty",
  "OffenseResetLog",
  "PowerHistory",
  "UserReport",
];

const getSession = () => {
  try {
    const raw = localStorage.getItem("adminSession");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export default function AppDataPanel() {
  const { t } = useTranslation();
  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(null); // 'backup' | 'restore' | 'wipe' | null

  // Wipe confirmation flow
  const [wipeStep, setWipeStep] = useState(0); // 0=hidden, 1=select, 2=warn, 3=type-confirm, 4=progress
  const [wipeConfirmText, setWipeConfirmText] = useState("");
  const [selectedWipeEntities, setSelectedWipeEntities] = useState([]);
  // Live progress state for the wipe operation
  const [wipeProgress, setWipeProgress] = useState({}); // { entityName: { status: 'pending'|'running'|'done'|'error', deleted?, error? } }

  const toggleWipeEntity = (entity) => {
    setSelectedWipeEntities((prev) =>
      prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity]
    );
  };
  const toggleAllWipeEntities = () => {
    setSelectedWipeEntities((prev) =>
      prev.length === WIPE_ENTITY_OPTIONS.length ? [] : [...WIPE_ENTITY_OPTIONS]
    );
  };
  const resetWipeFlow = () => {
    setWipeStep(0);
    setWipeConfirmText("");
    setSelectedWipeEntities([]);
    setWipeProgress({});
  };

  // Restore flow
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreStep, setRestoreStep] = useState(0); // 0=hidden, 1=select, 2=confirm, 3=progress
  const [restorePreview, setRestorePreview] = useState(null);
  const [selectedRestoreEntities, setSelectedRestoreEntities] = useState([]);
  const [restoreProgress, setRestoreProgress] = useState({}); // { entity: { status, inserted?, error? } }

  const toggleRestoreEntity = (entity) => {
    setSelectedRestoreEntities((prev) =>
      prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity]
    );
  };
  const toggleAllRestoreEntities = () => {
    const all = restorePreview ? Object.keys(restorePreview.counts) : [];
    setSelectedRestoreEntities((prev) => (prev.length === all.length ? [] : all));
  };
  const resetRestoreFlow = () => {
    setRestoreStep(0);
    setRestoreFile(null);
    setRestorePreview(null);
    setSelectedRestoreEntities([]);
    setRestoreProgress({});
  };

  const callApi = async (action, extra = {}) => {
    const session = getSession();
    if (!session) throw new Error("No admin session");
    const res = await base44.functions.invoke("appDataManagement", {
      action,
      session: {
        userId: session.userId,
        username: session.username,
        expiresAt: session.expiresAt,
        token: session.token,
      },
      masterPassword,
      ...extra,
    });
    if (!res.data?.success) throw new Error(res.data?.error || "Failed");
    return res.data;
  };

  const handleBackup = async () => {
    if (!masterPassword) { toast.error(t("appData.passwordRequired")); return; }
    setBusy("backup");
    try {
      const data = await callApi("backup");
      const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dkp-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const total = Object.values(data.counts).reduce((s, n) => s + n, 0);
      toast.success(t("appData.backupSuccess", { count: total }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const handleRestoreFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.data || !parsed?.entities) {
        toast.error(t("appData.invalidBackup"));
        return;
      }
      const counts = {};
      let total = 0;
      for (const ent of parsed.entities) {
        const n = (parsed.data[ent] || []).length;
        counts[ent] = n;
        total += n;
      }
      setRestoreFile(parsed);
      setRestorePreview({ counts, total, createdAt: parsed.created_at });
      // Pre-select all entities present in the backup
      setSelectedRestoreEntities(Object.keys(counts).filter((k) => counts[k] > 0));
      setRestoreStep(1);
    } catch (err) {
      toast.error(t("appData.invalidBackup"));
    }
    e.target.value = "";
  };

  const handleRestoreConfirm = async () => {
    if (!masterPassword) { toast.error(t("appData.passwordRequired")); return; }
    if (!restoreFile) return;
    if (selectedRestoreEntities.length === 0) {
      toast.error(t("appData.restore.noneSelected"));
      return;
    }

    setBusy("restore");

    // 1) Get the safe restore plan from backend
    let plan;
    try {
      const planRes = await callApi("restore-plan", {
        selectedEntities: selectedRestoreEntities,
        backupData: { data: { } }, // server only needs to know which keys exist; send minimal
      });
      plan = planRes.plan || [];
    } catch (err) {
      // Fallback: rebuild minimal data map for plan
      try {
        const dataKeys = {};
        for (const ent of selectedRestoreEntities) {
          dataKeys[ent] = restoreFile.data[ent] || [];
        }
        const planRes = await callApi("restore-plan", {
          selectedEntities: selectedRestoreEntities,
          backupData: { data: dataKeys },
        });
        plan = planRes.plan || [];
      } catch (err2) {
        toast.error(err2.message);
        setBusy(null);
        return;
      }
    }

    if (plan.length === 0) {
      toast.error(t("appData.restore.noneSelected"));
      setBusy(null);
      return;
    }

    // Switch to progress view
    const initialProgress = {};
    plan.forEach((e) => { initialProgress[e] = { status: "pending" }; });
    setRestoreProgress(initialProgress);
    setRestoreStep(3);

    // 2) Restore each entity one by one
    let totalInserted = 0;
    let hadError = false;
    for (const entity of plan) {
      setRestoreProgress((prev) => ({ ...prev, [entity]: { status: "running" } }));
      try {
        const records = restoreFile.data[entity] || [];
        const res = await callApi("restore-entity", { entityName: entity, records });
        const inserted = res.inserted || 0;
        totalInserted += inserted;
        setRestoreProgress((prev) => ({ ...prev, [entity]: { status: "done", inserted } }));
      } catch (err) {
        hadError = true;
        setRestoreProgress((prev) => ({ ...prev, [entity]: { status: "error", error: err.message } }));
      }
    }

    setBusy(null);
    if (hadError) {
      toast.error(t("appData.restore.partialError"));
    } else {
      toast.success(t("appData.restoreSuccess", { count: totalInserted }));
    }
  };

  const handleWipeConfirm = async () => {
    if (!masterPassword) { toast.error(t("appData.passwordRequired")); return; }
    if (wipeConfirmText !== "WIPE") {
      toast.error(t("appData.wipeTypeWrong"));
      return;
    }
    if (selectedWipeEntities.length === 0) {
      toast.error(t("appData.wipe.noneSelected"));
      return;
    }

    setBusy("wipe");

    // 1) Get the safe deletion plan from backend (server filters & orders our selection)
    let plan;
    try {
      const planRes = await callApi("wipe-plan", { selectedEntities: selectedWipeEntities });
      plan = planRes.plan || [];
    } catch (err) {
      toast.error(err.message);
      setBusy(null);
      return;
    }

    if (plan.length === 0) {
      toast.error(t("appData.wipe.noneSelected"));
      setBusy(null);
      return;
    }

    // Switch to progress view and initialize all entities as 'pending'
    const initialProgress = {};
    plan.forEach((e) => { initialProgress[e] = { status: "pending" }; });
    setWipeProgress(initialProgress);
    setWipeStep(4);

    // 2) Delete each selected entity one by one with live feedback
    let totalDeleted = 0;
    let hadError = false;
    for (const entity of plan) {
      setWipeProgress((prev) => ({ ...prev, [entity]: { status: "running" } }));
      try {
        const res = await callApi("wipe-entity", { entityName: entity });
        const deleted = res.deleted || 0;
        totalDeleted += deleted;
        setWipeProgress((prev) => ({ ...prev, [entity]: { status: "done", deleted } }));
      } catch (err) {
        hadError = true;
        setWipeProgress((prev) => ({ ...prev, [entity]: { status: "error", error: err.message } }));
      }
    }

    setBusy(null);
    if (hadError) {
      toast.error(t("appData.wipe.partialError"));
    } else {
      toast.success(t("appData.wipeSuccess", { count: totalDeleted }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Master Password */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
        <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">
          {t("appData.masterPassword")}
        </Label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            placeholder={t("appData.masterPasswordPlaceholder")}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">{t("appData.masterPasswordHint")}</p>
      </div>

      {/* Backup */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{t("appData.backup.title")}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{t("appData.backup.desc")}</p>
          </div>
        </div>
        <Button
          onClick={handleBackup}
          disabled={busy !== null || !masterPassword}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {busy === "backup" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          {t("appData.backup.button")}
        </Button>
      </div>

      {/* Restore */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{t("appData.restore.title")}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{t("appData.restore.desc")}</p>
          </div>
        </div>

        {restoreStep === 0 && (
          <label className="inline-flex">
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFileSelect}
              disabled={busy !== null || !masterPassword}
              className="hidden"
            />
            <span className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium cursor-pointer
              ${busy !== null || !masterPassword
                ? "bg-blue-600/40 text-white/60 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
              <Upload className="w-4 h-4 mr-2" />
              {t("appData.restore.selectFile")}
            </span>
          </label>
        )}

        {restoreStep === 1 && restorePreview && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
            <p className="text-sm font-bold text-blue-300 mb-1">{t("appData.restore.selectTitle")}</p>
            <p className="text-xs text-blue-200/80 mb-2">{t("appData.restore.selectDesc")}</p>
            <p className="text-xs text-gray-400 mb-3">
              {t("appData.restore.fileInfo", {
                date: restorePreview.createdAt ? new Date(restorePreview.createdAt).toLocaleString() : "—",
                count: restorePreview.total,
              })}
            </p>

            <button
              type="button"
              onClick={toggleAllRestoreEntities}
              className="text-xs text-amber-400 hover:text-amber-300 underline mb-3"
            >
              {selectedRestoreEntities.length === Object.keys(restorePreview.counts).length
                ? t("appData.restore.deselectAll")
                : t("appData.restore.selectAll")}
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {Object.entries(restorePreview.counts).map(([ent, n]) => (
                <label
                  key={ent}
                  className={`flex items-center gap-2 p-2 rounded-md border ${
                    n === 0 ? "bg-white/2 border-white/5 opacity-50" : "bg-white/5 hover:bg-white/10 border-white/5 cursor-pointer"
                  }`}
                >
                  <Checkbox
                    checked={selectedRestoreEntities.includes(ent)}
                    onCheckedChange={() => toggleRestoreEntity(ent)}
                    disabled={n === 0}
                    className="border-blue-500/40 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <span className="text-sm text-gray-200 flex-1 truncate">
                    {t(`appData.wipe.entities.${ent}`, { defaultValue: ent })}
                  </span>
                  <span className="text-xs font-mono text-blue-300/80">{n}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setRestoreStep(2)}
                disabled={selectedRestoreEntities.length === 0}
                variant="outline"
                className="border-blue-500/40 text-blue-300 hover:bg-blue-500/20 disabled:opacity-40"
              >
                {t("appData.wipe.continueButton")}
              </Button>
              <Button
                onClick={resetRestoreFlow}
                variant="outline"
                className="border-white/10 text-gray-400 hover:bg-white/5"
              >
                {t("appData.cancel")}
              </Button>
            </div>
          </div>
        )}

        {restoreStep === 2 && restorePreview && (
          <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-300 mb-1">{t("appData.restore.confirmTitle")}</p>
                <p className="text-xs text-blue-200/90 mb-2">{t("appData.restore.confirmWarn")}</p>
                <ul className="text-xs text-blue-200/80 list-disc list-inside space-y-0.5 mb-2">
                  {selectedRestoreEntities.map((ent) => (
                    <li key={ent}>
                      {t(`appData.wipe.entities.${ent}`, { defaultValue: ent })}{" "}
                      <span className="font-mono text-blue-300/80">({restorePreview.counts[ent] || 0})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleRestoreConfirm}
                disabled={busy !== null}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {busy === "restore" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {t("appData.restore.confirmButton")}
              </Button>
              <Button
                onClick={() => setRestoreStep(1)}
                disabled={busy !== null}
                variant="outline"
                className="border-white/10 text-gray-400 hover:bg-white/5"
              >
                {t("common.back")}
              </Button>
              <Button
                onClick={resetRestoreFlow}
                disabled={busy !== null}
                variant="outline"
                className="border-white/10 text-gray-400 hover:bg-white/5"
              >
                {t("appData.cancel")}
              </Button>
            </div>
          </div>
        )}

        {restoreStep === 3 && (
          <div className="rounded-lg border border-blue-500/40 bg-blue-500/5 p-4">
            <p className="text-sm font-bold text-blue-300 mb-3">{t("appData.restore.progressTitle")}</p>
            <div className="space-y-1.5 mb-3">
              {Object.entries(restoreProgress).map(([entity, info]) => (
                <div
                  key={entity}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-white/5 border border-white/5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {info.status === "pending" && <Clock className="w-4 h-4 text-gray-500 shrink-0" />}
                    {info.status === "running" && <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />}
                    {info.status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {info.status === "error" && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    <span className="text-sm text-gray-200 truncate">
                      {t(`appData.wipe.entities.${entity}`, { defaultValue: entity })}
                    </span>
                  </div>
                  <div className="text-xs font-mono shrink-0">
                    {info.status === "pending" && <span className="text-gray-500">—</span>}
                    {info.status === "running" && <span className="text-amber-400">…</span>}
                    {info.status === "done" && (
                      <span className="text-emerald-400">
                        {t("appData.restore.insertedCount", { count: info.inserted ?? 0 })}
                      </span>
                    )}
                    {info.status === "error" && (
                      <span className="text-red-400" title={info.error}>{t("appData.wipe.errorShort")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {busy !== "restore" && (
              <Button
                onClick={resetRestoreFlow}
                variant="outline"
                className="border-white/10 text-gray-300 hover:bg-white/5"
              >
                {t("appData.wipe.closeButton")}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Wipe */}
      <div className="bg-[#111827] rounded-xl border border-red-500/20 p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-400">{t("appData.wipe.title")}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{t("appData.wipe.desc")}</p>
          </div>
        </div>

        {wipeStep === 0 && (
          <Button
            onClick={() => setWipeStep(1)}
            disabled={busy !== null || !masterPassword}
            variant="outline"
            className="border-red-500/40 text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-2" /> {t("appData.wipe.startButton")}
          </Button>
        )}

        {wipeStep === 1 && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
            <p className="text-sm font-bold text-red-300 mb-1">{t("appData.wipe.selectTitle")}</p>
            <p className="text-xs text-red-200/80 mb-3">{t("appData.wipe.selectDesc")}</p>

            <button
              type="button"
              onClick={toggleAllWipeEntities}
              className="text-xs text-amber-400 hover:text-amber-300 underline mb-3"
            >
              {selectedWipeEntities.length === WIPE_ENTITY_OPTIONS.length
                ? t("appData.wipe.deselectAll")
                : t("appData.wipe.selectAll")}
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {WIPE_ENTITY_OPTIONS.map((entity) => (
                <label
                  key={entity}
                  className="flex items-center gap-2 p-2 rounded-md bg-white/5 hover:bg-white/10 cursor-pointer border border-white/5"
                >
                  <Checkbox
                    checked={selectedWipeEntities.includes(entity)}
                    onCheckedChange={() => toggleWipeEntity(entity)}
                    className="border-red-500/40 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <span className="text-sm text-gray-200">
                    {t(`appData.wipe.entities.${entity}`)}
                  </span>
                </label>
              ))}
            </div>

            <p className="text-xs text-emerald-300/90 mb-3">{t("appData.wipe.kept")}</p>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setWipeStep(2)}
                disabled={selectedWipeEntities.length === 0}
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-500/20 disabled:opacity-40"
              >
                {t("appData.wipe.continueButton")}
              </Button>
              <Button
                onClick={resetWipeFlow}
                variant="outline"
                className="border-white/10 text-gray-400 hover:bg-white/5"
              >
                {t("appData.cancel")}
              </Button>
            </div>
          </div>
        )}

        {wipeStep === 2 && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-300 mb-1">{t("appData.wipe.warnTitle")}</p>
                <p className="text-xs text-red-200/90 mb-2">{t("appData.wipe.warnLine1")}</p>
                <ul className="text-xs text-red-200/80 list-disc list-inside space-y-0.5 mb-2">
                  {selectedWipeEntities.map((entity) => (
                    <li key={entity}>{t(`appData.wipe.entities.${entity}`)}</li>
                  ))}
                </ul>
                <p className="text-xs text-emerald-300">{t("appData.wipe.kept")}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setWipeStep(3)}
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-500/20"
              >
                {t("appData.wipe.continueButton")}
              </Button>
              <Button
                onClick={() => setWipeStep(1)}
                variant="outline"
                className="border-white/10 text-gray-400 hover:bg-white/5"
              >
                {t("common.back")}
              </Button>
              <Button
                onClick={resetWipeFlow}
                variant="outline"
                className="border-white/10 text-gray-400 hover:bg-white/5"
              >
                {t("appData.cancel")}
              </Button>
            </div>
          </div>
        )}

        {wipeStep === 4 && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
            <p className="text-sm font-bold text-red-300 mb-3">{t("appData.wipe.progressTitle")}</p>
            <div className="space-y-1.5 mb-3">
              {Object.entries(wipeProgress).map(([entity, info]) => (
                <div
                  key={entity}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-white/5 border border-white/5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {info.status === "pending" && <Clock className="w-4 h-4 text-gray-500 shrink-0" />}
                    {info.status === "running" && <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />}
                    {info.status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {info.status === "error" && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    <span className="text-sm text-gray-200 truncate">
                      {t(`appData.wipe.entities.${entity}`)}
                    </span>
                  </div>
                  <div className="text-xs font-mono shrink-0">
                    {info.status === "pending" && <span className="text-gray-500">—</span>}
                    {info.status === "running" && <span className="text-amber-400">…</span>}
                    {info.status === "done" && (
                      <span className="text-emerald-400">
                        {t("appData.wipe.deletedCount", { count: info.deleted ?? 0 })}
                      </span>
                    )}
                    {info.status === "error" && (
                      <span className="text-red-400" title={info.error}>{t("appData.wipe.errorShort")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {busy !== "wipe" && (
              <Button
                onClick={resetWipeFlow}
                variant="outline"
                className="border-white/10 text-gray-300 hover:bg-white/5"
              >
                {t("appData.wipe.closeButton")}
              </Button>
            )}
          </div>
        )}

        {wipeStep === 3 && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4">
            <p className="text-sm font-bold text-red-300 mb-2">{t("appData.wipe.finalTitle")}</p>
            <p className="text-xs text-red-200/90 mb-3">{t("appData.wipe.finalDesc")}</p>
            <Label className="text-red-300 text-xs uppercase tracking-wider mb-1.5 block">
              {t("appData.wipe.typeLabel")}
            </Label>
            <Input
              value={wipeConfirmText}
              onChange={(e) => setWipeConfirmText(e.target.value)}
              placeholder="WIPE"
              className="bg-white/5 border-red-500/30 text-white placeholder:text-gray-600 mb-3 font-mono"
              autoFocus
            />
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleWipeConfirm}
                disabled={busy !== null || wipeConfirmText !== "WIPE"}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
              >
                {busy === "wipe" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                {t("appData.wipe.confirmButton")}
              </Button>
              <Button
                onClick={resetWipeFlow}
                disabled={busy !== null}
                variant="outline"
                className="border-white/10 text-gray-400 hover:bg-white/5"
              >
                {t("appData.cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}