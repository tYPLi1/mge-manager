# Automations – Cron-Jobs & Entity-Trigger

Liste aller aktiven Automations in der Base44-App, die nach Pocketbase migriert werden müssen.

## Scheduled (Cron)

| Name | Schedule | Function | Status (Base44) |
|---|---|---|---|
| Auto-Open/Close Auctions | `*/5 * * * *` | `autoOpenAuctions` | inaktiv (war aktiv) |
| Auction Reminder | `*/5 * * * *` | `auctionReminder` | inaktiv (war aktiv) |
| Auto Reset Penalties | täglich 02:00 | `autoResetPenalties` | **aktiv** |

→ Alle drei sollen in Pocketbase als `cronAdd(...)` in `pb_hooks/main.pb.js` umgesetzt werden.

## Entity-Trigger

| Name | Entity | Events | Function | Status |
|---|---|---|---|---|
| Document Manual DKP Adjustments | `Player` | update | `documentManualDKPAdjustment` | inaktiv |
| Auto-sync Player DKP on Transaction Create | `DKPTransaction` | create | `syncPlayerDKP` | inaktiv |
| Auto-sync Player DKP on Transaction Delete | `DKPTransaction` | delete | `syncPlayerDKP` | **aktiv** |
| Penalty & Compensation Notification | `DKPTransaction` | create | `notifyPenalty` | **aktiv** |
| Auction Results Notification | `Auction` | update | `notifyAuctionResults` | **aktiv** |
| DKP Event Update Notification | `DKPTransaction` | create | `notifyEventUpload` | **aktiv** |
| Auction Started Notification | `Auction` | update | `notifyAuctionOpened` | **aktiv** |

## Migrations-Hinweis

Einige Sync-Automations wurden in Base44 deaktiviert wegen Performance-/Datenproblemen. **In Pocketbase wird das robuster:**

1. **EIN** Hook für `dkp_transactions` (create/update/delete) → `syncPlayerDKP`, der nur den **einen betroffenen Spieler** neu berechnet (nicht alle).
2. **EIN** Hook für `players` (update) → `documentManualDKPAdjustment` mit Endlos-Schleife-Schutz.
3. Die Notification-Hooks bleiben wie sie sind.

## Pocketbase Hooks-Skelett (`pb_hooks/main.pb.js`)

```js
// === CRONS ===
cronAdd('autoOpenCloseAuctions', '*/5 * * * *', () => { /* ... */ })
cronAdd('auctionReminder', '*/5 * * * *', () => { /* ... */ })
cronAdd('autoResetPenalties', '0 2 * * *', () => { /* ... */ })

// === DKP TRANSACTIONS ===
onRecordAfterCreateRequest((e) => {
    syncPlayerDKP(e.record.get('player_id'))
    notifyPenalty(e.record)         // nur wenn type=penalty/compensation
}, 'dkp_transactions')

onRecordAfterUpdateRequest((e) => syncPlayerDKP(e.record.get('player_id')), 'dkp_transactions')
onRecordAfterDeleteRequest((e) => syncPlayerDKP(e.record.get('player_id')), 'dkp_transactions')

// === AUCTIONS ===
onRecordAfterUpdateRequest((e) => {
    const newStatus = e.record.get('status')
    if (newStatus === 'open') notifyAuctionOpened(e.record)
    if (newStatus === 'confirmed') notifyAuctionResults(e.record)
}, 'auctions')

// === PLAYERS ===
onRecordAfterUpdateRequest((e) => documentManualDKPAdjustment(e), 'players')
``