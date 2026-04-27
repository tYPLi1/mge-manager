import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";

/**
 * Apple HIG-inspired test page.
 * Pure iOS-style leaderboard preview — neutral palette, SF Pro stack,
 * grouped lists, large title, translucent nav bar.
 */
export default function AppleTest() {
  const [query, setQuery] = useState("");

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["apple-test-leaderboard"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPublicLeaderboard", {});
      return res?.data?.players || res?.data || [];
    },
  });

  const sorted = useMemo(() => {
    const list = [...players].sort(
      (a, b) => (b.total_dkp ?? 0) - (a.total_dkp ?? 0)
    );
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((p) => (p.name || "").toLowerCase().includes(q));
  }, [players, query]);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div style={styles.root}>
      <style>{globalCss}</style>

      {/* Translucent nav bar */}
      <header style={styles.navBar}>
        <Link to="/" style={styles.backBtn}>
          <ChevronLeft size={18} strokeWidth={2.5} />
          <span>Back</span>
        </Link>
        <div style={styles.navTitle}>Leaderboard</div>
        <div style={{ width: 60 }} />
      </header>

      <main style={styles.main}>
        {/* Large title */}
        <div style={styles.largeTitleBlock}>
          <h1 style={styles.largeTitle}>Leaderboard</h1>
          <p style={styles.subtitle}>
            {sorted.length} {sorted.length === 1 ? "player" : "players"}
          </p>
        </div>

        {/* Search */}
        <div style={styles.searchWrap}>
          <Search size={16} color="#8E8E93" strokeWidth={2.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            style={styles.searchInput}
          />
        </div>

        {/* Top 3 cards */}
        {!isLoading && top3.length > 0 && (
          <section style={styles.topRow}>
            {top3.map((p, i) => (
              <TopCard key={p.id || p.name} player={p} rank={i + 1} />
            ))}
          </section>
        )}

        {/* Grouped list — rest */}
        <section>
          <SectionLabel>All players</SectionLabel>
          <div style={styles.listGroup}>
            {isLoading ? (
              <div style={styles.emptyRow}>Loading…</div>
            ) : rest.length === 0 ? (
              <div style={styles.emptyRow}>No more players</div>
            ) : (
              rest.map((p, idx) => (
                <PlayerRow
                  key={p.id || p.name}
                  player={p}
                  rank={idx + 4}
                  isLast={idx === rest.length - 1}
                />
              ))
            )}
          </div>
          <p style={styles.footnote}>
            Sorted by total DKP. Pull data refreshes automatically.
          </p>
        </section>
      </main>
    </div>
  );
}

function TopCard({ player, rank }) {
  const tones = {
    1: { ring: "#D4AF37", label: "1st" },
    2: { ring: "#A8A8AD", label: "2nd" },
    3: { ring: "#B07A4B", label: "3rd" },
  };
  const tone = tones[rank];
  const initials = (player.name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={styles.topCard}>
      <div style={{ ...styles.avatar, boxShadow: `0 0 0 3px ${tone.ring}` }}>
        {initials}
      </div>
      <div style={styles.topRank}>{tone.label}</div>
      <div style={styles.topName}>{player.name}</div>
      <div style={styles.topDkp}>
        {(player.total_dkp ?? 0).toLocaleString()}
        <span style={styles.topDkpUnit}> DKP</span>
      </div>
    </div>
  );
}

function PlayerRow({ player, rank, isLast }) {
  return (
    <div
      style={{
        ...styles.row,
        borderBottom: isLast ? "none" : "0.5px solid #E5E5EA",
      }}
    >
      <div style={styles.rowRank}>{rank}</div>
      <div style={styles.rowName}>{player.name}</div>
      <div style={styles.rowDkp}>
        {(player.total_dkp ?? 0).toLocaleString()}
      </div>
      <ChevronRight size={16} color="#C7C7CC" strokeWidth={2.5} />
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={styles.sectionLabel}>{children}</div>;
}

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  body { margin: 0; }
`;

const sf =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif';

const styles = {
  root: {
    minHeight: "100vh",
    background: "#F2F2F7",
    color: "#000",
    fontFamily: sf,
    WebkitFontSmoothing: "antialiased",
    paddingBottom: 60,
  },
  navBar: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    background: "rgba(242, 242, 247, 0.78)",
    backdropFilter: "saturate(180%) blur(20px)",
    WebkitBackdropFilter: "saturate(180%) blur(20px)",
    borderBottom: "0.5px solid rgba(60,60,67,0.18)",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    color: "#007AFF",
    fontSize: 17,
    fontWeight: 400,
    textDecoration: "none",
    minWidth: 60,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: -0.2,
  },
  main: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "0 16px",
  },
  largeTitleBlock: {
    padding: "12px 4px 6px",
  },
  largeTitle: {
    margin: 0,
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: -0.8,
    lineHeight: 1.1,
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: 15,
    color: "#8E8E93",
    letterSpacing: -0.1,
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(118,118,128,0.12)",
    borderRadius: 10,
    padding: "8px 12px",
    margin: "16px 0 24px",
  },
  searchInput: {
    flex: 1,
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: 17,
    fontFamily: sf,
    color: "#000",
  },
  topRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginBottom: 28,
  },
  topCard: {
    background: "#FFFFFF",
    borderRadius: 14,
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #F2F2F7, #E5E5EA)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 600,
    color: "#3C3C43",
    marginBottom: 4,
  },
  topRank: {
    fontSize: 11,
    fontWeight: 600,
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  topName: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: -0.2,
    textAlign: "center",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  topDkp: {
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: -0.3,
  },
  topDkpUnit: {
    fontSize: 12,
    fontWeight: 500,
    color: "#8E8E93",
    marginLeft: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 400,
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: -0.08,
    margin: "8px 16px 6px",
  },
  listGroup: {
    background: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    minHeight: 44,
  },
  rowRank: {
    width: 28,
    fontSize: 15,
    fontWeight: 500,
    color: "#8E8E93",
    fontVariantNumeric: "tabular-nums",
  },
  rowName: {
    flex: 1,
    fontSize: 17,
    fontWeight: 400,
    letterSpacing: -0.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowDkp: {
    fontSize: 17,
    fontWeight: 500,
    color: "#3C3C43",
    fontVariantNumeric: "tabular-nums",
  },
  emptyRow: {
    padding: "16px",
    color: "#8E8E93",
    fontSize: 15,
    textAlign: "center",
  },
  footnote: {
    margin: "8px 16px 0",
    fontSize: 13,
    color: "#8E8E93",
    letterSpacing: -0.08,
  },
};