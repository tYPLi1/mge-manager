import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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
    const { session, embed, extraText, notifType } = body;

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

    // Optional: Verify user status (skip if AdminUser check fails)
     try {
       const user = await service.entities.AdminUser.get(session.userId);
       if (!user || !user.is_active) return Response.json({ error: 'User deactivated' }, { status: 403 });
     } catch (e) {
       // If AdminUser lookup fails, allow the request to continue
       // (session token validation is sufficient)
       console.log('AdminUser lookup skipped:', e?.message || 'unknown error');
     }

    if (!embed || (Array.isArray(embed) && embed.length === 0)) {
      return Response.json({ error: 'Missing embed data' }, { status: 400 });
    }

    const settings = await service.entities.AppSettings.list();

    // Get target channels based on notification type (default: auction)
    const type = notifType === 'event_upload' ? 'events' : (notifType || 'auction');
    const serversJson = settings.find(s => s.key === 'discord_servers')?.value;
    let channels = [];
    if (serversJson) {
      try {
        const servers = JSON.parse(serversJson);
        for (const server of servers) {
          const ch = server.channels?.[type];
          if (ch?.enabled) {
            const channelId = ch.channelId || server.defaultChannelId;
            if (channelId) channels.push(channelId);
          }
        }
      } catch {}
    }
    if (channels.length === 0) return Response.json({ error: 'No channels configured' }, { status: 400 });

    const linkUrl = 'https://mge002.base44.app/Leaderboard';

    // Handle both single embed and multiple embeds
    const embedsToProcess = Array.isArray(embed) ? embed : [embed];
    
    // Add extraText to first embed if provided
    if (extraText?.trim() && embedsToProcess.length > 0) {
      embedsToProcess[0].description = (embedsToProcess[0].description || "") + "\n\n" + extraText.trim();
    }

    // Ensure first embed has title, last embed has link/footer
    if (embedsToProcess.length > 0) {
      embedsToProcess[0].title = embedsToProcess[0].title || '📊 Update';
      
      embedsToProcess[embedsToProcess.length - 1].fields = embedsToProcess[embedsToProcess.length - 1].fields || [];
      embedsToProcess[embedsToProcess.length - 1].fields.push({ name: '🔗 Link', value: `[View Leaderboard](${linkUrl})`, inline: false });
      embedsToProcess[embedsToProcess.length - 1].footer = embedsToProcess[embedsToProcess.length - 1].footer || { text: 'DKP System' };
    }

    let sent = 0;
    for (const ch of channels) {
      const res = await fetch(`https://discord.com/api/v10/channels/${ch}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: embedsToProcess }),
      });
      if (res.ok) sent++;
      else console.error(`Discord send failed for channel ${ch}: ${res.status}`);
    }

    return Response.json({ success: true, channels: sent });
  } catch (error) {
    console.error('sendDiscordEmbed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});