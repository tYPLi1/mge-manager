import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Sends a Discord embed message via the configured webhook.
 * Requires admin session validation.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { session, embed, channelId, extraText } = body;

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

    // Verify user still active (best-effort; if SDK auth context missing, trust HMAC)
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

    // Get webhook URL from settings
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const webhookUrl = settings.find(s => s.key === 'discord_webhook_url')?.value;

    if (!webhookUrl) {
      return Response.json({ error: 'Discord webhook URL not configured' }, { status: 400 });
    }

    // Build embed with optional extra text
    const finalEmbed = { ...embed };
    if (extraText?.trim()) {
      finalEmbed.description = (finalEmbed.description || "") + "\n\n" + extraText.trim();
    }

    const contentParts = ['@everyone'];
    if (channelId) contentParts.push(`<#${channelId}>`);

    const discordPayload = {
      content: contentParts.join(' '),
      embeds: [finalEmbed],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Discord error: ${err}` }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendDiscordEmbed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});