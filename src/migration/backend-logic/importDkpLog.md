# importDkpLog – Excel-Import für DKP-Log

## Empfehlung: Frontend-Parsing

Pocketbase Goja unterstützt **kein npm**. Lösung: XLSX im Frontend mit `xlsx@0.18.5` parsen, fertige JSON an Pocketbase senden.

## Endpoint
`POST /api/custom/import/dkp-log` (admin-only)

## Request (NEU vereinfacht)
```json
{
  "transactions": [
    {
      "player_name": "Foo",
      "amount": 50,
      "type": "earn",
      "source": "MEE",
      "source_stage": "prep",
      "event_date": "2026-04-25",
      "note": "..."
    }
  ],
  "dry_run": false
}
```

## Excel-Struktur (vom Frontend zu parsen)
```
Spalte A: Name (Spielername)
Spalte B: Prep DKP    → type='earn', source_stage='prep'
Spalte C: War DKP     → type='earn', source_stage='war'
Spalte D: Spend DKP   → amount = -|spend|, type='bid', source_stage=''
Spalte E: Source      (z.B. 'MEE')
Spalte F: Note
Spalte G: Date        (Excel-Datum oder String)
```

## Excel-Datum-Conversion
```js
const excelEpoch = new Date(1899, 11, 30)
const d = new Date(excelEpoch.getTime() + rawDate * 86400000)
```

## Backend-Logik
1. Auth-Check
2. Für jede Transaction: Player by Name finden → `player_id` setzen
3. Bei No-Match: in `unmatched_names` aufnehmen
4. Wenn `dry_run` → nur Stats zurückgeben
5. Sonst: in Batches von 100 erstellen

## Response
```json
{
  "success": true,
  "total_created": 250,
  "matched_players": 240,
  "unmatched_players": 10,
  "unmatched_names": ["Spieler1"]
}
``