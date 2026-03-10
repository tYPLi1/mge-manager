import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Try to verify admin, but don't fail if not authenticated
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch {
      // Continue without admin check in deployed environment
    }

    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get Discord webhook URL from settings using service role
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const webhookUrl = settings.find(s => s.key === 'discord_webhook_url')?.value;

    if (!webhookUrl) {
      return Response.json({ error: 'Discord webhook URL not configured' }, { status: 400 });
    }

    // Send test message
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '🧪 **Discord Webhook Test**',
        embeds: [{
          title: 'Test Message',
          description: 'This is a test message from the DKP System.',
          color: 16776960,
          timestamp: new Date().toISOString()
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: `Discord API error: ${response.status}`, details: error }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Test message sent to Discord webhook' });
  } catch (error) {
    console.error('testDiscordWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});