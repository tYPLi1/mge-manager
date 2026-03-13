import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

function getServiceClient(req) {
  try { return createClientFromRequest(req).asServiceRole; }
  catch { return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole; }
}

async function validateSession(service, session) {
  if (!session || !session.userId || !session.username || !session.expiresAt || !session.token) {
    return { valid: false, status: 401, error: 'Unauthorized' };
  }
  if (new Date(session.expiresAt) <= new Date()) {
    return { valid: false, status: 401, error: 'Session expired' };
  }
  const secret = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
  const payload = `${session.userId}:${session.username}:${session.expiresAt}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (session.token !== expected) return { valid: false, status: 403, error: 'Invalid token' };
  try {
    const user = await service.entities.AdminUser.get(session.userId);
    if (!user || !user.is_active) return { valid: false, status: 403, error: 'User deactivated' };
  } catch (e) {
    const msg = e?.message || '';
    if (msg.includes('not found') || msg.includes('does not exist')) return { valid: false, status: 403, error: 'User not found' };
  }
  return { valid: true };
}

Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);
    const body = await req.json();
    const { session } = body;

    const auth = await validateSession(service, session);
    if (!auth.valid) return Response.json({ error: auth.error }, { status: auth.status });

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
              { name: '🔗 App Link', value: '[Zur App](https://mge002.base44.app)', inline: false },
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