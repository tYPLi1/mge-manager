import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

function getServiceClient(req) {
  try { return createClientFromRequest(req).asServiceRole; }
  catch { return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole; }
}

Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);

    if (!BOT_TOKEN) return Response.json({ error: 'No bot token' }, { status: 400 });

    const settings = await service.entities.AppSettings.list();
    const serversJson = settings.find(s => s.key === 'discord_servers')?.value;
    const channels = [];
    if (serversJson) {
      const servers = JSON.parse(serversJson);
      for (const server of servers) {
        const ch = server.channels?.results;
        if (ch?.enabled) {
          const channelId = ch.channelId || server.defaultChannelId;
          if (channelId) channels.push(channelId);
        }
      }
    }

    if (channels.length === 0) return Response.json({ error: 'No results channels' }, { status: 400 });

    const resultsUrl = 'https://mge002.base44.app/Results';

    const embed = {
      title: '🏆 Auction Results Ready',
      description: 'MGE Test Round',
      color: 0x10b981,
      fields: [
        {
          name: 'Top Winners',
          value: '1. **Xeraz** — 150 DKP | Target: 30,000,000 | Medals: 100\n2. **小神咒** — 120 DKP | Target: 28,000,000 | Medals: 80\n3. **Rcorreia** — 100 DKP | Target: 26,000,000 | Medals: 60',
          inline: false,
        },
        { name: 'Total Participants', value: '10', inline: true },
        { name: '🔗 Link', value: `[View Results](${resultsUrl})`, inline: false },
      ],
      footer: { text: 'DKP System' },
    };

    const payload = {
      content: '@everyone',
      embeds: [embed],
      components: [{ type: 1, components: [{ type: 2, label: 'View Results', style: 5, url: resultsUrl }] }],
    };

    let sent = 0;
    for (const ch of channels) {
      const res = await fetch(`https://discord.com/api/v10/channels/${ch}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) sent++;
      else console.error(`Failed ${ch}: ${res.status} ${await res.text()}`);
    }

    return Response.json({ success: true, channels_sent: sent });
  } catch (error) {
    console.error('testResultsEmbed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});