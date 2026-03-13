import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Secure bid submission — validates everything server-side:
 * - Auction exists and is open
 * - Password is correct (if required)
 * - Player exists, is not on cooldown, not auction-banned
 * - DKP is sufficient
 * - No duplicate bid
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { auction_id, player_id, dkp_bid, bid_password, want_friendly_zone } = await req.json();

    if (!auction_id || !player_id || dkp_bid === undefined || dkp_bid === null) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const bidAmount = parseInt(dkp_bid);
    if (isNaN(bidAmount) || bidAmount < 0) {
      return Response.json({ error: 'Invalid bid amount' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;

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

    // Check available DKP
    const currentDkp = (player.total_dkp || 0) - (player.dkp_spent || 0);
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