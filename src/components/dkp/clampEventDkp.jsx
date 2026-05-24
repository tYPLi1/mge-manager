// Utility: clamp event DKP rows against player balances so that no event
// transaction can drive a player's total_dkp below 0. Penalties / bids are
// handled separately and intentionally NOT clamped (a punishment may push a
// player into negative DKP — that's intended).
//
// Input rows are mutated NOT — a new array of rows is returned with the
// effective dkp value. Each returned row carries an `originalDkp` field if
// it was clamped, so callers (UI / Discord) can show what changed.

/**
 * @param {Array} rows  Event preview rows: { playerId, playerName, dkp, ... }
 * @param {Array} players Player records (must have id, total_dkp)
 * @returns {Array} new rows with .dkp possibly reduced (towards 0) and
 *                  .originalDkp set when clamped.
 */
export function clampEventDkpAgainstBalance(rows, players) {
  if (!Array.isArray(rows) || rows.length === 0) return rows || [];
  const playerById = new Map((players || []).map(p => [p.id, p]));

  return rows.map(r => {
    const dkp = Number(r.dkp) || 0;
    if (dkp >= 0) return r;
    // Find player by id (preferred) or by name fallback
    let player = null;
    if (r.playerId) player = playerById.get(r.playerId);
    if (!player && r.player) player = r.player;
    if (!player) return r; // new player → balance is 0 → can't go negative
    const currentBalance = Number(player.total_dkp) || 0;
    if (currentBalance <= 0) {
      // already at or below 0 → no further reduction from event
      return { ...r, dkp: 0, originalDkp: dkp };
    }
    const allowedNegative = -currentBalance; // can't deduct more than balance
    if (dkp < allowedNegative) {
      return { ...r, dkp: allowedNegative, originalDkp: dkp };
    }
    return r;
  });
}