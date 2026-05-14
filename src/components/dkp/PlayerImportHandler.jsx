import React, { useRef, useState } from "react";
import { adminEntities } from "@/components/adminApi";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";
import ImportPreview from "@/components/dkp/ImportPreview";
import { useTranslation } from "@/lib/i18n";

// Normalize date values from Excel (could be serial number, Date, or string)
function normalizeDateValue(val) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") {
    const d = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  const str = String(val).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}\s/.test(str)) return str.split(/[\sT]/)[0];
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  return str;
}

function normalizeCooldown(val) {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}\s/.test(str)) return str.split(/[\sT]/)[0];
  return str;
}

export default function PlayerImportHandler({
  players,
  penalties,
  transactions,
  alliances,
  settings,
  queryClient,
}) {
  const { t } = useTranslation();
  const fileRef = useRef();
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      await processImportFile(file);
    } catch (err) {
      console.error("Import error:", err);
      alert("Fehler beim Import: " + err.message);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const processImportFile = async (file) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const preview = [];

    // Process Players sheet — header-based column detection
    if (wb.Sheets["Players"]) {
      const allRows = XLSX.utils.sheet_to_json(wb.Sheets["Players"], { header: 1 });
      const headerRow = (allRows[0] || []).map(h => String(h).trim().toLowerCase());
      const col = (label) => headerRow.indexOf(label.toLowerCase());
      const nameCol = col("name");
      if (nameCol === -1) { alert("Players sheet missing 'Name' column."); return; }
      const newNameCol = col("new name");
      const newAllianceCol = col("new alliance");
      const dkpEarnedCol = col("dkp earned");
      const dkpSpentCol = col("dkp spent");
      const cooldownCol = headerRow.findIndex(h => h.includes("cooldown"));
      const powerCol = col("power");
      const meritsCol = col("merits");
      const allianceCol = col("alliance");
      const updatedCol = headerRow.findIndex(h => h.includes("last updated") || h.includes("updated"));
      const deleteCol = headerRow.findIndex(h => h.includes("delete player") || h === "delete");

      const rows = allRows.slice(1);
      const playersMap = new Map(players.map(p => [p.name.toLowerCase(), p]));

      const isTruthyDeleteFlag = (val) => {
        if (val === null || val === undefined) return false;
        const s = String(val).trim().toLowerCase();
        return ["true", "x", "1", "yes", "ja", "y"].includes(s);
      };

      for (const row of rows) {
        const name = row[nameCol]?.toString().trim();
        if (!name) continue;

        // Check delete flag first — if set on an existing player, mark for deletion and skip update logic
        if (deleteCol !== -1 && isTruthyDeleteFlag(row[deleteCol])) {
          const existing = players.find(p => p.name?.trim().toLowerCase() === name.toLowerCase());
          if (existing) {
            preview.push({ type: "delete", entity: "player", id: existing.id, name: existing.name });
            continue;
          }
        }

        const hasNewName = newNameCol !== -1;
        const hasNewAlliance = newAllianceCol !== -1;
        const hasDkpEarned = dkpEarnedCol !== -1;
        const hasDkpSpent = dkpSpentCol !== -1;
        const hasCooldown = cooldownCol !== -1;
        const hasPower = powerCol !== -1;
        const hasMerits = meritsCol !== -1;
        const hasAlliance = allianceCol !== -1;
        const hasUpdated = updatedCol !== -1;

        const newNameVal = hasNewName ? (row[newNameCol]?.toString().trim() || "") : "";
        const newAllianceVal = hasNewAlliance ? (row[newAllianceCol]?.toString().trim() || "") : "";
        const dkpEarned = hasDkpEarned ? (Math.round(Number(row[dkpEarnedCol])) || 0) : null;
        const dkpSpent = hasDkpSpent ? (Math.round(Number(row[dkpSpentCol])) || 0) : null;
        const rawCooldown = hasCooldown ? row[cooldownCol] : null;
        const cooldown = hasCooldown ? normalizeDateValue(rawCooldown) : null;
        const power = hasPower ? (row[powerCol] !== undefined && row[powerCol] !== null && row[powerCol] !== "" ? Math.round(Number(row[powerCol])) || 0 : null) : null;
        const merits = hasMerits ? (row[meritsCol] !== undefined && row[meritsCol] !== null && row[meritsCol] !== "" ? Math.round(Number(row[meritsCol])) || 0 : null) : null;
        const allianceVal = hasAlliance ? (row[allianceCol]?.toString().trim() || "") : null;
        const fileUpdatedDate = hasUpdated ? row[updatedCol]?.toString().trim() : null;

        const existing = playersMap.get(name.toLowerCase()) ||
          players.find(p => p.name?.trim().toLowerCase() === name.toLowerCase());
        if (!existing) {
          preview.push({
            type: "new",
            entity: "player",
            name: newNameVal || name,
            total_dkp: dkpEarned ?? 0,
            dkp_spent: dkpSpent ?? 0,
            cooldown_until: cooldown,
            power: power ?? 0,
            merits: merits ?? 0,
            alliance: newAllianceVal || allianceVal || null,
          });
        } else {
          if (fileUpdatedDate && existing.updated_date && fileUpdatedDate < existing.updated_date) {
            preview.push({ type: "outdated", entity: "player", id: existing.id, name, fileDate: fileUpdatedDate, dbDate: existing.updated_date });
            continue;
          }

          const changes = {};
          // New Name takes priority over Name change
          if (newNameVal && newNameVal !== existing.name) {
            changes.name = { old: existing.name, new: newNameVal };
          }
          // New Alliance takes priority over Alliance change
          if (newAllianceVal) {
            if ((existing.alliance || "") !== newAllianceVal) {
              changes.alliance = { old: existing.alliance || "", new: newAllianceVal };
            }
          } else if (hasAlliance && (existing.alliance || "") !== (allianceVal || "")) {
            changes.alliance = { old: existing.alliance || "", new: allianceVal || "" };
          }
          if (hasDkpEarned && (existing.total_dkp || 0) !== dkpEarned) changes.total_dkp = { old: existing.total_dkp || 0, new: dkpEarned };
          if (hasDkpSpent && (existing.dkp_spent || 0) !== dkpSpent) changes.dkp_spent = { old: existing.dkp_spent || 0, new: dkpSpent };
          if (hasCooldown && normalizeCooldown(existing.cooldown_until) !== cooldown) changes.cooldown_until = { old: existing.cooldown_until, new: cooldown };
          if (hasPower && (existing.power || 0) !== power) changes.power = { old: existing.power || 0, new: power };
          if (hasMerits && (existing.merits || 0) !== merits) changes.merits = { old: existing.merits || 0, new: merits };

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
        const offenseDate = normalizeDateValue(row[3]);
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
          const eventDate = normalizeDateValue(row[dateCol]) || "";
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
  };

  const confirmImport = async (items) => {
    setImporting(true);
    try {
      const newPlayers = items.filter(p => p.type === "new" && p.entity === "player").map(({ type, entity, ...rest }) => rest);
      const playerUpdates = items.filter(p => p.type === "update" && p.entity === "player");
      const newPenalties = items.filter(p => p.type === "new" && p.entity === "penalty").map(({ type, entity, ...rest }) => rest);
      const penaltyUpdates = items.filter(p => p.type === "update" && p.entity === "penalty");
      let playerDeletions = items.filter(p => p.type === "delete" && p.entity === "player");

      // Extra confirmation for player deletions
      if (playerDeletions.length > 0) {
        const names = playerDeletions.map(p => p.name).join(", ");
        const okDelete = confirm(
          t("adminImport.deleteConfirm", { count: playerDeletions.length, names })
        );
        if (!okDelete) {
          playerDeletions = [];
        }
      }

      // Detect unknown alliances from new players + alliance changes in updates
      const knownAllianceNames = new Set(alliances.map(a => a.name));
      const unknownAlliancesSet = new Set();
      for (const p of newPlayers) {
        if (p.alliance && !knownAllianceNames.has(p.alliance)) unknownAlliancesSet.add(p.alliance);
      }
      for (const u of playerUpdates) {
        const a = u.changes?.alliance?.new;
        if (a && !knownAllianceNames.has(a)) unknownAlliancesSet.add(a);
      }
      const unknownAlliances = [...unknownAlliancesSet];
      if (unknownAlliances.length > 0) {
        const ok = confirm(
          `${unknownAlliances.length} unknown alliance(s) found in the import:\n\n` +
          `${unknownAlliances.join(", ")}\n\n` +
          `Click OK to automatically create these alliances and continue.\n` +
          `Click Cancel to abort the import.`
        );
        if (!ok) { setImporting(false); return; }
        const allianceSetting = settings.find(s => s.key === "alliances");
        const next = [
          ...alliances,
          ...unknownAlliances.map(name => ({ name, color: "#f59e0b" })),
        ];
        if (allianceSetting?.id) {
          await adminEntities.AppSettings.update(allianceSetting.id, { value: JSON.stringify(next) });
        } else {
          await adminEntities.AppSettings.create({ key: "alliances", value: JSON.stringify(next) });
        }
        await queryClient.invalidateQueries({ queryKey: ["settings"] });
      }

      if (newPlayers.length > 0) {
        await adminEntities.Player.bulkCreate(newPlayers);
      }

      // Execute player deletions (already confirmed above)
      for (const item of playerDeletions) {
        await adminEntities.Player.delete(item.id);
      }

      for (const item of playerUpdates) {
        const updateData = {};
        Object.entries(item.changes).forEach(([key, { new: val }]) => {
          updateData[key] = val;
        });
        if (item.changes.power) {
          await adminEntities.PowerHistory.create({
            player_id: item.id,
            player_name: item.changes.name?.new || item.name,
            power: item.changes.power.new,
            recorded_at: new Date().toISOString().split("T")[0],
            source: "import",
          });
        }
        if (item.changes.merits) {
          await adminEntities.MeritsHistory.create({
            player_id: item.id,
            player_name: item.changes.name?.new || item.name,
            merits: item.changes.merits.new,
            recorded_at: new Date().toISOString().split("T")[0],
            source: "import",
          });
        }
        await adminEntities.Player.update(item.id, updateData);
      }

      if (newPenalties.length > 0) {
        const allPlayers = await adminEntities.Player.list("name", 500);
        const pMap = new Map(allPlayers.map(p => [p.name.toLowerCase(), p]));
        const penaltiesToCreate = newPenalties.map(p => {
          const player = pMap.get((p.player_name || "").toLowerCase());
          return { ...p, player_id: player?.id };
        }).filter(p => p.player_id);
        if (penaltiesToCreate.length > 0) {
          await adminEntities.Penalty.bulkCreate(penaltiesToCreate);
        }
      }

      for (const item of penaltyUpdates) {
        const updateData = {};
        Object.entries(item.changes).forEach(([key, { new: val }]) => {
          updateData[key] = val;
        });
        await adminEntities.Penalty.update(item.id, updateData);
      }

      const newTransactions = items.filter(p => p.type === "new" && p.entity === "transaction");
      if (newTransactions.length > 0) {
        const allPlayers = await adminEntities.Player.list("name", 500);
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

        for (let i = 0; i < txBatch.length; i += 50) {
          await adminEntities.DKPTransaction.bulkCreate(txBatch.slice(i, i + 50));
        }
      }

      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["penalties"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-export"] });
      setPreviewData(null);
      const parts = [];
      if (newPlayers.length) parts.push(`${newPlayers.length} new players`);
      if (playerUpdates.length) parts.push(`${playerUpdates.length} player updates`);
      if (playerDeletions.length) parts.push(`${playerDeletions.length} players deleted`);
      if (newPenalties.length) parts.push(`${newPenalties.length} new penalties`);
      if (penaltyUpdates.length) parts.push(`${penaltyUpdates.length} penalty updates`);
      if (newTransactions.length) parts.push(`${newTransactions.length} DKP transactions`);
      alert(parts.join(", ") || "Nothing imported.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      {previewData && (
        <ImportPreview
          preview={previewData}
          onConfirm={confirmImport}
          onCancel={() => setPreviewData(null)}
        />
      )}
      <Button
        variant="outline"
        className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
        onClick={() => fileRef.current?.click()}
        disabled={importing}
      >
        <Upload className="w-4 h-4 mr-1" /> {importing ? "Importing..." : "Import File"}
      </Button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
    </>
  );
}