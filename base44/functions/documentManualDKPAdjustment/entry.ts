import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;

    const { event, data, old_data } = await req.json();

    if (!data || !old_data) return Response.json({ success: true });

    const oldDKP = old_data.total_dkp || 0;
    const newDKP = data.total_dkp || 0;
    const diff = newDKP - oldDKP;

    // Only create transaction if DKP was actually changed
    if (diff !== 0) {
      await service.entities.DKPTransaction.create({
        player_id: data.id,
        player_name: data.name,
        amount: diff,
        type: 'compensation',
        source: 'MANUAL_ADJUSTMENT',
        event_date: new Date().toISOString().split('T')[0],
        note: `Manual adjustment: ${oldDKP} → ${newDKP}`
      });
    }

    return Response.json({ success: true, diff });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});