import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Returns only non-sensitive AppSettings to public users.
 * Sensitive keys like discord_webhook_url are excluded.
 */
const PUBLIC_KEYS = [
  "friendly_zone_enabled",
  "friendly_zone_threshold",
  "mge_targets",
  "auction_tiebreaker",
  "rules_text",
  "cooldown_table",
  "penalty_config",
  "wonder_dkp_enabled",
  "dawn_dkp_enabled",
  "last_event_dkp_sources",
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const allSettings = await base44.asServiceRole.entities.AppSettings.list('-created_date', 500);
    
    // Filter to only public keys
    const publicSettings = allSettings
      .filter(s => PUBLIC_KEYS.includes(s.key))
      .map(s => ({ key: s.key, value: s.value }));

    return Response.json({ settings: publicSettings });
  } catch (error) {
    console.error('getPublicSettings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});