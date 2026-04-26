import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const body = await req.json();
    const {
      type,
      subject,
      message,
      page,
      locale,
      reporter_name,
      screenshot_url,
    } = body || {};

    if (!type || !message || !String(message).trim()) {
      return Response.json({ error: 'Type and message are required' }, { status: 400 });
    }
    if (!['bug', 'translation', 'other'].includes(type)) {
      return Response.json({ error: 'Invalid type' }, { status: 400 });
    }

    const userAgent = req.headers.get('user-agent') || '';

    const report = await service.entities.UserReport.create({
      type,
      subject: subject ? String(subject).slice(0, 200) : '',
      message: String(message).slice(0, 5000),
      page: page ? String(page).slice(0, 200) : '',
      locale: locale ? String(locale).slice(0, 10) : '',
      reporter_name: reporter_name ? String(reporter_name).slice(0, 80) : '',
      screenshot_url: screenshot_url ? String(screenshot_url).slice(0, 500) : '',
      user_agent: userAgent.slice(0, 300),
      status: 'new',
    });

    let adminEmail = '';
    try {
      const settings = await service.entities.AppSettings.filter({ key: 'report_email' });
      if (settings && settings.length > 0) {
        adminEmail = String(settings[0].value || '').trim();
      }
    } catch (_) { /* ignore */ }

    if (adminEmail) {
      const typeLabel = type === 'bug' ? '🐛 Bug' : type === 'translation' ? '🌐 Translation' : '💬 Other';
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px;">
          <h2 style="color:#d4a859;margin:0 0 12px 0;">${typeLabel} Report</h2>
          ${subject ? `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ''}
          <p><strong>Message:</strong></p>
          <div style="background:#f4f4f4;padding:12px;border-radius:8px;white-space:pre-wrap;">${escapeHtml(message)}</div>
          <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />
          <p style="font-size:12px;color:#666;margin:4px 0;"><strong>Reporter:</strong> ${escapeHtml(reporter_name || 'Anonymous')}</p>
          <p style="font-size:12px;color:#666;margin:4px 0;"><strong>Page:</strong> ${escapeHtml(page || '-')}</p>
          <p style="font-size:12px;color:#666;margin:4px 0;"><strong>Locale:</strong> ${escapeHtml(locale || '-')}</p>
          ${screenshot_url ? `<p style="font-size:12px;color:#666;margin:4px 0;"><strong>Screenshot:</strong> <a href="${escapeHtml(screenshot_url)}">View</a></p>` : ''}
          <p style="font-size:11px;color:#999;margin-top:12px;">Report ID: ${report.id}</p>
        </div>
      `;

      try {
        await service.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `[DKP Report] ${typeLabel}${subject ? ' — ' + subject : ''}`,
          body: html,
        });
      } catch (mailErr) {
        console.error('Failed to send report email:', mailErr);
      }
    }

    return Response.json({ success: true, id: report.id });
  } catch (error) {
    console.error('submitUserReport error:', error);
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