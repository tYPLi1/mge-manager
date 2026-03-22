import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Plus } from "lucide-react";
import EventUpload from "@/components/dkp/EventUpload";
import DeleteEventData from "@/components/dkp/DeleteEventData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/dkp/PageHeader";

export default function AdminDKP() {
  const [playerId, setPlayerId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("earn");
  const [source, setSource] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("name", 500),
  });

  const { data: eventTypes = [] } = useQuery({
    queryKey: ["eventTypes"],
    queryFn: () => base44.entities.EventType.list("sort_order", 20),
  });

  useEffect(() => {
    const unsub1 = base44.entities.Player.subscribe(() => queryClient.invalidateQueries({ queryKey: ["players"] }));
    const unsub2 = base44.entities.EventType.subscribe(() => queryClient.invalidateQueries({ queryKey: ["eventTypes"] }));
    return () => { unsub1(); unsub2(); };
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const player = players.find((p) => p.id === data.player_id);
      await adminEntities.DKPTransaction.create({
        ...data,
        player_name: player?.name,
      });
      // Update player DKP
      const amt = parseInt(data.amount);
      if (data.type === "bid") {
        await adminEntities.Player.update(data.player_id, {
          dkp_spent: (player?.dkp_spent || 0) + Math.abs(amt),
        });
      } else {
        await adminEntities.Player.update(data.player_id, {
          total_dkp: (player?.total_dkp || 0) + amt,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setPlayerId("");
      setAmount("");
      setSource("");
      setNote("");
    },
  });

  const handleSubmit = () => {
    if (!playerId || !amount || !source) return;
    createMutation.mutate({
      player_id: playerId,
      amount: parseInt(amount),
      type,
      source,
      event_date: eventDate,
      note,
    });
  };

  return (
    <div>
      <PageHeader title="DKP Management" icon={History} />

      {/* Manual Adjustment */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Manual DKP Adjustment</h3>
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
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Amount</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50 or -10" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="earn">Earn</SelectItem>
                <SelectItem value="penalty">Penalty</SelectItem>
                <SelectItem value="bonus">Bonus</SelectItem>
                <SelectItem value="compensation">Compensation</SelectItem>
                <SelectItem value="king_allocation">King Allocation</SelectItem>
                <SelectItem value="bid">Bid (Deduct from Spent)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Source</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. MEE, GEE, KING" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Event Date</Label>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={!playerId || !amount || !source || createMutation.isPending} className="mt-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Apply Adjustment
        </Button>
      </div>

      <EventUpload players={players} eventTypes={eventTypes} />
      <UndoLastUpload />
    </div>
  );
}