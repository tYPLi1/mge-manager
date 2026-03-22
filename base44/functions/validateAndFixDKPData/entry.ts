import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { validate_only, adminSession } = body;

    if (!adminSession) {
      return Response.json({ error: 'Admin session required' }, { status: 401 });
    }

    // Use adminEntityProxy to fetch data
    const proxyFetch = async (operation, entity, payload = {}) => {
      const response = await base44.functions.invoke('adminEntityProxy', {
        operation,
        entity,
        payload,
        adminSession
      });
      return response.data;
    };

    // Fetch all data via proxy
    const players = await proxyFetch('list', 'Player', { sort: 'name', limit: 1000 });
    const transactions = await proxyFetch('list', 'DKPTransaction', { sort: '-created_date', limit: 10000 });

    const issues = [];
    const fixes = [];

    // Calculate what dkp_spent should be for each player based on bid transactions
    const dkpSpentMap = {};
    players.forEach(p => {
      dkpSpentMap[p.id] = 0;
    });

    transactions.forEach(tx => {
      if (tx.type === 'bid' && tx.player_id) {
        dkpSpentMap[tx.player_id] = (dkpSpentMap[tx.player_id] || 0) + tx.amount;
      }
    });

    // Check each player
    for (const player of players) {
      const expectedDkpSpent = dkpSpentMap[player.id] || 0;
      const actualDkpSpent = player.dkp_spent || 0;
      const expectedCurrentDkp = (player.total_dkp || 0) - expectedDkpSpent;
      const actualCurrentDkp = (player.total_dkp || 0) - actualDkpSpent;

      // Verify total_dkp from earn transactions
      const earnTotal = transactions
        .filter(tx => tx.type === 'earn' && tx.player_id === player.id)
        .reduce((sum, tx) => sum + tx.amount, 0);

      if (earnTotal !== (player.total_dkp || 0)) {
        issues.push({
          player: player.name,
          issue: 'total_dkp mismatch',
          expected: earnTotal,
          actual: player.total_dkp || 0,
          diff: earnTotal - (player.total_dkp || 0)
        });
        if (!validate_only) {
          fixes.push({
            player: player.name,
            action: 'update total_dkp',
            from: player.total_dkp || 0,
            to: earnTotal
          });
        }
      }

      if (expectedDkpSpent !== actualDkpSpent) {
        issues.push({
          player: player.name,
          issue: 'dkp_spent mismatch',
          expected: expectedDkpSpent,
          actual: actualDkpSpent,
          diff: expectedDkpSpent - actualDkpSpent
        });
        if (!validate_only) {
          fixes.push({
            player: player.name,
            action: 'update dkp_spent',
            from: actualDkpSpent,
            to: expectedDkpSpent
          });
        }
      }

      if (expectedCurrentDkp !== actualCurrentDkp) {
        issues.push({
          player: player.name,
          issue: 'current_dkp calculation issue',
          expected: expectedCurrentDkp,
          actual: actualCurrentDkp,
          diff: expectedCurrentDkp - actualCurrentDkp
        });
      }
    }

    // If validate_only, just return issues
    if (validate_only) {
      return Response.json({
        success: true,
        validate_only: true,
        total_players: players.length,
        issues_found: issues.length,
        issues
      });
    }

    // Apply fixes via proxy
    let updated = 0;
    for (const player of players) {
      const expectedDkpSpent = dkpSpentMap[player.id] || 0;
      const earnTotal = transactions
        .filter(tx => tx.type === 'earn' && tx.player_id === player.id)
        .reduce((sum, tx) => sum + tx.amount, 0);

      const actualDkpSpent = player.dkp_spent || 0;
      const actualTotal = player.total_dkp || 0;

      if (earnTotal !== actualTotal || expectedDkpSpent !== actualDkpSpent) {
        await proxyFetch('update', 'Player', {
          id: player.id,
          total_dkp: earnTotal,
          dkp_spent: expectedDkpSpent
        });
        updated++;
      }
    }

    return Response.json({
      success: true,
      validate_only: false,
      total_players: players.length,
      issues_found: issues.length,
      players_updated: updated,
      issues,
      fixes
    });
  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});