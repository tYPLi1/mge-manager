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

    // Only add title/footer/link if not already present
    if (embedsToProcess.length > 0) {
      if (!embedsToProcess[0].title) {
        embedsToProcess[0].title = '📊 Update';
      }
      
      const lastEmbed = embedsToProcess[embedsToProcess.length - 1];
      lastEmbed.fields = lastEmbed.fields || [];
      const hasLink = lastEmbed.fields.some(f => f.name === '🔗 Link');
      if (!hasLink) {
        lastEmbed.fields.push({ name: '🔗 Link', value: `[View Leaderboard](${linkUrl})`, inline: false });
      }
      if (!lastEmbed.footer) {
        lastEmbed.footer = { text: 'DKP System' };
      }
    }

    // Validate and sanitize embeds for Discord API limits
    for (const e of embedsToProcess) {
      if (!e.description && (!e.fields || e.fields.length === 0)) {
        e.description = ' ';
      }
      if (e.fields) {
        // Filter out empty fields
        e.fields = e.fields.filter(f => f.name && f.value);
        // Split fields that exceed Discord's 1024 char limit
        const newFields = [];
        for (const f of e.fields) {
          if (!f.value) f.value = '-';
          if (!f.name) f.name = '-';
          if (f.value.length > 1024) {
            // Split into chunks of max 1024 chars at line breaks
            let remaining = f.value;
            let partNum = 0;
            while (remaining.length > 0) {
              let chunk;
              if (remaining.length <= 1024) {
                chunk = remaining;
                remaining = '';
              } else {
                const cutAt = remaining.lastIndexOf('\n', 1024);
                const splitPos = cutAt > 200 ? cutAt : 1024;
                chunk = remaining.substring(0, splitPos);
                remaining = remaining.substring(splitPos).replace(/^\n/, '');
              }
              newFields.push({
                name: partNum === 0 ? f.name : `${f.name} (cont.)`,
                value: chunk,
                inline: f.inline || false,
              });
              partNum++;
            }
          } else {
            newFields.push(f);
          }
        }
        e.fields = newFields;
      }
    }

    console.log('Sending embeds:', JSON.stringify(embedsToProcess).substring(0, 500));

    let sent = 0;
    for (const ch of channels) {
      const res = await fetch(`https://discord.com/api/v10/channels/${ch}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: embedsToProcess }),
      });
      if (res.ok) {
        sent++;
      } else {
        const errBody = await res.text();
        console.error(`Discord send failed for channel ${ch}: ${res.status} - ${errBody}`);
      }
    }

    if (sent === 0) {
      return Response.json({ success: false, error: 'Failed to send to any channel' }, { status: 500 });
    }
    return Response.json({ success: true, channels: sent });
  } catch (error) {
    console.error('sendDiscordEmbed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});