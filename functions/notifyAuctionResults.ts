import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // Handle automation trigger (has event data) or manual trigger (has auctionId)
    let auction, auctionId;
    if (event?.type) {
      // Automation trigger - only notify if status changed to 'confirmed'
      if (data.status !== 'confirmed') {
        return Response.json({ success: true });
      }
      auction = data;
      auctionId = data.id;
    } else {
      // Manual trigger
      const { auctionId: id } = body;
      if (!id) {
        return Response.json({ error: 'Missing auctionId' }, { status: 400 });
      }
      auctionId = id;
      auction = await base44.asServiceRole.entities.Auction.get(auctionId);
    }

    // Fetch results & settings
    const results = await base44.asServiceRole.entities.AuctionResult.filter({ auction_id: auctionId }, 'rank', 10);
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    
    const webhookUrl = settings.find(s => s.key === 'discord_webhook_url')?.value;
    const enabled = settings.find(s => s.key === 'discord_results_enabled')?.value === 'true';
    const channelId = settings.find(s => s.key === 'discord_auction_channel')?.value;
    const tiebreaker = settings.find(s => s.key === 'auction_tiebreaker')?.value || 'fcfs';

    if (!webhookUrl || !enabled) {
      return Response.json({ status: 'disabled' }, { status: 200 });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://app.example.com';
    const resultsUrl = `${appUrl}/?page=Results`;

    const topResults = results.slice(0, 3);
    const resultsText = topResults.map((r, i) => `${i + 1}. **${r.player_name}** - ${r.dkp_bid} DKP`).join('\n');

    // Check for ties among all results
    const hasTies = results.some((r, i) => 
      (i > 0 && r.dkp_bid === results[i - 1].dkp_bid) ||
      (i < results.length - 1 && r.dkp_bid === results[i + 1].dkp_bid)
    );

    const tiebreakerNote = hasTies
      ? (tiebreaker === 'activity'
        ? '⚖ Tiebreaker: Higher Activity Score = higher rank'
        : tiebreaker === 'last_event_dkp'
        ? '⚖ Tiebreaker: Most DKP in last event = higher rank'
        : '⚖ Tiebreaker: First to bid = higher rank')
      : null;

    const fields = [
      { name: 'Top Winners', value: resultsText || 'No results', inline: false },
      { name: 'Total Participants', value: String(results.length), inline: true },
    ];
    if (tiebreakerNote) {
      fields.push({ name: 'Tiebreaker', value: tiebreakerNote, inline: false });
    }

    const embed = {
      title: '🏆 Auction Results Ready',
      description: auction.title,
      color: 0x10b981,
      fields,
      footer: { text: 'DKP System' },
    };

    const contentParts = ['@everyone'];
    if (channelId) contentParts.push(`<#${channelId}>`);

    const discordPayload = {
      content: contentParts.join(' '),
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