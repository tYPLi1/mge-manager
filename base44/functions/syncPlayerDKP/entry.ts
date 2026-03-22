import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Synchronizes all players' DKP totals based on their transaction history.
 * - Calculates total_dkp (sum of earn + compensation + bonus - penalty)
 * - Calculates dkp_spent (sum of bid transactions)
 * Only admin can call this.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all players and transactions
    const [players, transactions] = await Promise.all([
      base44.asServiceRole.entities.Player.list('-created_date', 10000),
      base44.asServiceRole.entities.DKPTransaction.list('-created_date', 50000),
    ]);

    const results = [];
    let fixedCount = 0;

    for (const player of players) {
      // Calculate totals from transactions
      const playerTransactions = transactions.filter(t => t.player_id === player.id);
      
      const totalDkp = playerTransactions.reduce((sum, t) => {
        // earn, compensation, bonus, king_allocation, penalty add to total
        // bid subtracts from spent (not from total)
        if (['earn', 'compensation', 'bonus', 'king_allocation', 'penalty'].includes(t.type)) {
          return sum + t.amount;
        }
        return sum;
      }, 0);

      const dkpSpent = playerTransactions
        .filter(t => t.type === 'bid')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      // Check if update needed
      const needsUpdate = 
        player.total_dkp !== totalDkp || 
        player.dkp_spent !== dkpSpent;

      if (needsUpdate) {
        await base44.asServiceRole.entities.Player.update(player.id, {
          total_dkp: totalDkp,
          dkp_spent: dkpSpent,
        });
        fixedCount++;
        results.push({
          name: player.name,
          oldTotal: player.total_dkp,
          newTotal: totalDkp,
          oldSpent: player.dkp_spent,
          newSpent: dkpSpent,
          transactionCount: playerTransactions.length,
        });
      }
    }

    return Response.json({
      success: true,
      totalPlayers: players.length,
      fixedCount,
      details: results,
    });
  } catch (error) {
    console.error('DKP sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});