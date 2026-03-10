import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createHmac } from 'crypto';

const DISCORD_PUBLIC_KEY = Deno.env.get('DISCORD_PUBLIC_KEY');

// Verify Discord interaction signature
function verifyDiscordRequest(req, rawBody) {
  const signature = req.headers.get('X-Signature-Ed25519');
  const timestamp = req.headers.get('X-Signature-Timestamp');

  if (!signature || !timestamp || !DISCORD_PUBLIC_KEY) {
    return false;
  }

  const message = timestamp + rawBody;
  const expectedSignature = createHmac('sha256', DISCORD_PUBLIC_KEY)
    .update(message)
    .digest('hex');

  return signature === expectedSignature;
}

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    
    // Only allow POST requests with Discord verification
    if (req.method !== 'POST') {
      return Response.json({ error: 'Only POST allowed' }, { status: 405 });
    }

    if (!verifyDiscordRequest(req, rawBody)) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const interaction = JSON.parse(rawBody);

    // Handle Discord ping (PING type = 1)
    if (interaction.type === 1) {
      return Response.json({ type: 1 });
    }

    // Handle command (APPLICATION_COMMAND type = 2)
    if (interaction.type === 2) {
      const commandName = interaction.data.name;
      const options = interaction.data.options || [];

      if (commandName === 'set-dkp-channel') {
        const channelId = options.find(o => o.name === 'channel')?.value;
        
        if (!channelId) {
          return Response.json({
            type: 4,
            data: { content: '❌ Please specify a channel.' },
          });
        }

        // Save channel setting
        const base44 = createClientFromRequest(req);
        const settings = await base44.asServiceRole.entities.AppSettings.list();
        const existing = settings.find(s => s.key === 'discord_auction_channel');

        if (existing) {
          await base44.asServiceRole.entities.AppSettings.update(existing.id, {
            value: channelId,
          });
        } else {
          await base44.asServiceRole.entities.AppSettings.create({
            key: 'discord_auction_channel',
            value: channelId,
          });
        }

        return Response.json({
          type: 4,
          data: { content: `✅ DKP notifications will be sent to <#${channelId}>` },
        });
      }

      return Response.json({
        type: 4,
        data: { content: '❌ Unknown command.' },
      });
    }

    return Response.json({ error: 'Unknown interaction type' }, { status: 400 });
  } catch (error) {
    console.error('discordSetChannel error:', error);
    return Response.json({
      type: 4,
      data: { content: '❌ An error occurred.' },
    });
  }
});