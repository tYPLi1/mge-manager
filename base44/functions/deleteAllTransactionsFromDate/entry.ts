import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const targetDate = body.date; // Format: "2026-03-22"

    if (!targetDate) {
      return Response.json({ error: 'Date required' }, { status: 400 });
    }

    // STEP 1: Get all transactions for the target date
    const allTransactions = await base44.entities.DKPTransaction.list("-event_date", 5000);
    const txsToDelete = allTransactions.filter(tx => tx.event_date === targetDate);

    if (txsToDelete.length === 0) {
      return Response.json({ message: 'No transactions found for this date' });
    }

    // STEP 2: Get affected players
    const affectedPlayerIds = [...new Set(txsToDelete.map(tx => tx.player_id))];
    const allPlayers = await base44.entities.Player.list("name", 1000);
    const playerMap = Object.fromEntries(
      allPlayers.filter(p => affectedPlayerIds.includes(p.id)).map(p => [p.id, p])
    );

    // STEP 3: Calculate DKP to remove per player
    const playerUpdates = {};
    for (const playerId of affectedPlayerIds) {
      const player = playerMap[playerId];
      const totalRemove = txsToDelete
        .filter(tx => tx.player_id === playerId)
        .reduce((sum, tx) => sum + tx.amount, 0);
      playerUpdates[playerId] = Math.max(0, (player.total_dkp || 0) - totalRemove);
    }

    // STEP 4: Delete all transactions
    for (const tx of txsToDelete) {
      await base44.entities.DKPTransaction.delete(tx.id);
    }

    // STEP 5: Update player DKP balances
    for (const [playerId, newDkp] of Object.entries(playerUpdates)) {
      await base44.entities.Player.update(playerId, { total_dkp: newDkp });
    }

    return Response.json({
      success: true,
      deleted_transactions: txsToDelete.length,
      affected_players: affectedPlayerIds.length,
      message: `Deleted ${txsToDelete.length} transactions from ${targetDate}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});