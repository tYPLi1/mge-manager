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
          let remaining = f.value;
          let part = 0;
          while (remaining.length > 0) {
            let chunk;
            if (remaining.length <= 1024) { chunk = remaining; remaining = ''; }
            else {
              const cut = remaining.lastIndexOf('\n', 1024);
              const pos = cut > 200 ? cut : 1024;
              chunk = remaining.substring(0, pos);
              remaining = remaining.substring(pos).replace(/^\n/, '');
            }
            newFields.push({ name: part === 0 ? f.name : `${f.name} (cont.)`, value: chunk, inline: f.inline || false });
            part++;
          }
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
    const { eventName, eventDate, playersUpdated, totalDkpDistributed, rankings } = body;

    if (!eventName || !eventDate) {
      return Response.json({ error: 'Missing eventName or eventDate' }, { status: 400 });
    }

    if (!BOT_TOKEN) return Response.json({ status: 'no_token' });

    const settings = await service.entities.AppSettings.list();
    const channels = getTargetChannels(settings, 'events');
    if (channels.length === 0) return Response.json({ status: 'no_channels' });

    const leaderboardUrl = 'https://mge002.base44.app/Leaderboard';

    const rankingsText = rankings && rankings.length > 0
      ? rankings.slice(0, 5).map((r, i) => `${i + 1}. **${r.player_name}** - Rank ${r.rank} (+${r.dkp} DKP)`).join('\n')
      : 'No ranking data';

    const payload = {
      embeds: [{
        title: '📊 Event Data Uploaded',
        description: `**${eventName}** - ${new Date(eventDate).toLocaleDateString("en-GB")}`,
        color: 0x8b5cf6,
        url: leaderboardUrl,
        fields: [
          { name: 'Players Updated', value: String(playersUpdated || 0), inline: true },
          { name: 'Total DKP Distributed', value: String(totalDkpDistributed || 0), inline: true },
          { name: 'Top Rankings', value: rankingsText, inline: false },
          { name: '🔗 Link', value: `[View Leaderboard](${leaderboardUrl})`, inline: false },
        ],
        footer: { text: 'DKP System' },
      }],
    };

    let sent = 0;
    for (const ch of channels) {
      if (await sendToChannel(ch, payload)) sent++;
    }

    return Response.json({ status: 'sent', channels: sent });
  } catch (error) {
    console.error('notifyEventUpload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});