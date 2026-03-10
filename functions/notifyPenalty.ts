import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    // Get Discord webhook URL
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const webhookUrl = settings.find(s => s.key === 'discord_webhook_url')?.value;
    const penaltiesEnabled = settings.find(s => s.key === 'discord_penalties_enabled')?.value === 'true';

    if (!webhookUrl || !penaltiesEnabled) return Response.json({ success: true });

    const { event, data } = body;
    if (!data) return Response.json({ success: true });

    const isCompensation = data.type === 'compensation';
    const isPenalty = data.type === 'penalty';
    
    if (!isCompensation && !isPenalty) {
      return Response.json({ success: true });
    }

    const title = isCompensation ? '💰 DKP Kompensation' : '⚠️ DKP Strafzug';
    const color = isCompensation ? 65280 : 16711680; // Green or Red
    
    const sourceText = data.source || (isCompensation ? 'MGE' : 'Offense');

    const embed = {
      title: title,
      description: `**${data.player_name}**`,
      fields: [
        { name: 'Betrag', value: `${data.amount > 0 ? '+' : ''}${data.amount} DKP`, inline: true },
        { name: 'Grund', value: sourceText, inline: true },
        { name: 'Details', value: data.note || 'Keine Notiz', inline: false }
      ],
      color: color,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('notifyPenalty error:', error);
    return Response.json({ success: true });
  }
});