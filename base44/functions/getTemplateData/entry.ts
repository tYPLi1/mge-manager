import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function getServiceClient(req) {
  try { return createClientFromRequest(req).asServiceRole; }
  catch { return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole; }
}

Deno.serve(async (req) => {
  try {
    const service = getServiceClient(req);
    const { password } = await req.json();

    // Load settings to verify password and enabled flag
    const allSettings = await service.entities.AppSettings.list('-created_date', 500);
    const enabled = allSettings.find(s => s.key === 'event_templates_enabled')?.value === 'true';
    const expectedPassword = allSettings.find(s => s.key === 'event_templates_password')?.value || '';
    const alliancesRaw = allSettings.find(s => s.key === 'alliances')?.value || '[]';

    if (!enabled) {
      return Response.json({ error: 'disabled' }, { status: 403 });
    }
    if (!expectedPassword) {
      return Response.json({ error: 'not_configured' }, { status: 403 });
    }
    if (!password || String(password) !== String(expectedPassword)) {
      return Response.json({ error: 'invalid_password' }, { status: 401 });
    }

    const [players, eventTypes] = await Promise.all([
      service.entities.Player.list('name', 1000),
      service.entities.EventType.filter({ active: true }, 'sort_order', 100),
    ]);

    // Return only the fields needed for templates
    const slimPlayers = players.map(p => ({
      id: p.id,
      name: p.name,
      alliance: p.alliance || '',
      power: p.power || 0,
      merits: p.merits || 0,
      updated_date: p.updated_date || '',
    }));

    return Response.json({
      success: true,
      players: slimPlayers,
      eventTypes,
      alliances: alliancesRaw,
    });
  } catch (error) {
    console.error('getTemplateData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});