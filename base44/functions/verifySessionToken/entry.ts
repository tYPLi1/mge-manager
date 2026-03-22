Deno.serve(async (req) => {
  try {
    const { userId, username, expiresAt, token } = await req.json();

    if (!userId || !username || !expiresAt || !token) {
      return Response.json({ valid: false, reason: 'Missing session fields' });
    }

    // Check expiry
    if (new Date(expiresAt) <= new Date()) {
      return Response.json({ valid: false, reason: 'Session expired' });
    }

    // Verify HMAC signature
    const secret = Deno.env.get('ADMIN_MANAGEMENT_PASSWORD');
    const payload = `${userId}:${username}:${expiresAt}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    if (token !== expectedSignature) {
      return Response.json({ valid: false, reason: 'Invalid token signature' });
    }

    // HMAC signature verified – token is valid
    return Response.json({ valid: true });
  } catch (error) {
    console.error('verifySessionToken error:', error.message);
    return Response.json({ valid: false, reason: 'Verification failed' });
  }
});