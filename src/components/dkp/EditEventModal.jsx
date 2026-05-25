import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Plus, Trash2, Save, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import DiscordPreviewModal from "@/components/dkp/DiscordPreviewModal";
import { useTranslation } from "@/lib/i18n";
import { writeAuditLog } from "@/lib/auditLog";

/**
 * Edit an existing event (group of DKPTransactions sharing event_date + source + source_stage).
 * Allows: change DKP amount, remove a player's transaction, add a new player transaction.
 * On save: applies DB changes, updates player balances, then opens Discord preview with a
 * correction summary showing exactly what changed.
 *
 * Mobile-responsive: rows render as cards on mobile (<sm) and as a table on tablet/desktop (>=sm).
 */
export default function EditEventModal({ event, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [discordPreview, setDiscordPreview] = useState(null);

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("name", 100000),
  });

  const { data: eventTypes = [] } = useQuery({
    queryKey: ["eventTypes"],
    queryFn: () => base44.entities.EventType.list("sort_order", 100),
  });

  const [rows, setRows] = useState([]);
  const [addPlayerId, setAddPlayerId] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addNote, setAddNote] = useState("");

  useEffect(() => {
    const sorted = [...event.transactions].sort((a, b) => (b.amount || 0) - (a.amount || 0));
    setRows(sorted.map(tx => ({
      id: tx.id,
      player_id: tx.player_id,
      player_name: tx.player_name,
      amount: tx.amount,
      type: tx.type,
      note: tx.note || "",
      original_amount: tx.amount,
      _new: false,
      _removed: false,
    })));
  }, [event]);

  const stageLabel = (stage) =>
    stage === "prep" ? t("eventTemplates.stagePrep") : stage === "war" ? t("eventTemplates.stageWar") : null;

  const eventType = eventTypes.find(e => e.key === event.source);
  const stageName = !event.source_stage ? "" : ` - ${stageLabel(event.source_stage)}`;
  const eventLabel = `${eventType?.display_name || event.source}${stageName}`;

  const existingPlayerIds = new Set(rows.filter(r => !r._removed).map(r => r.player_id));
  const availablePlayers = players.filter(p => !existingPlayerIds.has(p.id));

  const updateAmount = (id, newAmount) => {
    setRows(rows.map(r => r.id === id ? { ...r, amount: newAmount === "" ? "" : parseInt(newAmount) } : r));
  };

  const toggleRemove = (id) => {
    setRows(rows.map(r => r.id === id ? { ...r, _removed: !r._removed } : r));
  };

  const addRow = () => {
    if (!addPlayerId || !addAmount) {
      toast.error(t("editEvent.addRequiredError"));
      return;
    }
    const player = players.find(p => p.id === addPlayerId);
    if (!player) return;
    setRows([
      ...rows,
      {
        id: `new-${Date.now()}-${addPlayerId}`,
        player_id: addPlayerId,
        player_name: player.name,
        amount: parseInt(addAmount),
        type: "earn",
        note: addNote || "",
        original_amount: 0,
        _new: true,
        _removed: false,
      },
    ]);
    setAddPlayerId("");
    setAddAmount("");
    setAddNote("");
  };

  const diff = useMemo(() => {
    const changes = [];
    for (const r of rows) {
      if (r._removed && !r._new) {
        changes.push({ kind: "removed", player_name: r.player_name, from: r.original_amount, to: null });
      } else if (r._new && !r._removed) {
        changes.push({ kind: "added", player_name: r.player_name, from: null, to: r.amount });
      } else if (!r._new && !r._removed && r.amount !== r.original_amount) {
        changes.push({ kind: "modified", player_name: r.player_name, from: r.original_amount, to: r.amount });
      }
    }
    return changes;
  }, [rows]);

  const hasChanges = diff.length > 0;

  const buildCorrectionEmbeds = () => {
    const leaderboardUrl = "https://mge002.base44.app/Leaderboard";
    const MAX_FIELD_LENGTH = 1000;

    const lines = diff.map(c => {
      if (c.kind === "added") {
        const dkp = c.to > 0 ? `+${c.to}` : `${c.to}`;
        return `➕ **${c.player_name}** — ${t("editEvent.discord.addedWith", { dkp })}`;
      }
      if (c.kind === "removed") {
        const dkp = c.from > 0 ? `+${c.from}` : `${c.from}`;
        return `❌ **${c.player_name}** — ${t("editEvent.discord.removedWas", { dkp })}`;
      }
      const from = c.from > 0 ? `+${c.from}` : `${c.from}`;
      const to = c.to > 0 ? `+${c.to}` : `${c.to}`;
      return `✏️ **${c.player_name}** — \`${from}\` → \`${to} DKP\``;
    });

    const chunks = [];
    let cur = "";
    for (const ln of lines) {
      const next = cur ? cur + "\n" + ln : ln;
      if (next.length > MAX_FIELD_LENGTH && cur) { chunks.push(cur); cur = ln; }
      else { cur = next; }
    }
    if (cur) chunks.push(cur);

    const fields = chunks.map((c, i) => ({
      name: i === 0 ? `🛠 ${t("editEvent.discord.changesHeader")}` : `🛠 ${t("editEvent.discord.changesHeader")} (cont.)`,
      value: c,
      inline: false,
    }));
    fields.push({ name: "🔗 Link", value: `[View Leaderboard](${leaderboardUrl})`, inline: false });

    return [{
      title: `⚠️ ${t("editEvent.discord.title")}`,
      description: `**${eventLabel}** - ${new Date(event.event_date).toLocaleDateString("en-GB")}\n\n${t("editEvent.discord.description")}`,
      color: 0xf59e0b,
      url: leaderboardUrl,
      fields,
      footer: { text: `DKP System · ${t("editEvent.discord.footerTag")}` },
    }];
  };

  const handleSave = async () => {
    if (!hasChanges) {
      toast.info(t("editEvent.noChanges"));
      return;
    }
    for (const r of rows) {
      if (!r._removed && (r.amount === "" || isNaN(r.amount))) {
        toast.error(t("editEvent.invalidValueFor", { name: r.player_name }));
        return;
      }
    }

    setSaving(true);
    try {
      const allPlayers = await base44.entities.Player.list("name", 100000);
      const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));

      const balanceDelta = {};
      const addDelta = (pid, type, deltaAmount) => {
        if (!balanceDelta[pid]) balanceDelta[pid] = { total: 0, spent: 0 };
        if (type === "bid") balanceDelta[pid].spent += deltaAmount;
        else balanceDelta[pid].total += deltaAmount;
      };

      const opsCreate = [];
      const opsUpdate = [];
      const opsDelete = [];

      for (const r of rows) {
        if (r._removed && !r._new) {
          opsDelete.push(r.id);
          if (r.type === "bid") addDelta(r.player_id, "bid", Math.abs(r.original_amount));
          else addDelta(r.player_id, "earn", -r.original_amount);
        } else if (r._new && !r._removed) {
          opsCreate.push({
            player_id: r.player_id,
            player_name: r.player_name,
            amount: r.amount,
            type: "earn",
            source: event.source,
            source_stage: event.source_stage || undefined,
            event_date: event.event_date,
            note: r.note || undefined,
          });
          addDelta(r.player_id, "earn", r.amount);
        } else if (!r._new && !r._removed && r.amount !== r.original_amount) {
          opsUpdate.push({ id: r.id, amount: r.amount });
          const delta = r.amount - r.original_amount;
          if (r.type === "bid") {
            addDelta(r.player_id, "bid", Math.abs(r.original_amount) - Math.abs(r.amount));
          } else {
            addDelta(r.player_id, "earn", delta);
          }
        }
      }

      await Promise.all([
        ...opsDelete.map(id => adminEntities.DKPTransaction.delete(id)),
        ...opsUpdate.map(u => adminEntities.DKPTransaction.update(u.id, { amount: u.amount })),
        ...opsCreate.map(c => adminEntities.DKPTransaction.create(c)),
      ]);

      const playerUpdates = [];
      for (const [pid, d] of Object.entries(balanceDelta)) {
        const player = playerMap[pid];
        if (!player) continue;
        const update = {};
        // Event DKP cannot push a player below 0 (penalties handled separately).
        if (d.total !== 0) update.total_dkp = Math.max(0, (player.total_dkp || 0) + d.total);
        if (d.spent !== 0) update.dkp_spent = (player.dkp_spent || 0) + d.spent;
        if (Object.keys(update).length > 0) playerUpdates.push({ id: pid, data: update });
      }
      await Promise.all(playerUpdates.map(u => adminEntities.Player.update(u.id, u.data)));

      // Audit log — record event edit with diff summary
      const addedCount = diff.filter(c => c.kind === "added").length;
      const removedCount = diff.filter(c => c.kind === "removed").length;
      const modifiedCount = diff.filter(c => c.kind === "modified").length;
      const netDkp = diff.reduce((s, c) => {
        if (c.kind === "added") return s + (c.to || 0);
        if (c.kind === "removed") return s - (c.from || 0);
        if (c.kind === "modified") return s + ((c.to || 0) - (c.from || 0));
        return s;
      }, 0);
      await writeAuditLog({
        action_type: "event_edited",
        source: event.source,
        action_date: event.event_date,
        amount: netDkp,
        summary: `${eventLabel} — ${diff.length} change(s): ${addedCount} added, ${modifiedCount} modified, ${removedCount} removed (net ${netDkp >= 0 ? "+" : ""}${netDkp} DKP)`,
        details: {
          event_key: event.source,
          stage: event.source_stage || null,
          added: addedCount,
          modified: modifiedCount,
          removed: removedCount,
          net_dkp: netDkp,
          changes: diff,
        },
      });

      toast.success(t("editEvent.savedTitle"), {
        description: t("editEvent.savedDesc", { count: diff.length }),
      });

      queryClient.invalidateQueries({ queryKey: ["recent-events-4w"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["all-transactions-by-date"] });

      const embeds = buildCorrectionEmbeds();
      setDiscordPreview({ embeds, notifType: "event_upload" });
    } catch (err) {
      console.error("Edit event error:", err);
      toast.error(t("editEvent.saveFailed") + ": " + (err?.message || "—"));
    }
    setSaving(false);
  };

  const amountClass = (r) => {
    if (r.amount !== r.original_amount && !r._new && !r._removed) return "text-amber-300 border-amber-500/40";
    if (r.amount > 0) return "text-emerald-400";
    if (r.amount < 0) return "text-red-400";
    return "text-white";
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-0 sm:p-4">
        <div className="bg-[#111827] border border-white/10 rounded-none sm:rounded-2xl w-full sm:max-w-3xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0">
            <div className="min-w-0 flex-1 pr-2">
              <h2 className="text-white font-bold text-sm sm:text-base truncate">{t("editEvent.title")}</h2>
              <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 truncate">
                {eventLabel} · {new Date(event.event_date).toLocaleDateString("en-GB")}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-1 shrink-0" disabled={saving} aria-label={t("common.cancel")}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-[11px] sm:text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t("editEvent.warning")}</span>
            </div>

            {/* Desktop / tablet: table */}
            <div className="hidden sm:block border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#0d1117]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase">{t("editEvent.cols.player")}</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase w-32">DKP</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase">{t("editEvent.cols.note")}</th>
                    <th className="px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map(r => (
                    <tr key={r.id} className={r._removed ? "opacity-40 line-through" : (r._new ? "bg-emerald-500/5" : "")}>
                      <td className="px-3 py-1.5 text-white">
                        {r.player_name}
                        {r._new && <span className="ml-2 text-[10px] text-emerald-400 font-semibold">{t("editEvent.badgeNew")}</span>}
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          value={r.amount}
                          onChange={(e) => updateAmount(r.id, e.target.value)}
                          disabled={r._removed}
                          className={`h-7 bg-white/5 border-white/10 text-xs font-mono ${amountClass(r)}`}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-gray-400 truncate max-w-xs">{r.note || "—"}</td>
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => toggleRemove(r.id)}
                          className={`text-xs px-2 py-1 rounded ${r._removed ? "text-amber-400 hover:text-amber-300" : "text-red-400 hover:text-red-300"}`}
                          title={r._removed ? t("editEvent.restore") : t("editEvent.remove")}
                          aria-label={r._removed ? t("editEvent.restore") : t("editEvent.remove")}
                        >
                          {r._removed ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: card list */}
            <div className="sm:hidden space-y-2">
              {rows.map(r => (
                <div
                  key={r.id}
                  className={`border rounded-lg p-3 ${r._removed ? "opacity-40 border-white/5" : r._new ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/[0.02]"}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className={`text-sm font-semibold text-white min-w-0 break-words ${r._removed ? "line-through" : ""}`}>
                      {r.player_name}
                      {r._new && <span className="ml-2 text-[10px] text-emerald-400 font-semibold">{t("editEvent.badgeNew")}</span>}
                    </div>
                    <button
                      onClick={() => toggleRemove(r.id)}
                      className={`text-xs px-2 py-1 rounded shrink-0 ${r._removed ? "text-amber-400 bg-amber-500/10" : "text-red-400 bg-red-500/10"}`}
                      aria-label={r._removed ? t("editEvent.restore") : t("editEvent.remove")}
                    >
                      {r._removed ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 uppercase shrink-0 w-10">DKP</span>
                    <Input
                      type="number"
                      value={r.amount}
                      onChange={(e) => updateAmount(r.id, e.target.value)}
                      disabled={r._removed}
                      className={`h-8 bg-white/5 border-white/10 text-sm font-mono ${amountClass(r)}`}
                    />
                  </div>
                  {r.note && (
                    <div className="text-[11px] text-gray-400 mt-2 break-words">{r.note}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Add player */}
            <div className="border border-white/10 rounded-lg p-3 bg-white/[0.02]">
              <div className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase mb-2">{t("editEvent.addPlayer")}</div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_1fr_auto] gap-2">
                <Select value={addPlayerId} onValueChange={setAddPlayerId}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs">
                    <SelectValue placeholder={t("editEvent.selectPlayer")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {availablePlayers.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="DKP"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-9 text-xs"
                />
                <Input
                  placeholder={t("editEvent.notePlaceholder")}
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-9 text-xs"
                />
                <Button
                  onClick={addRow}
                  size="sm"
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 h-9"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> {t("editEvent.add")}
                </Button>
              </div>
            </div>

            {/* Diff summary */}
            {hasChanges && (
              <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-3">
                <div className="text-[11px] sm:text-xs font-semibold text-amber-400 uppercase mb-2">
                  {t("editEvent.pendingChanges", { count: diff.length })}
                </div>
                <ul className="text-[11px] sm:text-xs text-gray-300 space-y-0.5 max-h-32 overflow-y-auto">
                  {diff.map((c, i) => (
                    <li key={i} className="break-words">
                      {c.kind === "added" && <>➕ <strong>{c.player_name}</strong>: {t("editEvent.diff.added")} <span className="font-mono text-emerald-400">{c.to > 0 ? "+" : ""}{c.to}</span></>}
                      {c.kind === "removed" && <>❌ <strong>{c.player_name}</strong>: {t("editEvent.diff.removed")} (<span className="font-mono">{c.from > 0 ? "+" : ""}{c.from}</span>)</>}
                      {c.kind === "modified" && <>✏️ <strong>{c.player_name}</strong>: <span className="font-mono">{c.from > 0 ? "+" : ""}{c.from}</span> → <span className="font-mono text-amber-300">{c.to > 0 ? "+" : ""}{c.to}</span></>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-5 border-t border-white/10 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="flex-1 border-white/10 text-gray-400 hover:text-white text-xs sm:text-sm"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs sm:text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? t("editEvent.saving") : t("editEvent.saveAndPreview")}
            </Button>
          </div>
        </div>
      </div>

      {discordPreview && (
        <DiscordPreviewModal
          embeds={discordPreview.embeds}
          onClose={() => { setDiscordPreview(null); onClose(); }}
          onSent={() => { setDiscordPreview(null); onClose(); }}
          notifType={discordPreview.notifType}
        />
      )}
    </>
  );
}