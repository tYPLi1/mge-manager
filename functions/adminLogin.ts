import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { compare } from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Username and password required' }, { status: 400 });
    }

    // Get admin user from database
    const adminUsers = await base44.asServiceRole.entities.AdminUser.filter({ username });
    
    if (!adminUsers || adminUsers.length === 0) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const adminUser = adminUsers[0];

    // Check if active
    if (!adminUser.is_active) {
      return Response.json({ error: 'Admin account is inactive' }, { status: 401 });
    }

    // Verify password hash
    const passwordMatch = await compare(password, adminUser.password_hash);
    
    if (!passwordMatch) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate session token
    const sessionToken = crypto.getRandomValues(new Uint8Array(16))
      .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

    // Return session data
    return Response.json({
      success: true,
      session: {
        token: sessionToken,
        username: adminUser.username,
        userId: adminUser.id,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});