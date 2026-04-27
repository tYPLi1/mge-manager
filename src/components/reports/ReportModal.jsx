import React, { useState } from "react";
import { X, Bug, Languages, MessageSquare, Loader2, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/lib/i18n";

const TYPE_OPTIONS = [
  { value: "bug", icon: Bug },
  { value: "translation", icon: Languages },
  { value: "other", icon: MessageSquare },
];

export default function ReportModal({ onClose, page, initialType = "bug" }) {
  const { t, locale } = useTranslation();
  const [type, setType] = useState(initialType);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setScreenshotUrl(res?.file_url || "");
      toast.success(t("report.screenshotUploaded"));
    } catch (err) {
      toast.error(err?.message || t("report.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error(t("report.messageRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("submitUserReport", {
        type,
        subject: subject.trim(),
        message: message.trim(),
        page,
        locale,
        reporter_name: reporterName.trim(),
        screenshot_url: screenshotUrl,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      setSubmitted(true);
    } catch (err) {
      toast.error(err?.message || t("report.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f1628] border border-white/10 rounded-2xl"
        style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">{t("report.title")}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-2">{t("report.thankYouTitle")}</h3>
            <p className="text-sm text-gray-400 mb-5">{t("report.thankYouDesc")}</p>
            <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              {t("common.confirm")}
            </Button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <p className="text-xs text-gray-500">{t("report.subtitle")}</p>

            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                {t("report.typeLabel")}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border text-xs font-medium transition-colors ${
                        active
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                          : "bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5"
                      }`}
                    >
                      <Icon size={16} />
                      {t(`report.types.${opt.value}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
                {t("report.subjectLabel")}
              </Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("report.subjectPlaceholder")}
                maxLength={200}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
                {t("report.messageLabel")} *
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder={t("report.messagePlaceholder")}
                maxLength={5000}
                className="bg-white/5 border-white/10 text-white resize-none"
              />
              <div className="text-[10px] text-gray-600 mt-1 text-right">{message.length}/5000</div>
            </div>

            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
                {t("report.nameLabel")}
              </Label>
              <Input
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder={t("report.namePlaceholder")}
                maxLength={80}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
                {t("report.screenshotLabel")}
              </Label>
              {screenshotUrl ? (
                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-md px-3 py-2">
                  <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  <a href={screenshotUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-400 truncate flex-1">
                    {screenshotUrl.split("/").pop()}
                  </a>
                  <button
                    onClick={() => setScreenshotUrl("")}
                    className="text-gray-500 hover:text-red-400 text-xs"
                  >
                    {t("report.removeFile")}
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] border border-dashed border-white/15 rounded-md px-3 py-3 text-xs text-gray-400">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  <span>{uploading ? t("report.uploading") : t("report.uploadHint")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 border-white/10 text-gray-400 hover:text-white"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              >
                {submitting ? (
                  <><Loader2 size={14} className="mr-1 animate-spin" /> {t("report.submitting")}</>
                ) : (
                  t("report.submit")
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}