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

    let eventName, eventDate, playersUpdated, totalDkpDistributed, rankings;

    if (event?.type) {
      if (data?.type === 'penalty' || data?.type === 'compensation') return Response.json({ success: true });
      if (data?.source && data?.source_stage && data?.amount) {
        eventName = `${data.source}${data.source_stage ? ' - ' + data.source_stage : ''}`;
        eventDate = data.event_date;
        playersUpdated = 1;
        totalDkpDistributed = data.amount;
        rankings = [];
      } else {
        return Response.json({ success: true });
      }
    } else {
      const { eventName: name, eventDate: date, playersUpdated: players, totalDkpDistributed: total, rankings: ranks } = body;
      if (!name || !date) return Response.json({ error: 'Missing eventName or eventDate' }, { status: 400 });
      eventName = name; eventDate = date; playersUpdated = players; totalDkpDistributed = total; rankings = ranks;
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
      content: '@everyone',
      embeds: [{
        title: '📊 Event Data Uploaded',
        description: `**${eventName}** - ${new Date(eventDate).toLocaleDateString()}`,
        color: 0x8b5cf6,
        fields: [
          { name: 'Players Updated', value: String(playersUpdated || 0), inline: true },
          { name: 'Total DKP Distributed', value: String(totalDkpDistributed || 0), inline: true },
          { name: 'Top Rankings', value: rankingsText, inline: false },
          { name: '🔗 Link', value: `[Zum Leaderboard](${leaderboardUrl})`, inline: false },
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