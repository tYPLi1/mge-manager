import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all draft auctions that have a scheduled_open set
    const drafts = await base44.asServiceRole.entities.Auction.filter({ status: "draft" });
    const now = new Date();
    let opened = 0;

    for (const auction of drafts) {
      if (!auction.scheduled_open) continue;
      const openAt = new Date(auction.scheduled_open);
      if (openAt <= now) {
        await base44.asServiceRole.entities.Auction.update(auction.id, { status: "open" });
        opened++;
      }
    }

    return Response.json({ opened, checked: drafts.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});