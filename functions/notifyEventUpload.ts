import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    let eventName, eventDate, playersUpdated, totalDkpDistributed, rankings;

    if (event?.type) {
      if (data?.type === 'penalty' || data?.type === 'compensation') return Response.json({ success: true });
      if (data?.source && data?.source_stage && data?.amount) {
        eventName = `${data.source}${data.source_stage ? ' - ' + data.source_stage : ''}`;
        eventDate = data.event_date;
        playersUpdated = 1;
        totalDkpDistributed = data.amount;
        rankings = [];
      } else {
        return Response.json({ success: true });
      }
    } else {
      const { eventName: name, eventDate: date, playersUpdated: players, totalDkpDistributed: total, rankings: ranks } = body;
      if (!name || !date) return Response.json({ error: 'Missing eventName or eventDate' }, { status: 400 });
      eventName = name;
      eventDate = date;
      playersUpdated = players;
      totalDkpDistributed = total;
      rankings = ranks;
    }

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const getSetting = (key) => settings.find(s => s.key === key)?.value;

    const channelId = getSetting('discord_events_channel_id') || getSetting('discord_channel_id');
    const enabled = getSetting('discord_events_enabled') === 'true';

    if (!channelId || !BOT_TOKEN || !enabled) return Response.json({ status: 'disabled' });

    const appUrl = Deno.env.get('APP_URL') || 'https://app.example.com';
    const leaderboardUrl = `${appUrl}/?page=Leaderboard`;

    const rankingsText = rankings && rankings.length > 0
      ? rankings.slice(0, 5).map((r, i) => `${i + 1}. **${r.player_name}** - Rank ${r.rank} (+${r.dkp} DKP)`).join('\n')
      : 'No ranking data';

    const embed = {
      title: '📊 Event Data Uploaded',
      description: `**${eventName}** - ${new Date(eventDate).toLocaleDateString()}`,
      color: 0x8b5cf6,
      fields: [
        { name: 'Players Updated', value: String(playersUpdated || 0), inline: true },
        { name: 'Total DKP Distributed', value: String(totalDkpDistributed || 0), inline: true },
        { name: 'Top Rankings', value: rankingsText, inline: false },
        { name: '🔗 Link', value: `[Zum Leaderboard](${leaderboardUrl})`, inline: false },
      ],
      footer: { text: 'DKP System' },
    };

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '@everyone', embeds: [embed] }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Discord error: ${err}` }, { status: 500 });
    }

    return Response.json({ status: 'sent' });
  } catch (error) {
    console.error('notifyEventUpload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});