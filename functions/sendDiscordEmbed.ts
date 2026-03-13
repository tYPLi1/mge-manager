import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

async function sendBotMessage(channelId, payload) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord API error ${res.status}: ${err}`);
  }
  return res;
}

/**
 * Sends a Discord embed message via the Bot API.
 * Requires admin session validation.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { session, embed, channelId: overrideChannelId, extraText } = body;

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

    if (!embed) {
      return Response.json({ error: 'Missing embed' }, { status: 400 });
    }

    // Get channel ID from settings
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const channelId = overrideChannelId || settings.find(s => s.key === 'discord_channel_id')?.value;

    if (!channelId) {
      return Response.json({ error: 'Discord channel ID not configured' }, { status: 400 });
    }

    if (!BOT_TOKEN) {
      return Response.json({ error: 'Discord bot token not configured' }, { status: 400 });
    }

    // Build embed with optional extra text
    const finalEmbed = { ...embed };
    if (extraText?.trim()) {
      finalEmbed.description = (finalEmbed.description || "") + "\n\n" + extraText.trim();
    }

    await sendBotMessage(channelId, {
      content: '@everyone',
      embeds: [finalEmbed],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendDiscordEmbed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});