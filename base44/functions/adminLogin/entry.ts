import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Username and password required' }, { status: 400 });
    }

    // Get secret
    const secret = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
    if (!secret) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify password against secret (simple string match)
    if (password !== secret) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate session token using HMAC
    const adminId = `admin-${username}`;
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const payload = `${adminId}:${username}:${expiresAt}`;
    
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
        username,
        userId: adminId,
        expiresAt
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});