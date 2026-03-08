import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Search, Trash2, Edit2, Save, X, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/dkp/PageHeader";
import DKPValue from "@/components/dkp/DKPValue";
import StatusBadge from "@/components/dkp/StatusBadge";

export default function AdminPlayers() {
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editCooldown, setEditCooldown] = useState("");
  const [editingPowerId, setEditingPowerId] = useState(null);
  const [editPower, setEditPower] = useState("");
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

  const filtered = useMemo(() => {
    return search
      ? players.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()))
      : players;
  }, [players, search]);

  return (
    <div>
      <PageHeader title="Player Management" subtitle={`${players.length} players`} icon={Users} />

      {/* Add Player */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-4 mb-6">
        <div className="flex gap-3">
          <Input
            placeholder="New player name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 flex-1"
            onKeyDown={(e) => e.key === "Enter" && newName && createMutation.mutate(newName)}
          />
          <Button
            onClick={() => newName && createMutation.mutate(newName)}
            disabled={!newName || createMutation.isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Player
          </Button>
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
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Current DKP</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">Cooldown</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">Power</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5 text-sm font-medium text-white">{p.name}</td>
                  <td className="px-3 py-2.5"><DKPValue value={(p.total_dkp || 0) - (p.dkp_spent || 0)} size="sm" /></td>
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={editCooldown}
                          onChange={(e) => setEditCooldown(e.target.value)}
                          className="w-40 h-7 text-xs bg-white/5 border-white/10 text-white"
                        />
                        <button onClick={() => updateMutation.mutate({ id: p.id, data: { cooldown_until: editCooldown || null } })} className="text-emerald-400 hover:text-emerald-300"><Save className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-300"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <StatusBadge cooldownUntil={p.cooldown_until} />
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    {editingPowerId === p.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          value={editPower}
                          onChange={(e) => setEditPower(e.target.value)}
                          className="w-32 h-7 text-xs bg-white/5 border-white/10 text-white"
                        />
                        <button onClick={() => { updateMutation.mutate({ id: p.id, data: { power: parseInt(editPower) || 0 } }); setEditingPowerId(null); }} className="text-emerald-400 hover:text-emerald-300"><Save className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingPowerId(null)} className="text-gray-500 hover:text-gray-300"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-gray-400 font-mono">{p.power?.toLocaleString() || "—"}</span>
                        <button onClick={() => { setEditingPowerId(p.id); setEditPower(String(p.power || 0)); }} className="text-gray-600 hover:text-amber-400 transition-colors">
                          <Zap className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingId(p.id); setEditCooldown(p.cooldown_until || ""); }}
                        className="p-1.5 rounded hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}