import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { adminEntities } from "@/components/adminApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Gavel, AlertTriangle, History, Shield, Settings, Settings2, Activity, ChevronRight, TrendingUp } from "lucide-react";
import DPPageHeader from "@/components/dp/PageHeader";
import StatCard from "@/components/dp/StatCard";
import DiscordNotificationPanel from "@/components/dkp/DiscordNotificationPanel";
import { useTranslation } from "@/lib/i18n";

function ensureUTC(dateStr) {
  if (!dateStr) return dateStr;
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 11)) return dateStr + 'Z';
  return dateStr;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const a = (k) => t(`admin.dashboard.${k}`);

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("-total_dkp", 500),
  });

  const { data: auctions = [] } = useQuery({
    queryKey: ["auctions"],
    queryFn: () => adminEntities.Auction.list("-created_date", 5),
  });

  const { data: penalties = [] } = useQuery({
    queryKey: ["penalties-active"],
    queryFn: () => base44.entities.Penalty.filter({ status: "probation" }, "-offense_date", 50),
  });

  const queryClient = useQueryClient();
  useEffect(() => {
    const unsub1 = base44.entities.Player.subscribe(() => queryClient.invalidateQueries({ queryKey: ["players"] }));
    const unsub2 = adminEntities.Auction.subscribe(() => queryClient.invalidateQueries({ queryKey: ["auctions"] }));
    const unsub3 = base44.entities.Penalty.subscribe(() => queryClient.invalidateQueries({ queryKey: ["penalties-active"] }));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [queryClient]);

  const openAuction = auctions.find((au) => au.status === "open" || au.status === "closed");
  const isAuctionExpired = openAuction?.status === "open" && openAuction?.scheduled_close &&
    new Date(ensureUTC(openAuction.scheduled_close)) <= new Date();

  const onCooldownCount = players.filter((p) => p.cooldown_until && new Date(p.cooldown_until) > new Date()).length;

  const stats = [
    { label: a("totalPlayers"), value: players.length, icon: Users, accent: "var(--dp-info)" },
    { label: a("activePenalties"), value: penalties.length, icon: AlertTriangle, accent: "var(--dp-danger)" },
    { label: a("onCooldown"), value: onCooldownCount, icon: TrendingUp, accent: "var(--dp-accent)" },
  ];

  const quickLinks = [
    { name: a("manageAuctions"), desc: a("manageAuctionsDesc"), page: "AdminAuctions", icon: Gavel },
    { name: a("managePlayers"), desc: a("managePlayersDesc"), page: "AdminPlayers", icon: Users },
    { name: a("dkpManagement"), desc: a("dkpManagementDesc"), page: "AdminDKP", icon: History },
    { name: a("penalties"), desc: a("penaltiesDesc"), page: "AdminPenalties", icon: Shield },
    { name: a("settings"), desc: a("settingsDesc"), page: "AdminSettings", icon: Settings },
  ];

  const statusColor = isAuctionExpired ? "#e89556" : openAuction?.status === "open" ? "var(--dp-success)" : "var(--dp-danger)";

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div>
        <h2 className="dp-heading" style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "8px 0 12px" }}>
          {a("discordNotifications")}
        </h2>
        <DiscordNotificationPanel />
      </div>

      <div className="dp-grid-2">
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

        <div className="dp-card" style={{ padding: 0, overflow: "hidden", height: "fit-content" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dp-border)", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={14} style={{ color: "var(--dp-text-muted)" }} />
            <span className="dp-heading" style={{ fontSize: 14, fontWeight: 600 }}>{a("activeAuction")}</span>
          </div>
          <div>
            {auctions.slice(0, 5).map((au, i, arr) => (
              <Link
                key={au.id}
                to={createPageUrl("AdminAuctions")}
                style={{
                  display: "block",
                  padding: "14px 20px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--dp-border)" : "none",
                  textDecoration: "none", color: "inherit",
                }}
                className="dp-hover-row"
              >
                <div style={{ fontSize: 13, marginBottom: 4, color: "var(--dp-text)" }}>{au.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--dp-text-dim)", display: "flex", gap: 8 }}>
                  <span>{au.status}</span>
                  <span>·</span>
                  <span>{au.created_date ? new Date(au.created_date).toLocaleDateString("en-US") : ""}</span>
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
  );
}