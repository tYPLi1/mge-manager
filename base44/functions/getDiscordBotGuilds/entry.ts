Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { session } = body;

    // Validate admin session via HMAC
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

    if (session.token !== expectedSignature) {
      return Response.json({ error: 'Invalid token' }, { status: 403 });
    }

    const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
    if (!BOT_TOKEN) return Response.json({ error: 'Bot token not configured' }, { status: 400 });

    // Fetch guilds
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { 'Authorization': `Bot ${BOT_TOKEN}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Discord API error: ${err}` }, { status: res.status });
    }

    const guilds = await res.json();

    // Fetch guild channels sequentially to avoid rate limiting
    const result = [];
    for (const guild of guilds) {
      let channels = [];
      try {
        const chRes = await fetch(`https://discord.com/api/v10/guilds/${guild.id}/channels`, {
          headers: { 'Authorization': `Bot ${BOT_TOKEN}` },
        });
        if (chRes.ok) {
          const allChannels = await chRes.json();
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
      
      // Delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return Response.json({ guilds: result });
  } catch (error) {
    console.error('getDiscordBotGuilds error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});