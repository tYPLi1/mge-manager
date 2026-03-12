import React from "react";

export default function StatusBadge({ cooldownUntil }) {
  if (!cooldownUntil) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Ready
      </span>
    );
  }

  const now = new Date();
  const cooldown = new Date(cooldownUntil);
  if (cooldown <= now) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Ready
      </span>
    );
  }

  // Format date shorter: DD.MM
  const day = String(cooldown.getDate()).padStart(2, "0");
  const month = String(cooldown.getMonth() + 1).padStart(2, "0");

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      {day}.{month}
    </span>
  );
}