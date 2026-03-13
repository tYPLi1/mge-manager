import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import PageHeader from "@/components/dkp/PageHeader";
import LeaderboardFilters from "@/components/leaderboard/LeaderboardFilters";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";

export default function Leaderboard() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("current_dkp");
  const [sortDir, setSortDir] = useState("desc");
  const [powerGroup, setPowerGroup] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const queryClient = useQueryClient();

  const { data: players = [], isLoading: pLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("-total_dkp", 500),
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions-activity"],
    queryFn: () => base44.entities.DKPTransaction.list("-event_date", 5000),
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

  // Build dynamic event columns from EventType entity
  const eventColumns = useMemo(() => {
    const cols = [];
    eventTypes.forEach(et => {
      if (et.has_prep_stage) {
        cols.push({ key: `${et.key}_prep`, label: `${et.display_name} Prep` });
      }
      if (et.has_war_stage) {
        cols.push({ key: `${et.key}_war`, label: `${et.display_name} War` });
      }
      if (!et.has_prep_stage && !et.has_war_stage) {
        cols.push({ key: et.key, label: et.display_name });
      }
    });
    return cols;
  }, [eventTypes]);

  // Compute power ranks
  const powerRanks = useMemo(() => {
    const withPower = players.filter(p => p.power > 0).sort((a, b) => b.power - a.power);
    const map = {};
    withPower.forEach((p, i) => { map[p.id] = i + 1; });
    return map;
  }, [players]);

  // Set of event keys that count toward activity (exclude MGE/auction events)
  const activityKeys = useMemo(() => {
    const keys = new Set();
    eventTypes.forEach(et => {
      if (et.has_prep_stage) keys.add(`${et.key}_prep`);
      if (et.has_war_stage) keys.add(`${et.key}_war`);
      if (!et.has_prep_stage && !et.has_war_stage) keys.add(et.key);
    });
    return keys;
  }, [eventTypes]);

  // Build enriched player data
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
      // Activity score: only count actual event participation keys
      if (activityKeys.has(key)) {
        e.activity_score += t.amount;
        // 30-day activity
        const txDate = t.event_date ? new Date(t.event_date) : null;
        if (txDate && txDate >= thirtyDaysAgo) {
          e.activity_30d += t.amount;
        }
      }
    });

    return players.map(p => ({
      ...p,
      current_dkp: (p.total_dkp || 0) - (p.dkp_spent || 0),
      powerRank: powerRanks[p.id] || 0,
      ...eventMap[p.id],
    }));
  }, [players, transactions, powerRanks, eventColumns, activityKeys]);

  // Filter & sort
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
      } else if (sortField === "cooldown_until") {
        av = a.cooldown_until ? new Date(a.cooldown_until).getTime() : 0;
        bv = b.cooldown_until ? new Date(b.cooldown_until).getTime() : 0;
      } else {
        av = a[sortField] ?? 0;
        bv = b[sortField] ?? 0;
      }
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [enrichedPlayers, search, powerGroup, statusFilter, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const hasActiveFilters = search || powerGroup !== "all" || statusFilter !== "all";

  return (
    <div>
      <PageHeader title="DKP Leaderboard" subtitle={`${players.length} Players`} icon={Trophy} />
      <LeaderboardFilters
        search={search}
        setSearch={setSearch}
        powerGroup={powerGroup}
        setPowerGroup={setPowerGroup}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => { setSearch(""); setPowerGroup("all"); setStatusFilter("all"); }}
      />
      <LeaderboardTable
        data={filtered}
        isLoading={isLoading}
        sortField={sortField}
        sortDir={sortDir}
        onSort={toggleSort}
        eventColumns={eventColumns}
      />
    </div>
  );
}