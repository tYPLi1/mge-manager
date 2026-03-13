import React, { useState, useMemo, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Search, Trash2, Edit2, Save, X, Zap, XCircle, Upload, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/dkp/PageHeader";
import DKPValue from "@/components/dkp/DKPValue";
import StatusBadge from "@/components/dkp/StatusBadge";
import ImportPreview from "@/components/dkp/ImportPreview";
import * as XLSX from "xlsx";

export default function AdminPlayers() {
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCooldown, setEditCooldown] = useState("");
  const [editPower, setEditPower] = useState("");
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const fileRef = useRef();
  const queryClient = useQueryClient();

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("name", 500),
  });

  const { data: penalties = [] } = useQuery({
    queryKey: ["penalties"],
    queryFn: () => base44.entities.Penalty.list("-offense_date", 1000),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions-export"],
    queryFn: () => base44.entities.DKPTransaction.list("-event_date", 10000),
  });

  // Real-time subscriptions
  useEffect(() => {
    const unsubscribePlayers = base44.entities.Player.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    });

    const unsubscribePenalties = base44.entities.Penalty.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["penalties"] });
    });

    const unsubscribeTransactions = base44.entities.DKPTransaction.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["transactions-export"] });
    });

    return () => {
      unsubscribePlayers();
      unsubscribePenalties();
      unsubscribeTransactions();
    };
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (name) => base44.entities.Player.create({ name, total_dkp: 0, dkp_spent: 0 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["players"] }); setNewName(""); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Player.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["players"] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Player.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["players"] }),
  });

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditName(p.name || "");
    setEditCooldown(p.cooldown_until || "");
    setEditPower(String(p.power || 0));
  };

  const saveEdit = async (p) => {
    const newPower = parseInt(editPower) || 0;
    // Log power history if power changed
    if (newPower !== (p.power || 0)) {
      await base44.entities.PowerHistory.create({
        player_id: p.id,
        player_name: editName.trim() || p.name,
        power: newPower,
        recorded_at: new Date().toISOString().split("T")[0],
        source: "manual",
      });
    }
    updateMutation.mutate({
      id: p.id,
      data: {
        name: editName.trim() || p.name,
        cooldown_until: editCooldown || null,
        power: newPower,
      },
    });
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    // Players sheet
    const playerWs = XLSX.utils.aoa_to_sheet([
      ["Name", "DKP Earned", "DKP Spent", "Cooldown (YYYY-MM-DD)", "Power", "Last Updated"],
    ]);
    playerWs["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, playerWs, "Players");

    // Penalties sheet
    const penaltyWs = XLSX.utils.aoa_to_sheet([
      ["Player Name", "Level", "Offense #", "Date (YYYY-MM-DD)", "DKP Deducted", "Status", "Note"],
    ]);
    penaltyWs["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, penaltyWs, "Penalties");

    // DKP_History sheet
    const txWs = XLSX.utils.aoa_to_sheet([
      ["Player", "Type", "Source", "Stage", "Amount", "Date", "Note"],
    ]);
    txWs["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, txWs, "DKP_History");

    XLSX.writeFile(wb, "Players-Template.xlsx");
  };

  const downloadCurrent = () => {
    const wb = XLSX.utils.book_new();
    
    // Players sheet
    const playerData = players.map(p => [
      p.name,
      p.total_dkp || 0,
      p.dkp_spent || 0,
      p.cooldown_until || "",
      p.power || 0,
      p.updated_date || "",
    ]);
    const playerWs = XLSX.utils.aoa_to_sheet([
      ["Name", "DKP Earned", "DKP Spent", "Cooldown (YYYY-MM-DD)", "Power", "Last Updated"],
      ...playerData,
    ]);
    playerWs["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, playerWs, "Players");

    // Penalties sheet
    const penaltyData = penalties.filter(p => p.status === "probation").map(p => [
      p.player_name,
      p.level,
      p.offense_count,
      p.offense_date,
      p.dkp_deducted || 0,
      p.note || "",
    ]);
    const penaltyWs = XLSX.utils.aoa_to_sheet([
      ["Player", "Level", "Offense #", "Date", "DKP Deducted", "Note"],
      ...penaltyData,
    ]);
    penaltyWs["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, penaltyWs, "Penalties");

    // DKP History sheet — sorted by player, then date
    const sortedTx = [...transactions].sort((a, b) => {
      const nameCompare = (a.player_name || "").localeCompare(b.player_name || "");
      if (nameCompare !== 0) return nameCompare;
      return (a.event_date || "").localeCompare(b.event_date || "");
    });

    // Calculate cumulative DKP per player
    const cumulativeMap = {};
    const txRows = sortedTx.map(tx => {
      const name = tx.player_name || "Unknown";
      if (!cumulativeMap[name]) cumulativeMap[name] = 0;
      cumulativeMap[name] += (tx.amount || 0);
      return [
        name,
        tx.type || "",
        tx.source || "",
        tx.source_stage || "",
        tx.amount || 0,
        cumulativeMap[name],
        tx.event_date || "",
        tx.note || "",
      ];
    });

    const txWs = XLSX.utils.aoa_to_sheet([
      ["Player", "Type", "Source", "Stage", "Amount", "Cumulative DKP", "Date", "Note"],
      ...txRows,
    ]);
    txWs["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, txWs, "DKP_History");

    XLSX.writeFile(wb, `Players-State-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const preview = [];

    // Process Players sheet — header-based column detection
    if (wb.Sheets["Players"]) {
      const allRows = XLSX.utils.sheet_to_json(wb.Sheets["Players"], { header: 1 });
      const headerRow = (allRows[0] || []).map(h => String(h).trim().toLowerCase());
      const col = (label) => headerRow.indexOf(label.toLowerCase());
      const nameCol = col("name");
      if (nameCol === -1) { alert("Players sheet missing 'Name' column."); setImporting(false); return; }
      const dkpEarnedCol = col("dkp earned");
      const dkpSpentCol = col("dkp spent");
      const cooldownCol = headerRow.findIndex(h => h.includes("cooldown"));
      const powerCol = col("power");
      const updatedCol = headerRow.findIndex(h => h.includes("last updated") || h.includes("updated"));

      const rows = allRows.slice(1);
      const playersMap = new Map(players.map(p => [p.name.toLowerCase(), p]));

      for (const row of rows) {
        const name = row[nameCol]?.toString().trim();
        if (!name) continue;

        const hasDkpEarned = dkpEarnedCol !== -1;
        const hasDkpSpent = dkpSpentCol !== -1;
        const hasCooldown = cooldownCol !== -1;
        const hasPower = powerCol !== -1;
        const hasUpdated = updatedCol !== -1;

        const dkpEarned = hasDkpEarned ? (Math.round(Number(row[dkpEarnedCol])) || 0) : null;
        const dkpSpent = hasDkpSpent ? (Math.round(Number(row[dkpSpentCol])) || 0) : null;
        const cooldown = hasCooldown ? (row[cooldownCol]?.toString().trim() || null) : null;
        const power = hasPower ? (Math.round(Number(row[powerCol])) || 0) : null;
        const fileUpdatedDate = hasUpdated ? row[updatedCol]?.toString().trim() : null;

        const existing = playersMap.get(name.toLowerCase());
        if (!existing) {
          preview.push({
            type: "new",
            entity: "player",
            name,
            total_dkp: dkpEarned ?? 0,
            dkp_spent: dkpSpent ?? 0,
            cooldown_until: cooldown,
            power: power ?? 0,
          });
        } else {
          if (fileUpdatedDate && existing.updated_date && fileUpdatedDate < existing.updated_date) {
            preview.push({ type: "outdated", entity: "player", id: existing.id, name, fileDate: fileUpdatedDate, dbDate: existing.updated_date });
            continue;
          }

          const changes = {};
          if (hasDkpEarned && existing.total_dkp !== dkpEarned) changes.total_dkp = { old: existing.total_dkp, new: dkpEarned };
          if (hasDkpSpent && existing.dkp_spent !== dkpSpent) changes.dkp_spent = { old: existing.dkp_spent, new: dkpSpent };
          if (hasCooldown && existing.cooldown_until !== cooldown) changes.cooldown_until = { old: existing.cooldown_until, new: cooldown };
          if (hasPower && existing.power !== power) changes.power = { old: existing.power, new: power };

          if (Object.keys(changes).length > 0) {
            preview.push({ type: "update", entity: "player", id: existing.id, name, changes });
          }
        }
      }
    }

    // Process Penalties sheet
    if (wb.Sheets["Penalties"]) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets["Penalties"], { header: 1 }).slice(1);
      const penaltiesMap = new Map(penalties.map(p => [p.id, p]));

      for (const row of rows) {
        const playerName = row[0]?.toString().trim();
        const level = parseInt(row[1]);
        const offenseCount = parseInt(row[2]);
        const offenseDate = row[3]?.toString().trim();
        const dkpDeducted = parseInt(row[4]) || 0;
        const status = row[5]?.toString().trim() || "probation";
        const note = row[6]?.toString().trim() || "";

        if (!playerName || !level || !offenseDate) continue;

        const existingPenalty = Array.from(penaltiesMap.values()).find(
          p => p.player_name === playerName && p.offense_date === offenseDate
        );

        if (!existingPenalty) {
          preview.push({
            type: "new",
            entity: "penalty",
            player_name: playerName,
            level,
            offense_count: offenseCount,
            offense_date: offenseDate,
            dkp_deducted: dkpDeducted,
            status,
            note,
          });
        } else {
          const changes = {};
          if (existingPenalty.level !== level) changes.level = { old: existingPenalty.level, new: level };
          if (existingPenalty.offense_count !== offenseCount) changes.offense_count = { old: existingPenalty.offense_count, new: offenseCount };
          if (existingPenalty.dkp_deducted !== dkpDeducted) changes.dkp_deducted = { old: existingPenalty.dkp_deducted, new: dkpDeducted };
          if (existingPenalty.status !== status) changes.status = { old: existingPenalty.status, new: status };
          if (existingPenalty.note !== note) changes.note = { old: existingPenalty.note, new: note };

          if (Object.keys(changes).length > 0) {
            preview.push({
              type: "update",
              entity: "penalty",
              id: existingPenalty.id,
              player_name: playerName,
              changes,
            });
          }
        }
      }
    }

    // Process DKP_History sheet
    if (wb.Sheets["DKP_History"]) {
      const allRows = XLSX.utils.sheet_to_json(wb.Sheets["DKP_History"], { header: 1 });
      const headerRow = (allRows[0] || []).map(h => String(h).trim().toLowerCase());
      const col = (label) => headerRow.indexOf(label.toLowerCase());
      const playerCol = col("player");
      const typeCol = col("type");
      const sourceCol = col("source");
      const stageCol = col("stage");
      const amountCol = col("amount");
      const dateCol = col("date");
      const noteCol = col("note");

      if (playerCol === -1 || amountCol === -1 || dateCol === -1) {
        alert("DKP_History sheet needs at least 'Player', 'Amount', and 'Date' columns.");
      } else {
        const rows = allRows.slice(1);
        // Build a set of existing transactions for duplicate detection
        const existingTxKeys = new Set(
          transactions.map(tx =>
            `${(tx.player_name || "").toLowerCase()}|${tx.source || ""}|${tx.event_date || ""}|${tx.amount || 0}`
          )
        );

        const playersMap = new Map(players.map(p => [p.name.toLowerCase(), p]));

        for (const row of rows) {
          const playerName = row[playerCol]?.toString().trim();
          if (!playerName) continue;
          const amount = parseFloat(row[amountCol]) || 0;
          const eventDate = row[dateCol]?.toString().trim() || "";
          const source = sourceCol !== -1 ? (row[sourceCol]?.toString().trim() || "") : "";
          const type = typeCol !== -1 ? (row[typeCol]?.toString().trim() || "earn") : "earn";
          const stage = stageCol !== -1 ? (row[stageCol]?.toString().trim() || "") : "";
          const note = noteCol !== -1 ? (row[noteCol]?.toString().trim() || "") : "";

          if (!eventDate || amount === 0) continue;

          const txKey = `${playerName.toLowerCase()}|${source}|${eventDate}|${amount}`;
          if (existingTxKeys.has(txKey)) continue;

          const player = playersMap.get(playerName.toLowerCase());

          preview.push({
            type: "new",
            entity: "transaction",
            player_name: playerName,
            player_id: player?.id || null,
            amount,
            tx_type: type,
            source,
            source_stage: stage,
            event_date: eventDate,
            note,
          });
        }
      }
    }

    if (preview.length > 0) {
      setPreviewData(preview);
    } else {
      alert("No new or changed data found.");
    }
    setImporting(false);
    e.target.value = "";
  };

  const confirmImport = async (items) => {
    setImporting(true);
    const newPlayers = items.filter(p => p.type === "new" && p.entity === "player").map(({ type, entity, ...rest }) => rest);
    const playerUpdates = items.filter(p => p.type === "update" && p.entity === "player");
    const newPenalties = items.filter(p => p.type === "new" && p.entity === "penalty").map(({ type, entity, ...rest }) => rest);
    const penaltyUpdates = items.filter(p => p.type === "update" && p.entity === "penalty");

    if (newPlayers.length > 0) {
      await base44.entities.Player.bulkCreate(newPlayers);
    }

    for (const item of playerUpdates) {
      const updateData = {};
      Object.entries(item.changes).forEach(([key, { new: val }]) => {
        updateData[key] = val;
      });
      // Log power history if power changed
      if (item.changes.power) {
        await base44.entities.PowerHistory.create({
          player_id: item.id,
          player_name: item.name,
          power: item.changes.power.new,
          recorded_at: new Date().toISOString().split("T")[0],
          source: "import",
        });
      }
      await base44.entities.Player.update(item.id, updateData);
    }

    if (newPenalties.length > 0) {
      // Add player_id to new penalties
      const penaltiesToCreate = await Promise.all(newPenalties.map(async (p) => {
        const player = await base44.entities.Player.list().then(list => list.find(pl => pl.name === p.player_name));
        return { ...p, player_id: player?.id };
      }));
      await base44.entities.Penalty.bulkCreate(penaltiesToCreate.filter(p => p.player_id));
    }

    for (const item of penaltyUpdates) {
      const updateData = {};
      Object.entries(item.changes).forEach(([key, { new: val }]) => {
        updateData[key] = val;
      });
      await base44.entities.Penalty.update(item.id, updateData);
    }

    // Import DKP transactions
    const newTransactions = items.filter(p => p.type === "new" && p.entity === "transaction");
    if (newTransactions.length > 0) {
      // Fetch fresh player list to resolve IDs for new players created above
      const allPlayers = await base44.entities.Player.list("name", 500);
      const pMap = new Map(allPlayers.map(p => [p.name.toLowerCase(), p]));

      const txBatch = newTransactions.map(tx => {
        const player = pMap.get(tx.player_name.toLowerCase());
        return {
          player_id: tx.player_id || player?.id || "",
          player_name: tx.player_name,
          amount: tx.amount,
          type: tx.tx_type || "earn",
          source: tx.source || "",
          source_stage: tx.source_stage || "",
          event_date: tx.event_date,
          note: tx.note || "",
        };
      }).filter(tx => tx.player_id);

      // Bulk create in batches of 50
      for (let i = 0; i < txBatch.length; i += 50) {
        await base44.entities.DKPTransaction.bulkCreate(txBatch.slice(i, i + 50));
      }
    }

    queryClient.invalidateQueries({ queryKey: ["players"] });
    queryClient.invalidateQueries({ queryKey: ["penalties"] });
    queryClient.invalidateQueries({ queryKey: ["transactions-export"] });
    setPreviewData(null);
    const parts = [];
    if (newPlayers.length) parts.push(`${newPlayers.length} new players`);
    if (playerUpdates.length) parts.push(`${playerUpdates.length} player updates`);
    if (newPenalties.length) parts.push(`${newPenalties.length} new penalties`);
    if (penaltyUpdates.length) parts.push(`${penaltyUpdates.length} penalty updates`);
    if (newTransactions.length) parts.push(`${newTransactions.length} DKP transactions`);
    alert(parts.join(", ") || "Nothing imported.");
  };

  const filtered = useMemo(() =>
    search ? players.filter(p => p.name?.toLowerCase().includes(search.toLowerCase())) : players,
    [players, search]
  );

  return (
    <div>
      {previewData && (
        <ImportPreview
          preview={previewData}
          onConfirm={confirmImport}
          onCancel={() => setPreviewData(null)}
        />
      )}
      <PageHeader title="Player Management" subtitle={`${players.length} Players`} icon={Users} />

      {/* Add Player + Import + Export */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-4 mb-6">
        <div className="flex gap-3 flex-wrap mb-3">
          <Input
            placeholder="New player name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 flex-1 min-w-40"
            onKeyDown={(e) => e.key === "Enter" && newName && createMutation.mutate(newName)}
          />
          <Button
            onClick={() => newName && createMutation.mutate(newName)}
            disabled={!newName || createMutation.isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
            onClick={downloadTemplate}
          >
            <Download className="w-4 h-4 mr-1" /> Template
          </Button>
          <Button
            variant="outline"
            className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
            onClick={downloadCurrent}
            disabled={players.length === 0}
          >
            <Download className="w-4 h-4 mr-1" /> Current State
          </Button>
          <Button
            variant="outline"
            className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            <Upload className="w-4 h-4 mr-1" /> {importing ? "Importing..." : "Import File"}
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 w-64"
        />
      </div>

      {/* Table */}
      <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0d1117] border-b border-white/5">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Name</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">DKP</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">Cooldown</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">Power</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((p) =>
                editingId === p.id ? (
                  <tr key={p.id} className="bg-amber-500/5">
                    <td className="px-3 py-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-xs bg-white/5 border-white/20 text-white w-36"
                        placeholder="Name"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <DKPValue value={(p.total_dkp || 0) - (p.dkp_spent || 0)} size="sm" />
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <Input
                        type="date"
                        value={editCooldown}
                        onChange={(e) => setEditCooldown(e.target.value)}
                        className="w-36 h-7 text-xs bg-white/5 border-white/20 text-white"
                      />
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <Input
                        type="number"
                        value={editPower}
                        onChange={(e) => setEditPower(e.target.value)}
                        className="w-28 h-7 text-xs bg-white/5 border-white/20 text-white"
                        placeholder="Power"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => saveEdit(p)} className="text-emerald-400 hover:text-emerald-300 p-1">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-300 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5 text-sm font-medium text-white">{p.name}</td>
                    <td className="px-3 py-2.5"><DKPValue value={(p.total_dkp || 0) - (p.dkp_spent || 0)} size="sm" /></td>
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <StatusBadge cooldownUntil={p.cooldown_until} />
                        {p.cooldown_until && new Date(p.cooldown_until) > new Date() && (
                          <button
                            onClick={() => { if (confirm(`Clear cooldown for ${p.name}?`)) updateMutation.mutate({ id: p.id, data: { cooldown_until: null } }); }}
                            className="text-gray-600 hover:text-red-400 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <span className="text-sm text-gray-400 font-mono">{p.power?.toLocaleString() || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(p)}
                          className="p-1.5 rounded hover:bg-white/5 text-gray-500 hover:text-amber-400 transition-colors"
                          title="Edit"
                          >
                          <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                          onClick={() => { if (confirm(`Delete ${p.name}?`)) deleteMutation.mutate(p.id); }}
                          className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}