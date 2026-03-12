import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId } = await req.json();

    if (!userId) {
      return Response.json({ valid: false, reason: 'No userId provided' });
    }

    // Use service role to check admin user - no end-user auth needed
    const users = await base44.asServiceRole.entities.AdminUser.filter({ id: userId });
    const user = users.length > 0 ? users[0] : null;

    if (!user) {
      return Response.json({ valid: false, reason: 'User not found' });
    }

    if (!user.is_active) {
      return Response.json({ valid: false, reason: 'User is disabled' });
    }

    return Response.json({ valid: true });
  } catch (error) {
    console.error('verifyAdminSession error:', error.message);
    return Response.json({ valid: false, reason: 'Verification failed' });
  }
});