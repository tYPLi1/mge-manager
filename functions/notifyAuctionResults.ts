import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    let auction, auctionId;
    if (event?.type) {
      if (data.status !== 'confirmed') return Response.json({ success: true });
      auction = data;
      auctionId = data.id;
    } else {
      const { auctionId: id } = body;
      if (!id) return Response.json({ error: 'Missing auctionId' }, { status: 400 });
      auctionId = id;
      auction = await base44.asServiceRole.entities.Auction.get(auctionId);
    }

    const results = await base44.asServiceRole.entities.AuctionResult.filter({ auction_id: auctionId }, 'rank', 10);
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const getSetting = (key) => settings.find(s => s.key === key)?.value;

    const channelId = getSetting('discord_results_channel_id') || getSetting('discord_channel_id');
    const enabled = getSetting('discord_results_enabled') === 'true';
    const tiebreaker = getSetting('auction_tiebreaker') || 'fcfs';

    if (!channelId || !BOT_TOKEN || !enabled) {
      return Response.json({ status: 'disabled' });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://app.example.com';
    const resultsUrl = `${appUrl}/?page=Results`;

    const topResults = results.slice(0, 3);
    const resultsText = topResults.map((r, i) => `${i + 1}. **${r.player_name}** - ${r.dkp_bid} DKP`).join('\n');

    const hasTies = results.some((r, i) =>
      (i > 0 && r.dkp_bid === results[i - 1].dkp_bid) ||
      (i < results.length - 1 && r.dkp_bid === results[i + 1].dkp_bid)
    );

    const tiebreakerNote = hasTies
      ? (tiebreaker === 'activity' ? '⚖ Tiebreaker: Higher Activity Score = higher rank'
        : tiebreaker === 'last_event_dkp' ? '⚖ Tiebreaker: Most DKP in last event = higher rank'
        : '⚖ Tiebreaker: First to bid = higher rank')
      : null;

    const fields = [
      { name: 'Top Winners', value: resultsText || 'No results', inline: false },
      { name: 'Total Participants', value: String(results.length), inline: true },
    ];
    if (tiebreakerNote) fields.push({ name: 'Tiebreaker', value: tiebreakerNote, inline: false });
    fields.push({ name: '🔗 Link', value: `[Zu den Ergebnissen](${resultsUrl})`, inline: false });

    const embed = {
      title: '🏆 Auction Results Ready',
      description: auction.title,
      color: 0x10b981,
      fields,
      footer: { text: 'DKP System' },
    };

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '@everyone',
        embeds: [embed],
        components: [{ type: 1, components: [{ type: 2, label: 'View Results', style: 5, url: resultsUrl }] }],
      }),
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