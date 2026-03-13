import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Admin Entity Proxy — allows authenticated admin sessions to perform
 * CRUD operations on entities via the service role.
 * 
 * Validates the admin session token before executing any operation.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { sessionToken, operation, entityName, entityId, data, sort, limit, filter } = body;

    // Validate admin session
    if (!sessionToken) {
      return Response.json({ error: 'No session token provided' }, { status: 401 });
    }

    // Verify session token against AdminUser records
    const adminUsers = await base44.asServiceRole.entities.AdminUser.filter({});
    let validSession = false;

    for (const admin of adminUsers) {
      if (!admin.is_active) continue;
      // Session token format: base64(username:timestamp:hash)
      try {
        const decoded = atob(sessionToken);
        const parts = decoded.split(':');
        if (parts.length >= 2 && parts[0] === admin.username) {
          // Check if token has not expired (tokens are valid for 24h)
          const timestamp = parseInt(parts[1]);
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            validSession = true;
            break;
          }
        }
      } catch {
        // Invalid base64, skip
      }
    }

    if (!validSession) {
      return Response.json({ error: 'Invalid or expired admin session' }, { status: 403 });
    }

    // Execute the requested operation using service role
    const entity = base44.asServiceRole.entities[entityName];
    if (!entity) {
      return Response.json({ error: `Entity "${entityName}" not found` }, { status: 400 });
    }

    let result;

    switch (operation) {
      case 'list':
        result = await entity.list(sort || '-created_date', limit || 500);
        break;
      case 'filter':
        result = await entity.filter(filter || {}, sort || '-created_date', limit || 500);
        break;
      case 'create':
        result = await entity.create(data);
        break;
      case 'bulkCreate':
        result = await entity.bulkCreate(data);
        break;
      case 'update':
        if (!entityId) return Response.json({ error: 'entityId required for update' }, { status: 400 });
        result = await entity.update(entityId, data);
        break;
      case 'delete':
        if (!entityId) return Response.json({ error: 'entityId required for delete' }, { status: 400 });
        result = await entity.delete(entityId);
        break;
      default:
        return Response.json({ error: `Unknown operation: ${operation}` }, { status: 400 });
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('Admin proxy error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});