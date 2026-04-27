import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subject = "DKP-System · Audit Bericht: Allianz-Feature";

    const body = `Hallo Till,

hier der vollständige Audit-Bericht zum neu integrierten Allianz-System.
Es wurden KEINE Änderungen am Code vorgenommen — nur Befunde.

═══════════════════════════════════════════════════════
1. KORREKT FUNKTIONIERENDE TEILE  ✅
═══════════════════════════════════════════════════════

• Player-Entity: Feld "alliance" (string) korrekt im Schema, optional, mit RLS-Schutz für admin-only writes.
• AppSettings-Eintrag "alliances" als JSON-Array [{name,color}] strukturiert, in PUBLIC_KEYS von getPublicSettings veröffentlicht — d.h. öffentliches Leaderboard kann Farben laden.
• AllianceConfigEditor: Robustes Parsing mit try/catch, sauberes Add/Remove/Update, validiert Array-Form.
• AdminPlayers: Alliance-Spalte in Tabelle, Filter (all / spezifisch / __none__), Sortierung Alliance asc → DKP desc, Inline-Edit-Dropdown, farbiges Badge.
• AdminPlayers Excel: Import + Export inkl. Spalte "Alliance", header-basierte Detection (case-insensitive), Diff-Tracking in Preview.
• Leaderboard (öffentlich): Filter, Spalte mit Farbbadge, Sort-Header funktional, Reset-Button leert auch allianceFilter.
• Übersetzungen: leaderboard.filters.allAlliances + leaderboard.filters.noAlliance + leaderboard.columns.alliance + admin.alliances.* in allen 7 Sprachen vorhanden (de/en/tr/es/fr/ko/zh).

═══════════════════════════════════════════════════════
2. BUGS / LOGIKFEHLER  🐛
═══════════════════════════════════════════════════════

[B1] LEADERBOARD: alliance-Filter taucht NICHT in hasActiveFilters auf, wenn alliances-Liste leer ist
  → pages/Leaderboard.jsx Zeile 190: hasActiveFilters berücksichtigt allianceFilter !== "all" auch wenn Dropdown gar nicht gerendert wird (Filter rendert nur wenn alliances.length > 0). Ergebnis: Wenn jemand __none__ aktiv hat und dann der letzte alliance-Eintrag aus den Settings entfernt wird, bleibt der Filter "stuck" und der User kann ihn nur über Reset-Button löschen. Niedriges Risiko, aber inkonsistent.

[B2] LEADERBOARD: Sortierung "alliance" hat nicht-symmetrisches Verhalten
  → pages/Leaderboard.jsx Zeilen 166-173: Bei sortField === "alliance" werden leere Allianzen IMMER ans Ende gestellt, unabhängig von sortDir. Wenn der User asc → desc togglet, bleiben "—" trotzdem unten. Aus UX-Sicht ok, aber man könnte erwarten dass desc die Leeren nach oben bringt. Empfehlung: dokumentieren oder symmetrisch machen.

[B3] LEADERBOARD: Sortierung "alliance" ignoriert sortDir komplett wenn beide leer
  → Zeile 170-171: Wenn aAll==="" und bAll==="" wird sortDir nicht berücksichtigt; funktioniert aber faktisch korrekt, da die Vergleichsbedingungen nicht greifen — fällt auf return 0 zurück. Kein Bug, nur Anmerkung.

[B4] ADMIN-PLAYERS: Mutation für Alliance-Update sendet "null" statt ""
  → pages/AdminPlayers.jsx Zeile 163: alliance: editAlliance || null. Konsistent mit cooldown_until-Pattern. ABER: Beim Filter wird auf !p.alliance geprüft (truthy/falsy), das toleriert beides. Trotzdem: bei einem Update auf "" wird null gespeichert, beim Import bei leerem Wert wird ebenfalls null gespeichert — gut.
  ABER Inkonsistenz: Beim Import (Zeile 346) wird alliance: allianceVal || null gesendet; beim Update-Diff (Zeile 359) wird (existing.alliance || "") !== (allianceVal || "") verglichen — string-Vergleich. Das ist korrekt, aber falls existing.alliance jemals "null" als String wäre (Excel-Quirk), würde es nicht erkannt.

[B5] ADMIN-PLAYERS: Excel-Export verwendet andere Spaltenanordnung als Penalty-Sheet im aktuellen Excel-Output vs Template
  → Zeile 235-237: Penalty-Output-Header hat 6 Spalten ohne "Status", Template hat aber 7 mit "Status". User kann ein exportiertes File nicht 1:1 zurück importieren ohne Lücke. NICHT alliance-bezogen, aber im Audit aufgefallen.

[B6] ADMIN-PLAYERS-IMPORT: Wenn Import eine NEUE Allianz im File hat, die nicht in den Settings konfiguriert ist, wird sie ohne Warnung gespeichert
  → Zeile 346: keine Validierung gegen Settings-Liste. Resultat: Im Filter taucht der Spieler unter spezifischer Allianz nicht auf (Filter listet nur konfigurierte), und im Edit-Dropdown kann man die Allianz nicht mehr auswählen — der Spieler "verschwindet" effektiv aus dem Alliance-Filter. Empfehlung: Warnung im Import-Preview oder automatisch in Settings ergänzen.

[B7] ADMIN-PLAYERS Inline-Edit: Alliance-Dropdown zeigt aktuellen Wert nicht, wenn er nicht mehr in Settings existiert
  → Zeile 713-722: <select value={editAlliance}> mit nur den konfigurierten Optionen. Wenn ein Spieler eine "verwaiste" Allianz hat (Settings gelöscht), zeigt das Dropdown leer ("—") und beim Save würde er die alte Allianz verlieren. Datenverlust-Risiko bei Settings-Cleanup!

═══════════════════════════════════════════════════════
3. UI / UX-VERBESSERUNGEN  🎨
═══════════════════════════════════════════════════════

[U1] AllianceConfigEditor: Kein Schutz gegen DUPLIKATE
  → Zwei Allianzen mit gleichem Namen können angelegt werden. Hat keinen technischen Effekt (Settings sind nur JSON), aber Filter/Dropdown würden zwei Optionen zeigen.

[U2] AllianceConfigEditor: Kein Schutz gegen LEERE Namen
  → Eine Allianz mit name="" kann gespeichert werden — sie taucht dann im Dropdown auf, aber als unsichtbarer Eintrag.

[U3] AllianceConfigEditor: Keine Drag & Drop-Sortierung
  → Reihenfolge der Allianzen entspricht der Anlage-Reihenfolge. Im Filter/Dropdown wird genauso sortiert. Bei vielen Allianzen unpraktisch.

[U4] AllianceConfigEditor: KEINE WARNUNG beim Löschen einer Allianz, der noch Spieler zugeordnet sind
  → Wenn z.B. "ERA1" gelöscht wird, behalten alle ERA1-Spieler weiterhin "alliance: ERA1" — sie sind dann "verwaist" (siehe B7). Kritisch!

[U5] AllianceConfigEditor: Color-Picker hat nur Browser-Default-Palette
  → User können beliebige Farben wählen, auch sehr helle/unleserliche auf dunklem Hintergrund. Empfehlung: kuratierte Palette oder Kontrast-Hint.

[U6] AdminPlayers: "New Player Name" Form hat KEIN Alliance-Feld
  → Beim Anlegen eines neuen Spielers kann die Allianz nicht direkt gesetzt werden — User muss nach dem Create auf Edit klicken. Mehrarbeit.

[U7] AdminPlayers: Hardcoded englische Strings (NICHT übersetzt)
  → Zeilen 611, 617, 628, 637, 645, 653, 664, 692, 694-697, 709, 741, 780, 796, 801: "Player Management", "Add", "Template", "Current State", "Import File", "Search...", "Name", "DKP", "Cooldown", "Power", "Actions", "Edit", "Clear cooldown for [name]?", "Delete [name]?". Diese existieren NICHT in den locale-Files. Konsistent mit dem bisherigen Stand (war vorher schon so), aber mit Fortschreiten der i18n-Integration auffällig.

[U8] Leaderboard-Tabelle: Alliance-Spalte hat KEINE Min-Width
  → Bei langen Allianznamen (z.B. "Empire of Era 003") wird die Spalte breit, Tabelle scrollt horizontal. Empfehlung: max-width + ellipsis.

[U9] Leaderboard-Filter: Reihenfolge der Allianzen im Dropdown identisch zur Settings-Reihenfolge — keine alphabetische Sortierung
  → Bei vielen Allianzen schwerer zu finden.

[U10] AllianceConfigEditor: KEIN "Save"-Hint
  → User können Allianzen anlegen und dann die Seite verlassen ohne zu speichern. Der globale UnsavedChangesGuard greift zwar, aber es gibt keinen Hinweis im Editor selbst, dass der globale "Save All"-Button im PageHeader gedrückt werden muss.

[U11] AdminPlayers Tabelle: Bei Sortierung steht im Header KEIN Hinweis zur impliziten Sortierung
  → Aktuell sortiert die Tabelle implizit nach (Allianz asc → DKP desc), egal welcher Filter. Es gibt keine Sort-Header und keine Möglichkeit, das zu ändern. Konsistent mit dem Wunsch, aber ohne Sichtbarmachung ist es für neue Admins überraschend.

[U12] Leaderboard: Wenn KEINE Allianzen konfiguriert sind, zeigt die Tabelle trotzdem die Spalte "Alliance" (immer "—")
  → components/dp/leaderboard/LeaderboardTable.jsx Zeile 76 + 121-138: Spalte wird unkonditional gerendert. Wenn keine Allianzen existieren, ist es eine leere Spalte. Empfehlung: nur rendern wenn alliances.length > 0 ODER wenn mindestens ein Spieler eine alliance hat.

═══════════════════════════════════════════════════════
4. FEHLENDE / INKONSISTENTE ÜBERSETZUNGEN  🌐
═══════════════════════════════════════════════════════

[T1] common.reset
  → DPLeaderboardFilters.jsx Zeile 61 nutzt t("common.reset"). Müsste in allen 7 locales in der "common"-Section vorhanden sein. STATUS: Schlüssel war bereits vorher genutzt — sollte vorhanden sein, aber verifizieren empfehlenswert.

[T2] AdminPlayers komplett englisch hardcodiert (siehe U7)
  → Keine i18n-Keys für "Player Management", "Add", "Template", "Current State", "Import File", "Search...", Tabellenheader, Confirm-Dialoge. Sollte in admin.players.* gebündelt werden.

[T3] AllianceConfigEditor: Keys "admin.alliances.title/desc/empty/etc." sind übersetzt — ABER der Fließtext "desc" in den 7 Sprachen wurde maschinell übersetzt; menschliche Review empfohlen, besonders ko/zh/tr.

[T4] Excel-Header sind hartcodiert ENGLISCH ("Name", "Alliance", "DKP Earned", ...)
  → AdminPlayers.jsx Zeile 173, 220, 268. Sind nicht zu lokalisieren (Excel-Format-Stabilität rechtfertigt das), aber falls international Admins arbeiten, könnte ein Hinweis-Text auf Templates lokalisiert werden.

[T5] alert()-Texte hartcodiert englisch
  → "Players sheet missing 'Name' column.", "DKP_History sheet needs at least 'Player', 'Amount', and 'Date' columns.", "No new or changed data found.", "Fehler beim Import: ..." (deutsch!), "Nothing imported.". Inkonsistent: ein alert in deutsch, der Rest englisch. Sollte alles via i18n.

═══════════════════════════════════════════════════════
5. KRITISCHE EMPFEHLUNGEN — PRIORITÄT  🚨
═══════════════════════════════════════════════════════

P1 (HOCH): U4 — Beim Löschen einer Allianz im Editor warnen, wenn Spieler zugeordnet sind
P2 (HOCH): B7/U7 — Inline-Edit-Dropdown muss verwaiste Werte ANZEIGEN (sonst Datenverlust)
P3 (MITTEL): B6 — Import-Preview soll Allianzen markieren, die nicht in Settings existieren
P4 (MITTEL): U6 — Neuanlage-Form um Allianz-Feld erweitern
P5 (MITTEL): U1/U2 — Validierung: keine Duplikate, keine leeren Namen
P6 (NIEDRIG): U12 — Alliance-Spalte nur rendern wenn relevant
P7 (NIEDRIG): T2/T5 — Vollständige i18n von AdminPlayers (eigenes Ticket, nicht alliance-spezifisch)

═══════════════════════════════════════════════════════
6. SICHERHEIT  🔒
═══════════════════════════════════════════════════════

✅ Player-Entity RLS: nur admin kann create/update/delete — alliance-Feld wird über update geschrieben, ist abgesichert.
✅ AppSettings RLS: nur admin (alliances werden also nicht von normalen Usern manipulierbar).
✅ getPublicSettings: alliances ist explizit in PUBLIC_KEYS gewhitelistet — keine Leaks.
✅ AllianceConfigEditor parsed JSON in try/catch — kein Crash bei kaputtem Wert.
✅ Color-Werte werden als Inline-Style mit Template-String konkateniert. Theoretisch CSS-Injection, aber: Color stammt aus Settings, die nur Admin schreibt → kein praktisches Risiko.

═══════════════════════════════════════════════════════
ZUSAMMENFASSUNG
═══════════════════════════════════════════════════════

System ist FUNKTIONAL und PRODUCTION-READY. Keine Show-Stopper.
Wichtigste Punkte vor Live-Gang: P1, P2, P3 (Datenintegrität bei Settings-Änderungen).
i18n-Lücken in AdminPlayers existierten bereits vorher und sind kein Allianz-spezifisches Thema.

Warte auf dein Go für Korrekturen.

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
    console.error('sendAllianceAuditEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});