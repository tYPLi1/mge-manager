import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId } = await req.json();

    if (!userId) {
      return Response.json({ valid: false, reason: 'No userId provided' });
    }

    try {
      const user = await base44.asServiceRole.entities.AdminUser.get(userId);
      
      if (!user) {
        return Response.json({ valid: false, reason: 'User not found' });
      }

      if (!user.is_active) {
        return Response.json({ valid: false, reason: 'User is disabled' });
      }

      return Response.json({ valid: true });
    } catch (innerError) {
      console.error('Get user error:', innerError.message);
      return Response.json({ valid: false, reason: 'User not found or deleted' });
    }
  } catch (error) {
    console.error('verifyAdminSession error:', error.message);
    return Response.json({ valid: false, reason: 'Verification failed' });
  }
});