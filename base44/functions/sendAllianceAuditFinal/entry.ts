import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subject = "DKP-System · KONSOLIDIERTER Audit-Bericht Allianz-System (mit Priorisierung)";

    const body = `Hallo Till,

hier der konsolidierte Audit-Bericht aus beiden Durchgängen, sortiert nach Schwere × Dringlichkeit.

LEGENDE
═══════════════════════════════════════════════════════
Schwere:      🔴 Kritisch  🟠 Hoch  🟡 Mittel  🟢 Niedrig
Dringlichkeit: ⚡ Sofort   🕐 Bald   📅 Geplant  💤 Optional
Bereich:      [DATA] Datenintegrität  [UX] User Experience
              [I18N] Lokalisierung    [BUG] Funktionsfehler


═══════════════════════════════════════════════════════
🔴⚡ KRITISCH · SOFORT BEHEBEN  (Datenintegrität)
═══════════════════════════════════════════════════════

#1 [DATA] EventUpload erzeugt Spieler OHNE Allianz
   Datei: components/dkp/EventUpload.jsx, Zeile ~219
   Problem: Beim Excel-Upload werden unbekannte Spieler automatisch
            angelegt — das alliance-Feld bleibt leer.
   Folge:   Bei jedem MEE/GEE-Upload entstehen "verwaiste" Spieler
            ohne Allianz-Zuordnung. Admin muss alle manuell nachpflegen.
   Fix:     Beim Auto-Create entweder Default-Allianz setzen oder
            Admin zwingen, vor dem Upload eine Allianz zu wählen.

#2 [BUG] dkp_spent — Konventions-Inkonsistenz im Code
   (NICHT alliance-bezogen, aber im Audit aufgefallen)
   Problem: AdminDKP.jsx speichert dkp_spent als POSITIVEN Wert
            (Zeile 51: dkp_spent + Math.abs(amt)).
            PlayerDetail.jsx und AdminPlayers.jsx erwarten ihn aber
            als NEGATIVEN Wert (currentDkp = total_dkp + dkp_spent).
            testLeaderboardMessage.js subtrahiert ihn (- dkp_spent).
   Folge:   Je nach Code-Pfad werden falsche DKP-Salden angezeigt.
   Fix:     Konvention vereinheitlichen — Empfehlung: dkp_spent
            IMMER positiv speichern, überall subtrahieren.
   Hinweis: Eigenes Ticket — separat von Allianz-System.


═══════════════════════════════════════════════════════
🟠🕐 HOCH · BALD BEHEBEN  (UX-relevant für Endnutzer)
═══════════════════════════════════════════════════════

#3 [UX] PlayerDetail zeigt Allianz nicht an
   Datei: pages/PlayerDetail.jsx
   Problem: Der Spieler-Header zeigt nur den Namen — keine Allianz.
   Folge:   Wer per Direktlink auf einen Spieler kommt, sieht nicht,
            zu welcher Allianz er gehört.
   Fix:     Allianz-Badge mit Farbe im Header anzeigen.

#4 [I18N] PlayerSearchSelect ist hartcodiert deutsch
   Datei: components/dkp/PlayerSearchSelect.jsx
   Problem: "Spieler suchen…", "Name eingeben…", "Kein Spieler
            gefunden" — alles deutsch, ungeachtet der Sprache.
   Folge:   Englische/türkische/etc. User sehen deutsche Strings.
   Fix:     Über useTranslation() lokalisieren.


═══════════════════════════════════════════════════════
🟡📅 MITTEL · GEPLANT EINPLANEN  (Allianz-Sichtbarkeit)
═══════════════════════════════════════════════════════

#5 [UX] Discord-Notifications zeigen keine Allianz
   Dateien: functions/notifyAuctionResults.js,
            functions/notifyAuctionOpened.js,
            functions/notifyEventUpload.js,
            functions/testLeaderboardMessage.js
   Problem: Embeds zeigen nur Spielernamen, keine Allianz.
   Folge:   Discord-Channel sieht nicht, aus welcher Allianz die
            Auktions-Gewinner / Leaderboard-Top-30 kommen.
   Fix:     Allianz hinter dem Namen anhängen, z. B.
            "1. PlayerName [AllianceA] — 500 DKP".

#6 [UX] AdminDKP — Player-Dropdown ohne Allianz
   Datei: pages/AdminDKP.jsx, Zeile 95-97
   Problem: Dropdown zeigt nur den Namen, bei Namensgleichheit nicht
            unterscheidbar.
   Fix:     "PlayerName · AllianceA" im Dropdown.

#7 [UX] Charts-Page — keine Allianz-Anzeige/Filter
   Datei: pages/Charts.jsx
   Problem: Player-Buttons ohne Allianz-Info, kein Allianz-Filter.
   Fix:     Allianz-Badge auf Button + Filter-Dropdown.

#8 [UX] Transactions-Page — keine Allianz-Spalte/Filter
   Datei: pages/Transactions.jsx
   Problem: Tabelle zeigt keine Allianz, Filter fehlt.
   Fix:     Spalte + Filter ergänzen.

#9 [UX] Punishments-Page — keine Allianz-Anzeige/Filter
   Datei: pages/Punishments.jsx
   Problem: Strafenliste ohne Allianz-Information.
   Fix:     Allianz-Badge zum Spielernamen hinzufügen.


═══════════════════════════════════════════════════════
🟡📅 MITTEL · GEPLANT EINPLANEN  (I18N-Lücken — schon vor Allianz vorhanden)
═══════════════════════════════════════════════════════

#10 [I18N] AdminDKP komplett englisch hartcodiert
    Strings: "DKP Management", "Manual DKP Adjustment", "Player",
             "Select player…", "Amount", "e.g. 50 or -10", "Type",
             "Earn", "Penalty", "Bonus", "Compensation",
             "King Allocation", "Bid (Deduct from Spent)", "Source",
             "Event Date", "Note", "Optional note",
             "Apply Adjustment".

#11 [I18N] EventUpload komplett englisch hartcodiert
    Strings: "Event DKP Upload", "Event Type", "Stage",
             "Preparation", "War Stage", "Template",
             "Upload Filled Excel", "X unknown players — will be
             skipped", "Create X players & reload",
             "Confirm & Apply", "Top 20", "Outside",
             "Present", "Absent", "Override",
             "Missing required columns: Name, Server Rank", …


═══════════════════════════════════════════════════════
🟢💤 NIEDRIG · OPTIONAL / NICE-TO-HAVE
═══════════════════════════════════════════════════════

#12 [BUG] PlayerDetail — Variable t überschattet
    Datei: pages/PlayerDetail.jsx, Zeile 128-135
    Problem: const t (translation function) wird in
             {transactions.map(t => …)} überschattet.
    Folge:   Aktuell kein sichtbarer Fehler, aber Lesbarkeit leidet.
    Fix:     Map-Variable von t → tx umbenennen.

#13 [API] getPublicLeaderboard liefert keine alliances
    Datei: functions/getPublicLeaderboard.js
    Problem: Function lädt nur players/transactions/eventTypes,
             keine AppSettings.
    Folge:   Aktuell nicht aktiv genutzt — Frontend lädt direkt.
             Kein konkreter Bug, nur API-Inkonsistenz.
    Fix:     AppSettings ergänzen, falls Function später genutzt wird.

#14 [I18N] Discord-Embed-Inhalte hartcodiert englisch
    Komplexer Fall: Discord-Messages sind serverübergreifend,
    Lokalisierung müsste über Server-Config-Sprache laufen.
    Empfehlung: Erst angehen wenn Mehrsprachigkeit der Server
                gewünscht ist.


═══════════════════════════════════════════════════════
GESAMT-ÜBERSICHT
═══════════════════════════════════════════════════════

  Anzahl Befunde:  14
  🔴 Kritisch:      2  (#1, #2)
  🟠 Hoch:          2  (#3, #4)
  🟡 Mittel:        7  (#5–#11)
  🟢 Niedrig:       3  (#12–#14)

  Direkt durch Allianz-Integration verursacht: #1, #3, #5–#9
  Bestand schon vorher (Audit hat es entdeckt): #2, #4, #10–#14


═══════════════════════════════════════════════════════
EMPFOHLENE REIHENFOLGE FÜR UMSETZUNG
═══════════════════════════════════════════════════════

  Phase 1 (sofort):     #1
  Phase 2 (diese Woche): #3, #4
  Phase 3 (nächste Woche): #5, #6, #7, #8, #9
  Phase 4 (Sprint Lokalisierung): #10, #11
  Phase 5 (Backlog):    #2 (eigenes Ticket), #12, #13, #14

Sag mir welche Phase ich starten soll — ich empfehle Phase 1 (#1)
sofort, damit keine weiteren Spieler ohne Allianz angelegt werden.

Gruss,
Base44 Audit
`;

    await base44.integrations.Core.SendEmail({
      to: 'till@kastu.ch',
      subject,
      body,
      from_name: 'DKP-System Audit',
    });

    return Response.json({ ok: true, sentTo: 'till@kastu.ch' });
  } catch (error) {
    console.error('sendAllianceAuditFinal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});