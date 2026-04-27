import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entities that hold OPERATIONAL DATA (will be wiped / backed up / restored).
// NOT included: AppSettings, EventType, AdminUser (these are system config & accounts).
const DATA_ENTITIES = [
  'Player',
  'DKPTransaction',
  'Bid',
  'Auction',
  'AuctionResult',
  'Penalty',
  'OffenseResetLog',
  'PowerHistory',
  'UserReport',
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
  // Pull in pages of 1000
  const all = [];
  let skip = 0;
  const pageSize = 1000;
  // Pagination via list with limit; loop until empty page
  // base44.entities.X.list(sort, limit) — we use no sort for stability
  // Some entities may not support skip — we'll just take up to 50000 in one request as fallback
  // The SDK does not document skip — but list() should be enough for our scale.
  // To be safe we'll request a large limit.
  const records = await base44.asServiceRole.entities[entityName].list(null, 50000);
  return records || [];
}

async function deleteAll(base44, entityName) {
  let total = 0;
  // Loop until no records remain
  while (true) {
    const records = await base44.asServiceRole.entities[entityName].list(null, 500);
    if (!records || records.length === 0) break;
    for (const r of records) {
      try {
        await base44.asServiceRole.entities[entityName].delete(r.id);
        total++;
      } catch (e) {
        console.warn(`Failed to delete ${entityName}/${r.id}: ${e.message}`);
      }
    }
    if (records.length < 500) {
      // last batch — re-check once more in case of race
      const remaining = await base44.asServiceRole.entities[entityName].list(null, 1);
      if (!remaining || remaining.length === 0) break;
    }
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
      for (const entity of DATA_ENTITIES) {
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
          version: 1,
          created_at: new Date().toISOString(),
          entities: DATA_ENTITIES,
          data,
        },
        counts,
      });
    }

    if (action === 'wipe') {
      const counts = {};
      for (const entity of DATA_ENTITIES) {
        try {
          counts[entity] = await deleteAll(base44, entity);
        } catch (e) {
          console.error(`Wipe failed for ${entity}: ${e.message}`);
          counts[entity] = -1;
        }
      }
      return Response.json({ success: true, counts });
    }

    if (action === 'restore') {
      if (!backupData || !backupData.data) {
        return Response.json({ success: false, error: 'Invalid backup data' }, { status: 400 });
      }

      // Step 1: wipe existing data (so we have a clean slate)
      for (const entity of DATA_ENTITIES) {
        try {
          await deleteAll(base44, entity);
        } catch (e) {
          console.error(`Pre-restore wipe failed for ${entity}: ${e.message}`);
        }
      }

      // Step 2: insert from backup
      const counts = {};
      for (const entity of DATA_ENTITIES) {
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