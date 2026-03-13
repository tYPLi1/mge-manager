import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

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

    // Look up admin user from database
    const adminUsers = await base44.asServiceRole.entities.AdminUser.filter({ username, is_active: true });
    const adminUser = adminUsers[0];

    if (!adminUser) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, adminUser.password_hash);

    if (!passwordMatch) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate a signed session token using HMAC
    const secret = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const payload = `${adminUser.id}:${adminUser.username}:${expiresAt}`;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    return Response.json({
      success: true,
      session: {
        token: signature,
        username: adminUser.username,
        userId: adminUser.id,
        expiresAt
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});