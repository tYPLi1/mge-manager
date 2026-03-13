import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const openAuctions = await base44.asServiceRole.entities.Auction.filter({ status: "open" });
    const settings = await base44.asServiceRole.entities.AppSettings.filter({});
    const now = new Date();

    const getSetting = (key) => settings.find(s => s.key === key)?.value;
    const channelId = getSetting("discord_channel_id");
    const reminderEnabled = getSetting("discord_auction_reminder_enabled") === "true";

    if (!channelId || !BOT_TOKEN || !reminderEnabled) {
      return Response.json({ skipped: true, reason: "Discord bot not configured or auction reminder disabled" });
    }

    function ensureUTC(dateStr) {
      if (!dateStr) return dateStr;
      if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*[-+]/.test(dateStr)) {
        return dateStr + 'Z';
      }
      return dateStr;
    }

    let remindersSent = 0;

    for (const auction of openAuctions) {
      if (!auction.scheduled_close) continue;

      const closeAt = new Date(ensureUTC(auction.scheduled_close));
      const diffMs = closeAt - now;
      const diffMin = diffMs / 60000;

      if (diffMin > 5 && diffMin <= 15) {
        const minutesLeft = Math.round(diffMin);
        const closeTimeStr = closeAt.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

        const bids = await base44.asServiceRole.entities.Bid.filter({ auction_id: auction.id });
        const activeBids = bids.filter(b => !b.is_deleted);

        const embed = {
          title: "⏰ Auction Ending Soon!",
          description: `**${auction.title}** closes in ~${minutesLeft} minutes!`,
          color: 0xff6b35,
          fields: [
            { name: "Closes At", value: closeTimeStr, inline: true },
            { name: "Active Bids", value: String(activeBids.length), inline: true },
          ],
          footer: { text: "DKP System — Last chance to bid!" },
        };

        if (auction.has_password) {
          embed.fields.push({ name: "🔒", value: "Password required", inline: true });
        }

        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: "POST",
          headers: {
            'Authorization': `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: '@everyone', embeds: [embed] }),
        });

        if (res.ok) {
          remindersSent++;
        } else {
          console.error(`Failed to send reminder for ${auction.title}: ${res.status}`);
        }
      }
    }

    return Response.json({ remindersSent, checkedAuctions: openAuctions.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});