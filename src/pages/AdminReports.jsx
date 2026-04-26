import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminEntities } from "@/components/adminApi";
import { Bug, Languages, MessageSquare, Trash2, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import PageHeader from "@/components/dkp/PageHeader";
import { useTranslation } from "@/lib/i18n";

const TYPE_ICONS = { bug: Bug, translation: Languages, other: MessageSquare };

const STATUS_COLORS = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  resolved: "bg-green-500/15 text-green-400 border-green-500/30",
  wont_fix: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const STATUSES = ["new", "in_progress", "resolved", "wont_fix"];

export default function AdminReports() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [emailDraft, setEmailDraft] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["userReports"],
    queryFn: () => adminEntities.UserReport.list("-created_date", 500),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => adminEntities.AppSettings.list(),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (emailDraft !== null) return;
    const setting = settings.find((s) => s.key === "report_email");
    setEmailDraft(setting?.value || "");
  }, [settings, emailDraft]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminEntities.UserReport.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userReports"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminEntities.UserReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userReports"] });
      toast.success(t("adminReports.deleted"));
    },
  });

  const saveEmailMutation = useMutation({
    mutationFn: async () => {
      const existing = settings.find((s) => s.key === "report_email");
      if (existing) {
        await adminEntities.AppSettings.update(existing.id, { value: emailDraft || "" });
      } else {
        await adminEntities.AppSettings.create({ key: "report_email", value: emailDraft || "" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success(t("adminReports.emailSaved"));
    },
  });

  const filtered = filter === "all" ? reports : reports.filter((r) => r.status === filter);
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = reports.filter((r) => r.status === s).length;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title={t("adminReports.title")} subtitle={t("adminReports.subtitle")} icon={Bug} />

      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Mail size={16} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-white">{t("adminReports.emailConfigTitle")}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">{t("adminReports.emailConfigDesc")}</p>
        <div className="flex gap-2">
          <Input
            type="email"
            value={emailDraft || ""}
            onChange={(e) => setEmailDraft(e.target.value)}
            placeholder="admin@example.com"
            className="bg-white/5 border-white/10 text-white"
          />
          <Button
            onClick={() => saveEmailMutation.mutate()}
            disabled={saveEmailMutation.isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          >
            {t("common.save")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
            filter === "all"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
              : "bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5"
          }`}
        >
          {t("adminReports.filterAll")} ({reports.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              filter === s
                ? STATUS_COLORS[s]
                : "bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5"
            }`}
          >
            {t(`adminReports.status.${s}`)} ({counts[s]})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-sm text-gray-500 py-12">{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-sm text-gray-500 py-12 bg-white/[0.02] border border-white/5 rounded-xl">
          {t("adminReports.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onUpdate={(data) => updateMutation.mutate({ id: report.id, data })}
              onDelete={() => {
                if (confirm(t("adminReports.deleteConfirm"))) {
                  deleteMutation.mutate(report.id);
                }
              }}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report, onUpdate, onDelete, t }) {
  const Icon = TYPE_ICONS[report.type] || MessageSquare;
  const [adminNote, setAdminNote] = useState(report.admin_note || "");
  const [noteDirty, setNoteDirty] = useState(false);

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-lg ${STATUS_COLORS[report.status] || STATUS_COLORS.new} border`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
              {t(`report.types.${report.type}`)}
            </span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">
              {format(new Date(report.created_date), "yyyy-MM-dd HH:mm")}
            </span>
            {report.locale && (
              <>
                <span className="text-xs text-gray-600">·</span>
                <span className="text-xs text-gray-500 uppercase">{report.locale}</span>
              </>
            )}
          </div>
          {report.subject && (
            <h3 className="text-sm font-semibold text-white mt-1">{report.subject}</h3>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={report.status} onValueChange={(val) => onUpdate({ status: val })}>
            <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{t(`adminReports.status.${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md"
            title={t("adminReports.delete")}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 mb-3">
        <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{report.message}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
        {report.reporter_name && (
          <div>
            <span className="text-gray-500">{t("adminReports.reporter")}:</span>{" "}
            <span className="text-gray-300">{report.reporter_name}</span>
          </div>
        )}
        {report.page && (
          <div>
            <span className="text-gray-500">{t("adminReports.page")}:</span>{" "}
            <span className="text-gray-300 font-mono">{report.page}</span>
          </div>
        )}
        {report.screenshot_url && (
          <a
            href={report.screenshot_url}
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink size={11} /> {t("adminReports.screenshot")}
          </a>
        )}
      </div>

      <div>
        <Label className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 block">
          {t("adminReports.adminNote")}
        </Label>
        <Textarea
          value={adminNote}
          onChange={(e) => { setAdminNote(e.target.value); setNoteDirty(true); }}
          rows={2}
          placeholder={t("adminReports.adminNotePlaceholder")}
          className="bg-white/5 border-white/10 text-white text-xs resize-none"
        />
        {noteDirty && (
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              onClick={() => { onUpdate({ admin_note: adminNote }); setNoteDirty(false); }}
              className="bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 h-7 text-xs"
            >
              {t("common.save")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}