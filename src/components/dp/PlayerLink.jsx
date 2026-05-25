import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Renders a player name as a clickable link to the PlayerDetail page.
 * Falls back to plain text if no player_id is provided.
 */
export default function PlayerLink({ playerId, playerName, style }) {
  const baseStyle = {
    color: "var(--dp-text)",
    textDecoration: "none",
    cursor: "pointer",
    ...style,
  };

  if (!playerId || !playerName) {
    return <span style={baseStyle}>{playerName || "—"}</span>;
  }

  return (
    <Link
      to={createPageUrl(`PlayerDetail?id=${playerId}`)}
      style={baseStyle}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--dp-accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = style?.color || "var(--dp-text)")}
    >
      {playerName}
    </Link>
  );
}