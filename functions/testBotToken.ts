Deno.serve(async (req) => {
  try {
    const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
    
    if (!BOT_TOKEN) {
      return Response.json({ error: 'No DISCORD_BOT_TOKEN set' }, { status: 400 });
    }

    console.log('Token length:', BOT_TOKEN.length);
    console.log('Token starts with:', BOT_TOKEN.substring(0, 10) + '...');
    console.log('Token has whitespace:', BOT_TOKEN !== BOT_TOKEN.trim());

    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { 'Authorization': `Bot ${BOT_TOKEN.trim()}` },
    });

    const data = await res.json();
    console.log('Discord response status:', res.status);
    console.log('Discord response:', JSON.stringify(data));

    if (!res.ok) {
      return Response.json({ error: 'Discord rejected token', status: res.status, detail: data });
    }

    // Also test guilds
    const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { 'Authorization': `Bot ${BOT_TOKEN.trim()}` },
    });
    const guildsData = await guildsRes.json();
    console.log('Guilds status:', guildsRes.status);
    console.log('Guilds count:', Array.isArray(guildsData) ? guildsData.length : 'not array');

    return Response.json({ 
      bot: { id: data.id, username: data.username, bot: data.bot },
      guilds: Array.isArray(guildsData) ? guildsData.map(g => ({ id: g.id, name: g.name })) : guildsData,
      guildsStatus: guildsRes.status
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});