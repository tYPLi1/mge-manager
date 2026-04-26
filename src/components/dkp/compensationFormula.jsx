// Safe-ish formula evaluator for compensation calculation.
// Allows simple arithmetic expressions referencing predefined variables.
// Whitelist: digits, operators (+ - * / % ( )), whitespace, dots, commas,
// Math.* functions, and the variable names listed below.

export const FORMULA_VARS = [
  "bid",            // dkp_bid of the winning bid
  "wonRank",        // rank actually won in the auction (1..N)
  "achievedRank",   // rank achieved by the player in the event (0 if none)
  "wonMedals",      // medals associated with wonRank
  "achievedMedals", // medals associated with achievedRank
  "medalDiff",      // wonMedals - achievedMedals (positive = lost medals)
];

export const DEFAULT_FORMULA = "bid / 2";

const ALLOWED_PATTERN = /^[0-9+\-*/%().,\s a-zA-Z_]+$/;

export function evalCompensationFormula(formula, vars) {
  const expr = String(formula || "").trim();
  if (!expr) return 0;
  if (!ALLOWED_PATTERN.test(expr)) return 0;

  try {
    // Build function with whitelisted variables + Math
    const argNames = [...FORMULA_VARS, "Math"];
    const argValues = [
      Number(vars.bid) || 0,
      Number(vars.wonRank) || 0,
      Number(vars.achievedRank) || 0,
      Number(vars.wonMedals) || 0,
      Number(vars.achievedMedals) || 0,
      Number(vars.medalDiff) || 0,
      Math,
    ];
    // eslint-disable-next-line no-new-func
    const fn = new Function(...argNames, `"use strict"; return (${expr});`);
    const result = fn(...argValues);
    if (!Number.isFinite(result)) return 0;
    return Math.max(0, Math.floor(result));
  } catch {
    return 0;
  }
}