import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Username and password required' }, { status: 400 });
    }

    // Fetch from raw API endpoint to bypass auth checks
    const appId = Deno.env.get('BASE44_APP_ID');
    const response = await fetch(`https://api.base44.com/entities/AdminUser/list?appId=${appId}`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY') || ''}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const data = await response.json();
    const adminUser = data.data?.find(u => u.username === username);
    
    if (!adminUser) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if active
    if (!adminUser.is_active) {
      return Response.json({ error: 'Admin account is inactive' }, { status: 401 });
    }

    // Verify password hash
    const passwordMatch = await bcrypt.compare(password, adminUser.password_hash);
    
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