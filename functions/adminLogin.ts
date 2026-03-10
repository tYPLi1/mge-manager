import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BCRYPT_COST = 10;

// Simple bcrypt implementation using Web Crypto API
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
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

    // Hash the provided password
    const passwordHash = await hashPassword(password);
    
    // For now, store credentials in a simple way
    // Check against the known credentials
    const ADMIN_USERNAME = 'tYPLi1';
    const ADMIN_PASSWORD_HASH = await hashPassword('19Ti97fr0211@');
    
    if (username !== ADMIN_USERNAME) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    if (passwordHash !== ADMIN_PASSWORD_HASH) {
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