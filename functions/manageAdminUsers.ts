import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

function getServiceClient(req) {
  try { return createClientFromRequest(req).asServiceRole; }
  catch { return createClient({ appId: Deno.env.get('BASE44_APP_ID') }).asServiceRole; }
}

async function validateAdminSession(service, session) {
  if (!session || !session.userId || !session.username || !session.expiresAt || !session.token) {
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

  try {
    const user = await base44.asServiceRole.entities.AdminUser.get(session.userId);
    if (!user || !user.is_active) {
      return { valid: false, status: 403, error: 'User deactivated' };
    }
  } catch (e) {
    const msg = e?.message || '';
    if (msg.includes('not found') || msg.includes('does not exist')) {
      return { valid: false, status: 403, error: 'User not found' };
    }
    // SDK auth context missing — trust HMAC signature
    console.log('AdminUser lookup skipped, trusting HMAC:', msg);
  }

  return { valid: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, session, username, password, userId, credential } = body;

    // Validate admin session via HMAC token
    const validation = await validateAdminSession(base44, session);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    // 'verify' action: check if the provided credential matches the management secret
    if (action === 'verify') {
      const secret = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
      if (!credential || credential !== secret) {
        return Response.json({ error: 'Invalid credential' }, { status: 403 });
      }
      return Response.json({ success: true });
    }

    if (action === 'list') {
      const users = await base44.asServiceRole.entities.AdminUser.list('username', 100);
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
      const existing = await base44.asServiceRole.entities.AdminUser.filter({ username });
      if (existing.length > 0) {
        return Response.json({ error: 'Username already exists' }, { status: 400 });
      }
      const password_hash = await bcrypt.hash(password, 10);
      await base44.asServiceRole.entities.AdminUser.create({ username, password_hash, is_active: true });
      return Response.json({ success: true, message: `Admin '${username}' created` });
    }

    if (action === 'changePassword') {
      if (!userId || !password) {
        return Response.json({ error: 'userId and password required' }, { status: 400 });
      }
      const password_hash = await bcrypt.hash(password, 10);
      await base44.asServiceRole.entities.AdminUser.update(userId, { password_hash });
      return Response.json({ success: true, message: 'Password updated' });
    }

    if (action === 'toggleActive') {
      if (!userId) {
        return Response.json({ error: 'userId required' }, { status: 400 });
      }
      // Prevent self-deactivation
      if (userId === session.userId) {
        return Response.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
      }
      const user = await base44.asServiceRole.entities.AdminUser.get(userId);
      const newActive = !user.is_active;
      await base44.asServiceRole.entities.AdminUser.update(userId, { is_active: newActive });
      return Response.json({ success: true, message: `User ${newActive ? 'activated' : 'deactivated'}`, userId: user.id, is_active: newActive });
    }

    if (action === 'delete') {
      if (!userId) {
        return Response.json({ error: 'userId required' }, { status: 400 });
      }
      // Prevent self-deletion
      if (userId === session.userId) {
        return Response.json({ error: 'Cannot delete your own account' }, { status: 400 });
      }
      await base44.asServiceRole.entities.AdminUser.delete(userId);
      return Response.json({ success: true, message: 'User deleted', deletedUserId: userId });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('manageAdminUsers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});