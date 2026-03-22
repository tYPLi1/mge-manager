import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gavel, Clock, Send, Lock, AlertTriangle, Ban, Users, CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/dkp/PageHeader";
import PlayerSearchSelect from "@/components/dkp/PlayerSearchSelect";

function ensureUTC(dateStr) {
  if (!dateStr) return dateStr;
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 11)) {
    return dateStr + 'Z';
  }
  return dateStr;
}

function formatUTCDate(dateStr) {
  if (!dateStr) return '';
  return new Date(ensureUTC(dateStr)).toLocaleString("de-CH", { timeZone: "UTC" }) + " UTC";
}

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!targetDate) { setTimeLeft(""); setExpired(false); return; }
    const calc = () => {
      const diff = new Date(ensureUTC(targetDate)) - new Date();
      if (diff <= 0) { setTimeLeft("—"); setExpired(true); return; }
      setExpired(false);
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
  return { timeLeft, expired };
}

// Compute effective status client-side based on scheduled times
function getEffectiveStatus(auction) {
  if (!auction) return null;
  const now = new Date();
  const { status, scheduled_open, scheduled_close } = auction;

  if (status === "draft" && scheduled_open) {
    const openAt = new Date(ensureUTC(scheduled_open));
    if (openAt <= now) {
      // Should be open — check close too
      if (scheduled_close && new Date(ensureUTC(scheduled_close)) <= now) return "closed";
      return "open";
    }
    return "draft";
  }

  if (status === "open" && scheduled_close) {
    if (new Date(ensureUTC(scheduled_close)) <= now) return "closed";
  }

  return status;
}

