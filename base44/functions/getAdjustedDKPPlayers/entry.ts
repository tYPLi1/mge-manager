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
    
    const adjusted = [];
    
    for (const player of players) {
      const playerTxns = transactions
        .filter(t => t.player_id === player.id)
        .sort((a, b) => String(a.event_date || '').localeCompare(String(b.event_date || '')));
      
      // Berechne ohne Cap (alte Weise)
      const uncappedDkp = playerTxns
        .filter(t => !['bid'].includes(t.type))
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      // Berechne mit Cap (neue Weise)
      let cappedDkp = 0;
      for (const t of playerTxns) {
        const amount = t.amount || 0;
        if (t.type === 'bid') continue;
        if (t.type === 'penalty') {
          cappedDkp += amount;
        } else {
          const next = cappedDkp + amount;
          cappedDkp = amount < 0 ? Math.max(0, next) : next;
        }
      }
      
      // Nur anzeigen, wenn unterschiedlich
      if (uncappedDkp !== cappedDkp) {
        adjusted.push({
          name: player.name,
          before: uncappedDkp,
          after: cappedDkp,
          difference: cappedDkp - uncappedDkp
        });
      }
    }
    
    return Response.json({
      count: adjusted.length,
      players: adjusted.sort((a, b) => a.difference - b.difference)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});