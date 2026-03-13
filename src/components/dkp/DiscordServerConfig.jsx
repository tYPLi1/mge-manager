import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Server, ChevronDown, ChevronRight } from "lucide-react";

const NOTIFICATION_TYPES = [
  { key: "auction", label: "🔔 Auction Notifications", desc: "Wenn eine Auktion geöffnet wird" },
  { key: "results", label: "🏆 Results Notifications", desc: "Wenn Auktions-Ergebnisse veröffentlicht werden" },
  { key: "events", label: "📊 Event Upload Notifications", desc: "Wenn Event-Daten hochgeladen werden" },
  { key: "penalties", label: "⚠️ Penalty Notifications", desc: "Bei Strafen und Kompensationen" },
  { key: "reminder", label: "⏰ Auction Reminder", desc: "~10 Min vor Auktions-Ende" },
  { key: "manual", label: "📢 Manuelle Nachrichten", desc: "Manuell gesendete Nachrichten" },
];

function ServerCard({ server, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(true);

  const updateField = (field, value) => {
    onChange({ ...server, [field]: value });
  };

  const toggleNotif = (key, enabled) => {
    const channels = { ...(server.channels || {}) };
    channels[key] = { ...(channels[key] || {}), enabled };
    onChange({ ...server, channels });
  };

  const setChannelId = (key, channelId) => {
    const channels = { ...(server.channels || {}) };
    channels[key] = { ...(channels[key] || {}), channelId };
    onChange({ ...server, channels });
  };

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Server className="w-4 h-4 text-indigo-400" />
          <div>
            <span className="text-white font-medium text-sm">
              {server.name || "Unbenannter Server"}
            </span>
            {server.defaultChannelId && (
              <span className="text-gray-500 text-xs ml-2">ID: {server.defaultChannelId.slice(0, 8)}...</span>
            )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Server Name</Label>
              <Input
                placeholder="z.B. Haupt-Server"
                value={server.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Standard Channel ID</Label>
              <Input
                placeholder="123456789012345678"
                value={server.defaultChannelId || ""}
                onChange={(e) => updateField("defaultChannelId", e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 font-mono text-xs"
              />
            </div>
          </div>

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
                    <Input
                      placeholder="Channel ID (leer = Standard Channel)"
                      value={ch.channelId || ""}
                      onChange={(e) => setChannelId(nt.key, e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 font-mono text-xs"
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
  // value is a JSON string of server array
  const servers = (() => {
    try { return value ? JSON.parse(value) : []; }
    catch { return []; }
  })();

  const update = (newServers) => {
    onChange(JSON.stringify(newServers));
  };

  const addServer = () => {
    update([...servers, { name: "", defaultChannelId: "", channels: {} }]);
  };

  const removeServer = (index) => {
    update(servers.filter((_, i) => i !== index));
  };

  const updateServer = (index, server) => {
    const updated = [...servers];
    updated[index] = server;
    update(updated);
  };

  return (
    <div className="space-y-4">
      {servers.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">Noch keine Server konfiguriert</p>
      )}

      {servers.map((server, i) => (
        <ServerCard
          key={i}
          server={server}
          onChange={(s) => updateServer(i, s)}
          onRemove={() => removeServer(i)}
        />
      ))}

      <Button
        onClick={addServer}
        variant="outline"
        className="w-full border-dashed border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
      >
        <Plus className="w-4 h-4 mr-2" /> Server hinzufügen
      </Button>
    </div>
  );
}