import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function getServiceClient(req) {
  try { return createClientFromRequest(req).asServiceRole; }
  catch { return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole; }
}

Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);

    const [players, transactions, eventTypes] = await Promise.all([
      service.entities.Player.list('-total_dkp', 500),
      service.entities.DKPTransaction.list('-event_date', 5000),
      service.entities.EventType.filter({ active: true }, 'sort_order', 100),
    ]);

    return Response.json({ players, transactions, eventTypes });
  } catch (error) {
    console.error('getPublicLeaderboard error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});