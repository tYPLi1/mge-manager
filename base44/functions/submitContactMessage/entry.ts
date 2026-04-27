import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const body = await req.json();
    const {
      sender_email,
      sender_name,
      subject,
      message,
      page,
      locale,
    } = body || {};

    // Validation
    if (!sender_email || !String(sender_email).trim()) {
      return Response.json({ error: 'EMAIL_REQUIRED' }, { status: 400 });
    }
    if (!message || !String(message).trim()) {
      return Response.json({ error: 'MESSAGE_REQUIRED' }, { status: 400 });
    }
    const email = String(sender_email).trim().slice(0, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'INVALID_EMAIL' }, { status: 400 });
    }

    // Look up admin email (same setting as bug reports)
    let adminEmail = '';
    try {
      const settings = await service.entities.AppSettings.filter({ key: 'report_email' });
      if (settings && settings.length > 0) {
        adminEmail = String(settings[0].value || '').trim();
      }
    } catch (_) { /* ignore */ }

    if (!adminEmail) {
      return Response.json({ error: 'ADMIN_EMAIL_NOT_CONFIGURED' }, { status: 500 });
    }

    const userAgent = req.headers.get('user-agent') || '';
    const safeName = sender_name ? String(sender_name).trim().slice(0, 120) : '';
    const safeSubject = subject ? String(subject).trim().slice(0, 200) : '(no subject)';
    const safeMessage = String(message).slice(0, 5000);
    const safePage = page ? String(page).slice(0, 200) : '';
    const safeLocale = locale ? String(locale).slice(0, 10) : '';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px;">
        <h2 style="color:#d4a859;margin:0 0 12px 0;">📬 Contact form message</h2>
        <p><strong>From:</strong> ${escapeHtml(safeName || 'Anonymous')} &lt;${escapeHtml(email)}&gt;</p>
        <p><strong>Subject:</strong> ${escapeHtml(safeSubject)}</p>
        <p><strong>Message:</strong></p>
        <div style="background:#f4f4f4;padding:12px;border-radius:8px;white-space:pre-wrap;">${escapeHtml(safeMessage)}</div>
        <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />
        <p style="font-size:12px;color:#666;margin:4px 0;">
          <strong>Reply-To:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
        </p>
        <p style="font-size:12px;color:#666;margin:4px 0;"><strong>Page:</strong> ${escapeHtml(safePage || '-')}</p>
        <p style="font-size:12px;color:#666;margin:4px 0;"><strong>Locale:</strong> ${escapeHtml(safeLocale || '-')}</p>
        <p style="font-size:11px;color:#999;margin-top:12px;">User-Agent: ${escapeHtml(userAgent.slice(0, 200))}</p>
      </div>
    `;

    await service.integrations.Core.SendEmail({
      from_name: `Contact: ${safeName || email}`,
      to: adminEmail,
      subject: `[DKP Contact] ${safeSubject}`,
      body: html,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('submitContactMessage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}