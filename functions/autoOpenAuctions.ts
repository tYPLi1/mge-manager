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

        // Send Discord notification directly from backend
        try {
          const settings = await base44.asServiceRole.entities.AppSettings.list();
          const webhookUrl = settings.find(s => s.key === 'discord_webhook_url')?.value;
          const enabled = settings.find(s => s.key === 'discord_auction_enabled')?.value === 'true';
          const channelId = settings.find(s => s.key === 'discord_auction_channel')?.value;

          if (webhookUrl && enabled && auction.discord_embed) {
            const embed = typeof auction.discord_embed === 'string' ? JSON.parse(auction.discord_embed) : auction.discord_embed;
            if (auction.discord_extra_text?.trim()) {
              embed.description = (embed.description || "") + "\n\n" + auction.discord_extra_text.trim();
            }

            const appUrl = Deno.env.get('APP_URL') || 'https://app.example.com';
            const auctionUrl = `${appUrl}/?page=Auction`;

            const contentParts = ['@everyone'];
            if (channelId) contentParts.push(`<#${channelId}>`);

            const discordPayload = {
              content: contentParts.join(' '),
              embeds: [embed],
              components: [{
                type: 1,
                components: [{
                  type: 2,
                  label: 'View Auction',
                  style: 5,
                  url: auctionUrl,
                }],
              }],
            };

            const res = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(discordPayload),
            });

            if (!res.ok) {
              console.error('Discord notification failed:', await res.text());
            } else {
              console.log('Discord notification sent for auction:', auction.title);
            }
          }
        } catch (discordErr) {
          console.error('Discord notification error:', discordErr.message);
        }
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