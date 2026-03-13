import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

function getServiceClient(req) {
  try { return createClientFromRequest(req).asServiceRole; }
  catch { return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole; }
}

function getTargetChannels(settings, type) {
  const serversJson = settings.find(s => s.key === 'discord_servers')?.value;
  if (!serversJson) return [];
  try {
    const servers = JSON.parse(serversJson);
    const channels = [];
    for (const server of servers) {
      const ch = server.channels?.[type];
      if (ch?.enabled) {
        const channelId = ch.channelId || server.defaultChannelId;
        if (channelId) channels.push(channelId);
      }
    }
    return channels;
  } catch { return []; }
}

async function sendToChannel(channelId, payload) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error(`Discord send failed for ${channelId}: ${res.status}`);
  return res.ok;
}

Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);
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
      auction = await service.entities.Auction.get(auctionId);
    }

    if (!BOT_TOKEN) return Response.json({ status: 'no_token' });

    const results = await service.entities.AuctionResult.filter({ auction_id: auctionId }, 'rank', 10);
    const settings = await service.entities.AppSettings.list();
    const channels = getTargetChannels(settings, 'results');
    if (channels.length === 0) return Response.json({ status: 'no_channels' });

    const tiebreaker = settings.find(s => s.key === 'auction_tiebreaker')?.value || 'fcfs';
    const resultsUrl = 'https://mge002.base44.app/Results';

    const topResults = results.slice(0, 3);
    const resultsText = topResults.map((r, i) => {
      let line = `${i + 1}. **${r.player_name}** — ${r.dkp_bid} DKP`;
      if (r.target_score) line += ` | Target: ${r.target_score.toLocaleString()}`;
      if (r.hero_medals) line += ` | Medals: ${r.hero_medals}`;
      return line;
    }).join('\n');

    const hasTies = results.some((r, i) =>
      (i > 0 && r.dkp_bid === results[i - 1].dkp_bid) ||
      (i < results.length - 1 && r.dkp_bid === results[i + 1].dkp_bid)
    );
    const tiebreakerNote = hasTies
      ? (tiebreaker === 'activity' ? '⚖ Higher Activity Score'
        : tiebreaker === 'last_event_dkp' ? '⚖ Most DKP in last event'
        : '⚖ First to bid')
      : null;

    const fields = [
      { name: 'Top Winners', value: resultsText || 'No results', inline: false },
      { name: 'Total Participants', value: String(results.length), inline: true },
    ];
    if (tiebreakerNote) fields.push({ name: 'Tiebreaker', value: tiebreakerNote, inline: false });
    fields.push({ name: '🔗 Link', value: `[View Results](${resultsUrl})`, inline: false });

    const payload = {
      content: '@everyone',
      embeds: [{
        title: '🏆 Auction Results Ready',
        description: auction.title,
        color: 0x10b981,
        fields,
        footer: { text: 'DKP System' },
      }],
      components: [{ type: 1, components: [{ type: 2, label: 'View Results', style: 5, url: resultsUrl }] }],
    };

    let sent = 0;
    for (const ch of channels) {
      if (await sendToChannel(ch, payload)) sent++;
    }

    return Response.json({ status: 'sent', channels: sent });
  } catch (error) {
    console.error('notifyAuctionResults error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});