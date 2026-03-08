import React from "react";

export default function DKPValue({ value, size = "md", showSign = false }) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-2xl",
  };
  
  let colorClass = "text-amber-400";
  if (showSign) {
    colorClass = isNegative ? "text-red-400" : isPositive ? "text-emerald-400" : "text-gray-400";
  }

  return (
    <span className={`font-mono font-bold tabular-nums ${sizeClasses[size]} ${colorClass}`}>
      {showSign && isPositive ? "+" : ""}
      {value?.toLocaleString() ?? 0}
    </span>
  );
}