import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, CheckCircle, AlertTriangle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rankToDkp } from "@/components/dkp/rankToDkp";
import DiscordPreviewModal from "@/components/dkp/DiscordPreviewModal";

export default function EventUpload({ players, eventTypes }) {
  const [eventTypeId, setEventTypeId] = useState("");
  const [stage, setStage] = useState("war");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [preview, setPreview] = useState(null);
  const [unknownNames, setUnknownNames] = useState([]);
  const [creatingPlayers, setCreatingPlayers] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [discordPreview, setDiscordPreview] = useState(null);
  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => adminEntities.AppSettings.list(),
  });
  const webhookUrl = settings.find(s => s.key === "discord_webhook_url")?.value;
  const eventsEnabled = settings.find(s => s.key === "discord_events_enabled")?.value === "true";
  const channelId = settings.find(s => s.key === "discord_auction_channel")?.value;

  const selectedEventType = eventTypes.find(e => e.id === eventTypeId);
  const isYN = selectedEventType?.participation_type === "yn";
  const hasMultipleStages = selectedEventType?.has_prep_stage && selectedEventType?.has_war_stage;

  // Auto-set stage when event type changes and only one stage exists
  const effectiveStage = hasMultipleStages
    ? stage
    : selectedEventType?.has_prep_stage
      ? "prep"
      : "war";

  const downloadTemplate = () => {
    if (!selectedEventType) return;
    const wb = XLSX.utils.book_new();
    const names = players.map(p => p.name);
    if (isYN) {
      const data = [["Name", "Participated (Y/N)", "Note"], ...names.map(n => [n, "Y", ""])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), selectedEventType.key);
    } else if (hasMultipleStages) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Name", "Server Rank", "Note"], ...names.map(n => [n, "", ""])]), "Preparation");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Name", "Server Rank", "Power", "Note"], ...names.map(n => [n, "", "", ""])]), "War Stage");
    } else {
      const data = [["Name", "Server Rank", "Power", "Note"], ...names.map(n => [n, "", "", ""])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), selectedEventType.key);
    }
    XLSX.writeFile(wb, `Template_${selectedEventType.key}_${eventDate}.xlsx`);
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "binary" });
      if (isYN) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1);
        const results = [];
        const missing = [];
        for (const row of rows) {
          const name = row[0]?.toString().trim();
          const participated = row[1]?.toString().trim().toUpperCase();
          if (!name || !participated) continue;
          const player = players.find(p => p.name.toLowerCase() === name.toLowerCase());
          if (!player) { missing.push(name); continue; }
          const note = row[2]?.toString().trim() || "";
          const dkp = participated === "Y" ? (selectedEventType.dkp_yn_present ?? 5) : (selectedEventType.dkp_yn_absent ?? -5);
          results.push({ playerId: player.id, playerName: player.name, dkp, group: participated === "Y" ? "Present" : "Absent", note });
        }
        setUnknownNames(missing);
        setPreview(results);
      } else {
        let sheetName = wb.SheetNames[0];
        if (hasMultipleStages && effectiveStage === "prep") sheetName = "Preparation";
        if (hasMultipleStages && effectiveStage === "war") sheetName = "War Stage";
        const ws = wb.Sheets[sheetName];
        if (!ws) { alert(`Sheet "${sheetName}" not found in file`); return; }
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1);
        const parsed = [];
        const missing = [];
        for (const row of rows) {
          const name = row[0]?.toString().trim();
          const serverRank = parseInt(row[1]);
          const power = parseFloat(row[2]) || null;
          const note = row[3]?.toString().trim() || "";
          if (!name || !serverRank || isNaN(serverRank)) continue;
          const player = players.find(p => p.name.toLowerCase() === name.toLowerCase());
          if (!player) { missing.push(name); continue; }
          parsed.push({ player, serverRank, power: power ?? (player.power || 0), note });
        }
        setUnknownNames(missing);

        // Determine if this stage uses Top 20 split
        const isTop20Split = effectiveStage === "prep"
          ? (selectedEventType.prep_top20_enabled ?? false)
          : (selectedEventType.war_top20_enabled ?? true);

        const results = [];

        if (!isTop20Split) {
          // Unified: all players in one combined list, sorted by server rank
          const tableType = effectiveStage === "prep" ? "prep" : "war_top20"; // war unified reuses war_top20 table
          const allEntries = [...parsed].sort((a, b) => a.serverRank - b.serverRank);
          for (let i = 0; i < allEntries.length; i++) {
            const entry = allEntries[i];
            const groupRank = i + 1;
            const withinCutoff = entry.serverRank <= (selectedEventType.war_ranking_cutoff ?? 100);
            const dkp = rankToDkp(selectedEventType, tableType, groupRank, withinCutoff);
            results.push({ playerId: entry.player.id, playerName: entry.player.name, serverRank: entry.serverRank, groupRank, dkp, group: "All", power: entry.power, note: entry.note });
          }
        } else {
          // Split mode: Top 20 vs Outside
          const top20TableType = effectiveStage === "prep" ? "prep_top20" : "war_top20";
          const outsideTableType = effectiveStage === "prep" ? "prep_outside" : "war_outside";

          const allPlayersByPower = [...players].sort((a, b) => (b.power || 0) - (a.power || 0));
          const top20PlayerIds = new Set(allPlayersByPower.slice(0, 20).map(p => p.id));

          const top20Entries = [];
          const outsideEntries = [];
          for (const entry of parsed) {
            if (top20PlayerIds.has(entry.player.id)) {
              top20Entries.push(entry);
            } else {
              outsideEntries.push(entry);
            }
          }

          top20Entries.sort((a, b) => a.serverRank - b.serverRank);
          outsideEntries.sort((a, b) => a.serverRank - b.serverRank);

          const claimedRanks = new Set();

          // 1) Outside players with server rank 1-10 get Top-20 DKP override
          const outsideOverride = [];
          const outsideRegular = [];
          for (const entry of outsideEntries) {
            if (entry.serverRank >= 1 && entry.serverRank <= 10) {
              outsideOverride.push(entry);
              claimedRanks.add(entry.serverRank);
            } else {
              outsideRegular.push(entry);
            }
          }

          let outsideGroupRank = 1;
          for (const entry of outsideOverride) {
            const withinCutoff = entry.serverRank <= (selectedEventType.war_ranking_cutoff ?? 100);
            const dkp = rankToDkp(selectedEventType, top20TableType, entry.serverRank, withinCutoff);
            results.push({ playerId: entry.player.id, playerName: entry.player.name, serverRank: entry.serverRank, groupRank: outsideGroupRank, dkp, group: "Outside", power: entry.power, overrideApplied: true, note: entry.note });
            outsideGroupRank++;
          }

          // 2) Top-20 players: skip claimed ranks
          let effectiveRank = 1;
          for (const entry of top20Entries) {
            const withinCutoff = entry.serverRank <= (selectedEventType.war_ranking_cutoff ?? 100);
            while (effectiveRank <= 10 && claimedRanks.has(effectiveRank)) {
              effectiveRank++;
            }
            const dkp = rankToDkp(selectedEventType, top20TableType, effectiveRank, withinCutoff);
            results.push({ playerId: entry.player.id, playerName: entry.player.name, serverRank: entry.serverRank, groupRank: effectiveRank, dkp, group: "Top 20", power: entry.power, note: entry.note });
            effectiveRank++;
          }

          // 3) Remaining outside players
          for (let i = 0; i < outsideRegular.length; i++) {
            const entry = outsideRegular[i];
            const groupRank = outsideGroupRank + i;
            const withinCutoff = entry.serverRank <= (selectedEventType.war_ranking_cutoff ?? 100);
            const dkp = rankToDkp(selectedEventType, outsideTableType, groupRank, withinCutoff);
            results.push({ playerId: entry.player.id, playerName: entry.player.name, serverRank: entry.serverRank, groupRank, dkp, group: "Outside", power: entry.power, note: entry.note });
          }
        }
        setPreview(results);
      }
    };
    reader.readAsBinaryString(file);
  };

  const createMissingPlayers = async () => {
    setCreatingPlayers(true);
    await adminEntities.Player.bulkCreate(unknownNames.map(name => ({ name, total_dkp: 0, dkp_spent: 0 })));
    queryClient.invalidateQueries({ queryKey: ["players"] });
    setCreatingPlayers(false);
    setUnknownNames([]);
  };

  const doApply = async () => {
    if (!preview || !selectedEventType) return;
    setApplying(true);

    const toApply = preview.filter(entry => entry.dkp !== 0);

    await adminEntities.DKPTransaction.bulkCreate(
      toApply.map(entry => ({
        player_id: entry.playerId,
        player_name: entry.playerName,
        amount: entry.dkp,
        type: "earn",
        source: selectedEventType.key,
        source_stage: isYN ? null : effectiveStage,
        event_date: eventDate,
        note: entry.note || null,
      }))
    );

    for (const entry of toApply) {
      const player = players.find(p => p.id === entry.playerId);
      const updateData = { total_dkp: (player?.total_dkp || 0) + entry.dkp };
      const parsedEntry = preview.find(p => p.playerId === entry.playerId);
      if (parsedEntry?.power && parsedEntry.power > 0) {
        updateData.power = parsedEntry.power;
        await adminEntities.PowerHistory.create({
          player_id: entry.playerId,
          player_name: entry.playerName,
          power: parsedEntry.power,
          recorded_at: eventDate,
          source: selectedEventType.key,
        });
      }
      await adminEntities.Player.update(entry.playerId, updateData);
    }

    queryClient.invalidateQueries({ queryKey: ["players"] });
    setApplied(true);
    setApplying(false);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const applyResults = async () => {
    if (!preview || !selectedEventType || applying) return;
    setApplying(true);

    const toApply = preview.filter(entry => entry.dkp !== 0);
    const totalDkp = toApply.reduce((sum, e) => sum + e.dkp, 0);
    const stageLabel = effectiveStage === "prep" ? "Preparation" : "War Stage";
    const stageName = isYN ? "" : ` - ${stageLabel}`;

    if (eventsEnabled && webhookUrl) {
      const buildGroupLines = (groupName, entries) => {
        if (entries.length === 0) return [];
        const lines = [`**${groupName}**`];
        for (const r of entries) {
          const rank = r.groupRank ? `\`#${r.groupRank}\`` : r.group === "Present" ? "✅" : "❌";
          const dkpStr = r.dkp > 0 ? `+${r.dkp}` : `${r.dkp}`;
          let line = `${rank} **${r.playerName}** — \`${dkpStr} DKP\``;
          if (r.overrideApplied) line += " ⚡ *Override*";
          if (r.note && r.note.trim()) {
            line += ` — _${r.note}_`;
          }
          lines.push(line);
        }
        return lines;
      };

      const sorted = [...toApply].sort((a, b) => (a.groupRank || 999) - (b.groupRank || 999));
      const top20 = sorted.filter(r => r.group === "Top 20");
      const outside = sorted.filter(r => r.group === "Outside");
      const allGroup = sorted.filter(r => r.group === "All");
      const present = sorted.filter(r => r.group === "Present");
      const absent = sorted.filter(r => r.group === "Absent");

      const allLines = [];
      if (allGroup.length) allLines.push(...buildGroupLines("📋 Results", allGroup), "");
      if (top20.length) allLines.push(...buildGroupLines("🏆 Top 20", top20), "");
      if (outside.length) allLines.push(...buildGroupLines("🌐 Outside", outside), "");
      if (present.length) allLines.push(...buildGroupLines("✅ Present", present), "");
      if (absent.length) allLines.push(...buildGroupLines("❌ Absent", absent), "");

      const leaderboardUrl = "https://mge002.base44.app/Leaderboard";

      // Split into multiple embeds if needed (max ~5000 chars per embed)
      const embeds = [];
      const MAX_EMBED_LENGTH = 5000;
      
      let currentFields = [
        { name: "Players Updated", value: String(toApply.length), inline: true },
        { name: "Total DKP Distributed", value: String(totalDkp), inline: true },
      ];
      let currentLength = 200; // base length for title + description
      let chunk = "";
      let fieldIdx = 0;

      for (const line of allLines) {
        const lineWithNewline = (chunk ? "\n" : "") + line;
        if (currentLength + lineWithNewline.length > MAX_EMBED_LENGTH || currentFields.length >= 25) {
          // Finalize current embed
          if (chunk) currentFields.push({ name: fieldIdx === 0 ? "Results" : "​", value: chunk, inline: false });
          
          embeds.push({
            color: 0x8b5cf6,
            fields: currentFields,
          });

          // Start new embed
          currentFields = [];
          currentLength = 100;
          chunk = line;
          fieldIdx = 0;
        } else {
          chunk = chunk ? chunk + "\n" + line : line;
          currentLength += lineWithNewline.length;
        }
      }

      // Add remaining chunk
      if (chunk) currentFields.push({ name: fieldIdx === 0 ? "Results" : "​", value: chunk, inline: false });
      if (currentFields.length > 0) {
        embeds.push({
          color: 0x8b5cf6,
          fields: currentFields,
        });
      }

      // Add title/description to first embed, link/footer to last embed
      if (embeds.length > 0) {
        embeds[0].title = "📊 Event Data Uploaded";
        embeds[0].description = `**${selectedEventType.display_name}${stageName}** - ${new Date(eventDate).toLocaleDateString("en-GB")}`;
        embeds[0].url = leaderboardUrl;
        
        embeds[embeds.length - 1].fields.push({ name: "🔗 Link", value: `[View Leaderboard](${leaderboardUrl})`, inline: false });
        embeds[embeds.length - 1].footer = { text: "DKP System" };
      }

      setDiscordPreview({ embeds, onSent: doApply });
    } else {
      await doApply();
    }
  };

  const createMissingPlayersGuarded = async () => {
    if (creatingPlayers) return;
    await createMissingPlayers();
  };

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mt-6">
      <h3 className="text-sm font-semibold text-white mb-4">Event DKP Upload</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Event Type</Label>
          <Select value={eventTypeId} onValueChange={v => { setEventTypeId(v); setPreview(null); setApplied(false); }}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select event..." />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.filter(e => e.active !== false).map(e => (
                <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasMultipleStages && (
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {selectedEventType?.has_prep_stage && <SelectItem value="prep">Preparation</SelectItem>}
                {selectedEventType?.has_war_stage && <SelectItem value="war">War Stage</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Event Date</Label>
          <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="bg-white/5 border-white/10 text-white" />
        </div>
        <div className="flex items-end">
          <Button onClick={downloadTemplate} disabled={!selectedEventType} variant="outline" className="border-white/10 text-gray-300 hover:bg-white/5 w-full">
            <Download className="w-4 h-4 mr-1" /> Template
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Upload Filled Excel</Label>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          disabled={!selectedEventType}
          onChange={e => { if (e.target.files[0]) { setApplied(false); setUnknownNames([]); processFile(e.target.files[0]); } }}
          className="text-gray-300 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-amber-500/20 file:text-amber-400 file:text-xs hover:file:bg-amber-500/30 disabled:opacity-50"
        />
      </div>

      {unknownNames.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <div>
             <p className="text-xs font-semibold text-yellow-400 mb-1">
               {unknownNames.length} unknown players — will be skipped:
             </p>
             <p className="text-xs text-yellow-300/80 font-mono">{unknownNames.join(", ")}</p>
            </div>
            </div>
            <Button
            size="sm"
            onClick={createMissingPlayersGuarded}
            disabled={creatingPlayers}
            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 text-xs mt-1"
            >
            <UserPlus className="w-3.5 h-3.5 mr-1" />
            {creatingPlayers ? "Creating..." : `Create ${unknownNames.length} players & reload`}
          </Button>
        </div>
      )}

      {preview && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">{preview.length} players — Preview (dry run)</p>
            <div className="flex gap-2">
              <Button
                onClick={() => { setPreview(null); setUnknownNames([]); setApplied(false); if (fileRef.current) fileRef.current.value = ""; }}
                disabled={applying}
                variant="outline"
                className="border-white/10 text-gray-400 hover:bg-white/5 text-xs"
              >
                Cancel
              </Button>
              <Button onClick={applyResults} disabled={applying} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> {applying ? "Applying..." : "Confirm & Apply"}
              </Button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-white/10">
            <table className="w-full">
              <thead className="bg-[#0d1117] sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Player</th>
                  {!isYN && <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Server Rank</th>}
                  {!isYN && <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Group Rank</th>}
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Group</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">DKP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-1.5 text-sm text-white">{row.playerName}</td>
                    {!isYN && <td className="px-3 py-1.5 text-xs text-gray-400 font-mono">#{row.serverRank}</td>}
                    {!isYN && <td className="px-3 py-1.5 text-xs text-amber-400 font-mono">#{row.groupRank}</td>}
                    <td className="px-3 py-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded ${row.group === "Top 20" || row.group === "Present" ? "bg-amber-500/15 text-amber-400" : row.group === "Absent" ? "bg-red-500/15 text-red-400" : "bg-gray-500/15 text-gray-400"}`}>{row.group}</span>
                    </td>
                    <td className={`px-3 py-1.5 font-mono text-sm font-bold ${row.dkp > 0 ? "text-emerald-400" : row.dkp < 0 ? "text-red-400" : "text-gray-500"}`}>
                      {row.dkp > 0 ? "+" : ""}{row.dkp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {applied && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm mt-3">
          <CheckCircle className="w-4 h-4" /> DKP applied successfully!
        </div>
      )}

      {discordPreview && (
        <DiscordPreviewModal
          embed={discordPreview.embed}
          webhookUrl={webhookUrl}
          channelId={channelId}
          onClose={() => setDiscordPreview(null)}
          onSent={discordPreview.onSent}
        />
      )}
    </div>
  );
}