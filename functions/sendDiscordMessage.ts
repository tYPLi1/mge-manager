import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

function getServiceClient(req) {
  try {
    const client = createClientFromRequest(req);
    return client.asServiceRole;
  } catch {
    return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole;
  }
}

Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);
    const body = await req.json();
    const { message, session, channelIds } = body;

    if (!message) return Response.json({ error: 'Missing message' }, { status: 400 });
    if (!BOT_TOKEN) return Response.json({ error: 'Bot token not configured' }, { status: 400 });

    // Validate admin session
    if (!session || !session.userId || !session.username || !session.expiresAt || !session.token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (new Date(session.expiresAt) <= new Date()) {
      return Response.json({ error: 'Session expired' }, { status: 401 });
    }

    const secret = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
    const payload = `${session.userId}:${session.username}:${session.expiresAt}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (session.token !== expectedSignature) return Response.json({ error: 'Invalid token' }, { status: 403 });

    try {
      const user = await base44.asServiceRole.entities.AdminUser.get(session.userId);
      if (!user || !user.is_active) return Response.json({ error: 'User deactivated' }, { status: 403 });
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('not found') || msg.includes('does not exist')) {
        return Response.json({ error: 'User not found' }, { status: 403 });
      }
    }

    // Use explicitly provided channelIds, or fall back to config
    let channels = [];
    if (channelIds && Array.isArray(channelIds) && channelIds.length > 0) {
      channels = channelIds;
    } else {
      const settings = await base44.asServiceRole.entities.AppSettings.list();
      channels = getTargetChannels(settings, 'manual');
    }
    if (channels.length === 0) return Response.json({ error: 'No channels specified' }, { status: 400 });

    const appUrl = Deno.env.get('APP_URL') || 'https://app.example.com';
    const fullMessage = `${message}\n\n🔗 ${appUrl}`;

    let sent = 0;
    for (const ch of channels) {
      const res = await fetch(`https://discord.com/api/v10/channels/${ch}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fullMessage }),
      });
      if (res.ok) sent++;
      else console.error(`Send failed for channel ${ch}: ${res.status}`);
    }

    return Response.json({ success: true, channels: sent });
  } catch (error) {
    console.error('sendDiscordMessage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});