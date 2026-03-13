import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // Handle automation trigger or manual trigger
    let auction;
    if (event?.type) {
      const old_data = body.old_data;
      if (data.status !== 'open' || old_data?.status === 'open') {
        return Response.json({ success: true, skipped: true });
      }
      auction = data;
    } else {
      const { auctionId } = body;
      if (!auctionId) {
        return Response.json({ error: 'Missing auctionId' }, { status: 400 });
      }
      auction = await base44.asServiceRole.entities.Auction.get(auctionId);
    }

    // Fetch settings
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const channelId = settings.find(s => s.key === 'discord_channel_id')?.value;
    const enabled = settings.find(s => s.key === 'discord_auction_enabled')?.value === 'true';

    if (!channelId || !BOT_TOKEN || !enabled) {
      return Response.json({ status: 'disabled' }, { status: 200 });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://app.example.com';
    const auctionUrl = `${appUrl}/?page=Auction`;

    // Use stored embed if available, otherwise build default
    let embed;
    if (auction.discord_embed) {
      embed = typeof auction.discord_embed === 'string' ? JSON.parse(auction.discord_embed) : auction.discord_embed;
      if (auction.discord_extra_text?.trim()) {
        embed.description = (embed.description || "") + "\n\n" + auction.discord_extra_text.trim();
      }
    } else {
      embed = {
        title: '🔔 New Auction Opened!',
        description: auction.title,
        color: 0xf59e0b,
        fields: [
          { name: 'Status', value: auction.status.toUpperCase(), inline: true },
          { name: 'Closes', value: auction.scheduled_close ? new Date(auction.scheduled_close).toLocaleString() : 'TBD', inline: true },
        ],
        footer: { text: 'DKP System' },
      };
      if (auction.has_password) {
        embed.fields.push({ name: 'Password', value: `||${auction.bid_password}||`, inline: false });
      }
    }

    const discordPayload = {
      content: '@everyone',
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

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Discord error: ${err}` }, { status: 500 });
    }

    return Response.json({ status: 'sent' });
  } catch (error) {
    console.error('notifyAuctionOpened error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});