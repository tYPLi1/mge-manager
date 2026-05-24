import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function getServiceClient(req) {
  try { return createClientFromRequest(req).asServiceRole; }
  catch { return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole; }
}

Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);

    const players = await service.entities.Player.list('name', 100000);
    const transactions = await service.entities.DKPTransaction.list('-event_date', 1000000);

    const updates = [];

    for (const player of players) {
      const playerTxns = transactions
        .filter(t => t.player_id === player.id)
        // process chronologically so the 0-floor for non-penalty earnings is
        // applied in the same order as events happened
        .sort((a, b) => String(a.event_date || '').localeCompare(String(b.event_date || '')));

      // Earn / event DKP cannot push the balance below 0.
      // Penalties (type === 'penalty') can push the balance below 0.
      // Bids (type === 'bid') are tracked separately in dkp_spent.
      let total_dkp = 0;
      for (const t of playerTxns) {
        const amount = t.amount || 0;
        if (t.type === 'bid') continue;
        if (t.type === 'penalty') {
          total_dkp += amount; // penalties may take the player negative
        } else {
          // Event / earn / bonus / compensation / king_allocation:
          // clamp the running balance at 0 (only when the delta would push it below).
          const next = total_dkp + amount;
          total_dkp = amount < 0 ? Math.max(0, next) : next;
        }
      }

      const dkp_spent = playerTxns
        .filter(t => t.type === 'bid')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      if (player.total_dkp !== total_dkp || player.dkp_spent !== dkp_spent) {
        updates.push({ id: player.id, data: { total_dkp, dkp_spent } });
      }
    }

    // Batch update all changes at once
    for (const update of updates) {
      await service.entities.Player.update(update.id, update.data);
    }

    return Response.json({ 
      success: true, 
      players_processed: players.length,
      players_updated: updates.length
    });
  } catch (error) {
    console.error('syncPlayerDKP error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});