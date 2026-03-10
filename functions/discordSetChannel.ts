import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DISCORD_PUBLIC_KEY = Deno.env.get('DISCORD_PUBLIC_KEY');

// Verify Discord interaction signature using Web Crypto API
async function verifyDiscordRequest(req, rawBody) {
  const signature = req.headers.get('X-Signature-Ed25519');
  const timestamp = req.headers.get('X-Signature-Timestamp');

  if (!signature || !timestamp || !DISCORD_PUBLIC_KEY) {
    return false;
  }

  try {
    const message = timestamp + rawBody;
    const encoder = new TextEncoder();
    const keyBytes = Uint8Array.from(Buffer.from(DISCORD_PUBLIC_KEY, 'hex'));
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'Ed25519' }, false, ['verify']);
    const sigBytes = Uint8Array.from(Buffer.from(signature, 'hex'));
    
    return await crypto.subtle.verify('Ed25519', key, sigBytes, encoder.encode(message));
  } catch (e) {
    console.error('Signature verification failed:', e);
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    
    // Only allow POST requests with Discord verification
    if (req.method !== 'POST') {
      return Response.json({ error: 'Only POST allowed' }, { status: 405 });
    }

    const isValid = await verifyDiscordRequest(req, rawBody);
    if (!isValid) {
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