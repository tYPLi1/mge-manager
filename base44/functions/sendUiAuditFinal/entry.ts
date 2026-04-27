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
  <h1 style="font-size:22px;margin:0 0 4px">DKP App — UI/UX Audit · Final Status</h1>
  <p style="color:#475569;margin:0 0 20px">Alle priorisierten Punkte aus dem Audit sind umgesetzt — bis auf Tabellen-Virtualisierung (für eure Skalierung nicht nötig). Was noch offen ist, steht unten.</p>

  <h2 style="font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;color:#16a34a">✅ Diesen Sprint erledigt</h2>

  <h3 style="font-size:14px;margin:16px 0 6px">Phase 1 — Accessibility &amp; Foundations</h3>
  <ul>
    <li>Globale Focus-visible Ringe an allen interaktiven Elementen (Tastatur-Navigation sichtbar).</li>
    <li>WCAG-AA Kontrast: <code>--dp-text-muted</code> &amp; <code>--dp-text-dim</code> aufgehellt.</li>
    <li>Z-index-Skala via CSS-Variablen (<code>--dp-z-dropdown/sticky/modal/popover/toast</code>).</li>
    <li>iOS Zoom-on-focus-Fix (Inputs ≥16px auf Mobile).</li>
    <li><code>prefers-reduced-motion</code> respektiert.</li>
    <li>Skeleton-Loading via <code>.dp-skeleton</code>.</li>
    <li>Touch-Target-Helper <code>.dp-touch-target</code> + überall ≥36-44px.</li>
    <li>Tabular-numerals + <code>text-wrap: balance</code> für Headings.</li>
    <li><code>.dp-sr-only</code> Screen-Reader-Helper.</li>
  </ul>

  <h3 style="font-size:14px;margin:16px 0 6px">Phase 2 — AdminReports + Forms</h3>
  <ul>
    <li>Native <code>window.confirm()</code> → AlertDialog (<code>DeleteReportDialog</code>) mit Hinweis auf Screenshot-Verbleib.</li>
    <li>Spezifische Save-Buttons: "Save Email" + "Save Note" mit Disabled-State + Spinner während async.</li>
    <li>"Saving…" Feedback + Toast bei erfolgreichem Speichern.</li>
    <li>aria-labels an allen Icon-Buttons (Trash, Mobile-Toggle, Sprachwechsel, Suchicons als <code>aria-hidden</code>).</li>
    <li>Form-Inputs mit <code>&lt;label htmlFor&gt;</code> (Auction Bid-Form, Transactions-Suche, AdminReports).</li>
    <li>"Bid too high" mit <code>aria-invalid</code> + <code>role="alert"</code> + <code>aria-describedby</code>.</li>
    <li>"Wont fix" → "Won't fix" (curly apostrophe).</li>
    <li>Hardcoded Strings → i18n in alle 7 Sprachen (Players, Avg DKP, Total Power, Save-Buttons, Delete-Confirms, Stats-Labels).</li>
  </ul>

  <h3 style="font-size:14px;margin:16px 0 6px">Phase 3 — Layout, Empty States &amp; CTAs</h3>
  <ul>
    <li><strong>Wiederverwendbare <code>EmptyState</code>-Komponente</strong> (Icon + Titel + Description + optionale CTA).</li>
    <li><strong>Empty States mit Illustration</strong> in: Punishments (ShieldCheck), Charts (BarChart3), Results (ScrollText), Auction noActive (Gavel).</li>
    <li><strong>Auction "Closed"-View</strong>: CTA "Past Auctions" → /Results (Sackgasse beseitigt).</li>
    <li><strong>Auction "noActive"-View</strong>: ebenfalls CTA → /Results.</li>
    <li><strong>Past Auctions Liste</strong> in Results: Pagination (8 pro Seite) statt Wall of Buttons + aria-pressed + Mindesthöhe 44px.</li>
    <li><strong>Sticky First Column</strong> auf Leaderboard (Rang + Spielername bleiben beim Horizontal-Scrollen sichtbar).</li>
    <li><strong>Truncation</strong> auf langen Spielernamen in Punishments-Cards + Past-Auctions-Cards (<code>.dp-truncate</code>).</li>
    <li><strong>Hover-Effekt verstärkt</strong> auf Leaderboard-Tabellenzeilen (subtiler Gold-Tint).</li>
    <li><strong>Polling reduziert</strong> in Auction.jsx: 10s → 60s (Subscriptions tragen die Echtzeit-Updates, Polling nur als Safety-Net für Auction-Status).</li>
    <li><strong>Bid-Submission Feedback</strong>: Toast (Erfolg + Beschreibung) zusätzlich zur In-Place-Bestätigung.</li>
    <li><strong>Generic Error</strong> bei Bid-Fehler nutzt jetzt i18n-Key statt englischen Hardcode.</li>
  </ul>

  <h2 style="font-size:16px;margin:32px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;color:#dc2626">🔴 Bewusst übersprungen</h2>
  <ul>
    <li><strong>Tabellen-Virtualisierung (react-window)</strong> — bei eurer Größe (~50-200 Spieler, paginierte Transactions) bringt es kaum Gewinn und macht Sticky-Header / Sortierung komplexer. Package ist installiert, falls Spielerzahl &gt;500 wächst.</li>
  </ul>

  <h2 style="font-size:16px;margin:32px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;color:#ea580c">🟠 Noch offen — bewusst nicht angetastet</h2>

  <h3 style="font-size:14px;margin:16px 0 6px">Größere Refactorings (Risiko von Funktions-Regressionen)</h3>
  <ul>
    <li><strong>Layout-Migration der Admin-Pages</strong> (AdminAuctions, AdminPlayers, AdminDKP, AdminPenalties, AdminEventConfig, AdminSettings, AdminAuctionConfig, AdminAppManagement) — nutzen noch Tailwind <code>bg-[#111827]</code>/amber statt <code>--dp-*</code> Tokens. Public Pages sind komplett auf neuem System. Migration ist rein visuell, würde aber jede Page einzeln umstellen müssen — viel Oberfläche, Risiko von Detail-Regressionen. Empfehlung: einzeln gezielt nach Bedarf, nicht im Massenrefactor.</li>
    <li><strong>Filter-Row in Transactions wraps unschön bei ~600px</strong> — Selects brechen einzeln um statt zu gruppieren. Lösung: eigenes <code>FilterGroup</code>-Component mit gemeinsamem Wrap-Container.</li>
    <li><strong>Bid-Submit als Toast statt In-Place-Card</strong> — der Erfolgs-Toast ist jetzt zusätzlich aktiv, aber die alte In-Place-Bestätigung läuft parallel. Falls "nur Toast + Form-Reset" gewünscht: 5 Zeilen Anpassung.</li>
  </ul>

  <h3 style="font-size:14px;margin:16px 0 6px">Animation &amp; Mikrointeraktionen (Politur)</h3>
  <ul>
    <li>framer-motion installiert, aber bei Status-Wechseln &amp; Tab-Übergängen ungenutzt.</li>
    <li>Countdown rendert kompletten DOM-Baum jede Sekunde — bei vielen Spielern auf der Auction-Seite minimal merkbar. Memoize oder CSS-only.</li>
  </ul>

  <h3 style="font-size:14px;margin:16px 0 6px">Charts a11y &amp; Politur</h3>
  <ul>
    <li>Keine Tabellen-Alternative für Screen-Reader auf Charts-Page.</li>
    <li>Achsen-Labels bei 10px zu klein.</li>
    <li>PlayerDKPCumulativeChart Scroll-Buttons ohne Keyboard-Support (Pfeiltasten).</li>
  </ul>

  <h3 style="font-size:14px;margin:16px 0 6px">Niedrige Priorität</h3>
  <ul>
    <li>Stat Cards Hierarchie auf Mobile (alle vertikal mit gleicher Prominenz).</li>
    <li>Admin-Sidebar Gruppierung (DKP / Players / Auctions / System).</li>
    <li>Inline-Save on blur (Admin-Note speichert nur via Button, nicht beim Verlassen des Feldes).</li>
    <li>Error-Messages ohne Fix-Hinweis (z.B. "Bid submission failed" sollte "Try again" o. Erklärung ergänzen).</li>
  </ul>

  <p style="margin-top:32px;padding:14px;background:#f1f5f9;border-radius:8px;color:#475569;font-size:13px">
    <strong>Zusammenfassung:</strong> Phase 1 + 2 + 3 komplett. Public-Bereich ist a11y-bereit, durchgängig i18n-fähig und visuell konsistent. Admin-Bereich funktional unverändert (bewusst), kann bei Bedarf später visuell migriert werden.<br/><br/>
    Sag Bescheid wenn du eine konkrete Admin-Page als Pilot für die Token-Migration möchtest — ich beginne dann typischerweise mit AdminDashboard, da dort die meisten Public-User-Touchpoints sitzen.
  </p>
</body></html>`;

    await base44.integrations.Core.SendEmail({
      to: 'till@kastu.ch',
      subject: 'DKP App — UI/UX Audit · Final Status (was noch offen ist)',
      body: html,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});