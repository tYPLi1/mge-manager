import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

function sanitizeEmbeds(embeds) {
  for (const e of embeds) {
    if (!e.description && (!e.fields || e.fields.length === 0)) e.description = ' ';
    if (e.fields) {
      e.fields = e.fields.filter(f => f.name && f.value);
      const newFields = [];
      for (const f of e.fields) {
        if (!f.value) f.value = '-';
        if (!f.name) f.name = '-';
        if (f.value.length > 1024) {
          const lines = f.value.split('\n');
          let chunk = '';
          let part = 0;
          for (let li = 0; li < lines.length; li++) {
            const tentative = chunk ? chunk + '\n' + lines[li] : lines[li];
            if (tentative.length > 1000 && chunk) {
              const chunkLines = chunk.split('\n');
              while (chunkLines.length > 0 && (chunkLines[chunkLines.length - 1].trim() === '' || (chunkLines[chunkLines.length - 1].startsWith('**') && chunkLines[chunkLines.length - 1].endsWith('**')))) {
                lines.splice(li, 0, chunkLines.pop());
              }
              const trimmed = chunkLines.join('\n');
              if (trimmed) { newFields.push({ name: part === 0 ? f.name : `${f.name} (cont.)`, value: trimmed, inline: f.inline || false }); part++; }
              chunk = lines[li];
            } else { chunk = tentative; }
          }
          if (chunk) { newFields.push({ name: part === 0 ? f.name : `${f.name} (cont.)`, value: chunk, inline: f.inline || false }); }
        } else { newFields.push(f); }
      }
      e.fields = newFields;
    }
  }
  return embeds;
}

async function sendToChannel(channelId, payload) {
  if (payload.embeds) sanitizeEmbeds(payload.embeds);
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.error(`Discord send failed for ${channelId}: ${res.status} - ${errBody}`);
  }
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
    const tiebreakerFallback = settings.find(s => s.key === 'auction_tiebreaker_fallback')?.value || 'fcfs';
    const resultsUrl = 'https://mge002.base44.app/Results';

    const ruleLabel = (rule) => {
      if (rule === 'activity') return 'Higher Activity Score';
      if (rule === 'last_event_dkp') return 'Most DKP in last event';
      return 'First to bid';
    };

    const resultsText = results.map((r, i) => {
      let line = `${i + 1}. **${r.player_name}** — ${r.dkp_bid} DKP`;
      if (r.target_score) line += ` | Target: ${r.target_score.toLocaleString()}`;
      if (r.hero_medals) line += ` | Medals: ${r.hero_medals}`;
      return line;
    }).join('\n');

    const hasTies = results.some((r, i) =>
      (i > 0 && r.dkp_bid === results[i - 1].dkp_bid) ||
      (i < results.length - 1 && r.dkp_bid === results[i + 1].dkp_bid)
    );
    let tiebreakerNote = null;
    if (hasTies) {
      tiebreakerNote = `⚖ ${ruleLabel(tiebreaker)}`;
      if (tiebreaker !== 'fcfs') {
        tiebreakerNote += `\n↳ Fallback: ${ruleLabel(tiebreakerFallback)}`;
      }
    }

    const fields = [
      { name: 'Winners (Top 10)', value: resultsText || 'No results', inline: false },
      { name: 'Total Participants', value: String(results.length), inline: true },
    ];
    if (tiebreakerNote) fields.push({ name: 'Tiebreaker', value: tiebreakerNote, inline: false });
    fields.push({ name: '🔗 Link', value: `[View Results](${resultsUrl})`, inline: false });

    const payload = {
      embeds: [{
        title: '🏆 Auction Results Ready',
        description: auction.title,
        color: 0x10b981,
        url: resultsUrl,
        fields,
        footer: { text: 'DKP System' },
      }],
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