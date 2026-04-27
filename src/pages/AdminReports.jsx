import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminEntities } from "@/components/adminApi";
import { Bug, Languages, MessageSquare, Trash2, ExternalLink, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import PageHeader from "@/components/dkp/PageHeader";
import DeleteReportDialog from "@/components/admin/DeleteReportDialog";
import { useTranslation } from "@/lib/i18n";

const TYPE_ICONS = { bug: Bug, translation: Languages, other: MessageSquare };

const STATUS_COLORS = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  resolved: "bg-green-500/15 text-green-400 border-green-500/30",
  wont_fix: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const STATUSES = ["new", "in_progress", "resolved", "wont_fix"];
const TYPES = ["bug", "translation", "other"];

const TYPE_COLORS = {
  bug: "bg-red-500/15 text-red-400 border-red-500/30",
  translation: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  other: "bg-sky-500/15 text-sky-400 border-sky-500/30",
};

export default function AdminReports({ embedded = false }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [emailDraft, setEmailDraft] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  const byType = typeFilter === "all" ? reports : reports.filter((r) => r.type === typeFilter);
  const filtered = filter === "all" ? byType : byType.filter((r) => r.status === filter);
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = byType.filter((r) => r.status === s).length;
    return acc;
  }, {});
  const typeCounts = TYPES.reduce((acc, type) => {
    acc[type] = reports.filter((r) => r.type === type).length;
    return acc;
  }, {});

  return (
    <div>
      {!embedded && (
        <PageHeader title={t("adminReports.title")} subtitle={t("adminReports.subtitle")} icon={Bug} />
      )}

      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Mail size={16} className="text-amber-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">{t("adminReports.emailConfigTitle")}</h3>
        </div>
        <p className="text-xs text-gray-400 mb-3">{t("adminReports.emailConfigDesc")}</p>
        <div className="flex gap-2">
          <Label htmlFor="report-email" className="dp-sr-only">{t("adminReports.emailConfigTitle")}</Label>
          <Input
            id="report-email"
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
            {saveEmailMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden="true" />}
            {t("adminReports.saveEmail")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-white/5" role="group" aria-label={t("report.typeLabel")}>
        <button
          onClick={() => setTypeFilter("all")}
          aria-pressed={typeFilter === "all"}
          className={`px-3 py-2 rounded-lg text-xs font-medium border min-h-[36px] ${
            typeFilter === "all"
              ? "bg-white/10 border-white/20 text-white"
              : "bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5"
          }`}
        >
          {t("adminReports.filterAll")} ({reports.length})
        </button>
        {TYPES.map((type) => {
          const Icon = TYPE_ICONS[type];
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              aria-pressed={typeFilter === type}
              className={`px-3 py-2 rounded-lg text-xs font-medium border inline-flex items-center gap-1.5 min-h-[36px] ${
                typeFilter === type
                  ? TYPE_COLORS[type]
                  : "bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5"
              }`}
            >
              <Icon size={12} aria-hidden="true" />
              {t(`report.types.${type}`)} ({typeCounts[type]})
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Status">
        <button
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={`px-3 py-2 rounded-lg text-xs font-medium border min-h-[36px] ${
            filter === "all"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
              : "bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5"
          }`}
        >
          {t("adminReports.filterAll")} ({byType.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
            className={`px-3 py-2 rounded-lg text-xs font-medium border min-h-[36px] ${
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
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-[#111827] rounded-xl border border-white/5 p-5">
              <div className="dp-skeleton h-4 w-1/3 mb-3" />
              <div className="dp-skeleton h-3 w-full mb-2" />
              <div className="dp-skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-12 bg-white/[0.02] border border-white/5 rounded-xl">
          {t("adminReports.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onUpdate={(data) => updateMutation.mutate({ id: report.id, data })}
              onDelete={() => setDeleteTarget(report)}
              t={t}
            />
          ))}
        </div>
      )}

      <DeleteReportDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        hasScreenshot={!!deleteTarget?.screenshot_url}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function ReportCard({ report, onUpdate, onDelete, t }) {
  const Icon = TYPE_ICONS[report.type] || MessageSquare;
  const [adminNote, setAdminNote] = useState(report.admin_note || "");
  const [noteDirty, setNoteDirty] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const noteId = `note-${report.id}`;
  const statusId = `status-${report.id}`;

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await onUpdate({ admin_note: adminNote });
      toast.success(t("adminReports.noteSaved"));
      setNoteDirty(false);
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-lg ${STATUS_COLORS[report.status] || STATUS_COLORS.new} border`}>
          <Icon size={16} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
              {t(`report.types.${report.type}`)}
            </span>
            <span className="text-xs text-gray-500" aria-hidden="true">·</span>
            <time className="text-xs text-gray-400" dateTime={report.created_date}>
              {format(new Date(report.created_date), "yyyy-MM-dd HH:mm")}
            </time>
            {report.locale && (
              <>
                <span className="text-xs text-gray-500" aria-hidden="true">·</span>
                <span className="text-xs text-gray-400 uppercase">{report.locale}</span>
              </>
            )}
          </div>
          {report.subject && (
            <h3 className="text-sm font-semibold text-white mt-1">{report.subject}</h3>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Label htmlFor={statusId} className="dp-sr-only">Status</Label>
          <select
            id={statusId}
            value={report.status}
            onChange={(e) => onUpdate({ status: e.target.value })}
            className="w-36 bg-[#1a2333] border border-white/10 text-white text-xs h-9 rounded-md px-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
            style={{ colorScheme: "dark" }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="bg-[#1a2333] text-white">
                {t(`adminReports.status.${s}`)}
              </option>
            ))}
          </select>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label={t("adminReports.delete")}
            title={t("adminReports.delete")}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 mb-3">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{report.message}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
        {report.reporter_name && (
          <div>
            <span className="text-gray-400">{t("adminReports.reporter")}:</span>{" "}
            <span className="text-gray-200">{report.reporter_name}</span>
          </div>
        )}
        {report.page && (
          <div>
            <span className="text-gray-400">{t("adminReports.page")}:</span>{" "}
            <span className="text-gray-200 font-mono">{report.page}</span>
          </div>
        )}
        {report.screenshot_url && (
          <a
            href={report.screenshot_url}
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 hover:underline inline-flex items-center gap-1 min-h-[36px]"
            aria-label={`${t("adminReports.screenshot")} (opens in new tab)`}
          >
            <ExternalLink size={11} aria-hidden="true" /> {t("adminReports.screenshot")}
          </a>
        )}
      </div>

      <div>
        <Label htmlFor={noteId} className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 block">
          {t("adminReports.adminNote")}
        </Label>
        <Textarea
          id={noteId}
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
              onClick={handleSaveNote}
              disabled={savingNote}
              className="bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 h-8 text-xs"
            >
              {savingNote ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" aria-hidden="true" />
                  {t("adminReports.savingNote")}
                </>
              ) : t("adminReports.saveNote")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}