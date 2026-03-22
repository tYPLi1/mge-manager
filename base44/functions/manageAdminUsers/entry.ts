import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

async function hmacHash(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(password));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validateAdminSession(session) {
  if (!session?.userId || !session?.username || !session?.expiresAt || !session?.token) {
    return { valid: false, status: 401, error: 'Unauthorized: No session' };
  }
  if (new Date(session.expiresAt) <= new Date()) {
    return { valid: false, status: 401, error: 'Session expired' };
  }

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
    return { valid: false, status: 403, error: 'Invalid token' };
  }

  return { valid: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const body = await req.json();
    const { action, session, username, password, userId, credential } = body;

    const validation = await validateAdminSession(session);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    if (action === 'verify') {
      const secret = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
      if (!credential || credential !== secret) {
        return Response.json({ error: 'Invalid credential' }, { status: 403 });
      }
      return Response.json({ success: true });
    }

    if (action === 'list') {
      const users = await service.entities.AdminUser.list('username', 100);
      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        is_active: u.is_active,
        created_date: u.created_date,
      }));
      return Response.json({ success: true, users: safeUsers });
    }

    if (action === 'create') {
      if (!username || !password) {
        return Response.json({ error: 'Username and password required' }, { status: 400 });
      }
      const existing = await service.entities.AdminUser.filter({ username });
      if (existing.length > 0) {
        return Response.json({ error: 'Username already exists' }, { status: 400 });
      }
      const salt = crypto.randomUUID();
      const hash = await hmacHash(password, salt);
      await service.entities.AdminUser.create({ username, password_hash: `hmac:${salt}:${hash}`, is_active: true });
      return Response.json({ success: true, message: `Admin '${username}' created` });
    }

    if (action === 'changePassword') {
      if (!userId || !password) {
        return Response.json({ error: 'userId and password required' }, { status: 400 });
      }
      const salt = crypto.randomUUID();
      const hash = await hmacHash(password, salt);
      await service.entities.AdminUser.update(userId, { password_hash: `hmac:${salt}:${hash}` });
      return Response.json({ success: true, message: 'Password updated' });
    }

    if (action === 'toggleActive') {
      if (!userId) {
        return Response.json({ error: 'userId required' }, { status: 400 });
      }
      if (userId === session.userId) {
        return Response.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
      }
      const user = await service.entities.AdminUser.get(userId);
      const newActive = !user.is_active;
      await service.entities.AdminUser.update(userId, { is_active: newActive });
      return Response.json({ success: true, message: `User ${newActive ? 'activated' : 'deactivated'}`, userId: user.id, is_active: newActive });
    }

    if (action === 'delete') {
      if (!userId) {
        return Response.json({ error: 'userId required' }, { status: 400 });
      }
      if (userId === session.userId) {
        return Response.json({ error: 'Cannot delete your own account' }, { status: 400 });
      }
      await service.entities.AdminUser.delete(userId);
      return Response.json({ success: true, message: 'User deleted', deletedUserId: userId });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('manageAdminUsers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});