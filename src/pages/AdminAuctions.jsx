import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gavel, Plus, Play, Square, Eye, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/dkp/PageHeader";
import DKPValue from "@/components/dkp/DKPValue";

export default function AdminAuctions() {
  const [title, setTitle] = useState("");
  const [scheduledClose, setScheduledClose] = useState("");
  const [password, setPassword] = useState("");
  const [viewBids, setViewBids] = useState(null);
  const queryClient = useQueryClient();

  const { data: auctions = [] } = useQuery({
    queryKey: ["auctions"],
    queryFn: () => base44.entities.Auction.list("-created_date", 50),
  });

  const { data: bids = [] } = useQuery({
    queryKey: ["bids", viewBids?.id],
    queryFn: () => viewBids ? base44.entities.Bid.filter({ auction_id: viewBids.id }, "-dkp_bid", 100) : [],
    enabled: !!viewBids,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Auction.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["auctions"] }); setTitle(""); setScheduledClose(""); setPassword(""); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Auction.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auctions"] }),
  });

  const handleCreate = () => {
    createMutation.mutate({
      title,
      status: "draft",
      scheduled_close: scheduledClose || null,
      bid_password: password || null,
      has_password: !!password,
    });
  };

  return (
    <div>
      <PageHeader title="Auction Management" icon={Gavel} />

      {/* Create Auction */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Create New Auction</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. MGE Round 15" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Close Date/Time (UTC)</Label>
            <Input type="datetime-local" value={scheduledClose} onChange={(e) => setScheduledClose(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Password (Optional)</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave empty for none" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
        </div>
        <Button onClick={handleCreate} disabled={!title || createMutation.isPending} className="mt-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Create Auction
        </Button>
      </div>

      {/* Auction List */}
      <div className="space-y-3 mb-6">
        {auctions.map((a) => (
          <div key={a.id} className="bg-[#111827] rounded-xl border border-white/5 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-white text-sm">{a.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    a.status === "open" ? "bg-emerald-500/15 text-emerald-400" :
                    a.status === "closed" ? "bg-red-500/15 text-red-400" :
                    a.status === "confirmed" ? "bg-blue-500/15 text-blue-400" :
                    "bg-gray-500/15 text-gray-400"
                  }`}>
                    {a.status}
                  </span>
                  {a.scheduled_close && <span className="text-xs text-gray-500">Close: {new Date(a.scheduled_close).toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {a.status === "draft" && (
                  <Button size="sm" onClick={() => statusMutation.mutate({ id: a.id, status: "open" })} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                    <Play className="w-3 h-3 mr-1" /> Open
                  </Button>
                )}
                {a.status === "open" && (
                  <Button size="sm" onClick={() => statusMutation.mutate({ id: a.id, status: "closed" })} className="bg-red-600 hover:bg-red-700 text-white text-xs">
                    <Square className="w-3 h-3 mr-1" /> Close
                  </Button>
                )}
                {(a.status === "open" || a.status === "closed") && (
                  <Button size="sm" variant="outline" onClick={() => setViewBids(viewBids?.id === a.id ? null : a)} className="border-white/10 text-gray-300 text-xs hover:bg-white/5">
                    <Eye className="w-3 h-3 mr-1" /> Bids
                  </Button>
                )}
              </div>
            </div>

            {/* Bids Table */}
            {viewBids?.id === a.id && (
              <div className="mt-4 border-t border-white/5 pt-4">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">#</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">Player</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">DKP Bid</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">MGE Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bids.filter((b) => !b.is_deleted).map((b, i) => (
                      <tr key={b.id}>
                        <td className="px-2 py-1.5 text-xs text-gray-500">{i + 1}</td>
                        <td className="px-2 py-1.5 text-sm text-white">{b.player_name}</td>
                        <td className="px-2 py-1.5"><DKPValue value={b.dkp_bid} size="sm" /></td>
                        <td className="px-2 py-1.5 text-sm text-gray-400">{b.mge_score || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bids.filter((b) => !b.is_deleted).length === 0 && (
                  <p className="text-center text-gray-500 text-xs py-4">No bids yet</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}