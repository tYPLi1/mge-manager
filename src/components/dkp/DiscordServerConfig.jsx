import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Server, ChevronDown, ChevronRight, RefreshCw, Loader2, Hash } from "lucide-react";
import { base44 } from "@/api/base44Client";

const NOTIFICATION_TYPES = [
  { key: "auction", label: "🔔 Auction Notifications", desc: "When an auction is opened" },
  { key: "results", label: "🏆 Results Notifications", desc: "When auction results are published" },
  { key: "events", label: "📊 Event Upload Notifications", desc: "When event data is uploaded" },
  { key: "penalties", label: "⚠️ Penalty Notifications", desc: "For penalties and compensations" },
  { key: "reminder", label: "⏰ Auction Reminder", desc: "~10 min before auction ends" },
  { key: "manual", label: "📢 Manual Messages", desc: "Manually sent messages" },
];

function ChannelSelect({ channels, value, onChange, placeholder }) {
  return (
    <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8">
        <SelectValue placeholder={placeholder || "Channel wählen"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          <span className="text-gray-400">— Standard Channel —</span>
        </SelectItem>
        {channels.map((ch) => (
          <SelectItem key={ch.id} value={ch.id}>
            <span className="flex items-center gap-1.5">
              <Hash className="w-3 h-3 text-gray-400" />
              {ch.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ServerCard({ server, onChange, onRemove, guild }) {
  const [expanded, setExpanded] = useState(true);
  const channels = guild?.channels || [];

  const updateField = (field, value) => {
    onChange({ ...server, [field]: value });
  };

  const toggleNotif = (key, enabled) => {
    const chs = { ...(server.channels || {}) };
    chs[key] = { ...(chs[key] || {}), enabled };
    onChange({ ...server, channels: chs });
  };

  const setChannelId = (key, channelId) => {
    const chs = { ...(server.channels || {}) };
    chs[key] = { ...(chs[key] || {}), channelId };
    onChange({ ...server, channels: chs });
  };

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {guild?.icon ? (
            <img src={guild.icon} alt="" className="w-6 h-6 rounded-full" />
          ) : (
            <Server className="w-4 h-4 text-indigo-400" />
          )}
          <div>
            <span className="text-white font-medium text-sm">{server.name || guild?.name || "Server"}</span>
            <span className="text-gray-600 text-xs ml-2">({channels.length} Channels)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {/* Default Channel */}
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Default Channel (Fallback)</Label>
            <Select
              value={server.defaultChannelId || "__none__"}
              onValueChange={(v) => updateField("defaultChannelId", v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                <SelectValue placeholder="Channel wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-gray-400">— No Default Channel —</span>
                </SelectItem>
                {channels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3 h-3 text-gray-400" />
                      {ch.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notification Channels */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-xs uppercase tracking-wider block">Nachrichten-Kanäle</Label>
            {NOTIFICATION_TYPES.map((nt) => {
              const ch = server.channels?.[nt.key] || {};
              return (
                <div key={nt.key} className="bg-[#0a0e1a] rounded-lg border border-white/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-300 text-sm font-medium">{nt.label}</span>
                      <p className="text-gray-600 text-xs">{nt.desc}</p>
                    </div>
                    <Switch
                      checked={ch.enabled ?? false}
                      onCheckedChange={(v) => toggleNotif(nt.key, v)}
                    />
                  </div>
                  {ch.enabled && (
                    <ChannelSelect
                      channels={channels}
                      value={ch.channelId}
                      onChange={(v) => setChannelId(nt.key, v)}
                      placeholder="Standard Channel verwenden"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiscordServerConfig({ value, onChange }) {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const servers = (() => {
    try { return value ? JSON.parse(value) : []; }
    catch { return []; }
  })();

  const update = (newServers) => {
    onChange(JSON.stringify(newServers));
  };

  const fetchGuilds = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getDiscordBotGuilds', {});
      setGuilds(res.data.guilds || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGuilds(); }, []);

  const addServer = (guild) => {
    // Check if already added
    if (servers.some(s => s.guildId === guild.id)) return;
    update([...servers, { guildId: guild.id, name: guild.name, defaultChannelId: "", channels: {} }]);
  };

  const removeServer = (index) => {
    update(servers.filter((_, i) => i !== index));
  };

  const updateServer = (index, server) => {
    const updated = [...servers];
    updated[index] = server;
    update(updated);
  };

  // Guilds not yet added
  const availableGuilds = guilds.filter(g => !servers.some(s => s.guildId === g.id));

  return (
    <div className="space-y-4">
      {/* Bot Guilds Info */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-400" />
          <span className="text-indigo-300 text-sm font-medium">
            {loading ? "Lade Server..." : `Bot ist auf ${guilds.length} Server${guilds.length !== 1 ? 'n' : ''}`}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchGuilds}
          disabled={loading}
          className="text-indigo-400 hover:text-indigo-300 h-7 px-2"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Configured Servers */}
      {servers.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">Noch keine Server konfiguriert — wähle unten einen Server aus</p>
      )}

      {servers.map((server, i) => {
        const guild = guilds.find(g => g.id === server.guildId);
        return (
          <ServerCard
            key={server.guildId || i}
            server={server}
            guild={guild}
            onChange={(s) => updateServer(i, s)}
            onRemove={() => removeServer(i)}
          />
        );
      })}

      {/* Add Server Dropdown */}
      {availableGuilds.length > 0 && (
        <div className="space-y-2">
          <Label className="text-gray-400 text-xs uppercase tracking-wider block">Server hinzufügen</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableGuilds.map((guild) => (
              <button
                key={guild.id}
                onClick={() => addServer(guild)}
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/10 hover:border-white/20 rounded-lg transition-colors text-left"
              >
                {guild.icon ? (
                  <img src={guild.icon} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Server className="w-4 h-4 text-indigo-400" />
                  </div>
                )}
                <div>
                  <div className="text-white text-sm font-medium">{guild.name}</div>
                  <div className="text-gray-500 text-xs">{guild.channels.length} Channels</div>
                </div>
                <Plus className="w-4 h-4 text-gray-500 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && guilds.length === 0 && servers.length === 0 && !error && (
        <p className="text-gray-500 text-xs text-center">Bot ist auf keinem Server. Lade den Bot zuerst auf einen Discord Server ein.</p>
      )}
    </div>
  );
}