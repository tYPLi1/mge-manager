import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Only admin can trigger notifications
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await req.json();
    const { eventName, eventDate, playersUpdated, totalDkpDistributed, rankings } = body;

    if (!eventName || !eventDate) {
      return Response.json({ error: 'Missing eventName or eventDate' }, { status: 400 });
    }

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    
    const webhookUrl = settings.find(s => s.key === 'discord_webhook_url')?.value;
    const enabled = settings.find(s => s.key === 'discord_events_enabled')?.value === 'true';
    const channelId = settings.find(s => s.key === 'discord_auction_channel')?.value;

    if (!webhookUrl || !enabled) {
      return Response.json({ status: 'disabled' }, { status: 200 });
    }

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
      ],
      footer: { text: 'DKP System' },
    };

    const discordPayload = {
      content: channelId ? `<#${channelId}>` : undefined,
      embeds: [embed],
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

    return Response.json({ status: 'sent' });
  } catch (error) {
    console.error('notifyEventUpload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});