import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (!BOT_TOKEN) return Response.json({ error: 'Discord bot token not configured' }, { status: 400 });

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const serversJson = settings.find(s => s.key === 'discord_servers')?.value;

    if (!serversJson) return Response.json({ error: 'No Discord servers configured' }, { status: 400 });

    let servers;
    try { servers = JSON.parse(serversJson); } catch { return Response.json({ error: 'Invalid server config' }, { status: 400 }); }

    // Collect all default channels
    const channelIds = servers.map(s => s.defaultChannelId).filter(Boolean);
    if (channelIds.length === 0) return Response.json({ error: 'No default channels configured' }, { status: 400 });

    const players = await base44.asServiceRole.entities.Player.list('-total_dkp', 30);

    const leaderboardText = players
      .map((p, i) => {
        const rank = i + 1;
        const balance = (p.total_dkp || 0) - (p.dkp_spent || 0);
        return `**${rank}.** ${p.name} • Earned: ${p.total_dkp || 0} • Balance: ${balance}`;
      })
      .join('\n');

    const appUrl = Deno.env.get('APP_URL') || 'https://app.example.com';

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
            fields: [{ name: '🔗 Link', value: `[Zum Leaderboard](${appUrl}/?page=Leaderboard)`, inline: false }],
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