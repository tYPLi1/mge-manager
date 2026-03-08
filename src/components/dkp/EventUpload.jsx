import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Download, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rankToDkp } from "@/components/dkp/rankToDkp";

export default function EventUpload({ players, eventTypes }) {
  const [eventTypeId, setEventTypeId] = useState("");
  const [stage, setStage] = useState("war");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [preview, setPreview] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const selectedEventType = eventTypes.find(e => e.id === eventTypeId);
  const isYN = selectedEventType?.participation_type === "yn";
  const isMEE = selectedEventType?.key === "MEE";

  const downloadTemplate = () => {
    if (!selectedEventType) return;
    const wb = XLSX.utils.book_new();
    const names = players.map(p => p.name);
    if (isYN) {
      const data = [["Name", "Participated (Y/N)", "Note"], ...names.map(n => [n, "Y", ""])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), selectedEventType.key);
    } else if (isMEE) {
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
        for (const row of rows) {
          const name = row[0]?.toString().trim();
          const participated = row[1]?.toString().trim().toUpperCase();
          if (!name || !participated) continue;
          const player = players.find(p => p.name.toLowerCase() === name.toLowerCase());
          if (!player) continue;
          const dkp = participated === "Y" ? (selectedEventType.dkp_yn_present ?? 5) : (selectedEventType.dkp_yn_absent ?? -5);
          results.push({ playerId: player.id, playerName: player.name, dkp, group: participated === "Y" ? "Present" : "Absent" });
        }
        setPreview(results);
      } else {
        let sheetName = wb.SheetNames[0];
        if (isMEE && stage === "prep") sheetName = "Preparation";
        if (isMEE && stage === "war") sheetName = "War Stage";
        const ws = wb.Sheets[sheetName];
        if (!ws) { alert(`Sheet "${sheetName}" not found in file`); return; }
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1);
        const parsed = [];
        for (const row of rows) {
          const name = row[0]?.toString().trim();
          const serverRank = parseInt(row[1]);
          const power = parseFloat(row[2]) || null;
          if (!name || !serverRank || isNaN(serverRank)) continue;
          const player = players.find(p => p.name.toLowerCase() === name.toLowerCase());
          if (!player) continue;
          parsed.push({ player, serverRank, power: power ?? (player.power || 0) });
        }
        const sortedByPower = [...parsed].sort((a, b) => b.power - a.power);
        const results = parsed.map(entry => {
          const powerRank = sortedByPower.findIndex(s => s.player.id === entry.player.id) + 1;
          const isTop20 = powerRank <= 20;
          const withinCutoff = entry.serverRank <= (selectedEventType.war_ranking_cutoff ?? 100);
          const tableType = stage === "prep" ? "prep" : (isTop20 || entry.serverRank <= 10 ? "war_top20" : "war_outside");
          const dkp = rankToDkp(selectedEventType, tableType, entry.serverRank, withinCutoff);
          return { playerId: entry.player.id, playerName: entry.player.name, serverRank: entry.serverRank, dkp, group: isTop20 ? "Top 20" : "Outside" };
        });
        setPreview(results);
      }
    };
    reader.readAsBinaryString(file);
  };

  const applyResults = async () => {
    if (!preview || !selectedEventType) return;
    setApplying(true);
    for (const entry of preview) {
      if (entry.dkp === 0) continue;
      const player = players.find(p => p.id === entry.playerId);
      await base44.entities.DKPTransaction.create({
        player_id: entry.playerId,
        player_name: entry.playerName,
        amount: entry.dkp,
        type: "earn",
        source: selectedEventType.key,
        source_stage: isYN ? null : stage,
        event_date: eventDate,
      });
      await base44.entities.Player.update(entry.playerId, {
        total_dkp: (player?.total_dkp || 0) + entry.dkp,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["players"] });
    setApplied(true);
    setApplying(false);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
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
        {isMEE && (
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prep">Preparation</SelectItem>
                <SelectItem value="war">War Stage</SelectItem>
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">{preview.length} players — Preview (dry run)</p>
            <Button onClick={applyResults} disabled={applying} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> {applying ? "Applying..." : "Confirm & Apply"}
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-white/10">
            <table className="w-full">
              <thead className="bg-[#0d1117] sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Player</th>
                  {!isYN && <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Rank</th>}
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Group</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">DKP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-1.5 text-sm text-white">{row.playerName}</td>
                    {!isYN && <td className="px-3 py-1.5 text-xs text-gray-400 font-mono">#{row.serverRank}</td>}
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
    </div>
  );
}