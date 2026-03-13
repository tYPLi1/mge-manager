import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const drafts = await base44.asServiceRole.entities.Auction.filter({ status: "draft" });
    const openAuctions = await base44.asServiceRole.entities.Auction.filter({ status: "open" });
    const now = new Date();
    let opened = 0;
    let closed = 0;

    function ensureUTC(dateStr) {
      if (!dateStr) return dateStr;
      if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*[-+]/.test(dateStr)) {
        return dateStr + 'Z';
      }
      return dateStr;
    }

    // Auto-open drafts with scheduled_open in the past
    for (const auction of drafts) {
      if (!auction.scheduled_open) continue;
      const openAt = new Date(ensureUTC(auction.scheduled_open));
      if (openAt <= now) {
        await base44.asServiceRole.entities.Auction.update(auction.id, { status: "open" });
        opened++;
        // Discord notification is handled by the entity automation (notifyAuctionOpened)
      }
    }

    // Auto-close open auctions with scheduled_close in the past
    for (const auction of openAuctions) {
      if (!auction.scheduled_close) continue;
      const closeAt = new Date(ensureUTC(auction.scheduled_close));
      if (closeAt <= now) {
        await base44.asServiceRole.entities.Auction.update(auction.id, { status: "closed" });
        closed++;
      }
    }

    return Response.json({ opened, closed, checkedDrafts: drafts.length, checkedOpen: openAuctions.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});