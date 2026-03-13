import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const getSetting = (key) => settings.find(s => s.key === key)?.value;

    const channelId = getSetting('discord_penalties_channel_id') || getSetting('discord_channel_id');
    const penaltiesEnabled = getSetting('discord_penalties_enabled') === 'true';

    if (!channelId || !BOT_TOKEN || !penaltiesEnabled) return Response.json({ success: true });

    const { data } = body;
    if (!data) return Response.json({ success: true });

    const isCompensation = data.type === 'compensation';
    const isPenalty = data.type === 'penalty';
    if (!isCompensation && !isPenalty) return Response.json({ success: true });

    const appUrl = Deno.env.get('APP_URL') || 'https://app.example.com';
    const punishmentsUrl = `${appUrl}/?page=Punishments`;

    const title = isCompensation ? '💰 DKP Kompensation' : '⚠️ DKP Strafzug';
    const color = isCompensation ? 65280 : 16711680;
    const sourceText = data.source || (isCompensation ? 'MGE' : 'Offense');

    const embed = {
      title,
      description: `**${data.player_name}**`,
      fields: [
        { name: 'Betrag', value: `${data.amount > 0 ? '+' : ''}${data.amount} DKP`, inline: true },
        { name: 'Grund', value: sourceText, inline: true },
        { name: 'Details', value: data.note || 'Keine Notiz', inline: false },
        { name: '🔗 Link', value: `[Zu den Strafen](${punishmentsUrl})`, inline: false },
      ],
      color,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '@everyone', embeds: [embed] }),
    });

    if (!response.ok) console.error('Discord bot message failed:', response.status);

    return Response.json({ success: true });
  } catch (error) {
    console.error('notifyPenalty error:', error);
    return Response.json({ success: true });
  }
});