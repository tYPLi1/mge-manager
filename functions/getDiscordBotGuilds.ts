import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!BOT_TOKEN) return Response.json({ error: 'Bot token not configured' }, { status: 400 });

    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { 'Authorization': `Bot ${BOT_TOKEN}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Discord API error: ${err}` }, { status: res.status });
    }

    const guilds = await res.json();

    // Also fetch channels for each guild
    const result = [];
    for (const guild of guilds) {
      let channels = [];
      try {
        const chRes = await fetch(`https://discord.com/api/v10/guilds/${guild.id}/channels`, {
          headers: { 'Authorization': `Bot ${BOT_TOKEN}` },
        });
        if (chRes.ok) {
          const allChannels = await chRes.json();
          // Only text channels (type 0) and announcement channels (type 5)
          channels = allChannels
            .filter(c => c.type === 0 || c.type === 5)
            .sort((a, b) => a.position - b.position)
            .map(c => ({ id: c.id, name: c.name, type: c.type }));
        }
      } catch {}

      result.push({
        id: guild.id,
        name: guild.name,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
        channels,
      });
    }

    return Response.json({ guilds: result });
  } catch (error) {
    console.error('getDiscordBotGuilds error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});