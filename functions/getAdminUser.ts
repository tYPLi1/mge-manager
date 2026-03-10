import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Use service role to list all admin users
    const allAdminUsers = await base44.asServiceRole.entities.AdminUser.list();
    
    return Response.json({
      success: true,
      data: allAdminUsers
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});