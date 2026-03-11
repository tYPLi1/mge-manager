Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { message, webhookUrl } = body;

    if (!message || !webhookUrl) {
      return Response.json({ error: 'Missing message or webhookUrl' }, { status: 400 });
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