import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const html = `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;color:#0f172a;line-height:1.55;max-width:760px;margin:0 auto;padding:24px">
  <h1 style="font-size:22px;margin:0 0 4px">DKP App — UI/UX Audit</h1>
  <p style="color:#475569;margin:0 0 20px">Priority-ordered review based on the workspace UI/UX guide. <strong>No code was changed.</strong> Tick items you'd like fixed and reply.</p>

  <h2 style="font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">🔴 1. Accessibility (Critical)</h2>
  <ul>
    <li><strong>Contrast issues</strong> — Many secondary texts use <code>--dp-text-dim</code> on dark backgrounds (e.g. column headers, captions) which likely fail WCAG AA 4.5:1. Audit and lift dim greys.</li>
    <li><strong>Icon-only buttons missing aria-label</strong> — Trash icon in AdminReports, ChevronRight in Results card, mobile menu toggle, language switcher button. Screen readers announce these as "button" only.</li>
    <li><strong>No focus-visible styles</strong> — Custom <code>.dp-input</code>, <code>.dp-btn-*</code>, native <code>&lt;select&gt;</code> and link buttons lack visible keyboard focus rings. Tab navigation is invisible.</li>
    <li><strong>Form inputs without &lt;label htmlFor&gt;</strong> — Auction bid form uses styled label divs but inputs aren't associated. Screen readers won't announce the field name.</li>
    <li><strong>Color-only state on bid amount</strong> — "Bid too high" message is red-only; needs an icon and stronger inline error pattern (focus the field on submit error).</li>
    <li><strong>Search inputs without &lt;label&gt;</strong> — Transactions, Leaderboard, AdminReports search fields rely on placeholder only (placeholder ≠ label).</li>
  </ul>

  <h2 style="font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">🔴 2. Touch & Interaction (Critical)</h2>
  <ul>
    <li><strong>Status dropdown in AdminReports was being clipped</strong> — already fixed (z-index). Verify other Selects (filters etc.) don't have the same issue.</li>
    <li><strong>Touch targets &lt; 44px</strong> — Filter chip buttons in AdminReports (~30px tall), pagination buttons in Transactions, "View screenshot" link, delete-icon button (1.5 padding only). Should be min 44×44px on mobile.</li>
    <li><strong>Missing <code>cursor-pointer</code></strong> — Some clickable cards in Results "Past auctions" rely on default cursor on dark theme.</li>
    <li><strong>Destructive actions use native <code>confirm()</code></strong> — AdminReports delete uses <code>window.confirm</code>. Replace with proper Dialog with explicit "Delete report" action button per guide.</li>
    <li><strong>Submit buttons don't disable consistently during async</strong> — Bid submit handles it, but admin note save and email save show no disabled/spinner feedback.</li>
    <li><strong>No "Saving…" feedback on inline edits</strong> — Admin note save in AdminReports just changes color; no spinner or success toast on field-level save.</li>
    <li><strong>Hover effect uses background only on cards, but some links have no hover at all</strong> — e.g. Leaderboard table rows.</li>
  </ul>

  <h2 style="font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">🟠 3. Performance (High)</h2>
  <ul>
    <li><strong>Large lists not virtualized</strong> — Leaderboard, Transactions (up to 2500 rows), Results all render full lists. Per guide, virtualize when >50 items.</li>
    <li><strong>Skeleton screens missing</strong> — Most pages show spinner only; Transactions has skeleton rows ✅. Apply skeleton pattern to Leaderboard, Results, Punishments, AdminReports.</li>
    <li><strong>No <code>prefers-reduced-motion</code> handling</strong> — Spinner animations and pulse effects ignore user preference.</li>
    <li><strong>Polling every 10s on Auction page</strong> + entity subscriptions = double work. Consider relying on subscriptions only.</li>
  </ul>

  <h2 style="font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">🟠 4. Layout & Responsive (High)</h2>
  <ul>
    <li><strong>Body text below 16px on mobile</strong> — Many text elements at 11.5–13.5px. iOS will zoom-on-focus inputs &lt;16px and small text is hard to read on mobile.</li>
    <li><strong>Horizontal scroll inside tables</strong> is OK, but sticky first column missing — when scrolling Leaderboard horizontally, the player name disappears.</li>
    <li><strong>Filter row in Transactions wraps awkwardly at ~600px</strong> — selects break to new line individually rather than grouping.</li>
    <li><strong>Z-index scale not standardized</strong> — Mix of <code>z-50</code>, <code>z-40</code>, <code>z-[100]</code>, inline <code>zIndex: 10</code>. Adopt the guide's scale: 10 dropdowns, 20 sticky, 30 modals, 50 toasts.</li>
    <li><strong>Truncation missing on player names</strong> — Long names break layout in narrow cards (Auction fixed ranks, Punishments cards).</li>
    <li><strong>Stat cards reflow but don't keep visual hierarchy</strong> — On mobile they stack vertically with same prominence; could collapse to a single 2-up row.</li>
  </ul>

  <h2 style="font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">🟡 5. Typography & Color (Medium)</h2>
  <ul>
    <li><strong>Two competing design systems coexist</strong> — Old Tailwind <code>bg-[#111827]</code> + amber palette (AdminReports, Layout) and the new <code>--dp-*</code> tokens (public pages). Pick one, migrate the other.</li>
    <li><strong>Tabular numerals applied inconsistently</strong> — DKP numbers use <code>.dp-mono</code> ✅, but rank numbers, counts, and stat values in admin pages don't. Numbers jitter on update.</li>
    <li><strong>Loading copy uses "..." instead of "…"</strong> — minor but per guide.</li>
    <li><strong>Mixing en/de in hardcoded strings</strong> — "Players", "Avg DKP" in Leaderboard StatCards are hardcoded English even though the rest is i18n.</li>
    <li><strong>Headings could use <code>text-wrap: balance</code></strong> — Page titles wrap unevenly on tablet widths.</li>
    <li><strong>"Wont fix" status</strong> — Should be "Won't fix" (curly apostrophe).</li>
  </ul>

  <h2 style="font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">🟡 6. Animation (Medium)</h2>
  <ul>
    <li><strong>No interruptible animations</strong> — Spinner can't be cancelled; framer-motion not used on key transitions despite being installed.</li>
    <li><strong>Status badge color changes are abrupt</strong> — Could ease transition for status dropdown change in AdminReports.</li>
    <li><strong>Countdown re-renders entire DOM tree every second</strong> — Causing flicker on slower devices. Memoize or use CSS-only animation.</li>
  </ul>

  <h2 style="font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">🟢 7. Charts & Data Viz (Low)</h2>
  <ul>
    <li><strong>PlayerDKPCumulativeChart has horizontal scroll buttons</strong> but no keyboard support — left/right arrows would be expected.</li>
    <li><strong>Tooltip contrast on dark theme is OK</strong>, but chart axis labels at 10px are below recommended size.</li>
    <li><strong>No table-alternative for accessibility</strong> on charts (Charts page).</li>
    <li><strong>Gradient fill uses single hue</strong> — works for trend, but adding a baseline reference line would help reading "is this above/below average".</li>
  </ul>

  <h2 style="font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">📋 Pattern Selection Issues</h2>
  <ul>
    <li><strong>AdminReports admin-note "Save" button appears only on dirty</strong> — good, but should also show on blur via toast.</li>
    <li><strong>Empty states are text-only</strong> — Per guide: illustration + "No X yet" + CTA. Apply to AdminReports empty, Punishments empty, Results no-confirmed.</li>
    <li><strong>Bid submission shows success in-place</strong> — could be a toast + reset form, more in line with the rest of the app.</li>
    <li><strong>Admin sidebar &gt;5 items on small screens</strong> — Already collapses ✅; consider grouping (DKP / Players / Auctions / System).</li>
    <li><strong>Auction "Closed" view is a dead-end card</strong> — Add a CTA "View past results" linking to Results page.</li>
    <li><strong>Past auctions list uses full-width buttons</strong> — At &gt;10 entries this becomes a wall; should be a paginated/scrollable list with date grouping.</li>
  </ul>

  <h2 style="font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">✏️ Content & Copy</h2>
  <ul>
    <li><strong>Button labels not always specific</strong> — "Save" appears 5+ times across the app. Per guide: "Save Email", "Save Note", "Save Settings".</li>
    <li><strong>Error messages don't include the fix</strong> — "Bid submission failed" — should suggest "Try again" or explain why.</li>
    <li><strong>Numerals inconsistency</strong> — "8 players" (good) vs "no penalties" (should be "0 penalties" or specific message).</li>
    <li><strong>Confirmation copy mixes languages</strong> — Delete confirm string is English even on de/tr/fr locales.</li>
  </ul>

  <h2 style="font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">⭐ Quick Wins (Recommended order)</h2>
  <ol>
    <li>Add focus-visible rings to all interactive elements (1 file, big a11y gain).</li>
    <li>Standardize z-index scale across the app.</li>
    <li>Add aria-labels to all icon-only buttons.</li>
    <li>Replace native <code>confirm()</code> with the existing alert-dialog component.</li>
    <li>Fix iOS zoom-on-focus by raising input font-size to 16px on mobile.</li>
    <li>Sticky first column on Leaderboard table.</li>
    <li>Specific button labels (Save Email / Save Note / etc.).</li>
    <li>Migrate AdminReports + Layout to the <code>--dp-*</code> token system for visual unity.</li>
  </ol>

  <p style="margin-top:32px;padding:14px;background:#f1f5f9;border-radius:8px;color:#475569;font-size:13px">
    Reply with the numbers/topics you want me to tackle and I'll start the changes.
  </p>
</body></html>`;

    await base44.integrations.Core.SendEmail({
      to: 'till@kastu.ch',
      subject: 'DKP App — UI/UX Audit (priority-ordered)',
      body: html,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});