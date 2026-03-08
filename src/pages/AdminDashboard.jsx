import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Zap, Users, Gavel, History, Shield, Settings, ChevronRight, Download } from "lucide-react";
import PageHeader from "@/components/dkp/PageHeader";
import * as XLSX from "xlsx";

export default function AdminDashboard() {
  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("-total_dkp", 500),
  });

  const { data: auctions = [] } = useQuery({
    queryKey: ["auctions"],
    queryFn: () => base44.entities.Auction.list("-created_date", 5),
  });

  const { data: penalties = [] } = useQuery({
    queryKey: ["penalties-active"],
    queryFn: () => base44.entities.Penalty.filter({ status: "probation" }, "-offense_date", 50),
  });

  const openAuction = auctions.find((a) => a.status === "open" || a.status === "closed");

  const exportData = async () => {
    const [allPlayers, allTxns, allPenalties, allOffenseResets] = await Promise.all([
      base44.entities.Player.list("-total_dkp", 1000),
      base44.entities.DKPTransaction.list("-event_date", 5000),
      base44.entities.Penalty.list("-offense_date", 1000),
      base44.entities.OffenseResetLog.list("-offense_date", 1000),
    ]);
    const wb = XLSX.utils.book_new();
    const today = new Date().toISOString().split("T")[0];

    const leaderboard = allPlayers.map((p, i) => ({
      Rank: i + 1, Name: p.name, Total_DKP: p.total_dkp || 0, DKP_Spent: p.dkp_spent || 0,
      Current_DKP: (p.total_dkp || 0) - (p.dkp_spent || 0), Cooldown_Until: p.cooldown_until || "", Power: p.power || 0,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leaderboard), "Leaderboard");

    const txnData = allTxns.map(t => ({ Date: t.event_date, Player: t.player_name, Amount: t.amount, Type: t.type, Source: t.source, Note: t.note || "" }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txnData), "DKP_Log");

    const probData = allPenalties.filter(p => p.status === "probation").map(p => ({ Player: p.player_name, Level: p.level, Offense: p.offense_count, Date: p.offense_date, DKP: p.dkp_deducted || 0, Note: p.note || "" }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(probData.length ? probData : [{}]), "Probation");

    const cooldownData = allPlayers.filter(p => p.cooldown_until && new Date(p.cooldown_until) > new Date()).map(p => ({ Name: p.name, Cooldown_Until: p.cooldown_until }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cooldownData.length ? cooldownData : [{}]), "Player_On_Cooldown");

    const resetData = allOffenseResets.map(r => ({ Player: r.player_name, Offense_Count: r.offense_count, Offense_Date: r.offense_date, Eligible_Reset: r.eligible_reset_date || "", Status: r.status, Notes: r.notes || "" }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resetData.length ? resetData : [{}]), "Offense_Reset_log");

    XLSX.writeFile(wb, `DKP_Export_${today}.xlsx`);
  };

  const stats = [
    { label: "Total Players", value: players.length, color: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/20" },
    { label: "Active Penalties", value: penalties.length, color: "from-red-500/20 to-orange-500/20", border: "border-red-500/20" },
    { label: "On Cooldown", value: players.filter((p) => p.cooldown_until && new Date(p.cooldown_until) > new Date()).length, color: "from-amber-500/20 to-yellow-500/20", border: "border-amber-500/20" },
  ];

  const quickLinks = [
    { name: "Manage Auctions", page: "AdminAuctions", icon: Gavel, desc: "Create and manage MGE auctions" },
    { name: "Manage Players", page: "AdminPlayers", icon: Users, desc: "Add, edit, or remove players" },
    { name: "DKP Management", page: "AdminDKP", icon: History, desc: "Manual adjustments and event uploads" },
    { name: "Penalties", page: "AdminPenalties", icon: Shield, desc: "Apply and manage penalties" },
    { name: "Settings", page: "AdminSettings", icon: Settings, desc: "Configure system settings" },
  ];

  return (
    <div>
      <PageHeader title="Admin Dashboard" icon={Zap} />

      {/* Open Auction Card */}
      {openAuction && (
        <Link to={createPageUrl("AdminAuctions")} className="block mb-6">
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20 p-5 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">Active Auction</p>
                <h3 className="text-lg font-bold text-white">{openAuction.title}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Status: <span className={openAuction.status === "open" ? "text-emerald-400" : "text-red-400"}>{openAuction.status}</span>
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl border ${s.border} p-5`}>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{s.label}</p>
            <p className="text-3xl font-bold text-white mt-1 font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.page}
              to={createPageUrl(link.page)}
              className="bg-[#111827] rounded-xl border border-white/5 p-4 hover:border-white/10 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-amber-500/10 transition-colors">
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-amber-400 transition-colors" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">{link.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}