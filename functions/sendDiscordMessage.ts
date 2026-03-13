import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return Response.json({ error: 'Missing message' }, { status: 400 });
    }

    // Get webhook URL from app settings (no longer accepted from request)
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const webhookUrl = settings.find(s => s.key === 'discord_webhook_url')?.value;

    if (!webhookUrl) {
      return Response.json({ error: 'Discord webhook URL not configured' }, { status: 400 });
    }

    const payload = {
      content: message,
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Discord error: ${err}` }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendDiscordMessage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});