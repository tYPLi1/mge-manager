import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function getServiceClient(req) {
  try { return createClientFromRequest(req).asServiceRole; }
  catch { return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole; }
}

Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);
    const auctions = await service.entities.Auction.list('-created_date', 10);
    
    // Strip sensitive fields
    const publicAuctions = auctions.map(a => {
      const { bid_password, discord_embed, discord_extra_text, ...safe } = a;
      return safe;
    });

    return Response.json({ auctions: publicAuctions });
  } catch (error) {
    console.error('getPublicAuctions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});