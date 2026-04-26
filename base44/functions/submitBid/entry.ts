import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function getServiceClient(req) {
  try { return createClientFromRequest(req).asServiceRole; }
  catch { return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole; }
}

/**
 * Secure bid submission — validates everything server-side.
 */
Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);
    const { auction_id, player_id, dkp_bid, bid_password, want_friendly_zone } = await req.json();

    if (!auction_id || !player_id || dkp_bid === undefined || dkp_bid === null) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const bidAmount = parseInt(dkp_bid);
    if (isNaN(bidAmount) || bidAmount < 0) {
      return Response.json({ error: 'Invalid bid amount' }, { status: 400 });
    }

    const svc = service.entities;

    // Get the auction
    let auction;
    try {
      auction = await svc.Auction.get(auction_id);
    } catch {
      return Response.json({ error: 'Auction not found' }, { status: 404 });
    }

    if (auction.status !== 'open') {
      return Response.json({ error: 'Auction is not open for bidding' }, { status: 400 });
    }

    // Check fixed assignments — players with a pre-assigned rank cannot bid
    if (auction.fixed_assignments) {
      try {
        const fixed = JSON.parse(auction.fixed_assignments);
        if (Array.isArray(fixed) && fixed.some(a => a.player_id === player_id)) {
          return Response.json({ error: 'Du hast bereits einen fix vergebenen Rang in dieser Auktion und kannst nicht bieten.' }, { status: 400 });
        }
      } catch { /* ignore parse error */ }
    }

    // Validate password if required
    if (auction.has_password) {
      if (!bid_password || bid_password !== auction.bid_password) {
        return Response.json({ error: 'Incorrect auction password' }, { status: 403 });
      }
    }

    // Get the player
    let player;
    try {
      player = await svc.Player.get(player_id);
    } catch {
      return Response.json({ error: 'Player not found' }, { status: 404 });
    }

    // Check cooldown
    if (player.cooldown_until && new Date(player.cooldown_until) > new Date()) {
      return Response.json({ error: `Player is on cooldown until ${player.cooldown_until}` }, { status: 400 });
    }

    // Check auction ban
    if (player.auction_ban_count > 0) {
      return Response.json({ error: 'Player is banned from auctions' }, { status: 400 });
    }

    // Check available DKP (dkp_spent is stored as negative value)
    const currentDkp = (player.total_dkp || 0) + (player.dkp_spent || 0);
    
    // Failsafe: if calculation results in negative, something is wrong with data
    if (currentDkp < 0) {
      console.error(`Data integrity issue: player ${player.name} has negative DKP balance: total=${player.total_dkp}, spent=${player.dkp_spent}, calculated=${currentDkp}`);
      return Response.json({ error: 'DKP balance error. Please contact an admin.' }, { status: 400 });
    }
    
    if (bidAmount > currentDkp) {
      return Response.json({ error: `Not enough DKP. Available: ${currentDkp}` }, { status: 400 });
    }

    // Check for duplicate bid
    const existingBids = await svc.Bid.filter({
      auction_id: auction_id,
      player_id: player_id,
    }, '-created_date', 100);
    
    const hasActiveBid = existingBids.some(b => !b.is_deleted);
    if (hasActiveBid) {
      return Response.json({ error: 'Player has already placed a bid for this auction' }, { status: 400 });
    }

    // Check friendly zone eligibility
    let friendlyZone = false;
    if (want_friendly_zone) {
      const settings = await svc.AppSettings.filter({ key: 'friendly_zone_enabled' });
      const fzEnabled = settings.length > 0 && settings[0].value === 'true';
      if (fzEnabled) {
        const thresholdSettings = await svc.AppSettings.filter({ key: 'friendly_zone_threshold' });
        const threshold = thresholdSettings.length > 0 ? parseInt(thresholdSettings[0].value) : 50;
        friendlyZone = currentDkp <= threshold;
      }
    }

    // Create the bid
    const bid = await svc.Bid.create({
      auction_id,
      player_id,
      player_name: player.name,
      dkp_bid: bidAmount,
      want_friendly_zone: friendlyZone,
    });

    return Response.json({ success: true, bid });
  } catch (error) {
    console.error('submitBid error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});