import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Server, Hash, ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

function ChannelPicker({ servers, guilds, selected, onChange }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (channelId) => {
    if (selected.includes(channelId)) {
      onChange(selected.filter(id => id !== channelId));
    } else {
      onChange([...selected, channelId]);
    }
  };

  const toggleServer = (guildId) => {
    setExpanded(prev => ({ ...prev, [guildId]: !prev[guildId] }));
  };

  const toggleAllInServer = (channels, check) => {
    const ids = channels.map(c => c.id);
    if (check) {
      onChange([...new Set([...selected, ...ids])]);
    } else {
      onChange(selected.filter(id => !ids.includes(id)));
    }
  };

  if (servers.length === 0) {
    return <p className="text-gray-500 text-xs">No servers configured.</p>;
  }

  return (
    <div className="space-y-2">
      {servers.map(server => {
        const guild = guilds.find(g => g.id === server.guildId);
        const channels = guild?.channels || [];
        const isExpanded = expanded[server.guildId] !== false;
        const selectedInServer = channels.filter(c => selected.includes(c.id));
        const allSelected = channels.length > 0 && selectedInServer.length === channels.length;

        return (
          <div key={server.guildId} className="bg-[#0a0e1a] rounded-lg border border-white/5 overflow-hidden">
            <div
              className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => toggleServer(server.guildId)}
            >
              <div className="flex items-center gap-2">
                {guild?.icon ? (
                  <img src={guild.icon} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span className="text-white text-sm font-medium">{server.name || guild?.name || "Server"}</span>
                <span className="text-gray-600 text-xs">
                  ({selectedInServer.length}/{channels.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {channels.length > 0 && (
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => { toggleAllInServer(channels, v); }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
              </div>
            </div>
            {isExpanded && channels.length > 0 && (
              <div className="border-t border-white/5 px-2.5 py-2 space-y-1 max-h-48 overflow-y-auto">
                {channels.map(ch => (
                  <label key={ch.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-white/5 cursor-pointer">
                    <Checkbox
                      checked={selected.includes(ch.id)}
                      onCheckedChange={() => toggle(ch.id)}
                    />
                    <Hash className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-300 text-xs">{ch.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DiscordNotificationPanel({ serversJson }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [guilds, setGuilds] = useState([]);
  const [loadingGuilds, setLoadingGuilds] = useState(false);

  const servers = (() => {
    try { return serversJson ? JSON.parse(serversJson) : []; }
    catch { return []; }
  })();

  const fetchGuilds = async () => {
    setLoadingGuilds(true);
    try {
      const session = getSession();
      const res = await base44.functions.invoke('getDiscordBotGuilds', { session });
      setGuilds(res.data.guilds || []);
    } catch {}
    setLoadingGuilds(false);
  };

  useEffect(() => { fetchGuilds(); }, []);

  const getSession = () => {
    try {
      const raw = localStorage.getItem("adminSession");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const sendManualMessageMutation = useMutation({
    mutationFn: async () => {
      if (selectedChannels.length === 0) throw new Error("Please select at least one channel");
      const session = getSession();
      if (!session) throw new Error("No admin session");
      const fullMessage = title ? `**${title}**\n\n${message}` : message;
      const response = await base44.functions.invoke('sendDiscordMessage', {
        message: fullMessage,
        channelIds: selectedChannels,
        session: { userId: session.userId, username: session.username, expiresAt: session.expiresAt, token: session.token },
      });
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Message sent to ${data.channels || 0} channel(s)!`);
      setTitle('');
      setMessage('');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  const testMessageMutation = useMutation({
    mutationFn: async () => {
      if (selectedChannels.length === 0) throw new Error("Please select at least one channel");
      const session = getSession();
      if (!session) throw new Error("No admin session");
      const response = await base44.functions.invoke('sendDiscordMessage', {
        message: '✅ **Discord Bot Test**\nBot integration is working correctly! @everyone mentions are now supported!',
        channelIds: selectedChannels,
        session: { userId: session.userId, username: session.username, expiresAt: session.expiresAt, token: session.token },
      });
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => toast.success(`Test sent to ${data.channels || 0} channel(s)!`),
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-5 space-y-6">
      {/* Channel Picker */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">📢 Send Discord Message</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchGuilds}
            disabled={loadingGuilds}
            className="text-gray-400 hover:text-white h-7 px-2"
          >
            {loadingGuilds ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Select Target Channels</Label>
        <ChannelPicker
          servers={servers}
          guilds={guilds}
          selected={selectedChannels}
          onChange={setSelectedChannels}
        />
        {selectedChannels.length > 0 && (
          <p className="text-xs text-amber-400 mt-2">{selectedChannels.length} channel(s) selected</p>
        )}
      </div>

      {/* Test Button */}
      <div>
        <Button
          onClick={() => testMessageMutation.mutate()}
          disabled={testMessageMutation.isPending || selectedChannels.length === 0}
          size="sm"
          className="bg-slate-700 hover:bg-slate-600 text-white"
        >
          <Send className="w-3.5 h-3.5 mr-1.5" />
          {testMessageMutation.isPending ? "Sending..." : "Send Test Message"}
        </Button>
      </div>

      {/* Manual Message */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-4">✍️ Manual Message</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Title (Optional)</Label>
            <Input
              placeholder="Message title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Message</Label>
            <Textarea
              placeholder="Write your message here (supports markdown)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 font-mono text-sm"
            />
          </div>
          <Button
            onClick={() => sendManualMessageMutation.mutate()}
            disabled={sendManualMessageMutation.isPending || !message || selectedChannels.length === 0}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Send className="w-3.5 h-3.5 mr-2" />
            {sendManualMessageMutation.isPending ? "Sending..." : `Send to ${selectedChannels.length} channel(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
}