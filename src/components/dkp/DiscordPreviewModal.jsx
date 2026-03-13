import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function DiscordPreviewModal({ embed, channelId, onClose, onSent, sendNow = true, notifType }) {
  const [extraText, setExtraText] = useState("");
  const [sending, setSending] = useState(false);

  const getSession = () => {
    try {
      const raw = localStorage.getItem("adminSession");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const handleSend = async () => {
    // If sendNow is false, we just save without sending (for deferred sends like auction creation)
    if (sendNow === false) {
      toast.success("Discord message will be sent on start");
      onSent?.(extraText);
      onClose();
      return;
    }

    setSending(true);
    const session = getSession();
    if (!session) {
      toast.error("No admin session found");
      setSending(false);
      return;
    }

    const res = await base44.functions.invoke("sendDiscordEmbed", {
      session: { userId: session.userId, username: session.username, expiresAt: session.expiresAt, token: session.token },
      embed,
      channelId,
      extraText: extraText.trim() || undefined,
      notifType: notifType || undefined,
    });

    if (res.data?.success) {
      toast.success("Discord message sent!");
    } else {
      toast.error(`Discord error: ${res.data?.error || "Unknown"}`);
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

  // Render embed preview
  const colorHex = embed.color ? `#${embed.color.toString(16).padStart(6, "0")}` : "#f59e0b";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" /> Discord Preview
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Embed Preview */}
        <div className="bg-[#2f3136] rounded-lg overflow-hidden">
          <div className="flex">
            <div className="w-1 shrink-0" style={{ backgroundColor: colorHex }} />
            <div className="p-3 flex-1 space-y-2">
              {embed.title && (
                <p className="text-white font-semibold text-sm">{embed.title}</p>
              )}
              {embed.description && (
                <p className="text-gray-300 text-xs whitespace-pre-wrap">{embed.description}</p>
              )}
              {embed.fields?.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {embed.fields.map((f, i) => (
                    <div key={i} className={f.inline === false ? "col-span-2" : ""}>
                      <p className="text-gray-400 text-xs font-semibold">{f.name}</p>
                      <p className="text-gray-200 text-xs">{f.value}</p>
                    </div>
                  ))}
                </div>
              )}
              {embed.footer && (
                <p className="text-gray-500 text-[10px] mt-2 border-t border-white/5 pt-1.5">{embed.footer.text}</p>
              )}
            </div>
          </div>
        </div>

        {extraText.trim() && (
          <div className="bg-[#2f3136] rounded-lg overflow-hidden">
            <div className="flex">
              <div className="w-1 shrink-0" style={{ backgroundColor: colorHex }} />
              <div className="p-3 flex-1">
                <p className="text-gray-400 text-xs font-semibold mb-1">+ Extra Text</p>
                <p className="text-gray-200 text-xs whitespace-pre-wrap">{extraText}</p>
              </div>
            </div>
          </div>
        )}

        {/* Extra Text Input */}
        <div>
          <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
            Additional Text (optional)
          </Label>
          <Textarea
            placeholder="e.g. notes, comments..."
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
            onClick={handleSkip}
            className="flex-1 border-white/10 text-gray-400 hover:text-white"
          >
            Continue without Discord
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Send className="w-4 h-4 mr-1.5" />
            {sending ? "Sending..." : sendNow === false ? "Save & Create" : "Send & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}