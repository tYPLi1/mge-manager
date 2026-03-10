import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import * as bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only check
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return Response.json({ error: 'Username and password required' }, { status: 400 });
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    // Create the admin user
    const adminUser = await base44.asServiceRole.entities.AdminUser.create({
      username,
      password_hash,
      is_active: true,
    });

    return Response.json({ 
      success: true, 
      message: `Admin user '${username}' created successfully`,
      adminUser 
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});