import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const body = await req.json();
    const { session, operation, entityName, entityId, data, sort, limit, filter } = body;

    // Validate session structure
    if (!session?.userId || !session?.username || !session?.expiresAt || !session?.token) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check expiry
    if (new Date(session.expiresAt) <= new Date()) {
      return Response.json({ error: 'Session expired' }, { status: 401 });
    }

    // Verify HMAC signature
    const secret = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
    const payload = `${session.userId}:${session.username}:${session.expiresAt}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    if (session.token !== expectedSignature) {
      return Response.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Entity whitelist
    const ALLOWED_ENTITIES = [
      'Player', 'Auction', 'Bid', 'AuctionResult', 'DKPTransaction',
      'Penalty', 'PowerHistory', 'EventType', 'AppSettings', 'AdminUser',
      'OffenseResetLog', 'UserReport'
    ];
    if (!ALLOWED_ENTITIES.includes(entityName)) {
      return Response.json({ error: `Entity "${entityName}" not allowed` }, { status: 403 });
    }

    const entity = service.entities[entityName];
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
      case 'get':
        if (!entityId) return Response.json({ error: 'entityId required' }, { status: 400 });
        result = await entity.get(entityId);
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