export default function Auction() {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [bidPassword, setBidPassword] = useState("");
  const [wantFriendlyZone, setWantFriendlyZone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bidError, setBidError] = useState("");
  const [tick, setTick] = useState(0);
  const queryClient = useQueryClient();

  const { data: auctions = [] } = useQuery({
    queryKey: ["auctions"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPublicAuctions", {});
      return res.data?.auctions || [];
    },
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("name", 500),
  });

  const { data: allBids = [] } = useQuery({
    queryKey: ["bids-public"],
    queryFn: () => base44.entities.Bid.list("-created_date", 2000),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPublicSettings", {});
      return res.data?.settings || [];
    },
  });

  // Pick the most relevant auction
  const rawAuction = useMemo(() => {
    return auctions.find((a) => a.status === "open") ||
           auctions.find((a) => a.status === "closed") ||
           auctions.find((a) => a.status === "draft");
  }, [auctions]);

  // Adaptive tick: 1s in last 5 min before open/close, otherwise 30s
  useEffect(() => {
    let timer;
    const schedule = () => {
      const now = Date.now();
      const fiveMin = 5 * 60 * 1000;
      let nearEvent = false;
      if (rawAuction) {
        const open = rawAuction.scheduled_open ? new Date(ensureUTC(rawAuction.scheduled_open)).getTime() : null;
        const close = rawAuction.scheduled_close ? new Date(ensureUTC(rawAuction.scheduled_close)).getTime() : null;
        if (open && open > now && (open - now) <= fiveMin) nearEvent = true;
        if (close && close > now && (close - now) <= fiveMin) nearEvent = true;
      }
      const interval = nearEvent ? 1000 : 30000;
      timer = setTimeout(() => {
        setTick(t => t + 1);
        schedule();
      }, interval);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [rawAuction]);

  // Compute effective status client-side (recomputed every tick)
  const effectiveStatus = useMemo(() => getEffectiveStatus(rawAuction), [rawAuction, tick]);
  const currentAuction = rawAuction ? { ...rawAuction, _effectiveStatus: effectiveStatus } : null;

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      queryClient.invalidateQueries({ queryKey: ["bids-public"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
    }, 10000);

    const unsub1 = base44.entities.Bid.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["bids-public"] });
    });
    const unsub2 = base44.entities.Player.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    });
    return () => {
      clearInterval(interval);
      unsub1();
      unsub2();
    };
  }, [queryClient]);

  const friendlyZoneEnabled = settings.find((s) => s.key === "friendly_zone_enabled")?.value === "true";
  const friendlyZoneThreshold = parseInt(settings.find((s) => s.key === "friendly_zone_threshold")?.value || "50");

  const selectedPlayerData = useMemo(() => players.find((p) => p.id === selectedPlayer), [players, selectedPlayer]);
  const isOnCooldown = useMemo(() => {
    if (!selectedPlayerData?.cooldown_until) return false;
    return new Date(selectedPlayerData.cooldown_until) > new Date();
  }, [selectedPlayerData]);
  const isAuctionBanned = selectedPlayerData?.auction_ban_count > 0;
  const currentDkp = selectedPlayerData ? (selectedPlayerData.total_dkp - selectedPlayerData.dkp_spent) : 0;
  const bidTooHigh = bidAmount && parseInt(bidAmount) > currentDkp;
  const eligibleForFriendlyZone = friendlyZoneEnabled && currentDkp <= friendlyZoneThreshold;

  const alreadyBid = useMemo(() => {
    if (!selectedPlayer || !currentAuction) return false;
    return allBids.some(
      (b) => b.player_id === selectedPlayer && b.auction_id === currentAuction?.id && !b.is_deleted
    );
  }, [allBids, selectedPlayer, currentAuction]);

  const handleSubmit = async () => {
    if (!selectedPlayer || !bidAmount || !currentAuction) return;
    setBidError("");
    if (alreadyBid) { setBidError("You have already placed a bid for this auction."); return; }
    if (parseInt(bidAmount) > currentDkp) { setBidError(`Not enough DKP. Available: ${currentDkp}`); return; }

    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("submitBid", {
        auction_id: currentAuction.id,
        player_id: selectedPlayer,
        dkp_bid: parseInt(bidAmount),
        bid_password: bidPassword || undefined,
        want_friendly_zone: eligibleForFriendlyZone ? wantFriendlyZone : false,
      });
      if (res.data?.error) { setBidError(res.data.error); setSubmitting(false); return; }
      setSubmitted(true);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Bid submission failed";
      setBidError(msg);
    }
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

  const es = currentAuction._effectiveStatus;

  // ── DRAFT: Upcoming auction info card ──
  if (es === "draft") {
    return <DraftView auction={currentAuction} />;
  }

  // ── CLOSED: Results pending ──
  if (es === "closed") {
    return <ClosedView auction={currentAuction} />;
  }

  // ── OPEN: Show bid form ──
  return (
    <div>
      <PageHeader title="MGE Auction" subtitle={currentAuction.title} icon={Gavel} />
      <div className="grid gap-6 lg:grid-cols-3">
        <OpenInfoPanel auction={currentAuction} />
        <div className="lg:col-span-2">
          <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                  <Send className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Bid Submitted!</h3>
                <p className="text-sm text-gray-400">Your bid has been placed. Good luck!</p>
                <Button onClick={() => { setSubmitted(false); setBidAmount(""); setSelectedPlayer(""); }} variant="outline" className="mt-4 border-white/10 text-gray-300 hover:bg-white/5">
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
                    You are on cooldown until {selectedPlayerData.cooldown_until} (UTC). Bidding is disabled.
                  </div>
                )}
                {isAuctionBanned && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <Ban className="w-3.5 h-3.5" />
                    You are banned and cannot place any bids.
                  </div>
                )}
                {alreadyBid && (
                  <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    You have already placed a bid for this auction.
                  </div>
                )}
                {selectedPlayerData && (
                  <div className="text-xs text-gray-500 bg-white/5 rounded-lg px-3 py-2">
                    Available DKP: <span className="text-amber-400 font-mono font-bold">{currentDkp}</span>
                  </div>
                )}

                <div>
                  <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">DKP Bid Amount</Label>
                  <Input type="number" min="1" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder="Enter DKP amount" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
                </div>

                {eligibleForFriendlyZone && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={wantFriendlyZone} onChange={(e) => setWantFriendlyZone(e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-emerald-500" />
                      <div>
                        <p className="text-sm font-medium text-emerald-400 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Friendly Zone</p>
                        <p className="text-xs text-gray-400 mt-0.5">You have ≤ {friendlyZoneThreshold} DKP available. Enable this option to be eligible for the Friendly Zone slot.</p>
                      </div>
                    </label>
                  </div>
                )}

                {currentAuction.has_password && (
                  <div>
                    <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Auction Password</Label>
                    <Input type="password" value={bidPassword} onChange={(e) => setBidPassword(e.target.value)} placeholder="Enter password" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
                    <p className="text-xs text-gray-500 mt-1.5">The password can be found in the Discord auction announcement.</p>
                  </div>
                )}

                {bidError && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> {bidError}
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={!selectedPlayer || !bidAmount || isOnCooldown || isAuctionBanned || bidTooHigh || submitting || alreadyBid}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
                >
                  {submitting ? "Submitting..." : "Submit Bid"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function DraftView({ auction }) {
  const { timeLeft } = useCountdown(auction.scheduled_open);

  return (
    <div>
      <PageHeader title="MGE Auction" icon={Gavel} />
      <div className="bg-[#111827] rounded-xl border border-white/5 p-6 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <CalendarClock className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Upcoming Auction</h2>
          <p className="text-amber-400 font-semibold">{auction.title}</p>
        </div>

        <div className="space-y-3">
          {auction.scheduled_open && (
            <div className="bg-white/5 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Opens in</p>
                <span className="font-mono text-amber-400 text-lg font-bold">{timeLeft}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Start</p>
                <p className="text-sm text-gray-300 font-mono">{formatUTCDate(auction.scheduled_open)}</p>
              </div>
            </div>
          )}

          {auction.scheduled_close && (
            <div className="bg-white/5 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Closes at</p>
                <p className="text-sm text-gray-300 font-mono">{formatUTCDate(auction.scheduled_close)}</p>
              </div>
              <Clock className="w-4 h-4 text-gray-600" />
            </div>
          )}

          {auction.has_password && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <Lock className="w-3.5 h-3.5" />
              Password required to bid
            </div>
          )}
        </div>

        <p className="text-xs text-gray-600 text-center mt-5">Bidding will be available once the auction opens.</p>
      </div>
    </div>
  );
}

function ClosedView({ auction }) {
  return (
    <div>
      <PageHeader title="MGE Auction" subtitle={auction.title} icon={Gavel} />
      <div className="bg-[#111827] rounded-xl border border-white/5 p-8 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Bidding Closed</h2>
        <p className="text-sm text-gray-400 mb-4">
          The auction <span className="text-white font-medium">"{auction.title}"</span> has ended.
        </p>
        <p className="text-xs text-gray-500">Results will be published soon.</p>
      </div>
    </div>
  );
}

function OpenInfoPanel({ auction }) {
  const { timeLeft } = useCountdown(auction.scheduled_close);

  return (
    <div className="lg:col-span-1 space-y-4">
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold uppercase tracking-wider text-emerald-400">Open</span>
        </div>

        {auction.scheduled_close && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Closes in</p>
            <span className="font-mono text-amber-400 text-lg font-bold">{timeLeft}</span>
            <p className="text-xs text-gray-600 mt-1 font-mono">
              {formatUTCDate(auction.scheduled_close)}
            </p>
          </div>
        )}

        {auction.has_password && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <Lock className="w-3.5 h-3.5" />
            Password required to bid
          </div>
        )}
      </div>
    </div>
  );
}