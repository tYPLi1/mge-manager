import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Undoes the last DKP upload batch by:
 * 1. Finding all transactions with the given upload_batch_id
 * 2. Reversing the DKP on each player
 * 3. Deleting the transactions
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { session, upload_batch_id } = body;

    // Validate admin session via HMAC
    if (!session || !session.userId || !session.username || !session.expiresAt || !session.token) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }
    if (new Date(session.expiresAt) <= new Date()) {
      return Response.json({ error: 'Session expired' }, { status: 401 });
    }

    const secret = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
    const payload = `${session.userId}:${session.username}:${session.expiresAt}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    if (session.token !== expectedSignature) {
      return Response.json({ error: 'Invalid token' }, { status: 403 });
    }

    const service = base44.asServiceRole;

    if (!upload_batch_id) {
      return Response.json({ error: 'upload_batch_id required' }, { status: 400 });
    }

    // Find all transactions in this batch
    const transactions = await service.entities.DKPTransaction.filter(
      { upload_batch_id },
      '-created_date',
      500
    );

    if (transactions.length === 0) {
      return Response.json({ error: 'No transactions found for this batch' }, { status: 404 });
    }

    // Group DKP adjustments by player
    const playerAdjustments = {};
    for (const tx of transactions) {
      if (!playerAdjustments[tx.player_id]) {
        playerAdjustments[tx.player_id] = 0;
      }
      playerAdjustments[tx.player_id] += tx.amount;
    }

    // Reverse DKP on each player
    for (const [playerId, totalAmount] of Object.entries(playerAdjustments)) {
      const player = await service.entities.Player.get(playerId);
      if (player) {
        await service.entities.Player.update(playerId, {
          total_dkp: (player.total_dkp || 0) - totalAmount,
        });
      }
    }

    // Delete all transactions in this batch
    for (const tx of transactions) {
      await service.entities.DKPTransaction.delete(tx.id);
    }

    return Response.json({
      success: true,
      undone_count: transactions.length,
      players_affected: Object.keys(playerAdjustments).length,
      source: transactions[0]?.source || 'unknown',
      source_stage: transactions[0]?.source_stage || null,
      event_date: transactions[0]?.event_date || null,
    });
  } catch (error) {
    console.error('Undo upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});