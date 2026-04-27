import React, { useState } from "react";
import { X, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/lib/i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactModal({ onClose, page }) {
  const { t, locale } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = emailValid && message.trim().length > 0;

  const handleSubmit = async () => {
    if (!emailValid) {
      toast.error(t("contact.emailRequired"));
      return;
    }
    if (!message.trim()) {
      toast.error(t("contact.messageRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("submitContactMessage", {
        sender_email: email.trim(),
        sender_name: name.trim(),
        subject: subject.trim(),
        message: message.trim(),
        page,
        locale,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      setSubmitted(true);
    } catch (err) {
      toast.error(err?.message || t("contact.submitFailed"));
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
        style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">{t("contact.title")}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-2">{t("contact.thankYouTitle")}</h3>
            <p className="text-sm text-gray-400 mb-5">{t("contact.thankYouDesc")}</p>
            <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              {t("common.confirm")}
            </Button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <p className="text-xs text-gray-500">{t("contact.subtitle")}</p>

            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
                {t("contact.emailLabel")} *
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("contact.emailPlaceholder")}
                maxLength={200}
                className="bg-white/5 border-white/10 text-white"
              />
              <div className="text-[10px] text-gray-600 mt-1">{t("contact.emailHint")}</div>
            </div>

            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
                {t("contact.nameLabel")}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("contact.namePlaceholder")}
                maxLength={120}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
                {t("contact.subjectLabel")}
              </Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("contact.subjectPlaceholder")}
                maxLength={200}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
                {t("contact.messageLabel")} *
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder={t("contact.messagePlaceholder")}
                maxLength={5000}
                className="bg-white/5 border-white/10 text-white resize-none"
              />
              <div className="text-[10px] text-gray-600 mt-1 text-right">{message.length}/5000</div>
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
                disabled={submitting || !canSubmit}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              >
                {submitting ? (
                  <><Loader2 size={14} className="mr-1 animate-spin" /> {t("contact.submitting")}</>
                ) : (
                  t("contact.submit")
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}