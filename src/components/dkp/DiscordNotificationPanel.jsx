import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Send } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function DiscordNotificationPanel({ webhookUrl }) {
  const [message, setMessage] = useState("");

  const sendManualMessageMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('sendDiscordMessage', {
        message,
        webhookUrl,
      });
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Message sent to Discord!');
      setMessage('');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-5 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-4">📢 Manual Discord Message</h3>
        
        <div className="space-y-3">
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Message</Label>
            <Textarea
              placeholder="Write your message here (supports markdown formatting)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 font-mono text-sm"
            />
          </div>
          <Button 
            onClick={() => sendManualMessageMutation.mutate()} 
            disabled={sendManualMessageMutation.isPending || !webhookUrl || !message}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Send className="w-3.5 h-3.5 mr-2" /> Send to Discord
          </Button>
        </div>
      </div>
    </div>
  );
}