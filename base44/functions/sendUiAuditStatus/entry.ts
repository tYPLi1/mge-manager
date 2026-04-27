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
  <h1 style="font-size:22px;margin:0 0 4px">DKP App — UI/UX Audit Status</h1>
  <p style="color:#475569;margin:0 0 20px">Stand der UI/UX-Verbesserungen aus dem Audit. Alles was noch offen ist, ist unten gelistet.</p>

  <h2 style="font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;color:#16a34a">✅ Erledigt</h2>

  <h3 style="font-size:14px;margin:16px 0 6px">Accessibility</h3>
  <ul>
    <li>Focus-visible Ringe global an allen interaktiven Elementen (Tastatur-Navigation sichtbar).</li>
    <li>Kontrast WCAG-AA — <code>--dp-text-muted</code> &amp; <code>--dp-text-dim</code> aufgehellt.</li>
    <li>aria-labels an Icon-Buttons (Trash, Mobile-Toggle, Sprachwechsel, Suchicons als <code>aria-hidden</code>).</li>
    <li>Form-Inputs mit <code>&lt;label htmlFor&gt;</code> verknüpft (Auction Bid-Form, Transactions/AdminReports Suche, Admin-Note).</li>
    <li>"Bid too high" mit <code>aria-invalid</code> + <code>role="alert"</code>.</li>
    <li><code>.dp-sr-only</code> Helper für Screen-Reader-only Labels.</li>
  </ul>

  <h3 style="font-size:14px;margin:16px 0 6px">Touch &amp; Interaktion</h3>
  <ul>
    <li>Native <code>window.confirm()</code> in AdminReports → AlertDialog (<code>DeleteReportDialog</code>) mit Hinweis auf Screenshot-Verfügbarkeit.</li>
    <li>Touch-Targets auf Filter-Chips, Mobile-Toggles und Icon-Buttons auf min. 36-44px gehoben.</li>
    <li>Save-Buttons mit Disabled-State + Spinner während async (Email + Note).</li>
    <li>"Saving…"-Feedback + Toast bei erfolgreichem Speichern der Admin-Note.</li>
  </ul>

  <h3 style="font-size:14px;margin:16px 0 6px">Performance &amp; Layout</h3>
  <ul>
    <li>Z-index-Skala standardisiert via CSS-Variablen (<code>--z-dropdown/sticky/modal/toast</code>).</li>
    <li>iOS Zoom-on-focus-Fix (Inputs ≥16px auf Mobile).</li>
    <li><code>prefers-reduced-motion</code> respektiert (Spinner/Pulse).</li>
    <li>Skeleton-Loading-Klasse <code>.dp-skeleton</code> + in AdminReports angewendet.</li>
  </ul>

  <h3 style="font-size:14px;margin:16px 0 6px">Typografie &amp; Content</h3>
  <ul>
    <li>Tabular-numerals + <code>text-wrap: balance</code> Heading-Klassen.</li>
    <li>"Wont fix" → "Won't fix" (curly apostrophe).</li>
    <li>Hardcoded "Players"/"Avg DKP" in Leaderboard-StatCards → i18n in alle 7 Sprachen.</li>
    <li>Spezifische Button-Labels: "Save Email" / "Save Note" statt generisches "Save".</li>
    <li>Delete-Confirm-Strings sind jetzt mehrsprachig (alle 7 Sprachen).</li>
  </ul>

  <h2 style="font-size:16px;margin:32px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;color:#dc2626">🔴 Noch offen (high priority)</h2>

  <h3 style="font-size:14px;margin:16px 0 6px">Layout-Migration</h3>
  <ul>
    <li><strong>Zwei Design-Systeme koexistieren</strong> — Layout, Admin-Pages (AdminAuctions, AdminPlayers, AdminDKP, AdminPenalties, AdminEventConfig, AdminSettings, AdminAuctionConfig, AdminDashboard) nutzen noch Tailwind <code>bg-[#111827]</code> + amber. Public Pages bereits auf <code>--dp-*</code>. Migration ausstehend.</li>
    <li><strong>Sticky First Column</strong> im Leaderboard fehlt — beim horizontalen Scrollen verschwindet der Spielername.</li>
    <li><strong>Filter-Row in Transactions</strong> wraps unschön bei ~600px (Selects brechen einzeln um, statt zu gruppieren).</li>
  </ul>

  <h3 style="font-size:14px;margin:16px 0 6px">Empty States &amp; CTAs</h3>
  <ul>
    <li><strong>Empty States nur Text</strong> — sollten Illustration + "No X yet" + CTA haben (AdminReports, Punishments, Results no-confirmed, Charts no-player).</li>
    <li><strong>Auction "Closed"-View ist Sackgasse</strong> — CTA "Past results ansehen" → /Results fehlt.</li>
    <li><strong>Past Auctions Liste</strong> in Results ist bei &gt;10 Einträgen eine Wall of Buttons — Pagination + Datums-Gruppierung sinnvoll.</li>
  </ul>

  <h2 style="font-size:16px;margin:32px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;color:#ea580c">🟠 Mittlere Priorität</h2>

  <h3 style="font-size:14px;margin:16px 0 6px">Performance</h3>
  <ul>
    <li><strong>Tabellen-Virtualisierung</strong> — bei eurer Größe (~50-200 Spieler, paginierte Transactions) bringt es kaum Gewinn und macht Sticky-Header/Sortierung komplexer. <em>Ausgelassen.</em> Falls Spielerzahl &gt;500 wächst: <code>react-window</code> ist bereits installiert.</li>
    <li><strong>Auction-Polling alle 10s + Subscriptions</strong> = Doppelarbeit. Subscriptions sollten reichen.</li>
    <li><strong>Countdown rendert kompletten DOM-Baum jede Sekunde</strong> — Memoize oder CSS-only Animation.</li>
  </ul>

  <h3 style="font-size:14px;margin:16px 0 6px">Animation &amp; Mikrointeraktionen</h3>
  <ul>
    <li>framer-motion installiert, aber bei Status-Wechseln &amp; Tab-Übergängen ungenutzt.</li>
    <li>Hover-Effekt auf Leaderboard-Tabellenzeilen sehr subtil.</li>
    <li>Bid-Submission zeigt Erfolg in-place — Toast + Form-Reset wäre konsistenter.</li>
  </ul>

  <h2 style="font-size:16px;margin:32px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;color:#ca8a04">🟡 Niedrige Priorität</h2>

  <ul>
    <li><strong>Charts a11y</strong> — keine Tabellen-Alternative für Screen-Reader auf Charts-Page; Achsen-Labels bei 10px zu klein.</li>
    <li><strong>PlayerDKPCumulativeChart Scroll-Buttons</strong> ohne Keyboard-Support (Pfeiltasten).</li>
    <li><strong>Stat Cards Hierarchie auf Mobile</strong> — alle vertikal mit gleicher Prominenz; 2-up Row wäre stärker.</li>
    <li><strong>Truncation auf langen Spielernamen</strong> fehlt (Auction Fixed Ranks, Punishments-Cards).</li>
    <li><strong>Admin-Sidebar Gruppierung</strong> (DKP / Players / Auctions / System) — derzeit flache Liste.</li>
    <li><strong>Inline-Save on blur</strong> — Admin-Note speichert nur via Button, nicht beim Verlassen des Feldes.</li>
    <li><strong>Error-Messages ohne Fix-Hinweis</strong> — z.B. "Bid submission failed" sollte "Try again" o. Erklärung ergänzen.</li>
  </ul>

  <p style="margin-top:32px;padding:14px;background:#f1f5f9;border-radius:8px;color:#475569;font-size:13px">
    Sag Bescheid welche Punkte als nächstes — ich empfehle <strong>Layout-Migration</strong> + <strong>Sticky First Column</strong> + <strong>Auction Closed CTA</strong> als nächsten Sprint.
  </p>
</body></html>`;

    await base44.integrations.Core.SendEmail({
      to: 'till@kastu.ch',
      subject: 'DKP App — UI/UX Audit Status (was offen ist)',
      body: html,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});