import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Download, Upload, Trash2, AlertTriangle, Loader2, Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

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
  const [wipeStep, setWipeStep] = useState(0); // 0=hidden, 1=warn, 2=type-confirm
  const [wipeConfirmText, setWipeConfirmText] = useState("");

  // Restore flow
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreStep, setRestoreStep] = useState(0); // 0=hidden, 1=confirm
  const [restorePreview, setRestorePreview] = useState(null);

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
      setRestoreStep(1);
    } catch (err) {
      toast.error(t("appData.invalidBackup"));
    }
    e.target.value = "";
  };

  const handleRestoreConfirm = async () => {
    if (!masterPassword) { toast.error(t("appData.passwordRequired")); return; }
    if (!restoreFile) return;
    setBusy("restore");
    try {
      const data = await callApi("restore", { backupData: restoreFile });
      const total = Object.values(data.counts).reduce((s, n) => s + n, 0);
      toast.success(t("appData.restoreSuccess", { count: total }));
      setRestoreStep(0);
      setRestoreFile(null);
      setRestorePreview(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const handleWipeConfirm = async () => {
    if (!masterPassword) { toast.error(t("appData.passwordRequired")); return; }
    if (wipeConfirmText !== "WIPE") {
      toast.error(t("appData.wipeTypeWrong"));
      return;
    }
    setBusy("wipe");
    try {
      const data = await callApi("wipe");
      const total = Object.values(data.counts).reduce((s, n) => s + (n > 0 ? n : 0), 0);
      toast.success(t("appData.wipeSuccess", { count: total }));
      setWipeStep(0);
      setWipeConfirmText("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
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
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-300 mb-1">{t("appData.restore.confirmTitle")}</p>
                <p className="text-xs text-blue-200/80 mb-2">{t("appData.restore.confirmWarn")}</p>
                <p className="text-xs text-gray-400 mb-2">
                  {t("appData.restore.fileInfo", {
                    date: restorePreview.createdAt ? new Date(restorePreview.createdAt).toLocaleString() : "—",
                    count: restorePreview.total,
                  })}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mb-3">
                  {Object.entries(restorePreview.counts).map(([ent, n]) => (
                    <div key={ent} className="text-xs text-gray-400 font-mono bg-white/5 rounded px-2 py-1">
                      {ent}: <span className="text-blue-300">{n}</span>
                    </div>
                  ))}
                </div>
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
                onClick={() => { setRestoreStep(0); setRestoreFile(null); setRestorePreview(null); }}
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
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-300 mb-1">{t("appData.wipe.warnTitle")}</p>
                <p className="text-xs text-red-200/90 mb-2">{t("appData.wipe.warnLine1")}</p>
                <ul className="text-xs text-red-200/80 list-disc list-inside space-y-0.5 mb-2">
                  <li>{t("appData.wipe.warnPlayers")}</li>
                  <li>{t("appData.wipe.warnTransactions")}</li>
                  <li>{t("appData.wipe.warnAuctions")}</li>
                  <li>{t("appData.wipe.warnPenalties")}</li>
                  <li>{t("appData.wipe.warnPower")}</li>
                </ul>
                <p className="text-xs text-emerald-300">{t("appData.wipe.kept")}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setWipeStep(2)}
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-500/20"
              >
                {t("appData.wipe.continueButton")}
              </Button>
              <Button
                onClick={() => { setWipeStep(0); setWipeConfirmText(""); }}
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
                onClick={() => { setWipeStep(0); setWipeConfirmText(""); }}
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