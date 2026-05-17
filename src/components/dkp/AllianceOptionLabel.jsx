import React from "react";

/**
 * Renders an alliance label with a colored dot, for use inside Shadcn SelectItem.
 * Props:
 *  - name: alliance name (string)
 *  - color: hex color (string)
 *  - count: optional number to display in parentheses
 */
export default function AllianceOptionLabel({ name, color = "#f59e0b", count }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color, boxShadow: `0 0 0 1px ${color}55` }}
      />
      <span>{name}{typeof count === "number" ? ` (${count})` : ""}</span>
    </span>
  );
}