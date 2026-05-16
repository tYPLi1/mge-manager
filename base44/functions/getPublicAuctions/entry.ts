import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const auctions = await service.entities.Auction.list('-created_date', 1000);

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