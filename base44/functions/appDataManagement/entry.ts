import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entities included in BACKUP and RESTORE.
// AdminUser is intentionally excluded — admin accounts must never be overwritten by a backup.
const BACKUP_ENTITIES = [
  'Player',
  'DKPTransaction',
  'Bid',
  'Auction',
  'AuctionResult',
  'Penalty',
  'OffenseResetLog',
  'PowerHistory',
  'UserReport',
  'AppSettings',
  'EventType',
];

// Entities cleared by the WIPE action (operational data only — settings/events/admins are kept).
// This is the WHITELIST — only entities in this list may be selected for wiping.
// Special pseudo-entity: 'PlayerDKPReset' — does NOT delete players, only resets their DKP fields to 0.
const WIPE_ENTITIES = [
  'Player',
  'PlayerDKPReset',
  'DKPTransaction',
  'Bid',
  'Auction',
  'AuctionResult',
  'Penalty',
  'OffenseResetLog',
  'PowerHistory',
  'UserReport',
];

// Safe deletion order — child/dependent entities are deleted BEFORE parents.
// Player is deleted last because Bid/AuctionResult/DKPTransaction/Penalty/OffenseResetLog/PowerHistory reference it.
// Auction is deleted after Bid/AuctionResult because they reference Auction.
const SAFE_WIPE_ORDER = [
  'Bid',
  'AuctionResult',
  'DKPTransaction',
  'Penalty',
  'OffenseResetLog',
  'PowerHistory',
  'Auction',
  'UserReport',
  'PlayerDKPReset', // run BEFORE Player delete so it's a no-op if Player is also selected
  'Player',
];

// Helper: validate admin session via stored token
async function verifyAdminSession(base44, session) {
  if (!session || !session.userId || !session.token) {
    return { ok: false, error: 'No admin session' };
  }
  if (new Date(session.expiresAt) <= new Date()) {
    return { ok: false, error: 'Session expired' };
  }
  // Verify the admin user still exists and is active
  let admin;
  try {
    admin = await base44.asServiceRole.entities.AdminUser.filter({ id: session.userId });
  } catch {
    return { ok: false, error: 'Admin not found or inactive' };
  }
  if (!admin || admin.length === 0 || !admin[0].is_active) {
    return { ok: false, error: 'Admin not found or inactive' };
  }
  return { ok: true };
}

async function listAll(base44, entityName) {
  // Use filter({}) instead of list() — list() can return empty results for some entities
  // (e.g. when records are scoped by owner/RLS and the service-role list still applies a filter).
  // filter({}) bypasses that and returns ALL records the service role can see.
  const records = await base44.asServiceRole.entities[entityName].filter({}, null, 50000);
  return records || [];
}

async function deleteAll(base44, entityName) {
  let total = 0;
  const BATCH_SIZE = 200;
  const PARALLEL = 5; // gentle concurrency to avoid rate limits
  const failedIds = new Set(); // IDs we've already tried and failed — skip on next page

  // Hard safety cap so a buggy entity can never burn unlimited credits.
  const MAX_ITERATIONS = 200;
  let iter = 0;
  let lastErrorMessage = null;

  while (iter < MAX_ITERATIONS) {
    iter++;
    // Use filter({}) instead of list() — list() can silently return empty for some entities
    // even when records exist. filter({}) returns everything the service role can see.
    const page = await base44.asServiceRole.entities[entityName].filter({}, null, BATCH_SIZE);
    if (!page || page.length === 0) break;

    // Filter out IDs we already failed on — otherwise we'd loop forever on them.
    const records = page.filter((r) => !failedIds.has(r.id));
    if (records.length === 0) {
      // Every record on this page is unfixable — stop and report.
      break;
    }

    let deletedThisRound = 0;
    for (let i = 0; i < records.length; i += PARALLEL) {
      const chunk = records.slice(i, i + PARALLEL);
      const results = await Promise.allSettled(
        chunk.map((r) => base44.asServiceRole.entities[entityName].delete(r.id))
      );
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          total++;
          deletedThisRound++;
        } else {
          const id = chunk[idx].id;
          failedIds.add(id);
          lastErrorMessage = res.reason?.message || String(res.reason);
          console.warn(`Failed to delete ${entityName}/${id}: ${lastErrorMessage}`);
        }
      });
    }

    // If a full page came back but we deleted nothing, we'll never finish — stop.
    if (deletedThisRound === 0) break;
  }

  if (failedIds.size > 0) {
    throw new Error(
      `${failedIds.size} record(s) could not be deleted in ${entityName} after ${total} successful deletes. Last error: ${lastErrorMessage}`
    );
  }

  return total;
}

