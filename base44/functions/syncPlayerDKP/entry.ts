import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function getServiceClient(req) {
  try { return createClientFromRequest(req).asServiceRole; }
  catch { return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole; }
}

Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);

    const players = await service.entities.Player.list();
    const transactions = await service.entities.DKPTransaction.list();

    const updates = [];

    for (const player of players) {
      const playerTxns = transactions.filter(t => t.player_id === player.id);
      
      const total_dkp = playerTxns
        .filter(t => !['bid'].includes(t.type))
        .reduce((sum, t) => sum + (t.amount || 0), 0);

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