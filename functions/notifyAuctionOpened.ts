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

    let auction;
    if (event?.type) {
      const old_data = body.old_data;
      if (data.status !== 'open' || old_data?.status === 'open') {
        return Response.json({ success: true, skipped: true });
      }
      auction = data;
    } else {
      const { auctionId } = body;
      if (!auctionId) return Response.json({ error: 'Missing auctionId' }, { status: 400 });
      auction = await service.entities.Auction.get(auctionId);
    }

    if (!BOT_TOKEN) return Response.json({ status: 'no_token' });

    const settings = await service.entities.AppSettings.list();
    const channels = getTargetChannels(settings, 'auction');
    if (channels.length === 0) return Response.json({ status: 'no_channels' });

    const auctionUrl = 'https://mge002.base44.app/Auction';

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
    embed.fields.push({ name: '🔗 Link', value: `[View Auction](${auctionUrl})`, inline: false });

    const payload = {
      content: '@everyone',
      embeds: [embed],
      components: [{ type: 1, components: [{ type: 2, label: 'View Auction', style: 5, url: auctionUrl }] }],
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