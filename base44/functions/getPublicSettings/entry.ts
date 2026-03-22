import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const PUBLIC_KEYS = [
  'friendly_zone_enabled',
  'friendly_zone_threshold',
  'cooldown_days',
  'discord_servers',
  'app_base_url',
  'auction_tiebreaker',
  'auction_tiebreaker_fallback',
  'mge_targets',
  'rules_text',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const allSettings = await service.entities.AppSettings.list('-created_date', 500);
    
    const publicSettings = allSettings
      .filter(s => PUBLIC_KEYS.includes(s.key))
      .map(s => ({ key: s.key, value: s.value }));

    return Response.json({ settings: publicSettings });
  } catch (error) {
    console.error('getPublicSettings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});