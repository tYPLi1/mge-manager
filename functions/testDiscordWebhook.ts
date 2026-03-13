import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

function getServiceClient(req) {
  try { return createClientFromRequest(req).asServiceRole; }
  catch { return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole; }
}

Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);

    if (!BOT_TOKEN) return Response.json({ error: 'Discord bot token not configured' }, { status: 400 });

    const settings = await service.entities.AppSettings.list();
    const serversJson = settings.find(s => s.key === 'discord_servers')?.value;

    if (!serversJson) return Response.json({ error: 'No Discord servers configured' }, { status: 400 });

    let servers;
    try { servers = JSON.parse(serversJson); } catch { return Response.json({ error: 'Invalid server config' }, { status: 400 }); }

    if (servers.length === 0) return Response.json({ error: 'No servers configured' }, { status: 400 });

    // Send test to all default channels
    let sent = 0;
    const errors = [];

    for (const server of servers) {
      const channelId = server.defaultChannelId;
      if (!channelId) continue;

      const appUrl = Deno.env.get('APP_URL') || 'https://app.example.com';

      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🧪 **Discord Bot Test** — Server: ${server.name || 'Unnamed'}`,
          embeds: [{
            title: '✅ Discord Bot Test',
            description: 'Bot integration works! @everyone mentions are supported.',
            color: 16776960,
            fields: [
              { name: '🔗 App Link', value: `[Zur App](${appUrl})`, inline: false },
            ],
            timestamp: new Date().toISOString(),
          }],
        }),
      });

      if (res.ok) {
        sent++;
      } else {
        const err = await res.text();
        errors.push(`${server.name || channelId}: ${res.status} - ${err}`);
      }
    }

    if (sent === 0) {
      return Response.json({ error: `All sends failed: ${errors.join('; ')}` }, { status: 500 });
    }

    return Response.json({ success: true, message: `Test sent to ${sent} server(s)`, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    console.error('testDiscordWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});