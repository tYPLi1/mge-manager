import React, { useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users, Gavel, AlertTriangle, History, Shield, Settings, Settings2, Activity,
  ChevronRight, TrendingUp, Coins, Clock, Calendar, ArrowUpRight
} from "lucide-react";
import DPPageHeader from "@/components/dp/PageHeader";
import DiscordNotificationPanel from "@/components/dkp/DiscordNotificationPanel";
import { useTranslation } from "@/lib/i18n";

function ensureUTC(dateStr) {
  if (!dateStr) return dateStr;
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 11)) return dateStr + 'Z';
  return dateStr;
}

// Clickable stat card (subset of StatCard adapted for navigation)
function ClickStatCard({ label, value, sub, icon: Icon, accent, to, subtle }) {
  const body = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </div>
        {Icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: accent ? `${accent}22` : "var(--dp-accent-soft)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={15} style={{ color: accent || "var(--dp-accent)" }} />
          </div>
        )}
      </div>
      <div className="dp-heading dp-mono" style={{
        fontSize: 24, fontWeight: 600, lineHeight: 1, marginBottom: 6,
        color: subtle ? "var(--dp-text-muted)" : "var(--dp-text)",
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--dp-text-muted)" }}>{sub}</div>}
      {to && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          color: "var(--dp-text-dim)", opacity: 0.5,
        }}>
          <ArrowUpRight size={12} />
        </div>
      )}
    </>
  );

  const baseStyle = {
    padding: 16,
    position: "relative",
    display: "block",
    textDecoration: "none",
    color: "inherit",
  };

  if (to) {
    return (
      <Link to={to} className="dp-card-elevated dp-hover-row" style={baseStyle}>
        {body}
      </Link>
    );
  }
  return <div className="dp-card-elevated" style={baseStyle}>{body}</div>;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const a = (k) => t(`admin.dashboard.${k}`);

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("-total_dkp", 100000),
  });

  const { data: auctions = [] } = useQuery({
    queryKey: ["auctions"],
    queryFn: () => adminEntities.Auction.list("-created_date", 10),
  });

  const { data: penalties = [] } = useQuery({
    queryKey: ["penalties-active"],
    queryFn: () => base44.entities.Penalty.filter({ status: "probation" }, "-offense_date", 100),
  });

  const { data: recentTxns = [] } = useQuery({
    queryKey: ["dashboard-recent-txns"],
    queryFn: () => base44.entities.DKPTransaction.list("-event_date", 500),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => adminEntities.AppSettings.list(),
  });
  const discordServersJson = settings.find((s) => s.key === "discord_servers")?.value;

  const queryClient = useQueryClient();
  useEffect(() => {
    const unsub1 = base44.entities.Player.subscribe(() => queryClient.invalidateQueries({ queryKey: ["players"] }));
    const unsub2 = adminEntities.Auction.subscribe(() => queryClient.invalidateQueries({ queryKey: ["auctions"] }));
    const unsub3 = base44.entities.Penalty.subscribe(() => queryClient.invalidateQueries({ queryKey: ["penalties-active"] }));
    const unsub4 = base44.entities.DKPTransaction.subscribe(() => queryClient.invalidateQueries({ queryKey: ["dashboard-recent-txns"] }));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [queryClient]);

  const openAuction = auctions.find((au) => au.status === "open" || au.status === "closed");
  const isAuctionExpired = openAuction?.status === "open" && openAuction?.scheduled_close &&
    new Date(ensureUTC(openAuction.scheduled_close)) <= new Date();

  const onCooldownCount = players.filter((p) => p.cooldown_until && new Date(p.cooldown_until) > new Date()).length;

  // Aggregate stats
  const stats = useMemo(() => {
    const totalDkp = players.reduce((sum, p) => sum + (p.total_dkp || 0), 0);
    const avgDkp = players.length > 0 ? Math.round(totalDkp / players.length) : 0;

    // Last events: group by event_date + source + source_stage
    const eventMap = new Map();
    for (const tx of recentTxns) {
      if (!tx.source || !tx.event_date) continue;
      const key = `${tx.event_date}|${tx.source}|${tx.source_stage || ""}`;
      if (!eventMap.has(key)) {
        eventMap.set(key, {
          key,
          event_date: tx.event_date,
          source: tx.source,
          source_stage: tx.source_stage || null,
          count: 0,
          total: 0,
        });
      }
      const ev = eventMap.get(key);
      ev.count += 1;
      ev.total += tx.amount || 0;
    }
    const events = Array.from(eventMap.values()).sort((a, b) => b.event_date.localeCompare(a.event_date));

    return { totalDkp, avgDkp, events };
  }, [players, recentTxns]);

  const statusColor = isAuctionExpired ? "#e89556" : openAuction?.status === "open" ? "var(--dp-success)" : "var(--dp-danger)";

  const stageLabel = (stage) =>
    stage === "prep" ? "Prep" : stage === "war" ? "War" : null;

  const quickLinks = [
    { name: a("manageAuctions"), desc: a("manageAuctionsDesc"), page: "AdminAuctions", icon: Gavel },
    { name: a("managePlayers"), desc: a("managePlayersDesc"), page: "AdminPlayers", icon: Users },
    { name: a("dkpManagement"), desc: a("dkpManagementDesc"), page: "AdminDKP", icon: History },
    { name: a("penalties"), desc: a("penaltiesDesc"), page: "AdminPenalties", icon: Shield },
    { name: a("settings"), desc: a("settingsDesc"), page: "AdminSettings", icon: Settings },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <DPPageHeader title={a("title")} />

      {openAuction && (
        <Link to={createPageUrl("AdminAuctions")} style={{ textDecoration: "none", color: "inherit" }}>
          <div className="dp-card-elevated dp-hover-row" style={{
            padding: 20,
            background: "linear-gradient(135deg, rgba(212, 168, 89, 0.08), rgba(212, 168, 89, 0.02))",
            borderColor: "var(--dp-accent-border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div className="dp-accent-text" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  {a("activeAuction")}
                </div>
                <h3 className="dp-heading" style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 4 }}>{openAuction.title}</h3>
                <div style={{ fontSize: 13, color: "var(--dp-text-muted)" }}>
                  {a("status")}: <span style={{ color: statusColor, fontWeight: 600 }}>
                    {isAuctionExpired ? a("closing") : openAuction.status}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} style={{ color: "var(--dp-accent)" }} />
            </div>
          </div>
        </Link>
      )}

      {/* KPI Grid — all clickable */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <ClickStatCard
          label={a("totalPlayers")}
          value={players.length}
          icon={Users}
          accent="var(--dp-info)"
          to={createPageUrl("AdminPlayers")}
        />
        <ClickStatCard
          label={a("totalDkpInCirculation")}
          value={stats.totalDkp.toLocaleString()}
          sub={a("avgDkpPerPlayer", { value: stats.avgDkp.toLocaleString() })}
          icon={Coins}
          accent="var(--dp-accent)"
          to={createPageUrl("AdminDKP")}
        />
        <ClickStatCard
          label={a("activePenalties")}
          value={penalties.length}
          icon={AlertTriangle}
          accent="var(--dp-danger)"
          to={createPageUrl("AdminPenalties")}
        />
        <ClickStatCard
          label={a("onCooldown")}
          value={onCooldownCount}
          icon={Clock}
          accent="#e89556"
          to={createPageUrl("AdminPlayers")}
        />
        <ClickStatCard
          label={a("recentEvents")}
          value={stats.events.length}
          sub={a("last4Weeks")}
          icon={TrendingUp}
          accent="var(--dp-success)"
          to={createPageUrl("AdminDKP")}
        />
      </div>

      <div>
        <h2 className="dp-heading" style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "8px 0 12px" }}>
          {a("discordNotifications")}
        </h2>
        <DiscordNotificationPanel serversJson={discordServersJson} />
      </div>

      <div className="dp-grid-2">
        {/* Quick actions */}
        <div className="dp-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Settings2 size={14} style={{ color: "var(--dp-text-muted)" }} />
            <span className="dp-heading" style={{ fontSize: 14, fontWeight: 600 }}>{a("quickActions")}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.page}
                  to={createPageUrl(link.page)}
                  className="dp-hover-row"
                  style={{
                    padding: "14px 14px",
                    background: "var(--dp-bg)",
                    border: "1px solid var(--dp-border)",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "inherit",
                    display: "flex", alignItems: "center", gap: 12,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: "var(--dp-accent-soft)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Icon size={16} style={{ color: "var(--dp-accent)" }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--dp-text)" }}>{link.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", marginTop: 2 }}>{link.desc}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right column: Recent Events + Auctions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Recent Events */}
          <div className="dp-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dp-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={14} style={{ color: "var(--dp-text-muted)" }} />
                <span className="dp-heading" style={{ fontSize: 14, fontWeight: 600 }}>{a("recentEvents")}</span>
              </div>
              <Link to={createPageUrl("AdminDKP")} style={{ fontSize: 11, color: "var(--dp-accent)", textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
                {a("viewAll")} <ArrowUpRight size={11} />
              </Link>
            </div>
            <div>
              {stats.events.slice(0, 4).map((ev, i, arr) => (
                <Link
                  key={ev.key}
                  to={createPageUrl("AdminDKP")}
                  style={{
                    display: "block",
                    padding: "12px 20px",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--dp-border)" : "none",
                    textDecoration: "none", color: "inherit",
                  }}
                  className="dp-hover-row"
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, color: "var(--dp-text)", fontWeight: 500 }}>
                        {ev.source}
                        {stageLabel(ev.source_stage) && (
                          <span style={{ color: "var(--dp-text-dim)", fontWeight: 400 }}> — {stageLabel(ev.source_stage)}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", marginTop: 2 }}>
                        {new Date(ev.event_date).toLocaleDateString()} · {ev.count} {a("players").toLowerCase()}
                      </div>
                    </div>
                    <div className="dp-mono" style={{ fontSize: 12, fontWeight: 600, color: ev.total >= 0 ? "var(--dp-success)" : "var(--dp-danger)" }}>
                      {ev.total > 0 ? "+" : ""}{ev.total}
                    </div>
                  </div>
                </Link>
              ))}
              {stats.events.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: "var(--dp-text-dim)", fontSize: 13 }}>
                  {t("common.noData")}
                </div>
              )}
            </div>
          </div>

          {/* Recent Auctions */}
          <div className="dp-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dp-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={14} style={{ color: "var(--dp-text-muted)" }} />
                <span className="dp-heading" style={{ fontSize: 14, fontWeight: 600 }}>{a("recentAuctions")}</span>
              </div>
              <Link to={createPageUrl("AdminAuctions")} style={{ fontSize: 11, color: "var(--dp-accent)", textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
                {a("viewAll")} <ArrowUpRight size={11} />
              </Link>
            </div>
            <div>
              {auctions.slice(0, 4).map((au, i, arr) => (
                <Link
                  key={au.id}
                  to={createPageUrl("AdminAuctions")}
                  style={{
                    display: "block",
                    padding: "12px 20px",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--dp-border)" : "none",
                    textDecoration: "none", color: "inherit",
                  }}
                  className="dp-hover-row"
                >
                  <div style={{ fontSize: 13, marginBottom: 4, color: "var(--dp-text)" }}>{au.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", display: "flex", gap: 8 }}>
                    <span>{au.status}</span>
                    <span>·</span>
                    <span>{au.created_date ? new Date(au.created_date).toLocaleDateString() : ""}</span>
                  </div>
                </Link>
              ))}
              {auctions.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: "var(--dp-text-dim)", fontSize: 13 }}>
                  {t("common.noData")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}