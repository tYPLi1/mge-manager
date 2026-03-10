import React, { useState, useMemo, useRef } from "react";
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

  const saveEdit = (p) => {
    updateMutation.mutate({
      id: p.id,
      data: {
        name: editName.trim() || p.name,
        cooldown_until: editCooldown || null,
        power: parseInt(editPower) || 0,
      },
    });
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1);
    const existingNames = new Set(players.map(p => p.name.toLowerCase()));
    const newPlayers = [];
    for (const row of rows) {
      const name = row[0]?.toString().trim();
      if (!name) continue;
      if (!existingNames.has(name.toLowerCase())) {
        newPlayers.push({ name, total_dkp: 0, dkp_spent: 0 });
        existingNames.add(name.toLowerCase());
      }
    }
    if (newPlayers.length > 0) {
      await base44.entities.Player.bulkCreate(newPlayers);
      queryClient.invalidateQueries({ queryKey: ["players"] });
      alert(`${newPlayers.length} Spieler importiert.`);
    } else {
      alert("Keine neuen Spieler gefunden.");
    }
    setImporting(false);
    e.target.value = "";
  };

  const filtered = useMemo(() =>
    search ? players.filter(p => p.name?.toLowerCase().includes(search.toLowerCase())) : players,
    [players, search]
  );

  return (
    <div>
      <PageHeader title="Player Management" subtitle={`${players.length} Spieler`} icon={Users} />

      {/* Add Player + Import */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-4 mb-6">
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="Neuer Spielername..."
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
            <Plus className="w-4 h-4 mr-1" /> Hinzufügen
          </Button>
          <Button
            variant="outline"
            className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            <Upload className="w-4 h-4 mr-1" /> {importing ? "Importiere..." : "Excel importieren"}
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
        </div>
        <p className="text-xs text-gray-600 mt-2">Excel: Spalte A = Spielername (ab Zeile 2)</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Suchen..."
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
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase w-24">Aktionen</th>
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
                            onClick={() => { if (confirm(`Cooldown für ${p.name} löschen?`)) updateMutation.mutate({ id: p.id, data: { cooldown_until: null } }); }}
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
                          title="Bearbeiten"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`${p.name} löschen?`)) deleteMutation.mutate(p.id); }}
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