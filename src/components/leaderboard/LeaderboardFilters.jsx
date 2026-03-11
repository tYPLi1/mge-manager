import React from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const POWER_GROUPS = [
  { value: "all", label: "All" },
  { value: "top20", label: "Top 20" },
  { value: "outside", label: "Outside Top 20" },
  { value: "no_power", label: "No Power" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "cooldown", label: "Cooldown" },
];

export default function LeaderboardFilters({ search, setSearch, powerGroup, setPowerGroup, statusFilter, setStatusFilter, hasActiveFilters, onClearFilters }) {
  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-3 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Spieler suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          <Select value={powerGroup} onValueChange={setPowerGroup}>
            <SelectTrigger className="w-36 bg-white/5 border-white/10 text-gray-300 text-xs h-9">
              <SelectValue placeholder="Power Group" />
            </SelectTrigger>
            <SelectContent>
              {POWER_GROUPS.map(g => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-white/5 border-white/10 text-gray-300 text-xs h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-gray-500 hover:text-white h-9 px-2">
              <X className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}