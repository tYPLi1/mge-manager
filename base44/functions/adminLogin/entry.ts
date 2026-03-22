import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

async function hmacHash(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(password));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
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

    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;

    const users = await service.entities.AdminUser.filter({ username });
    if (users.length === 0) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const adminUser = users[0];
    if (!adminUser.is_active) {
      return Response.json({ error: 'Account deactivated' }, { status: 403 });
    }

    const storedHash = adminUser.password_hash;

    // Support both bcrypt (legacy, starts with $2) and HMAC hashes
    let passwordMatch = false;
    if (storedHash.startsWith('$2')) {
      // Legacy bcrypt — import dynamically only when needed
      const bcrypt = await import('npm:bcryptjs@2.4.3');
      passwordMatch = await bcrypt.default.compare(password, storedHash);
      
      // Migrate to HMAC hash for faster future logins
      if (passwordMatch) {
        const salt = crypto.randomUUID();
        const newHash = await hmacHash(password, salt);
        await service.entities.AdminUser.update(adminUser.id, {
          password_hash: `hmac:${salt}:${newHash}`
        });
      }
    } else if (storedHash.startsWith('hmac:')) {
      const [, salt, hash] = storedHash.split(':');
      const computed = await hmacHash(password, salt);
      passwordMatch = computed === hash;
    } else {
      return Response.json({ error: 'Invalid password format' }, { status: 500 });
    }

    if (!passwordMatch) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate session token
    const secret = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
    if (!secret) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

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