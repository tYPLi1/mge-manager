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

    if (!BOT_TOKEN) return Response.json({ skipped: true, reason: "No bot token" });

    const openAuctions = await service.entities.Auction.filter({ status: "open" });
    const settings = await service.entities.AppSettings.list();
    const channels = getTargetChannels(settings, 'reminder');

    if (channels.length === 0) {
      return Response.json({ skipped: true, reason: "No reminder channels configured" });
    }

    const now = new Date();
    const auctionUrl = 'https://mge002.base44.app/Auction';

    function ensureUTC(dateStr) {
      if (!dateStr) return dateStr;
      if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*[-+]/.test(dateStr)) {
        return dateStr + 'Z';
      }
      return dateStr;
    }

    let remindersSent = 0;

    for (const auction of openAuctions) {
      if (!auction.scheduled_close) continue;
      if (auction.reminder_sent) continue;
      const closeAt = new Date(ensureUTC(auction.scheduled_close));
      const diffMin = (closeAt - now) / 60000;

      if (diffMin > 0 && diffMin <= 35) {
        const minutesLeft = Math.round(diffMin);
        const closeTimeStr = closeAt.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
        const bids = await service.entities.Bid.filter({ auction_id: auction.id });
        const activeBids = bids.filter(b => !b.is_deleted);

        const fields = [
          { name: "Closes At", value: closeTimeStr, inline: true },
          { name: "Active Bids", value: String(activeBids.length), inline: true },
        ];
        if (auction.has_password) fields.push({ name: "🔒", value: "Password required", inline: true });
        fields.push({ name: '🔗 Link', value: `[View Auction](${auctionUrl})`, inline: false });

        const payload = {
          embeds: [{
            title: "⏰ Auction Ending Soon!",
            description: `**${auction.title}** closes in ~${minutesLeft} minutes!`,
            color: 0xff6b35,
            fields,
            footer: { text: "DKP System — Last chance to bid!" },
          }],
        };

        // Sanitize embeds for Discord limits
        if (payload.embeds) {
          for (const e of payload.embeds) {
            if (e.fields) {
              e.fields = e.fields.filter(f => f.name && f.value);
              const newFields = [];
              for (const f of e.fields) {
                if (f.value && f.value.length > 1024) {
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
          if (res.ok) {
            remindersSent++;
          } else {
            const errBody = await res.text();
            console.error(`Reminder failed for channel ${ch}: ${res.status} - ${errBody}`);
          }
        }

        await service.entities.Auction.update(auction.id, { reminder_sent: true });
      }
    }

    return Response.json({ remindersSent, checkedAuctions: openAuctions.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});