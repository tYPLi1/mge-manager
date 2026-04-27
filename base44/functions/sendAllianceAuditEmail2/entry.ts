import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subject = "DKP-System · Audit-Bericht TEIL 2 (Tiefenscan Allianz-System)";

    const body = `Hallo Till,

ehrliche Antwort auf deine Frage: NEIN, beim ersten Audit habe ich NICHT alles gescannt.
Ich hatte nur AdminPlayers, Leaderboard, AdminSettings, AllianceConfigEditor und LeaderboardTable/Filters geprüft.

Hier ist der vollständige Tiefenscan mit allen NEU entdeckten Befunden:

═══════════════════════════════════════════════════════
NEU ENTDECKTE KRITISCHE BEFUNDE  🚨
═══════════════════════════════════════════════════════

[N1] KRITISCH — EventUpload erstellt neue Spieler OHNE Allianz
  → components/dkp/EventUpload.jsx Zeile 219:
     adminEntities.Player.bulkCreate(unknownNames.map(name => ({ name, total_dkp: 0, dkp_spent: 0 })))
  Wenn beim Excel-Upload neue Spieler automatisch angelegt werden, fehlt das alliance-Feld komplett. Diese Spieler stehen dann ohne Allianz in der Datenbank — Admin muss alle manuell zuordnen.
  → IMPACT: Bei jedem MEE/GEE-Upload mit neuen Spielern entstehen "verwaiste" Spieler ohne Allianz.

[N2] WICHTIG — getPublicLeaderboard liefert KEINE alliances mit
  → functions/getPublicLeaderboard.js: Lädt nur players, transactions, eventTypes — KEINE AppSettings.
  Die Function wird zwar aktuell vom Leaderboard NICHT genutzt (das Leaderboard nutzt direkt base44.entities.Player.list + getPublicSettings), aber falls jemand die Function woanders einbindet, würden Allianz-Farben fehlen.
  → IMPACT: Aktuell kein direkter Bug, aber inkonsistente API.

[N3] ADMIN-DKP "Manual Adjustment" zeigt Allianz NICHT an
  → pages/AdminDKP.jsx Zeile 95-97: Player-Dropdown listet nur p.name. Bei vielen Spielern mit gleichen/ähnlichen Namen wäre die Allianz als Disambiguation hilfreich.
  → IMPACT: UX-Verbesserung, kein Bug.

[N4] PlayerSearchSelect zeigt Allianz NICHT an
  → components/dkp/PlayerSearchSelect.jsx Zeile 77: Listet nur p.name, keine Allianz-Anzeige.
  → IMPACT: UX, vor allem wenn mehrere Allianzen gleiche Spielernamen haben.
  Außerdem: Placeholder "Spieler suchen..." ist HARDCODED DEUTSCH (Zeile 4), "Name eingeben..." (Zeile 60), "Kein Spieler gefunden" (Zeile 66).

[N5] PlayerDetail zeigt KEINE Allianz an
  → pages/PlayerDetail.jsx: Kompletter Player-Header (Zeile 69) zeigt nur den Namen. Die Allianz wird NIRGENDS angezeigt — weder als Badge im Header noch in den Stats.
  → IMPACT: User die per Direktlink öffnen sehen nicht, in welcher Allianz der Spieler ist.

[N6] PlayerDetail "transactionHistory" — Konflikt im Variablen-Naming
  → Zeile 128-135: const t (translation function) wird durch t in {transactions.map(t => ...)} ÜBERSCHATTET. Innerhalb der Map ist t die Transaction, nicht die translation function. KEIN Bug für Allianzen, aber generelle Code-Qualität — sollte als "tx" benannt werden.

[N7] Charts: Player-Buttons zeigen KEINE Allianz
  → pages/Charts.jsx Zeile 75-87: Filtert nur nach Name. Kein Alliance-Filter, keine Anzeige der Allianz im Button. Bei vielen Spielern wäre Allianz-Filterung sehr nützlich.

[N8] Transactions-Page zeigt KEINE Allianz und hat KEINEN Allianz-Filter
  → pages/Transactions.jsx: Kein alliance-Filter, kein Allianz-Hinweis. Bei großen Allianzen wäre "Alle Transaktionen von Allianz X" eine wertvolle Funktion.

[N9] Punishments-Page zeigt KEINE Allianz und hat KEINEN Allianz-Filter
  → pages/Punishments.jsx: Gleiche Lücke wie Transactions.

[N10] Discord-Notifications: notifyAuctionResults zeigt KEINE Allianz neben dem Spielernamen
  → functions/notifyAuctionResults.js Zeile 117: \`[rank]. **[player_name]**\` — keine Allianz-Anzeige im Embed.
  → IMPACT: Discord-Channel sieht nicht, aus welcher Allianz die Auktions-Gewinner kommen.
  Gleiches Problem in notifyAuctionOpened, notifyEventUpload, testLeaderboardMessage.

[N11] testLeaderboardMessage: Discord-Top-30 zeigt keine Allianz
  → functions/testLeaderboardMessage.js Zeile 60-65: Pure Liste ohne Allianz-Info.

[N12] testLeaderboardMessage: BUG in Balance-Berechnung
  → Zeile 62: const balance = (p.total_dkp || 0) - (p.dkp_spent || 0);
  ABER: dkp_spent wird im System als POSITIVER Wert gespeichert (siehe AdminDKP.jsx Zeile 51: dkp_spent + Math.abs(amt)) — NICHT negativ.
  ABER NOCH: Im PlayerDetail Zeile 55 steht: const currentDkp = (player.total_dkp || 0) + (player.dkp_spent || 0); mit dem Kommentar "dkp_spent is stored as negative value (e.g. -660), so we ADD it"
  ABER NOCH NOCH: AdminPlayers.jsx Zeile 207: const aDkp = (a.total_dkp || 0) + (a.dkp_spent || 0);  — erwartet auch negativ.
  → ECHTER BUG: Im Code gibt es WIDERSPRUCH bei der dkp_spent-Konvention. AdminDKP speichert es positiv, alles andere erwartet es negativ. Diese Inkonsistenz war SCHON VORHER vorhanden, ist aber im Audit aufgefallen. NICHT alliance-bezogen!

═══════════════════════════════════════════════════════
WEITERE NEU ENTDECKTE FEHLENDE ÜBERSETZUNGEN  🌐
═══════════════════════════════════════════════════════

[L1] PlayerSearchSelect — DEUTSCH HARDCODED
  → "Spieler suchen...", "Name eingeben...", "Kein Spieler gefunden" — alles deutsch, alle anderen Sprachen sehen Deutsch.

[L2] AdminDKP komplett englisch hardcoded
  → "DKP Management", "Manual DKP Adjustment", "Player", "Select player...", "Amount", "e.g. 50 or -10", "Type", "Earn", "Penalty", "Bonus", "Compensation", "King Allocation", "Bid (Deduct from Spent)", "Source", "e.g. MEE, GEE, KING", "Event Date", "Note", "Optional note", "Apply Adjustment".

[L3] EventUpload komplett englisch hardcoded
  → "Event DKP Upload", "Event Type", "Select event...", "Stage", "Preparation", "War Stage", "Event Date", "Template", "Upload Filled Excel", "X unknown players — will be skipped:", "Create X players & reload", "X players — Preview (dry run)", "Cancel", "Confirm & Apply", "Applying...", "Player", "Server Rank", "Group Rank", "Group", "DKP", "Notes", "DKP applied successfully!", "Top 20", "Outside", "Present", "Absent", "Override", "Missing required columns: Name, Server Rank", etc.

[L4] AdminAuctions: Discord-Embed-Texte hardcoded englisch
  → "Auction Results Ready", "Winners (Top X)", "Total Participants", "Friendly Zone", "Tiebreaker", "View Results", "First to bid", "Higher Activity Score", "Most DKP in last event", "Fixed Ranks", "These slots were pre-assigned...". Aber: Discord-Messages sind serverübergreifend — Lokalisierung müsste über Server-Config-Sprache laufen, ist also komplexer.

═══════════════════════════════════════════════════════
ZUSAMMENGEFASSTE NEUE PRIORITÄTSLISTE
═══════════════════════════════════════════════════════

P1 (HOCH) — N1: EventUpload-Auto-Create um Allianz-Feld erweitern (oder zumindest Warnung anzeigen, dass Allianz fehlt)
P2 (HOCH) — N5: PlayerDetail muss Allianz-Badge anzeigen
P3 (MITTEL) — N10/N11: Discord-Notifications mit Allianz-Info anreichern (auf Wunsch optional)
P4 (MITTEL) — N3/N4/N7/N8/N9: Allianz-Anzeige + Filter in AdminDKP/Charts/Transactions/Punishments + PlayerSearchSelect
P5 (MITTEL) — L1: PlayerSearchSelect deutsche Strings → i18n

═══════════════════════════════════════════════════════
WAS ICH IM ERSTEN AUDIT ÜBERSEHEN HATTE
═══════════════════════════════════════════════════════

❌ EventUpload (Auto-Create-Logik) — NICHT geprüft im 1. Durchgang
❌ PlayerDetail — NICHT geprüft
❌ Charts — NICHT geprüft
❌ Transactions — NICHT geprüft
❌ Punishments — NICHT geprüft
❌ AdminDKP — NICHT geprüft
❌ PlayerSearchSelect — NICHT geprüft
❌ Backend-Functions (notifyAuctionResults, testLeaderboardMessage, getPublicLeaderboard) — NICHT geprüft
❌ Discord-Embed-Inhalte allgemein — NICHT geprüft

Im Audit-Bericht 1 erfasst waren NUR:
✓ AdminPlayers (Hauptintegration)
✓ Leaderboard + LeaderboardTable + LeaderboardFilters
✓ AllianceConfigEditor + AdminSettings
✓ Player-Entity-Schema
✓ getPublicSettings
✓ Übersetzungen (alliances-spezifisch)

═══════════════════════════════════════════════════════
ZUSAMMENFASSUNG
═══════════════════════════════════════════════════════

Es gibt 12 neue Befunde, davon 1 KRITISCH (N1: EventUpload-Auto-Create vergisst Allianz)
und 1 HOCH (N5: PlayerDetail zeigt Allianz nicht).
Die übrigen sind UX-Verbesserungen und i18n-Lücken, die schon vor der Allianz-Integration existierten.

Außerdem entdeckt: Inkonsistenz in dkp_spent-Konvention (positiv vs negativ) — eigenes Ticket nötig, NICHT alliance-bezogen.

Warte auf dein Go für Korrekturen.

Gruss,
Base44 Audit (Tiefenscan)
`;

    await base44.integrations.Core.SendEmail({
      to: 'till@kastu.ch',
      subject,
      body,
      from_name: 'DKP-System Audit',
    });

    return Response.json({ ok: true, sentTo: 'till@kastu.ch' });
  } catch (error) {
    console.error('sendAllianceAuditEmail2 error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});