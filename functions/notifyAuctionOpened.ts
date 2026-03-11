import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // Handle automation trigger (has event data) or manual trigger (has auctionId)
    let auction;
    if (event?.type) {
      // Automation trigger - only notify if status changed to 'open'
      if (data.status !== 'open') {
        return Response.json({ success: true });
      }
      auction = data;
    } else {
      // Manual trigger
      const { auctionId } = body;
      if (!auctionId) {
        return Response.json({ error: 'Missing auctionId' }, { status: 400 });
      }
      auction = await base44.asServiceRole.entities.Auction.get(auctionId);
    }

    // Fetch settings
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    
    const webhookUrl = settings.find(s => s.key === 'discord_webhook_url')?.value;
    const enabled = settings.find(s => s.key === 'discord_auction_enabled')?.value === 'true';
    const channelId = settings.find(s => s.key === 'discord_auction_channel')?.value;

    if (!webhookUrl || !enabled) {
      return Response.json({ status: 'disabled' }, { status: 200 });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://app.example.com';
    const auctionUrl = `${appUrl}/?page=Auction`;

    const embed = {
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

    const discordPayload = {
      content: channelId ? `<#${channelId}>` : undefined,
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
      const err = await res.text();
      return Response.json({ error: `Discord error: ${err}` }, { status: 500 });
    }

    return Response.json({ status: 'sent' });
  } catch (error) {
    console.error('notifyAuctionOpened error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});