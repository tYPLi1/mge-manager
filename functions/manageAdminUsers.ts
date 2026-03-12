import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, masterPassword, username, password, userId } = body;

    // Verify master password
    const correctPassword = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
    if (!masterPassword || masterPassword !== correctPassword) {
      return Response.json({ error: 'Unauthorized: Invalid master password' }, { status: 403 });
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
      // Check if username already exists
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
      const user = await base44.asServiceRole.entities.AdminUser.get(userId);
      const newActive = !user.is_active;
      await base44.asServiceRole.entities.AdminUser.update(userId, { is_active: newActive });
      return Response.json({ success: true, message: `User ${newActive ? 'activated' : 'deactivated'}`, userId: user.id, is_active: newActive });
    }

    if (action === 'delete') {
      if (!userId) {
        return Response.json({ error: 'userId required' }, { status: 400 });
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