import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DPPageHeader from "@/components/dp/PageHeader";
import StatCard from "@/components/dp/StatCard";
import DPLeaderboardFilters from "@/components/dp/leaderboard/LeaderboardFilters";
import DPLeaderboardTable from "@/components/dp/leaderboard/LeaderboardTable";
import { useTranslation } from "@/lib/i18n";

export default function Leaderboard() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("current_dkp");
  const [sortDir, setSortDir] = useState("desc");
  const [powerGroup, setPowerGroup] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [allianceFilter, setAllianceFilter] = useState("all");

  const queryClient = useQueryClient();

  const { data: publicSettings = [] } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("getPublicSettings", {});
        return res?.data?.settings || [];
      } catch { return []; }
    },
  });

  const alliances = useMemo(() => {
    const raw = publicSettings.find(s => s.key === "alliances")?.value;
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(a => a && typeof a.name === "string" && a.name.trim()).map(a => ({
        name: a.name,
        color: typeof a.color === "string" ? a.color : "#f59e0b",
      }));
    } catch { return []; }
  }, [publicSettings]);

  const allianceColors = useMemo(() => {
    const m = {};
    alliances.forEach(a => { m[a.name] = a.color; });
    return m;
  }, [alliances]);

  const { data: players = [], isLoading: pLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("-total_dkp", 100000),
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions-activity"],
    queryFn: () => base44.entities.DKPTransaction.list("-event_date", 1000000),
  });

  const { data: eventTypes = [], isLoading: etLoading } = useQuery({
    queryKey: ["event-types"],
    queryFn: () => base44.entities.EventType.filter({ active: true }, "sort_order", 100),
  });

  useEffect(() => {
    const unsub1 = base44.entities.Player.subscribe(() => queryClient.invalidateQueries({ queryKey: ["players"] }));
    const unsub2 = base44.entities.DKPTransaction.subscribe(() => queryClient.invalidateQueries({ queryKey: ["transactions-activity"] }));
    return () => { unsub1(); unsub2(); };
  }, [queryClient]);

  const isLoading = pLoading || txLoading || etLoading;

  const eventColumns = useMemo(() => {
    const cols = [];
    eventTypes.forEach(et => {
      if (et.has_prep_stage) cols.push({ key: `${et.key}_prep`, label: `${et.display_name} Prep` });
      if (et.has_war_stage) cols.push({ key: `${et.key}_war`, label: `${et.display_name} War` });
      if (!et.has_prep_stage && !et.has_war_stage) cols.push({ key: et.key, label: et.display_name });
    });
    return cols;
  }, [eventTypes]);

  const powerRanks = useMemo(() => {
    const withPower = players.filter(p => p.power > 0).sort((a, b) => b.power - a.power);
    const map = {};
    withPower.forEach((p, i) => { map[p.id] = i + 1; });
    return map;
  }, [players]);

  const activityKeys = useMemo(() => {
    const keys = new Set();
    eventTypes.forEach(et => {
      if (et.has_prep_stage) keys.add(`${et.key}_prep`);
      if (et.has_war_stage) keys.add(`${et.key}_war`);
      if (!et.has_prep_stage && !et.has_war_stage) keys.add(et.key);
    });
    return keys;
  }, [eventTypes]);

  const enrichedPlayers = useMemo(() => {
    const eventMap = {};
    players.forEach(p => {
      const entry = { total_events: 0, activity_score: 0, activity_30d: 0 };
      eventColumns.forEach(col => { entry[col.key] = { count: 0, dkp: 0 }; });
      eventMap[p.id] = entry;
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    transactions.filter(t => t.type === "earn").forEach(t => {
      const e = eventMap[t.player_id];
      if (!e) return;
      let key = t.source;
      if (t.source_stage) key = `${t.source}_${t.source_stage}`;
      if (e[key] !== undefined) {
        e[key].count++;
        e[key].dkp += t.amount;
        e.total_events++;
      }
      if (activityKeys.has(key)) {
        e.activity_score += t.amount;
        const txDate = t.event_date ? new Date(t.event_date) : null;
        if (txDate && txDate >= thirtyDaysAgo) e.activity_30d += t.amount;
      }
    });

    return players.map(p => ({
      ...p,
      current_dkp: (p.total_dkp || 0) + (p.dkp_spent || 0),
      powerRank: powerRanks[p.id] || 0,
      ...eventMap[p.id],
    }));
  }, [players, transactions, powerRanks, eventColumns, activityKeys]);

  const filtered = useMemo(() => {
    let result = enrichedPlayers;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q));
    }

    if (powerGroup === "top20") result = result.filter(p => p.powerRank > 0 && p.powerRank <= 20);
    else if (powerGroup === "outside") result = result.filter(p => p.powerRank > 20);
    else if (powerGroup === "no_power") result = result.filter(p => !p.power || p.power === 0);

    if (statusFilter === "ready") result = result.filter(p => !p.cooldown_until || new Date(p.cooldown_until) <= new Date());
    else if (statusFilter === "cooldown") result = result.filter(p => p.cooldown_until && new Date(p.cooldown_until) > new Date());

    if (allianceFilter !== "all") {
      if (allianceFilter === "__none__") result = result.filter(p => !p.alliance);
      else result = result.filter(p => p.alliance === allianceFilter);
    }

    return result.sort((a, b) => {
      let av, bv;
      if (sortField.startsWith("evt_")) {
        const key = sortField.replace("evt_", "");
        av = a[key]?.dkp || 0;
        bv = b[key]?.dkp || 0;
      } else if (sortField === "name") {
        av = a.name?.toLowerCase() || "";
        bv = b.name?.toLowerCase() || "";
        return sortDir === "desc" ? bv.localeCompare(av) : av.localeCompare(bv);
      } else if (sortField === "alliance") {
        // Sort by alliance asc/desc, secondary by current_dkp desc (within alliance: highest DKP on top)
        const aAll = (a.alliance || "").toLowerCase();
        const bAll = (b.alliance || "").toLowerCase();
        if (aAll === "" && bAll !== "") return 1;
        if (bAll === "" && aAll !== "") return -1;
        if (aAll !== bAll) return sortDir === "desc" ? bAll.localeCompare(aAll) : aAll.localeCompare(bAll);
        return (b.current_dkp || 0) - (a.current_dkp || 0);
      } else if (sortField === "cooldown_until") {
        av = a.cooldown_until ? new Date(a.cooldown_until).getTime() : 0;
        bv = b.cooldown_until ? new Date(b.cooldown_until).getTime() : 0;
      } else {
        av = a[sortField] ?? 0;
        bv = b[sortField] ?? 0;
      }
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [enrichedPlayers, search, powerGroup, statusFilter, allianceFilter, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const hasActiveFilters = search || powerGroup !== "all" || statusFilter !== "all" || allianceFilter !== "all";

  // Stats
  const totalDkp = enrichedPlayers.reduce((s, p) => s + (p.current_dkp || 0), 0);
  const avgDkp = enrichedPlayers.length ? Math.round(totalDkp / enrichedPlayers.length) : 0;
  const onCooldownCount = enrichedPlayers.filter(p => p.cooldown_until && new Date(p.cooldown_until) > new Date()).length;
  const totalPower = enrichedPlayers.reduce((s, p) => s + (p.power || 0), 0);
  const formatPower = (n) => {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return String(n);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <DPPageHeader
        title={t("leaderboard.title")}
        subtitle={t("leaderboard.subtitle")}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <StatCard label={t("leaderboard.stats.players")} value={enrichedPlayers.length} sub={t("leaderboard.playersCount", { count: enrichedPlayers.length })} />
        <StatCard label={t("leaderboard.stats.avgDkp")} value={avgDkp.toLocaleString("en-US")} />
        <StatCard label={t("leaderboard.filters.cooldown")} value={onCooldownCount} />
        <StatCard label={t("leaderboard.stats.totalPower")} value={formatPower(totalPower)} />
      </div>

      <DPLeaderboardFilters
        search={search}
        setSearch={setSearch}
        powerGroup={powerGroup}
        setPowerGroup={setPowerGroup}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        allianceFilter={allianceFilter}
        setAllianceFilter={setAllianceFilter}
        alliances={alliances}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => { setSearch(""); setPowerGroup("all"); setStatusFilter("all"); setAllianceFilter("all"); }}
      />

      <DPLeaderboardTable
        data={filtered}
        isLoading={isLoading}
        sortField={sortField}
        sortDir={sortDir}
        onSort={toggleSort}
        eventColumns={eventColumns}
        allianceColors={allianceColors}
      />
    </div>
  );
}