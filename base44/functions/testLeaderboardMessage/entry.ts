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

    // Collect all default channels
    const channelIds = servers.map(s => s.defaultChannelId).filter(Boolean);
    if (channelIds.length === 0) return Response.json({ error: 'No default channels configured' }, { status: 400 });

    const players = await service.entities.Player.list('-total_dkp', 30);

    const leaderboardText = players
      .map((p, i) => {
        const rank = i + 1;
        const balance = (p.total_dkp || 0) - (p.dkp_spent || 0);
        return `**${rank}.** ${p.name} • Earned: ${p.total_dkp || 0} • Balance: ${balance}`;
      })
      .join('\n');

    let sent = 0;
    for (const ch of channelIds) {
      const res = await fetch(`https://discord.com/api/v10/channels/${ch}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '📊 **DKP Leaderboard - Top 30**',
          embeds: [{
            description: leaderboardText,
            color: 16776960,
            timestamp: new Date().toISOString(),
            fields: [{ name: '🔗 Link', value: '[View Leaderboard](https://mge.era003.com/Leaderboard)', inline: false }],
          }],
        }),
      });
      if (res.ok) sent++;
      else console.error(`Leaderboard send failed for ${ch}: ${res.status}`);
    }

    return Response.json({ success: true, message: `Leaderboard sent to ${sent} server(s)` });
  } catch (error) {
    console.error('testLeaderboardMessage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});