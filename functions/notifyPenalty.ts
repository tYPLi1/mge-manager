import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

function getTargetChannels(settings, notifType) {
  const serversJson = settings.find(s => s.key === 'discord_servers')?.value;
  if (!serversJson) return [];
  try {
    const servers = JSON.parse(serversJson);
    const channels = [];
    for (const server of servers) {
      const ch = server.channels?.[notifType];
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
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    if (!BOT_TOKEN) return Response.json({ success: true });

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const channels = getTargetChannels(settings, 'penalties');
    if (channels.length === 0) return Response.json({ success: true });

    const { data } = body;
    if (!data) return Response.json({ success: true });

    const isCompensation = data.type === 'compensation';
    const isPenalty = data.type === 'penalty';
    if (!isCompensation && !isPenalty) return Response.json({ success: true });

    const appUrl = Deno.env.get('APP_URL') || 'https://app.example.com';
    const punishmentsUrl = `${appUrl}/?page=Punishments`;

    const title = isCompensation ? '💰 DKP Kompensation' : '⚠️ DKP Strafzug';
    const color = isCompensation ? 65280 : 16711680;
    const sourceText = data.source || (isCompensation ? 'MGE' : 'Offense');

    const payload = {
      content: '@everyone',
      embeds: [{
        title,
        description: `**${data.player_name}**`,
        fields: [
          { name: 'Betrag', value: `${data.amount > 0 ? '+' : ''}${data.amount} DKP`, inline: true },
          { name: 'Grund', value: sourceText, inline: true },
          { name: 'Details', value: data.note || 'Keine Notiz', inline: false },
          { name: '🔗 Link', value: `[Zu den Strafen](${punishmentsUrl})`, inline: false },
        ],
        color,
        timestamp: new Date().toISOString(),
      }],
    };

    for (const ch of channels) {
      const res = await fetch(`https://discord.com/api/v10/channels/${ch}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) console.error(`Discord send failed for channel ${ch}: ${res.status}`);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('notifyPenalty error:', error);
    return Response.json({ success: true });
  }
});