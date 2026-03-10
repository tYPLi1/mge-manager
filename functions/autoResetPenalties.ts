import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Load penalty config
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const raw = settings.find((s) => s.key === "penalty_config")?.value;
    const config = raw ? JSON.parse(raw) : {};

    const resetDays = {
      1: config.level1_reset_days ? parseInt(config.level1_reset_days) : null,
      2: config.level2_reset_days ? parseInt(config.level2_reset_days) : null,
      3: config.level3_reset_days ? parseInt(config.level3_reset_days) : null,
    };

    // If no levels have auto-reset configured, do nothing
    if (!resetDays[1] && !resetDays[2] && !resetDays[3]) {
      return Response.json({ message: "No auto-reset configured", reset: 0 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const penalties = await base44.asServiceRole.entities.Penalty.filter({ status: "probation" });
    let resetCount = 0;

    for (const penalty of penalties) {
      const days = resetDays[penalty.level];
      if (!days || !penalty.offense_date) continue;

      const offenseDate = new Date(penalty.offense_date);
      offenseDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - offenseDate) / (1000 * 60 * 60 * 24));

      if (diffDays >= days) {
        await base44.asServiceRole.entities.Penalty.update(penalty.id, { status: "reset" });
        resetCount++;
      }
    }

    return Response.json({ message: `Auto-reset complete`, reset: resetCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});