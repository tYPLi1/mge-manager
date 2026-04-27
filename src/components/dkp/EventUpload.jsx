import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rankToDkp } from "@/components/dkp/rankToDkp";
import DiscordPreviewModal from "@/components/dkp/DiscordPreviewModal";
import EventUploadPreviewTable from "@/components/dkp/EventUploadPreviewTable";

function parseAlliances(json) {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter(a => a && typeof a.name === "string" && a.name.trim()).map(a => ({
      name: a.name,
      color: typeof a.color === "string" ? a.color : "#f59e0b",
    }));
  } catch { return []; }
}

export default function EventUpload({ players = [], eventTypes = [] }) {
  const [eventTypeId, setEventTypeId] = useState(undefined);
  const [stage, setStage] = useState("war");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [preview, setPreview] = useState(null); // editable rows
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
  const alliancesSetting = settings.find(s => s.key === "alliances");
  const alliances = parseAlliances(alliancesSetting?.value);

  const selectedEventType = eventTypes.find(e => e.id === eventTypeId);
  const isYN = selectedEventType?.participation_type === "yn";
  const hasMultipleStages = selectedEventType?.has_prep_stage && selectedEventType?.has_war_stage;

  const effectiveStage = hasMultipleStages
    ? stage
    : selectedEventType?.has_prep_stage
      ? "prep"
      : "war";

  // ── Template Download (with Alliance column) ──────────────────────────
  const downloadTemplate = () => {
    if (!selectedEventType) return;
    const wb = XLSX.utils.book_new();
    const playerRows = players.map(p => ({ name: p.name, alliance: p.alliance || "" }));

    if (isYN) {
      const data = [
        ["Name", "Alliance", "Participated (Y/N)", "Note"],
        ...playerRows.map(p => [p.name, p.alliance, "Y", ""]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), selectedEventType.key);
    } else if (hasMultipleStages) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ["Name", "Alliance", "Server Rank", "Note"],
          ...playerRows.map(p => [p.name, p.alliance, "", ""]),
        ]),
        "Preparation"
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ["Name", "Alliance", "Server Rank", "Power", "Note"],
          ...playerRows.map(p => [p.name, p.alliance, "", "", ""]),
        ]),
        "War Stage"
      );
    } else {
      const data = [
        ["Name", "Alliance", "Server Rank", "Power", "Note"],
        ...playerRows.map(p => [p.name, p.alliance, "", "", ""]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), selectedEventType.key);
    }
    XLSX.writeFile(wb, `Template_${selectedEventType.key}_${eventDate}.xlsx`);
  };

  // ── File Parsing ──────────────────────────────────────────────────────
  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "binary" });
      const playerByName = new Map(players.map(p => [p.name.toLowerCase(), p]));

      if (isYN) {
        const allRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        const headers = (allRows[0] || []).map(h => h?.toString().toLowerCase().trim());
        const nameIdx = headers.findIndex(h => h === "name");
        const allianceIdx = headers.findIndex(h => h === "alliance");
        const participatedIdx = headers.findIndex(h => h === "participated (y/n)");
        const noteIdx = headers.findIndex(h => h === "note");
        if (nameIdx < 0 || participatedIdx < 0) {
          alert("Missing required columns: Name, Participated (Y/N)");
          return;
        }

        const rows = allRows.slice(1);
        const results = [];
        for (const row of rows) {
          const name = row[nameIdx]?.toString().trim();
          const participated = row[participatedIdx]?.toString().trim().toUpperCase();
          if (!name || !participated) continue;
          const player = playerByName.get(name.toLowerCase());
          const alliance = allianceIdx >= 0 ? (row[allianceIdx]?.toString().trim() || "") : (player?.alliance || "");
          const note = noteIdx >= 0 ? (row[noteIdx]?.toString().trim() || "") : "";
          const dkp = participated === "Y"
            ? (selectedEventType.dkp_yn_present ?? 5)
            : (selectedEventType.dkp_yn_absent ?? -5);
          results.push({
            playerId: player?.id || null,
            playerName: player?.name || name,
            isNewPlayer: !player,
            alliance,
            dkp,
            group: participated === "Y" ? "Present" : "Absent",
            note,
            serverRank: null,
            power: null,
            groupRank: null,
          });
        }
        setPreview(results);
      } else {
        let sheetName = wb.SheetNames[0];
        if (hasMultipleStages && effectiveStage === "prep") sheetName = "Preparation";
        if (hasMultipleStages && effectiveStage === "war") sheetName = "War Stage";
        const ws = wb.Sheets[sheetName];
        if (!ws) { alert(`Sheet "${sheetName}" not found in file`); return; }
        const allRows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const headers = (allRows[0] || []).map(h => h?.toString().toLowerCase().trim());
        const nameIdx = headers.findIndex(h => h === "name");
        const allianceIdx = headers.findIndex(h => h === "alliance");
        const serverRankIdx = headers.findIndex(h => h === "server rank");
        const powerIdx = headers.findIndex(h => h === "power");
        const noteIdx = headers.findIndex(h => h === "note");
        if (nameIdx < 0 || serverRankIdx < 0) {
          alert("Missing required columns: Name, Server Rank");
          return;
        }

        const rows = allRows.slice(1);
        const parsed = [];
        for (const row of rows) {
          const name = row[nameIdx]?.toString().trim();
          const serverRank = parseInt(row[serverRankIdx]);
          if (!name || !serverRank || isNaN(serverRank)) continue;
          const player = playerByName.get(name.toLowerCase());
          const alliance = allianceIdx >= 0
            ? (row[allianceIdx]?.toString().trim() || "")
            : (player?.alliance || "");
          let power = null;
          if (powerIdx >= 0) power = parseFloat(row[powerIdx]) || null;
          const note = noteIdx >= 0 ? (row[noteIdx]?.toString().trim() || "") : "";
          parsed.push({
            player,
            playerName: player?.name || name,
            isNewPlayer: !player,
            alliance,
            serverRank,
            power: power ?? (player?.power || 0),
            note,
          });
        }

        // Determine if this stage uses Top 20 split
        const isTop20Split = effectiveStage === "prep"
          ? (selectedEventType.prep_top20_enabled ?? false)
          : (selectedEventType.war_top20_enabled ?? true);

        const results = [];

        if (!isTop20Split) {
          const tableType = effectiveStage === "prep" ? "prep" : "war_top20";
          const allEntries = [...parsed].sort((a, b) => a.serverRank - b.serverRank);
          for (let i = 0; i < allEntries.length; i++) {
            const entry = allEntries[i];
            const groupRank = i + 1;
            const withinCutoff = entry.serverRank <= (selectedEventType.war_ranking_cutoff ?? 100);
            const dkp = rankToDkp(selectedEventType, tableType, groupRank, withinCutoff);
            results.push({
              playerId: entry.player?.id || null,
              playerName: entry.playerName,
              isNewPlayer: entry.isNewPlayer,
              alliance: entry.alliance,
              serverRank: entry.serverRank,
              groupRank,
              dkp,
              group: "All",
              power: entry.power,
              note: entry.note,
            });
          }
        } else {
          const top20TableType = effectiveStage === "prep" ? "prep_top20" : "war_top20";
          const outsideTableType = effectiveStage === "prep" ? "prep_outside" : "war_outside";
          const allPlayersByPower = [...players].sort((a, b) => (b.power || 0) - (a.power || 0));
          const top20PlayerIds = new Set(allPlayersByPower.slice(0, 20).map(p => p.id));

          const top20Entries = [];
          const outsideEntries = [];
          for (const entry of parsed) {
            if (entry.player && top20PlayerIds.has(entry.player.id)) {
              top20Entries.push(entry);
            } else {
              outsideEntries.push(entry);
            }
          }

          top20Entries.sort((a, b) => a.serverRank - b.serverRank);
          outsideEntries.sort((a, b) => a.serverRank - b.serverRank);

          const claimedRanks = new Set();
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
            results.push({
              playerId: entry.player?.id || null,
              playerName: entry.playerName,
              isNewPlayer: entry.isNewPlayer,
              alliance: entry.alliance,
              serverRank: entry.serverRank,
              groupRank: outsideGroupRank,
              dkp,
              group: "Outside",
              power: entry.power,
              overrideApplied: true,
              note: entry.note,
            });
            outsideGroupRank++;
          }

          let effectiveRank = 1;
          for (const entry of top20Entries) {
            const withinCutoff = entry.serverRank <= (selectedEventType.war_ranking_cutoff ?? 100);
            while (effectiveRank <= 10 && claimedRanks.has(effectiveRank)) {
              effectiveRank++;
            }
            const dkp = rankToDkp(selectedEventType, top20TableType, effectiveRank, withinCutoff);
            results.push({
              playerId: entry.player?.id || null,
              playerName: entry.playerName,
              isNewPlayer: entry.isNewPlayer,
              alliance: entry.alliance,
              serverRank: entry.serverRank,
              groupRank: effectiveRank,
              dkp,
              group: "Top 20",
              power: entry.power,
              note: entry.note,
            });
            effectiveRank++;
          }

          for (let i = 0; i < outsideRegular.length; i++) {
            const entry = outsideRegular[i];
            const groupRank = outsideGroupRank + i;
            const withinCutoff = entry.serverRank <= (selectedEventType.war_ranking_cutoff ?? 100);
            const dkp = rankToDkp(selectedEventType, outsideTableType, groupRank, withinCutoff);
            results.push({
              playerId: entry.player?.id || null,
              playerName: entry.playerName,
              isNewPlayer: entry.isNewPlayer,
              alliance: entry.alliance,
              serverRank: entry.serverRank,
              groupRank,
              dkp,
              group: "Outside",
              power: entry.power,
              note: entry.note,
            });
          }
        }
        setPreview(results);
      }
    };
    reader.readAsBinaryString(file);
  };

  // ── Create new alliance (in alliances setting) ────────────────────────
  const createAlliance = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (alliances.some(a => a.name.toLowerCase() === trimmed.toLowerCase())) return;
    const next = [...alliances, { name: trimmed, color: "#f59e0b" }];
    if (alliancesSetting?.id) {
      await adminEntities.AppSettings.update(alliancesSetting.id, { value: JSON.stringify(next) });
    } else {
      await adminEntities.AppSettings.create({ key: "alliances", value: JSON.stringify(next) });
    }
    queryClient.invalidateQueries({ queryKey: ["settings"] });
  };

  // ── Apply ─────────────────────────────────────────────────────────────
  const doApply = async () => {
    if (!preview || !selectedEventType) return;
    setApplying(true);

    // 1) Create new players (with alliance)
    const newPlayerRows = preview.filter(r => r.isNewPlayer);
    const playerNameToId = new Map();
    if (newPlayerRows.length) {
      const createdResp = await adminEntities.Player.bulkCreate(
        newPlayerRows.map(r => ({
          name: r.playerName,
          total_dkp: 0,
          dkp_spent: 0,
          alliance: r.alliance || null,
          power: r.power || 0,
        }))
      );
      // Re-fetch to resolve IDs reliably
      const refreshed = await adminEntities.Player.list("name", 500);
      for (const r of newPlayerRows) {
        const found = refreshed.find(p => p.name.toLowerCase() === r.playerName.toLowerCase());
        if (found) playerNameToId.set(r.playerName.toLowerCase(), found);
      }
    }

    // Helper to resolve player object for any preview row
    const resolvePlayer = (row) => {
      if (row.playerId) return players.find(p => p.id === row.playerId);
      const fromNew = playerNameToId.get(row.playerName.toLowerCase());
      return fromNew || players.find(p => p.name.toLowerCase() === row.playerName.toLowerCase());
    };

    const toApply = preview.filter(r => r.dkp !== 0);

    // 2) DKP transactions
    await adminEntities.DKPTransaction.bulkCreate(
      toApply.map(entry => {
        const player = resolvePlayer(entry);
        return {
          player_id: player?.id || "",
          player_name: entry.playerName,
          amount: entry.dkp,
          type: "earn",
          source: selectedEventType.key,
          source_stage: isYN ? null : effectiveStage,
          event_date: eventDate,
          note: entry.note || null,
        };
      }).filter(t => t.player_id)
    );

    // 3) Update each player's total_dkp, power, alliance + power history
    for (const entry of preview) {
      const player = resolvePlayer(entry);
      if (!player) continue;
      const updateData = {};

      if (entry.dkp !== 0) {
        updateData.total_dkp = (player.total_dkp || 0) + entry.dkp;
      }
      if (entry.power && entry.power > 0 && entry.power !== (player.power || 0)) {
        updateData.power = entry.power;
        await adminEntities.PowerHistory.create({
          player_id: player.id,
          player_name: entry.playerName,
          power: entry.power,
          recorded_at: eventDate,
          source: selectedEventType.key,
        });
      }
      const desiredAlliance = entry.alliance || null;
      if ((player.alliance || null) !== desiredAlliance) {
        updateData.alliance = desiredAlliance;
      }

      if (Object.keys(updateData).length > 0) {
        await adminEntities.Player.update(player.id, updateData);
      }
    }

    // 4) Discord notification
    if (eventsEnabled && webhookUrl) {
      const totalDkp = toApply.reduce((sum, e) => sum + e.dkp, 0);
      const stageLabel = effectiveStage === "prep" ? "Preparation" : "War Stage";
      const stageName = isYN ? "" : ` - ${stageLabel}`;
      await base44.functions.invoke('notifyEventUpload', {
        eventName: `${selectedEventType.display_name}${stageName}`,
        eventDate,
        playersUpdated: toApply.length,
        totalDkpDistributed: totalDkp,
      });
    }

    queryClient.invalidateQueries({ queryKey: ["players"] });
    setApplied(true);
    setApplying(false);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const applyResults = async () => {
    if (!preview || !selectedEventType || applying) return;

    // Confirm: any unknown alliances still left?
    const allianceNames = alliances.map(a => a.name);
    const unknownAlliancesLeft = preview
      .map(r => r.alliance)
      .filter(a => a && !allianceNames.includes(a));
    if (unknownAlliancesLeft.length > 0) {
      if (!confirm(
        `${unknownAlliancesLeft.length} player(s) reference an alliance that does not exist (${[...new Set(unknownAlliancesLeft)].join(", ")}). ` +
        `Use the dropdown to fix or create new alliances. Continue anyway and assign these names as-is?`
      )) {
        setApplying(false);
        return;
      }
    }

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
          if (r.note && r.note.trim()) line += ` — _${r.note}_`;
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

      const MAX_FIELD_LENGTH = 1000;
      const resultChunks = [];
      let currentChunk = "";
      for (let i = 0; i < allLines.length; i++) {
        const tentative = currentChunk ? currentChunk + "\n" + allLines[i] : allLines[i];
        if (tentative.length > MAX_FIELD_LENGTH && currentChunk) {
          const chunkLines = currentChunk.split("\n");
          while (chunkLines.length > 0 && (chunkLines[chunkLines.length - 1].trim() === "" || (chunkLines[chunkLines.length - 1].startsWith("**") && chunkLines[chunkLines.length - 1].endsWith("**")))) {
            allLines.splice(i, 0, chunkLines.pop());
          }
          const trimmed = chunkLines.join("\n");
          if (trimmed) resultChunks.push(trimmed);
          currentChunk = allLines[i];
        } else {
          currentChunk = tentative;
        }
      }
      if (currentChunk) resultChunks.push(currentChunk);

      const embeds = [];
      const MAX_EMBED_LENGTH = 5500;
      let currentFields = [
        { name: "Players Updated", value: String(toApply.length), inline: true },
        { name: "Total DKP Distributed", value: String(totalDkp), inline: true },
      ];
      let currentLength = 200;
      for (let i = 0; i < resultChunks.length; i++) {
        const fieldName = i === 0 ? "📋 Results" : `📋 Results (cont.)`;
        const fieldLength = fieldName.length + resultChunks[i].length;
        if (currentLength + fieldLength > MAX_EMBED_LENGTH || currentFields.length >= 24) {
          embeds.push({ color: 0x8b5cf6, fields: currentFields });
          currentFields = [];
          currentLength = 100;
        }
        currentFields.push({ name: fieldName, value: resultChunks[i], inline: false });
        currentLength += fieldLength;
      }
      if (currentFields.length > 0) {
        embeds.push({ color: 0x8b5cf6, fields: currentFields });
      }

      if (embeds.length > 0) {
        embeds[0].title = "📊 Event Data Uploaded";
        embeds[0].description = `**${selectedEventType.display_name}${stageName}** - ${new Date(eventDate).toLocaleDateString("en-GB")}`;
        embeds[0].url = leaderboardUrl;
        embeds[embeds.length - 1].fields.push({ name: "🔗 Link", value: `[View Leaderboard](${leaderboardUrl})`, inline: false });
        embeds[embeds.length - 1].footer = { text: "DKP System" };
      }

      setDiscordPreview({ embeds, channelId, onSent: doApply, notifType: "event_upload" });
    } else {
      await doApply();
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────
  const newPlayerCount = (preview || []).filter(r => r.isNewPlayer).length;
  const unknownAllianceCount = (preview || []).filter(
    r => r.alliance && !alliances.some(a => a.name === r.alliance)
  ).length;

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
              {eventTypes.filter(e => e && e.id && e.active !== false).map(e => (
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
          onChange={e => { if (e.target.files[0]) { setApplied(false); processFile(e.target.files[0]); } }}
          className="text-gray-300 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-amber-500/20 file:text-amber-400 file:text-xs hover:file:bg-amber-500/30 disabled:opacity-50"
        />
      </div>

      {preview && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs text-gray-400">{preview.length} rows — fully editable preview</p>
              {newPlayerCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 inline-flex items-center gap-1">
                  {newPlayerCount} new player{newPlayerCount > 1 ? "s" : ""} will be created
                </span>
              )}
              {unknownAllianceCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {unknownAllianceCount} unknown alliance{unknownAllianceCount > 1 ? "s" : ""} — fix in dropdown
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => { setPreview(null); setApplied(false); if (fileRef.current) fileRef.current.value = ""; }}
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

          <EventUploadPreviewTable
            rows={preview}
            onChange={setPreview}
            alliances={alliances}
            onCreateAlliance={createAlliance}
            isYN={isYN}
          />
        </div>
      )}

      {applied && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm mt-3">
          <CheckCircle className="w-4 h-4" /> DKP applied successfully!
        </div>
      )}

      {discordPreview && (
        <DiscordPreviewModal
          embeds={discordPreview.embeds}
          channelId={discordPreview.channelId}
          onClose={() => setDiscordPreview(null)}
          onSent={discordPreview.onSent}
          notifType={discordPreview.notifType}
        />
      )}
    </div>
  );
}