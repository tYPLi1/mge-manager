import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Username and password required' }, { status: 400 });
    }

    // Get credentials from environment variables
    const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD');
    
    if (!ADMIN_PASSWORD) {
      return Response.json({ error: 'Admin credentials not configured' }, { status: 500 });
    }
    
    if (password !== ADMIN_PASSWORD) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Generate session token (simple UUID-like string)
    const sessionToken = crypto.getRandomValues(new Uint8Array(16))
      .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

    // Return session data
    return Response.json({
      success: true,
      session: {
        token: sessionToken,
        username: username,
        userId: 'admin',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});