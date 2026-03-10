import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/dkp/PageHeader";
import PenaltyConfigEditor from "@/components/dkp/PenaltyConfigEditor";

export default function AdminSettings() {
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  useEffect(() => {
    const map = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    setForm(map);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (updates) => {
      for (const [key, value] of Object.entries(updates)) {
        const existing = settings.find((s) => s.key === key);
        if (existing) {
          await base44.entities.AppSettings.update(existing.id, { value: String(value) });
        } else {
          await base44.entities.AppSettings.create({ key, value: String(value) });
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  const handleSave = () => saveMutation.mutate(form);

  const getBool = (key) => form[key] === "true";
  const setBool = (key, val) => setForm({ ...form, [key]: val ? "true" : "false" });

  const testWebhookMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('testDiscordWebhook', {});
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => toast.success('Test message sent to Discord!'),
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  const testLeaderboardMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('testLeaderboardMessage', {});
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => toast.success('Leaderboard sent to Discord!'),
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });



  return (
    <div>
      <PageHeader title="Settings" icon={Settings}>
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Save className="w-4 h-4 mr-1" /> Save All
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {/* Friendly Zone */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Friendly Zone</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Enabled</Label>
              <Switch checked={getBool("friendly_zone_enabled")} onCheckedChange={(v) => setBool("friendly_zone_enabled", v)} />
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">DKP Threshold</Label>
              <Input type="number" value={form.friendly_zone_threshold || ""} onChange={(e) => setForm({ ...form, friendly_zone_threshold: e.target.value })} className="bg-white/5 border-white/10 text-white w-32" />
            </div>
          </div>
        </div>

        {/* Event Toggles */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Event DKP Toggles</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Wonder Contest DKP</Label>
              <Switch checked={getBool("wonder_dkp_enabled")} onCheckedChange={(v) => setBool("wonder_dkp_enabled", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Battle of Dawn DKP</Label>
              <Switch checked={getBool("dawn_dkp_enabled")} onCheckedChange={(v) => setBool("dawn_dkp_enabled", v)} />
            </div>
          </div>
        </div>

        {/* Auction Defaults */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Default Auction Close</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Day</Label>
              <Input value={form.auction_close_day || ""} onChange={(e) => setForm({ ...form, auction_close_day: e.target.value })} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Time (UTC)</Label>
              <Input value={form.auction_close_time_utc || ""} onChange={(e) => setForm({ ...form, auction_close_time_utc: e.target.value })} className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>
        </div>

        {/* MGE Targets */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">MGE Targets (JSON)</h3>
          <p className="text-xs text-gray-500 mb-3">rank, medals, target score per rank 1–10</p>
          <Textarea
            value={form.mge_targets || ""}
            onChange={(e) => setForm({ ...form, mge_targets: e.target.value })}
            rows={6}
            className="bg-white/5 border-white/10 text-white font-mono text-xs"
          />
        </div>

        {/* Rules Text */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Rules Text (Markdown)</h3>
          <Textarea
            value={form.rules_text || ""}
            onChange={(e) => setForm({ ...form, rules_text: e.target.value })}
            rows={10}
            placeholder="Enter guild rules in markdown format..."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 font-mono text-sm"
          />
        </div>

        {/* Cooldown Table */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Cooldown Table (Rounds per Rank)</h3>
          <p className="text-xs text-gray-500 mb-3">JSON format: rank → number of rounds</p>
          <Textarea
            value={form.cooldown_table || ""}
            onChange={(e) => setForm({ ...form, cooldown_table: e.target.value })}
            rows={3}
            className="bg-white/5 border-white/10 text-white font-mono text-sm"
          />
        </div>

        {/* Penalty Config */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-5">Penalty Configuration</h3>
          <PenaltyConfigEditor
            value={form.penalty_config}
            onChange={(val) => setForm({ ...form, penalty_config: val })}
          />
        </div>

        {/* Discord Integration */}
         <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
           <h3 className="text-sm font-semibold text-white mb-4">Discord Notifications</h3>
           <p className="text-xs text-gray-500 mb-4">
             Get notified on Discord when auctions open, results are ready, and event data is uploaded.
           </p>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Discord Webhook URL</Label>
              <Input
                type="text"
                placeholder="https://discord.com/api/webhooks/..."
                value={form.discord_webhook_url || ""}
                onChange={(e) => setForm({ ...form, discord_webhook_url: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-2">
                Create a webhook: Server → Channel → Edit → Integrations → Webhooks
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Auction Notifications</Label>
              <Switch checked={getBool("discord_auction_enabled")} onCheckedChange={(v) => setBool("discord_auction_enabled", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Results Notifications</Label>
              <Switch checked={getBool("discord_results_enabled")} onCheckedChange={(v) => setBool("discord_results_enabled", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Event Upload Notifications</Label>
              <Switch checked={getBool("discord_events_enabled")} onCheckedChange={(v) => setBool("discord_events_enabled", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Penalty Notifications</Label>
              <Switch checked={getBool("discord_penalties_enabled")} onCheckedChange={(v) => setBool("discord_penalties_enabled", v)} />
            </div>
            <div className="flex gap-2 mt-2">
              <Button 
                onClick={() => testWebhookMutation.mutate()} 
                disabled={testWebhookMutation.isPending || !form.discord_webhook_url}
                variant="outline"
                className="flex-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                <Send className="w-3.5 h-3.5 mr-2" /> Test Message
              </Button>
              <Button 
                onClick={() => testLeaderboardMutation.mutate()} 
                disabled={testLeaderboardMutation.isPending || !form.discord_webhook_url}
                variant="outline"
                className="flex-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                <Send className="w-3.5 h-3.5 mr-2" /> Send Top 30
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}