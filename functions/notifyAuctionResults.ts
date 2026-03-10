import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Only admin can trigger notifications
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await req.json();
    const { auctionId } = body;

    if (!auctionId) {
      return Response.json({ error: 'Missing auctionId' }, { status: 400 });
    }

    // Fetch auction, results & settings
    const auction = await base44.asServiceRole.entities.Auction.get(auctionId);
    const results = await base44.asServiceRole.entities.AuctionResult.filter({ auction_id: auctionId }, 'rank', 10);
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    
    const webhookUrl = settings.find(s => s.key === 'discord_webhook_url')?.value;
    const enabled = settings.find(s => s.key === 'discord_results_enabled')?.value === 'true';
    const channelId = settings.find(s => s.key === 'discord_auction_channel')?.value;

    if (!webhookUrl || !enabled) {
      return Response.json({ status: 'disabled' }, { status: 200 });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://app.example.com';
    const resultsUrl = `${appUrl}/?page=Results`;

    const topResults = results.slice(0, 3);
    const resultsText = topResults.map((r, i) => `${i + 1}. **${r.player_name}** - ${r.dkp_bid} DKP`).join('\n');

    const embed = {
      title: '🏆 Auction Results Ready',
      description: auction.title,
      color: 0x10b981,
      fields: [
        { name: 'Top Winners', value: resultsText || 'No results', inline: false },
        { name: 'Total Participants', value: String(results.length), inline: true },
      ],
      footer: { text: 'DKP System' },
    };

    const discordPayload = {
      content: channelId ? `<#${channelId}>` : undefined,
      embeds: [embed],
      components: [{
        type: 1,
        components: [{
          type: 2,
          label: 'View Results',
          style: 5,
          url: resultsUrl,
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
    console.error('notifyAuctionResults error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});