import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Users, Gavel, CheckCircle2, AlertTriangle, Ban, Clock, CalendarClock, ScrollText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import DPPageHeader from "@/components/dp/PageHeader";
import EmptyState from "@/components/dp/EmptyState";
import { useTranslation } from "@/lib/i18n";

function ensureUTC(dateStr) {
  if (!dateStr) return dateStr;
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 11)) return dateStr + 'Z';
  return dateStr;
}

function formatUTCDate(dateStr) {
  if (!dateStr) return '';
  return new Date(ensureUTC(dateStr)).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC";
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

function getEffectiveStatus(auction) {
  if (!auction) return null;
  const now = new Date();
  const { status, scheduled_open, scheduled_close } = auction;
  if (status === "draft" && scheduled_open) {
    const openAt = new Date(ensureUTC(scheduled_open));
    if (openAt <= now) {
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
  const { t } = useTranslation();
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [bidPassword, setBidPassword] = useState("");
  const [wantFriendlyZone, setWantFriendlyZone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bidError, setBidError] = useState("");
  const [tick, setTick] = useState(0);
  const queryClient = useQueryClient();

  const { data: auctions = [], isLoading: auctionsLoading } = useQuery({
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

  const rawAuction = useMemo(() => {
    return auctions.find((a) => a.status === "open") ||
           auctions.find((a) => a.status === "closed") ||
           auctions.find((a) => a.status === "draft");
  }, [auctions]);

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
      timer = setTimeout(() => { setTick(x => x + 1); schedule(); }, interval);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [rawAuction]);

  const effectiveStatus = useMemo(() => getEffectiveStatus(rawAuction), [rawAuction, tick]);
  const currentAuction = rawAuction ? { ...rawAuction, _effectiveStatus: effectiveStatus } : null;

  useEffect(() => {
    // Subscriptions handle real-time updates; light 60s safety poll for auctions only (no bid/player streaming).
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    }, 60000);
    const unsub1 = base44.entities.Bid.subscribe(() => queryClient.invalidateQueries({ queryKey: ["bids-public"] }));
    const unsub2 = base44.entities.Player.subscribe(() => queryClient.invalidateQueries({ queryKey: ["players"] }));
    return () => { clearInterval(interval); unsub1(); unsub2(); };
  }, [queryClient]);

  const friendlyZoneEnabled = settings.find((s) => s.key === "friendly_zone_enabled")?.value === "true";
  const friendlyZoneThreshold = parseInt(settings.find((s) => s.key === "friendly_zone_threshold")?.value || "50");

  const reserveNextRanks = useMemo(() => {
    try {
      const raw = settings.find((s) => s.key === "reserve_next_mge_ranks")?.value;
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(Number) : [];
    } catch { return []; }
  }, [settings]);

  const fixedAssignments = useMemo(() => {
    if (!currentAuction?.fixed_assignments) return [];
    try {
      const arr = JSON.parse(currentAuction.fixed_assignments);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }, [currentAuction]);

  const fixedAssignmentForSelected = useMemo(() => {
    if (!selectedPlayer) return null;
    return fixedAssignments.find(a => a.player_id === selectedPlayer) || null;
  }, [fixedAssignments, selectedPlayer]);

  const selectedPlayerData = useMemo(() => players.find((p) => p.id === selectedPlayer), [players, selectedPlayer]);
  const isOnCooldown = useMemo(() => {
    if (!selectedPlayerData?.cooldown_until) return false;
    return new Date(selectedPlayerData.cooldown_until) > new Date();
  }, [selectedPlayerData]);
  const isAuctionBanned = selectedPlayerData?.auction_ban_count > 0;
  const currentDkp = selectedPlayerData ? (selectedPlayerData.total_dkp || 0) + (selectedPlayerData.dkp_spent || 0) : 0;
  const bidTooHigh = bidAmount && parseInt(bidAmount) > currentDkp;
  const eligibleForFriendlyZone = friendlyZoneEnabled && currentDkp <= friendlyZoneThreshold;

  const alreadyBid = useMemo(() => {
    if (!selectedPlayer || !currentAuction) return false;
    return allBids.some((b) => b.player_id === selectedPlayer && b.auction_id === currentAuction?.id && !b.is_deleted);
  }, [allBids, selectedPlayer, currentAuction]);

  const auctionBids = useMemo(() => {
    if (!currentAuction) return [];
    return allBids
      .filter(b => b.auction_id === currentAuction.id && !b.is_deleted)
      .sort((a, b) => (b.dkp_bid || 0) - (a.dkp_bid || 0))
      .slice(0, 10);
  }, [allBids, currentAuction]);

  const handleSubmit = async () => {
    if (!selectedPlayer || !bidAmount || !currentAuction) return;
    setBidError("");
    if (alreadyBid) { setBidError(t("auction.alreadyBid")); return; }
    if (parseInt(bidAmount) > currentDkp) { setBidError(t("auction.notEnoughDkp", { amount: currentDkp })); return; }
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
      toast.success(t("auction.bidSubmitted"), { description: t("auction.bidSubmittedDesc") });
    } catch (err) {
      setBidError(err?.response?.data?.error || err?.message || t("auction.errors.GENERIC"));
    }
    setSubmitting(false);
  };

  if (auctionsLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <DPPageHeader title={t("auction.title")} />
        <div className="dp-card" style={{ padding: 60, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid var(--dp-border)", borderTopColor: "var(--dp-accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  if (!currentAuction) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <DPPageHeader title={t("auction.title")} />
        <EmptyState
          icon={Gavel}
          title={t("auction.noActive")}
          description={t("auction.noActiveDesc")}
          action={
            <Link to={createPageUrl("Results")} className="dp-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              <ScrollText size={14} aria-hidden="true" /> {t("results.pastAuctions")}
            </Link>
          }
        />
      </div>
    );
  }

  const es = currentAuction._effectiveStatus;

  if (es === "draft") return <DraftView auction={currentAuction} t={t} fixedAssignments={fixedAssignments} />;
  if (es === "closed") return <ClosedView auction={currentAuction} t={t} fixedAssignments={fixedAssignments} />;
  // (FixedRanksDisplay receives t via prop in views below)

  // OPEN view with hero + bid list + bid form
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <DPPageHeader title={t("auction.title")} subtitle={t("auction.subtitleLive")} />

      <HeroCard auction={currentAuction} t={t} />

      {fixedAssignments.length > 0 && (
        <div style={{ maxWidth: 520, margin: "0 auto", width: "100%" }}>
          <FixedRanksDisplay assignments={fixedAssignments} t={t} />
        </div>
      )}

      {reserveNextRanks.length > 0 && (
        <div style={{ maxWidth: 520, margin: "0 auto", width: "100%" }}>
          <ReservedRanksDisplay ranks={reserveNextRanks} t={t} />
        </div>
      )}

      <div style={{ maxWidth: 520, margin: "0 auto", width: "100%" }}>
        {/* Blind auction notice */}
        <div className="dp-card" style={{
          padding: "12px 16px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--dp-accent-soft)",
          border: "1px solid var(--dp-accent-border)",
        }}>
          <Lock size={14} style={{ color: "var(--dp-accent)", flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: "var(--dp-text-muted)" }}>
            {t("auction.blindNotice")}
          </span>
        </div>

        {/* Bid form */}
        <div className="dp-card-elevated" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Gavel size={14} style={{ color: "var(--dp-accent)" }} />
            <span className="dp-heading" style={{ fontSize: 14, fontWeight: 600 }}>{t("auction.placeBid")}</span>
          </div>

          {submitted ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(109, 185, 137, 0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>
                <CheckCircle2 size={26} style={{ color: "var(--dp-success)" }} />
              </div>
              <h3 className="dp-heading" style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{t("auction.bidSubmitted")}</h3>
              <p style={{ fontSize: 13, color: "var(--dp-text-muted)", marginBottom: 16 }}>{t("auction.bidSubmittedDesc")}</p>
              <button className="dp-btn-ghost" onClick={() => { setSubmitted(false); setBidAmount(""); setSelectedPlayer(""); }}>
                {t("auction.placeAnotherBid")}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label htmlFor="auction-player-select" style={{ display: "block", fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                  {t("auction.selectName")}
                </label>
                <select
                  id="auction-player-select"
                  className="dp-input"
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                >
                  <option value="">{t("auction.selectNamePlaceholder")}</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {fixedAssignmentForSelected && (
                <Alert color="warn" icon={AlertTriangle}>
                  {t("auction.fixedRankNotice", { rank: fixedAssignmentForSelected.rank, reason: fixedAssignmentForSelected.reason })}
                </Alert>
              )}
              {isOnCooldown && (
                <Alert color="danger" icon={AlertTriangle}>
                  {t("auction.onCooldown", { date: selectedPlayerData.cooldown_until })}
                </Alert>
              )}
              {isAuctionBanned && <Alert color="danger" icon={Ban}>{t("auction.banned")}</Alert>}
              {alreadyBid && <Alert color="warn" icon={AlertTriangle}>{t("auction.alreadyBid")}</Alert>}

              {selectedPlayerData && (
                <div style={{
                  fontSize: 11.5, color: "var(--dp-text-muted)",
                  background: "var(--dp-bg)", border: "1px solid var(--dp-border)",
                  borderRadius: 8, padding: "8px 12px",
                }}>
                  {t("auction.availableDkp")}: <span className="dp-mono dp-accent-text" style={{ fontWeight: 600 }}>{currentDkp}</span>
                </div>
              )}

              <div>
                <label htmlFor="auction-bid-amount" style={{ display: "block", fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                  {t("auction.dkpBidAmount")}
                </label>
                <input
                  id="auction-bid-amount"
                  type="number"
                  min="0"
                  max={currentDkp > 0 ? currentDkp : 0}
                  className="dp-input dp-mono"
                  placeholder={selectedPlayerData ? `Max: ${currentDkp}` : "0"}
                  value={bidAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && parseInt(val) > currentDkp) setBidAmount(String(currentDkp));
                    else setBidAmount(val);
                  }}
                  aria-invalid={bidTooHigh}
                  aria-describedby={bidTooHigh ? "bid-error" : undefined}
                />
                {bidTooHigh && (
                  <p id="bid-error" role="alert" style={{ fontSize: 11.5, color: "var(--dp-danger)", marginTop: 4 }}>
                    {t("auction.bidExceeds", { amount: currentDkp })}
                  </p>
                )}
              </div>

              {eligibleForFriendlyZone && (
                <div style={{
                  background: "rgba(109, 185, 137, 0.08)",
                  border: "1px solid rgba(109, 185, 137, 0.2)",
                  borderRadius: 8, padding: "10px 14px",
                }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={wantFriendlyZone} onChange={(e) => setWantFriendlyZone(e.target.checked)} style={{ accentColor: "var(--dp-success)", marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--dp-success)" }}>{t("auction.friendlyZone")}</div>
                      <div style={{ fontSize: 11.5, color: "var(--dp-text-muted)", marginTop: 2 }}>
                        {t("auction.friendlyZoneDesc", { threshold: friendlyZoneThreshold })}
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {currentAuction.has_password && (
                <div>
                  <label htmlFor="auction-password" style={{ display: "block", fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                    {t("auction.auctionPassword")}
                  </label>
                  <input
                    id="auction-password"
                    type="password"
                    className="dp-input"
                    placeholder={t("auction.passwordPlaceholder")}
                    value={bidPassword}
                    onChange={(e) => setBidPassword(e.target.value)}
                    aria-describedby="auction-password-hint"
                  />
                  <p id="auction-password-hint" style={{ fontSize: 11.5, color: "var(--dp-text-dim)", marginTop: 6 }}>{t("auction.passwordHint")}</p>
                </div>
              )}

              {bidError && <Alert color="danger" icon={AlertTriangle}>{bidError}</Alert>}

              <button
                className="dp-btn-primary"
                onClick={handleSubmit}
                disabled={!selectedPlayer || !bidAmount || isOnCooldown || isAuctionBanned || bidTooHigh || submitting || alreadyBid || !!fixedAssignmentForSelected}
                style={{ width: "100%", padding: "10px 16px", fontSize: 13.5, marginTop: 4 }}
              >
                <CheckCircle2 size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
                {submitting ? t("auction.submitting") : t("auction.submitBid")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Alert({ color, icon: Icon, children }) {
  const styles = color === "danger"
    ? { bg: "rgba(201, 101, 101, 0.1)", border: "rgba(201, 101, 101, 0.25)", color: "var(--dp-danger)" }
    : color === "warn"
    ? { bg: "rgba(232, 149, 86, 0.1)", border: "rgba(232, 149, 86, 0.25)", color: "#e89556" }
    : { bg: "rgba(107, 147, 201, 0.1)", border: "rgba(107, 147, 201, 0.25)", color: "var(--dp-info)" };
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      fontSize: 12, color: styles.color,
      background: styles.bg, border: `1px solid ${styles.border}`,
      borderRadius: 8, padding: "8px 12px",
    }}>
      {Icon && <Icon size={14} />}
      <span>{children}</span>
    </div>
  );
}

function ReservedRanksDisplay({ ranks, t }) {
  const sorted = [...ranks].sort((a, b) => a - b);
  return (
    <div className="dp-card" style={{ padding: 14, border: "1px solid rgba(107, 147, 201, 0.25)", background: "rgba(107, 147, 201, 0.06)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 16 }}>🔄</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="dp-heading" style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-info)", marginBottom: 4 }}>
            {t("admin.auctionConfig.cols.reserveNext")}: {sorted.map(r => `#${r}`).join(", ")}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--dp-text-muted)" }}>
            {t("admin.auctionConfig.reserveNextHint")}
          </div>
        </div>
      </div>
    </div>
  );
}

function FixedRanksDisplay({ assignments, t }) {
  return (
    <div className="dp-card" style={{ padding: 16, border: "1px solid rgba(212, 168, 89, 0.25)", background: "rgba(212, 168, 89, 0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>📌</span>
        <span className="dp-heading" style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-accent)" }}>{t ? t("fixedRanks.title") : "Fixed Ranks"}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {assignments.sort((a, b) => Number(a.rank) - Number(b.rank)).map(a => (
          <div key={a.rank} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "8px 10px",
            background: "var(--dp-bg)",
            border: "1px solid var(--dp-border)",
            borderRadius: 8,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "var(--dp-accent-soft)",
              border: "1px solid var(--dp-accent-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "var(--dp-accent)",
              flexShrink: 0,
            }}>
              #{a.rank}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>{a.player_name}</div>
              <div style={{ fontSize: 11.5, color: "var(--dp-text-muted)", marginTop: 2 }}>{a.reason}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroCard({ auction, t }) {
  const { timeLeft } = useCountdown(auction.scheduled_close);
  return (
    <div className="dp-card-elevated" style={{ padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: 0, right: 0, width: 240, height: 240,
        background: "radial-gradient(circle, rgba(212, 168, 89, 0.08), transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", position: "relative" }}>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            <span className="dp-badge" style={{
              background: "rgba(109, 185, 137, 0.15)",
              color: "var(--dp-success)",
              border: "1px solid rgba(109, 185, 137, 0.3)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--dp-success)", boxShadow: "0 0 8px var(--dp-success)" }} />
              {t("auction.open").toUpperCase()}
            </span>
            {auction.has_password && (
              <span className="dp-badge" style={{ background: "var(--dp-bg)", color: "var(--dp-text-muted)", border: "1px solid var(--dp-border)" }}>
                <Lock size={11} /> {t("auction.passwordRequired")}
              </span>
            )}
          </div>
          <h2 className="dp-heading" style={{ fontSize: 22, fontWeight: 600, margin: 0, marginBottom: 6 }}>
            {auction.title}
          </h2>
          {auction.scheduled_close && (
            <p style={{ fontSize: 13.5, color: "var(--dp-text-muted)", margin: 0 }}>
              {t("auction.closesAt")}: {formatUTCDate(auction.scheduled_close)}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t("auction.remaining")}</div>
            <div className="dp-heading dp-mono dp-accent-text" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
              {timeLeft || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DraftView({ auction, t, fixedAssignments = [] }) {
  const { timeLeft } = useCountdown(auction.scheduled_open);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <DPPageHeader title={t("auction.title")} />
      {fixedAssignments.length > 0 && (
        <div style={{ maxWidth: 520, margin: "0 auto", width: "100%" }}>
          <FixedRanksDisplay assignments={fixedAssignments} t={t} />
        </div>
      )}
      <div className="dp-card-elevated" style={{ padding: 24, maxWidth: 520, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "var(--dp-accent-soft)",
            border: "1px solid var(--dp-accent-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
          }}>
            <CalendarClock size={26} style={{ color: "var(--dp-accent)" }} />
          </div>
          <h2 className="dp-heading" style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{t("auction.upcomingAuction")}</h2>
          <p className="dp-accent-text" style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{auction.title}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {auction.scheduled_open && (
            <Row label={t("auction.opensIn")} value={<span className="dp-mono dp-accent-text" style={{ fontWeight: 700 }}>{timeLeft}</span>} sub={formatUTCDate(auction.scheduled_open)} />
          )}
          {auction.scheduled_close && (
            <Row label={t("auction.closesAt")} value={<span className="dp-mono" style={{ color: "var(--dp-text-muted)" }}>{formatUTCDate(auction.scheduled_close)}</span>} icon={Clock} />
          )}
          {auction.has_password && (
            <div className="dp-badge" style={{
              background: "var(--dp-accent-soft)", color: "var(--dp-accent)",
              border: "1px solid var(--dp-accent-border)", padding: "8px 12px", justifyContent: "center",
            }}>
              <Lock size={12} /> {t("auction.passwordRequired")}
            </div>
          )}
        </div>

        <p style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textAlign: "center", marginTop: 16 }}>
          {t("auction.biddingAvailableLater")}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, sub, icon: Icon }) {
  return (
    <div style={{
      background: "var(--dp-bg)", border: "1px solid var(--dp-border)",
      borderRadius: 8, padding: "12px 14px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
    }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{label}</div>
        <div>{value}</div>
        {sub && <div style={{ fontSize: 11.5, color: "var(--dp-text-muted)", marginTop: 2 }} className="dp-mono">{sub}</div>}
      </div>
      {Icon && <Icon size={16} style={{ color: "var(--dp-text-dim)" }} />}
    </div>
  );
}

function ClosedView({ auction, t, fixedAssignments = [] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <DPPageHeader title={t("auction.title")} subtitle={auction.title} />
      {fixedAssignments.length > 0 && (
        <div style={{ maxWidth: 520, margin: "0 auto", width: "100%" }}>
          <FixedRanksDisplay assignments={fixedAssignments} t={t} />
        </div>
      )}
      <div className="dp-card-elevated" style={{ padding: 32, textAlign: "center", maxWidth: 520, margin: "0 auto", width: "100%" }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: "rgba(201, 101, 101, 0.1)",
          border: "1px solid rgba(201, 101, 101, 0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 14px",
        }}>
          <Clock size={26} style={{ color: "var(--dp-danger)" }} />
        </div>
        <h2 className="dp-heading" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{t("auction.biddingClosed")}</h2>
        <p style={{ fontSize: 13.5, color: "var(--dp-text-muted)", margin: 0, marginBottom: 8 }}>
          {t("auction.biddingClosedDesc", { title: auction.title })}
        </p>
        <p style={{ fontSize: 12, color: "var(--dp-text-dim)", marginBottom: 18 }}>{t("auction.resultsSoon")}</p>
        <Link
          to={createPageUrl("Results")}
          className="dp-btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
        >
          <ScrollText size={14} aria-hidden="true" /> {t("results.pastAuctions")}
        </Link>
      </div>
    </div>
  );
}