import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import bcrypt from 'npm:bcryptjs@2.4.3';

function getServiceClient(req) {
  try { 
    return createClientFromRequest(req).asServiceRole; 
  } catch { 
    const appId = Deno.env.get('BASE44_APP_ID');
    const serviceToken = Deno.env.get('BASE44_SERVICE_ROLE_KEY');
    if (!serviceToken) throw new Error('Service role credentials not configured');
    return createClient({ appId, serviceRoleKey: serviceToken }).asServiceRole; 
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Username and password required' }, { status: 400 });
    }

    const service = getServiceClient(req);
    
    // Lookup user in AdminUser entity
    const users = await service.entities.AdminUser.filter({ username });
    if (users.length === 0) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const adminUser = users[0];
    if (!adminUser.is_active) {
      return Response.json({ error: 'Account deactivated' }, { status: 403 });
    }

    // Verify password against hash
    const passwordMatch = await bcrypt.compare(password, adminUser.password_hash);
    if (!passwordMatch) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate signed session token using HMAC
    const secret = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
    if (!secret) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Token valid for 24h; frontend enforces 10-min inactivity logout separately
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
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