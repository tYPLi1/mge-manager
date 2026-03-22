function parseTable(jsonStr) {
  try { return JSON.parse(jsonStr || "[]"); } catch { return []; }
}

export function rankToDkp(eventType, tableType, rank, withinCutoff) {
  if (!withinCutoff || rank <= 0) return 0;
  let table, fallback;
  if (tableType === "prep") {
    // Unified prep (no top20 split)
    table = parseTable(eventType.dkp_table_prep);
    fallback = 0;
  } else if (tableType === "prep_top20") {
    table = parseTable(eventType.dkp_table_prep_top20);
    fallback = eventType.prep_top20_fallback ?? 20;
  } else if (tableType === "prep_outside") {
    table = parseTable(eventType.dkp_table_prep_outside);
    fallback = eventType.prep_outside_fallback ?? 0;
  } else if (tableType === "war_top20") {
    table = parseTable(eventType.dkp_table_war_top20);
    fallback = eventType.war_top20_fallback ?? eventType.dkp_top20_fallback ?? 20;
  } else if (tableType === "war_outside") {
    table = parseTable(eventType.dkp_table_war_outside);
    fallback = eventType.war_outside_fallback ?? eventType.dkp_outside_fallback ?? 0;
  } else {
    return 0;
  }
  return (rank - 1) < table.length ? (table[rank - 1] || 0) : (fallback ?? 0);
}