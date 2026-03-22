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

Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);
    const body = await req.json();

    if (!BOT_TOKEN) return Response.json({ success: true });

    const settings = await service.entities.AppSettings.list();
    const channels = getTargetChannels(settings, 'penalties');
    if (channels.length === 0) return Response.json({ success: true });

    const { data } = body;
    if (!data) return Response.json({ success: true });

    const isCompensation = data.type === 'compensation';
    const isPenalty = data.type === 'penalty';
    if (!isCompensation && !isPenalty) return Response.json({ success: true });

    const punishmentsUrl = 'https://mge002.base44.app/Leaderboard';

    const title = isCompensation ? '💰 DKP Compensation' : '⚠️ DKP Penalty';
    const color = isCompensation ? 65280 : 16711680;
    const sourceText = data.source || (isCompensation ? 'MGE' : 'Offense');

    const payload = {
      embeds: [{
        title,
        description: `**${data.player_name}**`,
        fields: [
          { name: 'Amount', value: `${data.amount > 0 ? '+' : ''}${data.amount} DKP`, inline: true },
          { name: 'Reason', value: sourceText, inline: true },
          { name: 'Details', value: data.note || 'No note', inline: false },
          { name: '🔗 Link', value: `[View Leaderboard](${punishmentsUrl})`, inline: false },
        ],
        color,
        timestamp: new Date().toISOString(),
      }],
    };

    // Sanitize embeds for Discord limits
    if (payload.embeds) {
      for (const e of payload.embeds) {
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
    }

    for (const ch of channels) {
      const res = await fetch(`https://discord.com/api/v10/channels/${ch}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error(`Discord send failed for channel ${ch}: ${res.status} - ${errBody}`);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('notifyPenalty error:', error);
    return Response.json({ success: true });
  }
});