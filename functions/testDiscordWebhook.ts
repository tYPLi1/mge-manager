import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const channelId = settings.find(s => s.key === 'discord_channel_id')?.value;

    if (!channelId) {
      return Response.json({ error: 'Discord channel ID not configured' }, { status: 400 });
    }
    if (!BOT_TOKEN) {
      return Response.json({ error: 'Discord bot token not configured' }, { status: 400 });
    }

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: '🧪 **Discord Bot Test**',
        embeds: [{
          title: 'Test Message',
          description: 'This is a test message from the DKP System Bot. @everyone mentions now work!',
          color: 16776960,
          timestamp: new Date().toISOString()
        }]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: `Discord API error: ${response.status}`, details: error }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Test message sent via Discord Bot' });
  } catch (error) {
    console.error('testDiscordWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});