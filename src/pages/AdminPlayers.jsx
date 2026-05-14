import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Search, Trash2, Edit2, Save, X, XCircle, Download, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/dkp/PageHeader";
import DKPValue from "@/components/dkp/DKPValue";
import StatusBadge from "@/components/dkp/StatusBadge";
import PlayerImportHandler from "@/components/dkp/PlayerImportHandler";
import { useTranslation } from "@/lib/i18n";
import * as XLSX from "xlsx";

function parseAllianceList(json) {
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

export default function AdminPlayers() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [allianceFilter, setAllianceFilter] = useState("all");
  const [templateDownloadAlliance, setTemplateDownloadAlliance] = useState("__all__");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCooldown, setEditCooldown] = useState("");
  const [editPower, setEditPower] = useState("");
  const [editAlliance, setEditAlliance] = useState("");
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => adminEntities.AppSettings.list(),
  });

  const alliances = useMemo(
    () => parseAllianceList(settings.find(s => s.key === "alliances")?.value),
    [settings]
  );
  const allianceColors = useMemo(() => {
    const map = {};
    alliances.forEach(a => { map[a.name] = a.color; });
    return map;
  }, [alliances]);

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
    mutationFn: (name) => adminEntities.Player.create({ name, total_dkp: 0, dkp_spent: 0 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["players"] }); setNewName(""); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminEntities.Player.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["players"] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminEntities.Player.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["players"] }),
  });

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditName(p.name || "");
    setEditCooldown(p.cooldown_until || "");
    setEditPower(String(p.power || 0));
    setEditAlliance(p.alliance || "");
  };

  const saveEdit = async (p) => {
    const newPower = parseInt(editPower) || 0;
    if (newPower !== (p.power || 0)) {
      await adminEntities.PowerHistory.create({
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
        alliance: editAlliance || null,
      },
    });
  };

  // Filter players for template/export downloads
  const getFilteredPlayersForDownload = () => {
    if (templateDownloadAlliance === "__all__") return players;
    if (templateDownloadAlliance === "__none__") return players.filter(p => !p.alliance);
    return players.filter(p => p.alliance === templateDownloadAlliance);
  };

  const allianceSuffix = () => {
    if (templateDownloadAlliance === "__all__") return "ALL";
    if (templateDownloadAlliance === "__none__") return "NoAlliance";
    return templateDownloadAlliance.replace(/[^a-z0-9]/gi, "_");
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const filtered = getFilteredPlayersForDownload();

    // Sort: alliance asc (empty last), then by power desc
    const sorted = [...filtered].sort((a, b) => {
      const aAll = (a.alliance || "").toLowerCase();
      const bAll = (b.alliance || "").toLowerCase();
      if (aAll === "" && bAll !== "") return 1;
      if (bAll === "" && aAll !== "") return -1;
      if (aAll !== bAll) return aAll.localeCompare(bAll);
      return (b.power || 0) - (a.power || 0);
    });

    // Players sheet — pre-filled with current data and empty New Name / New Alliance columns
    const playerRows = sorted.map(p => [
      p.name,
      p.alliance || "",
      "",                       // New Name
      "",                       // New Alliance
      p.total_dkp || 0,
      p.dkp_spent || 0,
      p.cooldown_until || "",
      p.power || 0,
      "",
    ]);
    const playerWs = XLSX.utils.aoa_to_sheet([
      ["Name", "Alliance", "New Name", "New Alliance", "DKP Earned", "DKP Spent", "Cooldown (YYYY-MM-DD)", "Power", "Last Updated"],
      ...playerRows,
    ]);
    playerWs["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 20 }];
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

    XLSX.writeFile(wb, `Players-Template_${allianceSuffix()}.xlsx`);
  };

  const downloadCurrent = () => {
    const wb = XLSX.utils.book_new();
    const filtered = getFilteredPlayersForDownload();

    // Players sheet — sorted by alliance, then by power desc
    const sortedPlayers = [...filtered].sort((a, b) => {
      const aAll = (a.alliance || "").toLowerCase();
      const bAll = (b.alliance || "").toLowerCase();
      if (aAll === "" && bAll !== "") return 1;
      if (bAll === "" && aAll !== "") return -1;
      if (aAll !== bAll) return aAll.localeCompare(bAll);
      return (b.power || 0) - (a.power || 0);
    });
    const playerData = sortedPlayers.map(p => [
      p.name,
      "",                       // New Name
      p.alliance || "",
      "",                       // New Alliance
      p.power || 0,
      p.updated_date || "",
      "",                       // Delete Player (set to TRUE / X / 1 to delete on import)
    ]);
    const playerWs = XLSX.utils.aoa_to_sheet([
      ["Name", "New Name", "Alliance", "New Alliance", "Power", "Last Updated", "Delete Player"],
      ...playerData,
    ]);
    playerWs["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, playerWs, "Players");

    // Available Alliances sheet — reference list of configured alliances
    const allianceRows = alliances.map(a => [a.name]);
    const allianceWs = XLSX.utils.aoa_to_sheet([
      ["Existing Alliances"],
      ...allianceRows,
    ]);
    allianceWs["!cols"] = [{ wch: 25 }];
    XLSX.utils.book_append_sheet(wb, allianceWs, "Available Alliances");

    XLSX.writeFile(wb, `Players-State-${allianceSuffix()}-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const filtered = useMemo(() => {
    let res = players;
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(p => p.name?.toLowerCase().includes(q));
    }
    if (allianceFilter !== "all") {
      if (allianceFilter === "__none__") {
        res = res.filter(p => !p.alliance);
      } else {
        res = res.filter(p => p.alliance === allianceFilter);
      }
    }
    // Sort: alliance asc (empty last), then current DKP desc
    return [...res].sort((a, b) => {
      const aAll = a.alliance || "";
      const bAll = b.alliance || "";
      if (aAll === "" && bAll !== "") return 1;
      if (bAll === "" && aAll !== "") return -1;
      if (aAll !== bAll) return aAll.localeCompare(bAll);
      const aDkp = (a.total_dkp || 0) + (a.dkp_spent || 0);
      const bDkp = (b.total_dkp || 0) + (b.dkp_spent || 0);
      return bDkp - aDkp;
    });
  }, [players, search, allianceFilter]);

  return (
    <div>
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

        {/* Alliance selector for downloads */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">Template/Export Alliance:</span>
          <select
            value={templateDownloadAlliance}
            onChange={(e) => setTemplateDownloadAlliance(e.target.value)}
            className="bg-[#1f2937] border border-white/10 rounded-md px-3 py-1.5 text-sm text-white"
          >
            <option value="__all__" className="bg-[#1f2937] text-white">All Players</option>
            {alliances.map(a => (
              <option key={a.name} value={a.name} className="bg-[#1f2937] text-white">{a.name}</option>
            ))}
            <option value="__none__" className="bg-[#1f2937] text-white">No Alliance</option>
          </select>
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
          <PlayerImportHandler
            players={players}
            penalties={penalties}
            transactions={transactions}
            alliances={alliances}
            settings={settings}
            queryClient={queryClient}
          />
        </div>
      </div>

      {/* Search + Alliance Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 w-64"
          />
        </div>
        <div className="inline-flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={allianceFilter}
            onChange={(e) => setAllianceFilter(e.target.value)}
            className="bg-[#1f2937] border border-white/10 rounded-md px-3 py-2 text-sm text-white"
          >
            <option value="all" className="bg-[#1f2937] text-white">{t("admin.alliances.filterAll")}</option>
            {alliances.map(a => (
              <option key={a.name} value={a.name} className="bg-[#1f2937] text-white">{a.name}</option>
            ))}
            <option value="__none__" className="bg-[#1f2937] text-white">{t("admin.alliances.filterNone")}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0d1117] border-b border-white/5">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Name</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">{t("admin.alliances.column")}</th>
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
                      <select
                        value={editAlliance}
                        onChange={(e) => setEditAlliance(e.target.value)}
                        className="h-7 text-xs bg-[#1f2937] border border-white/20 rounded text-white px-2 w-32"
                      >
                        <option value="" className="bg-[#1f2937] text-white">—</option>
                        {alliances.map(a => (
                          <option key={a.name} value={a.name} className="bg-[#1f2937] text-white">{a.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <DKPValue value={(p.total_dkp || 0) + (p.dkp_spent || 0)} size="sm" />
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
                    <td className="px-3 py-2.5">
                      {p.alliance ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                          style={{
                            color: allianceColors[p.alliance] || "#f59e0b",
                            borderColor: (allianceColors[p.alliance] || "#f59e0b") + "40",
                            background: (allianceColors[p.alliance] || "#f59e0b") + "15",
                          }}
                        >
                          {p.alliance}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5"><DKPValue value={(p.total_dkp || 0) + (p.dkp_spent || 0)} size="sm" /></td>
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