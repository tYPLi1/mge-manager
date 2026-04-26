# documentManualDKPAdjustment – Audit-Trail für manuelle DKP-Änderungen

## Trigger
`onRecordAfterUpdateRequest('players')` – wenn `total_dkp` geändert wurde.

## Zweck
Wenn Admin direkt `player.total_dkp` ändert (statt via Transaction), wird automatisch eine Compensation-Transaction angelegt.

## Logik
```
oldDKP = old_data.total_dkp || 0
newDKP = data.total_dkp || 0
diff = newDKP - oldDKP

if diff !== 0:
    create DKPTransaction({
        player_id: data.id,
        player_name: data.name,
        amount: diff,
        type: 'compensation',
        source: 'MANUAL_ADJUSTMENT',
        event_date: today (YYYY-MM-DD),
        note: `Manual adjustment: ${oldDKP} → ${newDKP}`
    })
```

## ⚠️ Endlos-Schleife verhindern
Die neue Transaction triggert wieder `syncPlayerDKP` → updated Player → triggert wieder diesen Hook.

**Lösung:** Vergleichen, ob die Änderung von Sync stammt:
- Wenn `newDKP === SUM(transactions WHERE type≠'bid')` → wahrscheinlich von Sync, skip.
- Oder: Flag im Player setzen während Sync läuft.

In Pocketbase ggf. `e.dao` vs `$app.dao()` nutzen, um Hooks zu umgehen.