function stripSystemFields(record) {
  // Remove built-in fields that must NOT be sent on create
  const { id, created_date, updated_date, created_by, ...rest } = record;
  return rest;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, session, masterPassword, backupData } = body || {};

    // 1) Verify admin session
    const sessionCheck = await verifyAdminSession(base44, session);
    if (!sessionCheck.ok) {
      return Response.json({ success: false, error: sessionCheck.error }, { status: 401 });
    }

    // 2) Verify master password (same one used to unlock App Management)
    const expected = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
    if (!expected || masterPassword !== expected) {
      return Response.json({ success: false, error: 'Wrong master password' }, { status: 403 });
    }

    if (action === 'backup') {
      const data = {};
      const counts = {};
      for (const entity of BACKUP_ENTITIES) {
        try {
          const records = await listAll(base44, entity);
          data[entity] = records;
          counts[entity] = records.length;
        } catch (e) {
          console.error(`Backup failed for ${entity}: ${e.message}`);
          data[entity] = [];
          counts[entity] = 0;
        }
      }
      return Response.json({
        success: true,
        backup: {
          version: 2,
          created_at: new Date().toISOString(),
          entities: BACKUP_ENTITIES,
          data,
        },
        counts,
      });
    }

    if (action === 'wipe') {
      // Caller must provide the list of entities to wipe.
      const { selectedEntities } = body || {};
      if (!Array.isArray(selectedEntities) || selectedEntities.length === 0) {
        return Response.json({ success: false, error: 'No entities selected' }, { status: 400 });
      }

      // Build the actual wipe list:
      //  - filter against the whitelist (WIPE_ENTITIES) for safety
      //  - reorder according to SAFE_WIPE_ORDER to respect dependencies
      const actualEntitiesToWipe = SAFE_WIPE_ORDER.filter(
        (e) => selectedEntities.includes(e) && WIPE_ENTITIES.includes(e)
      );

      if (actualEntitiesToWipe.length === 0) {
        return Response.json({ success: false, error: 'No valid entities selected' }, { status: 400 });
      }

      const counts = {};
      for (const entity of actualEntitiesToWipe) {
        try {
          counts[entity] = await deleteAll(base44, entity);
        } catch (e) {
          console.error(`Wipe failed for ${entity}: ${e.message}`);
          counts[entity] = -1;
        }
      }
      return Response.json({ success: true, counts });
    }

    // Wipe a SINGLE entity — used by the frontend to give live progress feedback
    // and to avoid backend timeouts on large datasets. The frontend loops through
    // the selected entities in SAFE order and calls this once per entity.
    if (action === 'wipe-entity') {
      const { entityName } = body || {};
      if (!entityName || !WIPE_ENTITIES.includes(entityName)) {
        return Response.json({ success: false, error: 'Invalid entity' }, { status: 400 });
      }

      // Special pseudo-entity: reset all players' DKP fields to 0 instead of deleting players.
      if (entityName === 'PlayerDKPReset') {
        try {
          const players = await listAll(base44, 'Player');
          let updated = 0;
          const PARALLEL = 5;
          for (let i = 0; i < players.length; i += PARALLEL) {
            const chunk = players.slice(i, i + PARALLEL);
            const results = await Promise.allSettled(
              chunk.map((p) =>
                base44.asServiceRole.entities.Player.update(p.id, {
                  total_dkp: 0,
                  dkp_spent: 0,
                  auction_ban_count: 0,
                  cooldown_until: null,
                })
              )
            );
            results.forEach((r) => { if (r.status === 'fulfilled') updated++; });
          }
          return Response.json({ success: true, entity: entityName, deleted: updated });
        } catch (e) {
          console.error(`Player DKP reset failed: ${e.message}`);
          return Response.json({ success: false, error: e.message }, { status: 500 });
        }
      }

      try {
        const deleted = await deleteAll(base44, entityName);
        return Response.json({ success: true, entity: entityName, deleted });
      } catch (e) {
        console.error(`Wipe failed for ${entityName}: ${e.message}`);
        return Response.json({ success: false, error: e.message }, { status: 500 });
      }
    }

    // Returns the safe deletion order filtered for the caller's selection.
    // The frontend uses this to know in WHICH ORDER to call wipe-entity.
    if (action === 'wipe-plan') {
      const { selectedEntities } = body || {};
      if (!Array.isArray(selectedEntities) || selectedEntities.length === 0) {
        return Response.json({ success: false, error: 'No entities selected' }, { status: 400 });
      }
      const plan = SAFE_WIPE_ORDER.filter(
        (e) => selectedEntities.includes(e) && WIPE_ENTITIES.includes(e)
      );
      if (plan.length === 0) {
        return Response.json({ success: false, error: 'No valid entities selected' }, { status: 400 });
      }
      return Response.json({ success: true, plan });
    }

    // Returns the safe restore order for the selected entities that exist in the backup.
    // Restore order = REVERSE of safe wipe order (parents first, children last) for entities
    // that have dependencies, except Player which must come FIRST since it's referenced by others.
    // Actually we use this order: AppSettings, EventType, Player, Auction, then dependents.
    if (action === 'restore-plan') {
      const { selectedEntities, backupData: bd } = body || {};
      if (!bd || !bd.data) {
        return Response.json({ success: false, error: 'Invalid backup data' }, { status: 400 });
      }
      if (!Array.isArray(selectedEntities) || selectedEntities.length === 0) {
        return Response.json({ success: false, error: 'No entities selected' }, { status: 400 });
      }
      const RESTORE_ORDER = [
        'AppSettings',
        'EventType',
        'Player',
        'Auction',
        'Bid',
        'AuctionResult',
        'DKPTransaction',
        'Penalty',
        'OffenseResetLog',
        'PowerHistory',
        'UserReport',
      ];
      const plan = RESTORE_ORDER.filter(
        (e) =>
          selectedEntities.includes(e) &&
          BACKUP_ENTITIES.includes(e) &&
          Array.isArray(bd.data[e])
      );
      if (plan.length === 0) {
        return Response.json({ success: false, error: 'No valid entities selected' }, { status: 400 });
      }
      return Response.json({ success: true, plan });
    }

    // Restore a SINGLE entity — used by the frontend to give live progress feedback
    // and to avoid backend timeouts. Wipes that entity first, then inserts.
    if (action === 'restore-entity') {
      const { entityName, records } = body || {};
      if (!entityName || !BACKUP_ENTITIES.includes(entityName)) {
        return Response.json({ success: false, error: 'Invalid entity' }, { status: 400 });
      }
      if (!Array.isArray(records)) {
        return Response.json({ success: false, error: 'Invalid records' }, { status: 400 });
      }

      try {
        // Wipe existing rows for this entity to give a clean slate
        await deleteAll(base44, entityName);
      } catch (e) {
        console.error(`Pre-restore wipe failed for ${entityName}: ${e.message}`);
      }

      const cleaned = records.map(stripSystemFields);
      let inserted = 0;
      for (let i = 0; i < cleaned.length; i += 50) {
        const batch = cleaned.slice(i, i + 50);
        try {
          await base44.asServiceRole.entities[entityName].bulkCreate(batch);
          inserted += batch.length;
        } catch (e) {
          console.error(`Restore batch failed for ${entityName}: ${e.message}`);
          for (const item of batch) {
            try {
              await base44.asServiceRole.entities[entityName].create(item);
              inserted++;
            } catch (innerErr) {
              console.warn(`Skipped record in ${entityName}: ${innerErr.message}`);
            }
          }
        }
      }
      return Response.json({ success: true, entity: entityName, inserted });
    }

    if (action === 'restore') {
      if (!backupData || !backupData.data) {
        return Response.json({ success: false, error: 'Invalid backup data' }, { status: 400 });
      }

      // Optional: caller can restrict restore to a subset of entities
      const { selectedEntities } = body || {};
      const filterSet = Array.isArray(selectedEntities) && selectedEntities.length > 0
        ? new Set(selectedEntities)
        : null;

      // Determine which entities the backup actually contains (supports v1 and v2 backups)
      const entitiesToRestore = BACKUP_ENTITIES.filter(
        (e) => Array.isArray(backupData.data[e]) && (!filterSet || filterSet.has(e))
      );

      // Step 1: wipe existing data (so we have a clean slate) — only for entities present in backup
      for (const entity of entitiesToRestore) {
        try {
          await deleteAll(base44, entity);
        } catch (e) {
          console.error(`Pre-restore wipe failed for ${entity}: ${e.message}`);
        }
      }

      // Step 2: insert from backup
      const counts = {};
      for (const entity of entitiesToRestore) {
        const records = backupData.data[entity] || [];
        if (records.length === 0) {
          counts[entity] = 0;
          continue;
        }
        const cleaned = records.map(stripSystemFields);
        let inserted = 0;
        // Insert in batches of 50
        for (let i = 0; i < cleaned.length; i += 50) {
          const batch = cleaned.slice(i, i + 50);
          try {
            await base44.asServiceRole.entities[entity].bulkCreate(batch);
            inserted += batch.length;
          } catch (e) {
            console.error(`Restore batch failed for ${entity}: ${e.message}`);
            // Try one-by-one fallback
            for (const item of batch) {
              try {
                await base44.asServiceRole.entities[entity].create(item);
                inserted++;
              } catch (innerErr) {
                console.warn(`Skipped record in ${entity}: ${innerErr.message}`);
              }
            }
          }
        }
        counts[entity] = inserted;
      }
      return Response.json({ success: true, counts });
    }

    return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('appDataManagement error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});