import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function getServiceClient(req) {
  try { return createClientFromRequest(req).asServiceRole; }
  catch { return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole; }
}

Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);
    
    const players = await service.entities.Player.list('name', 100000);
    const negativeBalances = players
      .filter(p => p.total_dkp < 0)
      .sort((a, b) => a.total_dkp - b.total_dkp)
      .map(p => ({
        name: p.name,
        total_dkp: p.total_dkp,
        dkp_spent: p.dkp_spent
      }));

    return Response.json({
      count: negativeBalances.length,
      players: negativeBalances
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});