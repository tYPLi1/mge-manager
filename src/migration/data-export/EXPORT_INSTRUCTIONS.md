# Daten-Export aus Base44

Du brauchst die Live-Daten als JSON-Dumps, damit Claude Code sie in Pocketbase importieren kann.

## Methode 1: Über das Base44-Dashboard (empfohlen)

1. Gehe ins Base44-Dashboard deiner App
2. Wechsle zum Reiter **"Data"**
3. Wähle nacheinander jede Entität an:
   - Player → speichern als `players.json`
   - Auction → `auctions.json`
   - Bid → `bids.json`
   - AuctionResult → `auction_results.json`
   - DKPTransaction → `dkp_transactions.json`
   - Penalty → `penalties.json`
   - OffenseResetLog → `offense_reset_log.json`
   - EventType → `event_types.json`
   - PowerHistory → `power_history.json`
   - AppSettings → `app_settings.json`
4. Bei jeder Entität: **Export → JSON**
5. Lege alle Dateien in diesen Ordner (`migration/data-export/`)

## Methode 2: Über mich (im Diskussionsmodus)

Sag mir z.B. „exportiere alle Players als JSON" – ich hole die Daten via Tool und gebe dir den JSON-Inhalt im Chat zum Kopieren.

## Reihenfolge des Imports in Pocketbase

Wegen der Relations **MUSS** in dieser Reihenfolge importiert werden:

1. `event_types.json`
2. `app_settings.json`
3. `players.json`
4. `power_history.json`
5. `dkp_transactions.json`
6. `penalties.json`
7. `offense_reset_log.json`
8. `auctions.json`
9. `bids.json`
10. `auction_results.json`

## ID-Problematik

Base44 nutzt eigene IDs, Pocketbase nutzt 15-stellige IDs. Das Import-Skript baut eine Lookup-Map (`alteID → neueID`) und biegt alle Relations beim Import um. Kein manueller Eingriff nötig.

## Admin-Konten

Die alten `AdminUser`-Records mit HMAC-Hashes sind **nicht portierbar**. Du musst entweder:
- in der Pocketbase Admin-UI (`/_/`) neue Konten anlegen, oder
- via CLI: `pocketbase superuser create email@example.com mypassword