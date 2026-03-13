import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { message, session } = body;

    if (!message) {
      return Response.json({ error: 'Missing message' }, { status: 400 });
    }

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
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    if (session.token !== expectedSignature) {
      return Response.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Verify user still active
    try {
      const user = await base44.asServiceRole.entities.AdminUser.get(session.userId);
      if (!user || !user.is_active) {
        return Response.json({ error: 'User deactivated' }, { status: 403 });
      }
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('not found') || msg.includes('does not exist')) {
        return Response.json({ error: 'User not found' }, { status: 403 });
      }
      console.log('AdminUser lookup skipped, trusting HMAC:', msg);
    }

    // Get channel ID from settings
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const channelId = settings.find(s => s.key === 'discord_channel_id')?.value;

    if (!channelId || !BOT_TOKEN) {
      return Response.json({ error: 'Discord bot not configured (channel ID or token missing)' }, { status: 400 });
    }

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: message }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Discord error: ${err}` }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendDiscordMessage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});