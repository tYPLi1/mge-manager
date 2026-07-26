import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

export default function DiscordPreviewModal({ embed, embeds, channelId, onClose, onSent, sendNow = true, notifType }) {
  const { t } = useTranslation();
  const [extraText, setExtraText] = useState("");
  const [sending, setSending] = useState(false);

  const embedsToSend = embeds || (embed ? [embed] : []);

  const getSession = () => {
    try {
      const raw = localStorage.getItem("adminSession");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const handleSend = async () => {
    // If sendNow is false, we just save without sending (for deferred sends like auction creation)
    if (sendNow === false) {
      toast.success(t("discordModal.willSendOnStart"));
      onSent?.(extraText);
      onClose();
      return;
    }

    setSending(true);
    const session = getSession();
    if (!session) {
      toast.error(t("discordModal.noSession"));
      setSending(false);
      onSent?.();
      onClose();
      return;
    }

    try {
      const res = await base44.functions.invoke("sendDiscordEmbed", {
        session: { userId: session.userId, username: session.username, expiresAt: session.expiresAt, token: session.token },
        embed: embedsToSend.length === 1 ? embedsToSend[0] : embedsToSend,
        extraText: extraText.trim() || undefined,
        notifType: notifType || "auction",
      });

      if (!res.data?.success) {
        toast.error(t("discordModal.sendFailed", { error: res.data?.error || "Unknown" }));
        setSending(false);
        onSent?.(extraText);
        onClose();
        return;
      }
      toast.success(t("discordModal.sent"));
    } catch (error) {
      console.error("Discord send error:", error);
      toast.error(t("discordModal.sendFailed", { error: error.message }));
    }

    setSending(false);
    onSent?.(extraText);
    onClose();
  };

  const handleSkip = () => {
    // Still execute the onSent callback (e.g. doConfirm) — just skip Discord
    onSent?.(extraText);
    onClose();
  };

  // Calculate character counts
  const calculateEmbedLength = (embed) => {
    let length = 0;
    if (embed.title) length += embed.title.length;
    if (embed.description) length += embed.description.length;
    if (embed.fields) {
      for (const field of embed.fields) {
        if (field.name) length += field.name.length;
        if (field.value) length += field.value.length;
      }
    }
    return length;
  };

  // Render embed preview
  const firstEmbed = embedsToSend[0] || {};
  const colorHex = firstEmbed.color ? `#${firstEmbed.color.toString(16).padStart(6, "0")}` : "#f59e0b";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" /> {t("discordModal.title")}
            {embedsToSend.length > 1 && <span className="text-xs text-gray-400">({t("discordModal.messages", { count: embedsToSend.length })})</span>}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Split Info */}
         {embedsToSend.length > 1 && (
           <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-3">
             <p className="text-blue-300 text-xs">
               {t("discordModal.splitInfo", { count: embedsToSend.length })}
             </p>
           </div>
         )}

        {/* Character Count Info */}
         <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 space-y-2">
           {embedsToSend.map((embed, idx) => {
             const charCount = calculateEmbedLength(embed);
             const limit = 5000;
             const percentage = Math.round((charCount / limit) * 100);
             return (
               <div key={idx} className="flex items-center justify-between text-xs">
                 <span className="text-slate-400">
                   {t("discordModal.message", { n: idx + 1 })}: <strong className={charCount > limit ? 'text-red-400' : 'text-slate-300'}>{charCount}</strong> / {limit} {t("discordModal.chars")}
                 </span>
                 <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                   <div 
                     className={`h-full transition-all ${charCount > limit ? 'bg-red-500' : 'bg-emerald-500'}`}
                     style={{ width: `${Math.min(percentage, 100)}%` }}
                   />
                 </div>
               </div>
             );
           })}
         </div>

         {/* Embed Previews */}
         {embedsToSend.map((embedItem, idx) => (
           <div key={idx} className="bg-[#2f3136] rounded-lg overflow-hidden">
             <div className="flex">
               <div className="w-1 shrink-0" style={{ backgroundColor: colorHex }} />
               <div className="p-3 flex-1 space-y-2">
                 {embedsToSend.length > 1 && (
                   <p className="text-gray-500 text-[10px] font-semibold">{t("discordModal.message", { n: idx + 1 })}/{embedsToSend.length}</p>
                 )}
                 {embedItem.title && (
                   <p className="text-white font-semibold text-sm">{embedItem.title}</p>
                 )}
                 {embedItem.description && (
                   <p className="text-gray-300 text-xs whitespace-pre-wrap">{embedItem.description}</p>
                 )}
                 {embedItem.fields?.length > 0 && (
                   <div className="space-y-2 mt-2">
                     {embedItem.fields.map((f, i) => (
                       <div key={i}>
                         <p className="text-gray-400 text-xs font-semibold">{f.name}</p>
                         <p className="text-gray-200 text-xs whitespace-pre-wrap break-words">{f.value}</p>
                       </div>
                     ))}
                   </div>
                 )}
                 {embedItem.footer && (
                   <p className="text-gray-500 text-[10px] mt-2 border-t border-white/5 pt-1.5">{embedItem.footer.text}</p>
                 )}
               </div>
             </div>
           </div>
         ))}

        {extraText.trim() && (
           <div className="bg-[#2f3136] rounded-lg overflow-hidden">
             <div className="flex">
               <div className="w-1 shrink-0" style={{ backgroundColor: colorHex }} />
               <div className="p-3 flex-1">
                 <p className="text-gray-400 text-xs font-semibold mb-1">{t("discordModal.eventNotes")}</p>
                 <p className="text-gray-200 text-xs whitespace-pre-wrap">{extraText}</p>
               </div>
             </div>
           </div>
         )}

        {/* Extra Text Input */}
        <div>
          <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
            {t("discordModal.additionalText")}
          </Label>
          <Textarea
            placeholder={t("discordModal.placeholder")}
            value={extraText}
            onChange={(e) => setExtraText(e.target.value)}
            rows={3}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm"
          />
        </div>

        {/* Actions */}
         <div className="flex gap-3 pt-1">
           <Button
             variant="outline"
             onClick={onClose}
             className="flex-1 border-white/10 text-gray-400 hover:text-white"
           >
             {t("common.cancel")}
           </Button>
           <Button
             variant="outline"
             onClick={handleSkip}
             className="flex-1 border-white/10 text-gray-400 hover:text-white"
           >
             {t("discordModal.skip")}
           </Button>
           <Button
             onClick={handleSend}
             disabled={sending}
             className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
           >
             <Send className="w-4 h-4 mr-1.5" />
             {sending ? t("discordModal.sending") : sendNow === false ? t("discordModal.saveCreate") : t("discordModal.sendContinue")}
           </Button>
         </div>
      </div>
    </div>
  );
}