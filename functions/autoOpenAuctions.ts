import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const drafts = await base44.asServiceRole.entities.Auction.filter({ status: "draft" });
    const openAuctions = await base44.asServiceRole.entities.Auction.filter({ status: "open" });
    const now = new Date();
    let opened = 0;
    let closed = 0;

    // Fetch settings for Discord
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const webhookUrl = settings.find(s => s.key === 'discord_webhook_url')?.value;
    const enabled = settings.find(s => s.key === 'discord_auction_enabled')?.value === 'true';
    const channelId = settings.find(s => s.key === 'discord_auction_channel')?.value;

    // Auto-open drafts with scheduled_open in the past
    for (const auction of drafts) {
      if (!auction.scheduled_open) continue;
      const openAt = new Date(auction.scheduled_open);
      if (openAt <= now) {
        await base44.asServiceRole.entities.Auction.update(auction.id, { status: "open" });
        opened++;

        // Send stored Discord message if available
        if (enabled && webhookUrl && auction.discord_embed) {
          const embed = JSON.parse(auction.discord_embed);
          if (auction.discord_extra_text?.trim()) {
            embed.description = (embed.description || "") + "\n\n" + auction.discord_extra_text.trim();
          }
          const discordPayload = {
            content: channelId ? `<#${channelId}>` : undefined,
            embeds: [embed],
          };
          try {
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(discordPayload),
            });
          } catch (err) {
            console.error('Discord send failed for auction', auction.id, err.message);
          }
        }
      }
    }

    // Auto-close open auctions with scheduled_close in the past
    for (const auction of openAuctions) {
      if (!auction.scheduled_close) continue;
      const closeAt = new Date(auction.scheduled_close);
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