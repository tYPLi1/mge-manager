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

    let updated = 0;
    const results = [];

    for (const player of players) {
      // Calculate totals from transactions
      const playerTxns = transactions.filter(t => t.player_id === player.id);
      
      const total_dkp = playerTxns
        .filter(t => !['bid'].includes(t.type))
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const dkp_spent = playerTxns
        .filter(t => t.type === 'bid')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      // Only update if values differ
      if (player.total_dkp !== total_dkp || player.dkp_spent !== dkp_spent) {
        await service.entities.Player.update(player.id, { total_dkp, dkp_spent });
        updated++;
        results.push({ player_id: player.id, player_name: player.name, total_dkp, dkp_spent });
      }
    }

    return Response.json({ 
      success: true, 
      players_processed: players.length,
      players_updated: updated,
      results
    });
  } catch (error) {
    console.error('syncPlayerDKP error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});