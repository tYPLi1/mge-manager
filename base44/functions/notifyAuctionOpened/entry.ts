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

    let auction;
    if (event?.type) {
      if (data.status !== 'open') {
        return Response.json({ success: true, skipped: true, reason: 'not open' });
      }
      const old_data = body.old_data;
      if (old_data && old_data.status === 'open') {
        return Response.json({ success: true, skipped: true, reason: 'already open' });
      }
      if (!old_data && body.payload_too_large) {
        auction = await service.entities.Auction.get(event.entity_id || data.id);
      } else {
        auction = data;
      }
    } else {
      const { auctionId } = body;
      if (!auctionId) return Response.json({ error: 'Missing auctionId' }, { status: 400 });
      auction = await service.entities.Auction.get(auctionId);
    }

    if (!BOT_TOKEN) return Response.json({ status: 'no_token' });

    const settings = await service.entities.AppSettings.list();
    const channels = getTargetChannels(settings, 'auction');
    if (channels.length === 0) return Response.json({ status: 'no_channels' });

    const auctionUrl = 'https://mge.era003.com/Auction';

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
          { name: 'Status', value: 'OPEN', inline: true },
          { name: 'Closes', value: auction.scheduled_close ? new Date(auction.scheduled_close).toLocaleString() : 'TBD', inline: true },
        ],
        footer: { text: 'DKP System' },
      };
      if (auction.has_password) {
        embed.fields.push({ name: 'Password', value: `||${auction.bid_password}||`, inline: false });
      }
    }

    embed.fields = embed.fields || [];
    const hasLink = embed.fields.some(f => f.name === '🔗 Link');
    if (!hasLink) {
      embed.fields.push({ name: '🔗 Link', value: `[View Auction](${auctionUrl})`, inline: false });
    }

    const payload = {
      embeds: [embed],
    };

    let sent = 0;
    for (const ch of channels) {
      if (await sendToChannel(ch, payload)) sent++;
    }

    return Response.json({ status: 'sent', channels: sent });
  } catch (error) {
    console.error('notifyAuctionOpened error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});