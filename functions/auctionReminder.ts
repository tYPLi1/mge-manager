import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Sends a Discord reminder when an auction closes in ~10 minutes
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const openAuctions = await base44.asServiceRole.entities.Auction.filter({ status: "open" });
    const settings = await base44.asServiceRole.entities.AppSettings.filter({});
    const now = new Date();

    const getSetting = (key) => settings.find(s => s.key === key)?.value;
    const webhookUrl = getSetting("discord_webhook_url");
    const auctionEnabled = getSetting("discord_auction_enabled") === "true";

    if (!webhookUrl || !auctionEnabled) {
      return Response.json({ skipped: true, reason: "Discord not configured or auction notifications disabled" });
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

      // Send reminder if closing in 5-15 minutes (scheduled task runs every 5 min)
      if (diffMin > 5 && diffMin <= 15) {
        const minutesLeft = Math.round(diffMin);
        const closeTimeStr = closeAt.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

        // Count active bids
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

        const body = { embeds: [embed] };
        if (auction.has_password) {
          embed.fields.push({ name: "🔒", value: "Password required", inline: true });
        }

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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