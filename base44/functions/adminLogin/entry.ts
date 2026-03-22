import bcrypt from 'npm:bcryptjs@2.4.3';

// Simple hardcoded admin check
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin'
};

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Username and password required' }, { status: 400 });
    }

    // Check credentials
    if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const adminUser = { id: 'admin-1', username };

    // Generate a signed session token using HMAC
    const secret = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
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