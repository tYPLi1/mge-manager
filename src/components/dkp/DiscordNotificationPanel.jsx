import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function DiscordNotificationPanel() {
  const [auctionId, setAuctionId] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [totalDkp, setTotalDkp] = useState("");
  const [playersCount, setPlayersCount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleAuctionNotif = async () => {
    if (!auctionId) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('notifyAuctionOpened', { auctionId });
      setResult(`✅ Auction notification sent`);
    } catch (e) {
      setResult(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResultsNotif = async () => {
    if (!auctionId) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('notifyAuctionResults', { auctionId });
      setResult(`✅ Results notification sent`);
    } catch (e) {
      setResult(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEventNotif = async () => {
    if (!eventName || !eventDate) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('notifyEventUpload', {
        eventName,
        eventDate,
        playersUpdated: parseInt(playersCount) || 0,
        totalDkpDistributed: parseInt(totalDkp) || 0,
        rankings: [],
      });
      setResult(`✅ Event notification sent`);
    } catch (e) {
      setResult(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-5 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-4">📢 Manual Discord Notifications</h3>
        
        {/* Auction Notification */}
        <div className="space-y-3 mb-6 p-4 bg-white/5 rounded-lg">
          <h4 className="text-xs font-semibold text-amber-400 uppercase">Auction Opened</h4>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Auction ID</Label>
            <Input
              value={auctionId}
              onChange={(e) => setAuctionId(e.target.value)}
              placeholder="Auction ID"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <Button
            onClick={handleAuctionNotif}
            disabled={!auctionId || loading}
            size="sm"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" /> Send Auction Notification
          </Button>
        </div>

        {/* Results Notification */}
        <div className="space-y-3 mb-6 p-4 bg-white/5 rounded-lg">
          <h4 className="text-xs font-semibold text-emerald-400 uppercase">Auction Results</h4>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Auction ID</Label>
            <Input
              value={auctionId}
              onChange={(e) => setAuctionId(e.target.value)}
              placeholder="Auction ID"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <Button
            onClick={handleResultsNotif}
            disabled={!auctionId || loading}
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" /> Send Results Notification
          </Button>
        </div>

        {/* Event Upload Notification */}
        <div className="space-y-3 p-4 bg-white/5 rounded-lg">
          <h4 className="text-xs font-semibold text-purple-400 uppercase">Event Upload</h4>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Event Name</Label>
            <Input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g., Wonder Contest"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Event Date</Label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Players Updated</Label>
              <Input
                type="number"
                value={playersCount}
                onChange={(e) => setPlayersCount(e.target.value)}
                placeholder="0"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Total DKP</Label>
              <Input
                type="number"
                value={totalDkp}
                onChange={(e) => setTotalDkp(e.target.value)}
                placeholder="0"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <Button
            onClick={handleEventNotif}
            disabled={!eventName || !eventDate || loading}
            size="sm"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" /> Send Event Notification
          </Button>
        </div>

        {/* Result Message */}
        {result && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            result.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}