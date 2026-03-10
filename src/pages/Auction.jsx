import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Gavel, Clock, Send, Lock, AlertTriangle, Ban, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/dkp/PageHeader";
import PlayerSearchSelect from "@/components/dkp/PlayerSearchSelect";

function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) { setTimeLeft("Closed"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d > 0 ? d + "d " : ""}${h}h ${m}m ${s}s`);
    };
    calc();
    const i = setInterval(calc, 1000);
    return () => clearInterval(i);
  }, [targetDate]);
  return <span className="font-mono text-amber-400 text-lg font-bold">{timeLeft}</span>;
}

export default function Auction() {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [mgeScore, setMgeScore] = useState("");
  const [bidPassword, setBidPassword] = useState("");
  const [wantFriendlyZone, setWantFriendlyZone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bidError, setBidError] = useState("");

  const { data: auctions = [] } = useQuery({
    queryKey: ["auctions"],
    queryFn: () => base44.entities.Auction.list("-created_date", 10),
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("name", 500),
  });

  const currentAuction = useMemo(() => {
    return auctions.find((a) => a.status === "open") || auctions.find((a) => a.status === "closed") || auctions.find((a) => a.status === "draft");
  }, [auctions]);

  const selectedPlayerData = useMemo(() => {
    return players.find((p) => p.id === selectedPlayer);
  }, [players, selectedPlayer]);

  const isOnCooldown = useMemo(() => {
    if (!selectedPlayerData?.cooldown_until) return false;
    return new Date(selectedPlayerData.cooldown_until) > new Date();
  }, [selectedPlayerData]);

  const isAuctionBanned = selectedPlayerData?.auction_ban_count > 0;
  const currentDkp = selectedPlayerData ? (selectedPlayerData.total_dkp - selectedPlayerData.dkp_spent) : 0;
  const bidTooHigh = bidAmount && parseInt(bidAmount) > currentDkp;

  const handleSubmit = async () => {
    if (!selectedPlayer || !bidAmount || !currentAuction) return;
    setBidError("");

    // Validate password
    if (currentAuction.has_password && bidPassword !== currentAuction.bid_password) {
      setBidError("Incorrect auction password.");
      return;
    }
    // Validate DKP
    if (parseInt(bidAmount) > currentDkp) {
      setBidError(`Insufficient DKP. You have ${currentDkp} available.`);
      return;
    }

    setSubmitting(true);
    await base44.entities.Bid.create({
      auction_id: currentAuction.id,
      player_id: selectedPlayer,
      player_name: selectedPlayerData?.name,
      dkp_bid: parseInt(bidAmount),
      mge_score: mgeScore ? parseInt(mgeScore) : null,
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (!currentAuction) {
    return (
      <div>
        <PageHeader title="MGE Auction" icon={Gavel} />
        <div className="bg-[#111827] rounded-xl border border-white/5 p-12 text-center">
          <Gavel className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-400 mb-2">No Active Auction</h2>
          <p className="text-gray-500 text-sm">Check back later for the next MGE auction.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="MGE Auction" subtitle={currentAuction.title} icon={Gavel} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Auction Info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2.5 h-2.5 rounded-full ${
                currentAuction.status === "open" ? "bg-emerald-400 animate-pulse" :
                currentAuction.status === "closed" ? "bg-red-400" : "bg-gray-500"
              }`} />
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-300">
                {currentAuction.status}
              </span>
            </div>

            {currentAuction.status === "open" && currentAuction.scheduled_close && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Closes in</p>
                <CountdownTimer targetDate={currentAuction.scheduled_close} />
              </div>
            )}

            {currentAuction.has_password && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <Lock className="w-3.5 h-3.5" />
                Password required to bid
              </div>
            )}
          </div>

          {currentAuction.status === "closed" && (
            <div className="bg-[#111827] rounded-xl border border-white/5 p-5 text-center">
              <Clock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Bidding has closed. Results pending.</p>
            </div>
          )}
        </div>

        {/* Bid Form */}
        {currentAuction.status === "open" && (
          <div className="lg:col-span-2">
            <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                    <Send className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Bid Submitted!</h3>
                  <p className="text-sm text-gray-400">Your bid has been placed. Good luck!</p>
                  <Button onClick={() => { setSubmitted(false); setBidAmount(""); setMgeScore(""); setSelectedPlayer(""); }} variant="outline" className="mt-4 border-white/10 text-gray-300 hover:bg-white/5">
                    Place Another Bid
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <h3 className="text-base font-semibold text-white">Place Your Bid</h3>

                  <div>
                    <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Select Your Name</Label>
                    <PlayerSearchSelect players={players} value={selectedPlayer} onValueChange={setSelectedPlayer} placeholder="Namen eingeben..." />
                  </div>

                  {isOnCooldown && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      You are on cooldown until {selectedPlayerData.cooldown_until}. Bidding is disabled.
                    </div>
                  )}

                  {isAuctionBanned && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      <Ban className="w-3.5 h-3.5" />
                      You are auction-banned and cannot place bids.
                    </div>
                  )}

                  {selectedPlayerData && (
                    <div className="text-xs text-gray-500 bg-white/5 rounded-lg px-3 py-2">
                      Available DKP: <span className="text-amber-400 font-mono font-bold">{currentDkp}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">DKP Bid Amount</Label>
                      <Input
                        type="number"
                        min="1"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder="Enter DKP amount"
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">MGE Score (Optional)</Label>
                      <Input
                        type="number"
                        value={mgeScore}
                        onChange={(e) => setMgeScore(e.target.value)}
                        placeholder="Score"
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                      />
                    </div>
                  </div>

                  {currentAuction.has_password && (
                    <div>
                      <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Auction Password</Label>
                      <Input
                        type="password"
                        value={bidPassword}
                        onChange={(e) => setBidPassword(e.target.value)}
                        placeholder="Enter password"
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                      />
                    </div>
                  )}

                  {bidError && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5" /> {bidError}
                    </div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedPlayer || !bidAmount || isOnCooldown || isAuctionBanned || bidTooHigh || submitting}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
                  >
                    {submitting ? "Submitting..." : "Submit Bid"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}