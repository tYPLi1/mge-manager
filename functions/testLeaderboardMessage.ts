import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get Discord webhook URL from settings
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const webhookUrl = settings.find(s => s.key === 'discord_webhook_url')?.value;

    if (!webhookUrl) {
      return Response.json({ error: 'Discord webhook URL not configured' }, { status: 400 });
    }

    // Get top 30 players for DKP leaderboard
    const players = await base44.asServiceRole.entities.Player.list('-total_dkp', 30);
    
    // Build leaderboard text
    const leaderboardText = players
      .map((p, i) => {
        const rank = i + 1;
        const dkpEarned = p.total_dkp || 0;
        const dkpSpent = p.dkp_spent || 0;
        const balance = dkpEarned - dkpSpent;
        return `**${rank}.** ${p.name} • Earned: ${dkpEarned} • Balance: ${balance}`;
      })
      .join('\n');

    // Send test message
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '📊 **DKP Leaderboard Test - Top 30**',
        embeds: [{
          description: leaderboardText,
          color: 16776960,
          timestamp: new Date().toISOString()
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: `Discord API error: ${response.status}`, details: error }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Leaderboard message sent to Discord' });
  } catch (error) {
    console.error('testLeaderboardMessage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});