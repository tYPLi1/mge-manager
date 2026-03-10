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

    // Get admin credentials from environment/database
    // For now, hardcode the credentials we created
    const adminCredentials = {
      'test': '$2a$10$MvVR5kVdCWugwgy8h1ZYiu/YoFr7URLOqOqHlg/oPMNkua5JHzhcC',
      'tYPLi1': '$2a$10$dB5SxsITiXHeBnKkC9zIOOlfbg6EEUrCKuID8bTnZ0Ek.W/tNjG06'
    };

    const passwordHash = adminCredentials[username];
    
    if (!passwordHash) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password hash
    const passwordMatch = await bcrypt.compare(password, passwordHash);
    
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
        username: username,
        userId: username,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});