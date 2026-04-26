# syncPlayerDKP – DKP-Aggregation

## Zweck
Stellt sicher, dass `player.total_dkp` und `player.dkp_spent` immer mit der Summe der `dkp_transactions` übereinstimmen.

## Trigger
- `onRecordAfterCreateRequest('dkp_transactions')`
- `onRecordAfterUpdateRequest('dkp_transactions')`
- `onRecordAfterDeleteRequest('dkp_transactions')`

## Logik
Für den betroffenen `player_id`:

```
total_dkp = SUM(amount) WHERE player_id=X AND type != 'bid'
dkp_spent = SUM(amount) WHERE player_id=X AND type == 'bid'
```

Dann `players[player_id]` updaten falls Werte abweichen.

## Optimierung
Statt aller Spieler **nur den einen betroffenen Spieler** neu berechnen.

## Pocketbase-Hook (Skelett)
```js
function recalcPlayer(playerId) {
    const txns = $app.dao().findRecordsByFilter('dkp_transactions', `player_id="${playerId}"`, '', 0, 0)
    let total = 0, spent = 0
    txns.forEach(t => {
        if (t.get('type') === 'bid') spent += t.get('amount') || 0
        else total += t.get('amount') || 0
    })
    const player = $app.dao().findRecordById('players', playerId)
    if (player.get('total_dkp') !== total || player.get('dkp_spent') !== spent) {
        player.set('total_dkp', total)
        player.set('dkp_spent', spent)
        $app.dao().saveRecord(player)
    }
}

onRecordAfterCreateRequest((e) => recalcPlayer(e.record.get('player_id')), 'dkp_transactions')
onRecordAfterUpdateRequest((e) => recalcPlayer(e.record.get('player_id')), 'dkp_transactions')
onRecordAfterDeleteRequest((e) => recalcPlayer(e.record.get('player_id')), 'dkp_transactions')
``