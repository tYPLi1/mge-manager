import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function getServiceClient(req) {
  try { return createClientFromRequest(req).asServiceRole; }
  catch { return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole; }
}

Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);

    const [players, transactions, eventTypes] = await Promise.all([
      service.entities.Player.list('-total_dkp', 100000),
      service.entities.DKPTransaction.list('-event_date', 1000000),
      service.entities.EventType.filter({ active: true }, 'sort_order', 1000),
    ]);

    return Response.json({ players, transactions, eventTypes });
  } catch (error) {
    console.error('getPublicLeaderboard error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});