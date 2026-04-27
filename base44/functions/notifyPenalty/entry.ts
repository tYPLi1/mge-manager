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

    // Compensations link to Leaderboard (DKP balances), Penalties link to Punishments (offense list)
    const linkUrl = isCompensation
      ? 'https://mge.era003.com/Leaderboard'
      : 'https://mge.era003.com/Punishments';
    const linkLabel = isCompensation ? 'View Leaderboard' : 'View Punishments';

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
          { name: '🔗 Link', value: `[${linkLabel}](${linkUrl})`, inline: false },
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