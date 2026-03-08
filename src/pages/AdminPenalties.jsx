import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Plus, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/dkp/PageHeader";
import DKPValue from "@/components/dkp/DKPValue";

export default function AdminPenalties() {
  const [playerId, setPlayerId] = useState("");
  const [level, setLevel] = useState("1");
  const [offenseCount, setOffenseCount] = useState("1");
  const [dkpDeducted, setDkpDeducted] = useState("0");
  const [offenseDate, setOffenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("name", 500),
  });

  const { data: penalties = [] } = useQuery({
    queryKey: ["penalties"],
    queryFn: () => base44.entities.Penalty.list("-offense_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const player = players.find((p) => p.id === data.player_id);
      await base44.entities.Penalty.create({
        ...data,
        player_name: player?.name,
      });
      // Deduct DKP if applicable
      if (data.dkp_deducted > 0) {
        await base44.entities.DKPTransaction.create({
          player_id: data.player_id,
          player_name: player?.name,
          amount: -data.dkp_deducted,
          type: "penalty",
          source: `Level ${data.level} Penalty`,
          event_date: data.offense_date,
          note: data.note,
        });
        await base44.entities.Player.update(data.player_id, {
          total_dkp: (player?.total_dkp || 0) - data.dkp_deducted,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["penalties"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setPlayerId("");
      setNote("");
      setDkpDeducted("0");
    },
  });

  const resetMutation = useMutation({
    mutationFn: (id) => base44.entities.Penalty.update(id, { status: "reset" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["penalties"] }),
  });

  const handleCreate = () => {
    if (!playerId) return;
    createMutation.mutate({
      player_id: playerId,
      level: parseInt(level),
      offense_count: parseInt(offenseCount),
      dkp_deducted: parseInt(dkpDeducted) || 0,
      offense_date: offenseDate,
      note,
      status: "probation",
    });
  };

  const activePenalties = penalties.filter((p) => p.status === "probation");

  return (
    <div>
      <PageHeader title="Penalty Management" icon={Shield} />

      {/* Apply Penalty */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Apply Penalty</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Player</Label>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select player..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {players.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Level 1 — Significant</SelectItem>
                <SelectItem value="2">Level 2 — Major</SelectItem>
                <SelectItem value="3">Level 3 — Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Offense Count</Label>
            <Input type="number" min="1" value={offenseCount} onChange={(e) => setOffenseCount(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">DKP to Deduct</Label>
            <Input type="number" min="0" value={dkpDeducted} onChange={(e) => setDkpDeducted(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Offense Date</Label>
            <Input type="date" value={offenseDate} onChange={(e) => setOffenseDate(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
        </div>
        <Button onClick={handleCreate} disabled={!playerId || createMutation.isPending} className="mt-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Apply Penalty
        </Button>
      </div>

      {/* Active Penalties */}
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Active Penalties ({activePenalties.length})</h3>
      <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0d1117] border-b border-white/5">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Player</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Level</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Offense #</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">Date</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">DKP</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase w-20">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {activePenalties.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2.5 text-sm font-medium text-white">{p.player_name}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                    p.level === 1 ? "bg-yellow-500/15 text-yellow-400" :
                    p.level === 2 ? "bg-orange-500/15 text-orange-400" :
                    "bg-red-500/15 text-red-400"
                  }`}>L{p.level}</span>
                </td>
                <td className="px-3 py-2.5 text-sm text-gray-300 font-mono">{p.offense_count}</td>
                <td className="px-3 py-2.5 text-xs text-gray-400 hidden sm:table-cell">{p.offense_date}</td>
                <td className="px-3 py-2.5 hidden sm:table-cell">
                  {p.dkp_deducted ? <DKPValue value={-p.dkp_deducted} size="sm" showSign /> : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <Button size="sm" variant="outline" onClick={() => resetMutation.mutate(p.id)} className="border-white/10 text-gray-300 text-xs hover:bg-white/5 h-7">
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {activePenalties.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">No active penalties</div>
        )}
      </div>
    </div>
  );
}