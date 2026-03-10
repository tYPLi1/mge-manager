import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // Handle automation trigger (DKPTransaction) or manual trigger
    let eventName, eventDate, playersUpdated, totalDkpDistributed, rankings;
    
    if (event?.type) {
      // Automation trigger - single DKPTransaction
      // Skip if this is a penalty/compensation (those are handled by notifyPenalty)
      if (data?.type === 'penalty' || data?.type === 'compensation') {
        return Response.json({ success: true });
      }
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
      // Manual trigger
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { eventName: name, eventDate: date, playersUpdated: players, totalDkpDistributed: total, rankings: ranks } = body;
      if (!name || !date) {
        return Response.json({ error: 'Missing eventName or eventDate' }, { status: 400 });
      }
      eventName = name;
      eventDate = date;
      playersUpdated = players;
      totalDkpDistributed = total;
      rankings = ranks;
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