# Backend-Funktionen – Übersicht

Hier sind alle Base44-Backend-Funktionen aufgelistet mit ihrer Rolle nach der Migration zu Pocketbase.

| # | Datei (alt) | Pocketbase-Pendant | Status nach Migration | Detail-Datei |
|---|---|---|---|---|
| 1 | `submitBid.js` | `pb_hooks/submitBid.pb.js` (Custom Route) | **MUSS portiert werden** | `submitBid.md` |
| 2 | `syncPlayerDKP.js` | `pb_hooks/syncPlayerDKP.pb.js` (Hook auf `dkp_transactions`) | **MUSS portiert werden** | `syncPlayerDKP.md` |
| 3 | `autoOpenAuctions.js` | `pb_hooks/main.pb.js` → `cronAdd("*/5 * * * *", ...)` | **MUSS portiert werden** | `autoOpenAuctions.md` |
| 4 | `auctionReminder.js` | `pb_hooks/main.pb.js` → `cronAdd("*/5 * * * *", ...)` | **MUSS portiert werden** | `auctionReminder.md` |
| 5 | `autoResetPenalties.js` | `pb_hooks/main.pb.js` → `cronAdd("0 2 * * *", ...)` | **MUSS portiert werden** | `autoResetPenalties.md` |
| 6 | `notifyAuctionOpened.js` | `onRecordAfterUpdateRequest('auctions')` | **MUSS portiert werden** | `notifyAuctionOpened.md` |
| 7 | `notifyAuctionResults.js` | `onRecordAfterUpdateRequest('auctions')` | **MUSS portiert werden** | `notifyAuctionResults.md` |
| 8 | `notifyEventUpload.js` | Custom Route, manuell aufgerufen | **MUSS portiert werden** | `notifyEventUpload.md` |
| 9 | `notifyPenalty.js` | `onRecordAfterCreateRequest('dkp_transactions')` | **MUSS portiert werden** | `notifyPenalty.md` |
| 10 | `sendDiscordEmbed.js` | `pb_hooks/discordSend.pb.js` (Helper) | **MUSS portiert werden** | `discordSend.md` |
| 11 | `sendDiscordMessage.js` | `pb_hooks/discordSend.pb.js` (Helper) | **MUSS portiert werden** | `discordSend.md` |
| 12 | `getDiscordBotGuilds.js` | Custom Route `GET /api/discord/guilds` | **MUSS portiert werden** | `getDiscordBotGuilds.md` |
| 13 | `testDiscordWebhook.js` | Custom Route, ruft `discordSend` auf | **Optional** | `discordSend.md` |
| 14 | `testLeaderboardMessage.js` | Custom Route, ruft `discordSend` auf | **Optional** | `discordSend.md` |
| 15 | `importDkpLog.js` | Custom Route `POST /api/import/dkp-log` (XLSX im Frontend parsen!) | **MUSS portiert werden** | `importDkpLog.md` |
| 16 | `documentManualDKPAdjustment.js` | `onRecordAfterUpdateRequest('players')` | **MUSS portiert werden** | `documentManualDKPAdjustment.md` |
| 17 | `getPublicAuctions.js` | **ENTFÄLLT** – direkt via `pb.collection('auctions').getList()` mit Public-Read-Rule | – | – |
| 18 | `getPublicLeaderboard.js` | **ENTFÄLLT** – direkt via `pb.collection('players').getList()` | – | – |
| 19 | `getPublicSettings.js` | **ENTFÄLLT** – direkt via `pb.collection('app_settings').getList()` mit Filter | – | – |
| 20 | `adminLogin.js` | **ENTFÄLLT** – Pocketbase Admin-Login `pb.admins.authWithPassword()` | – | – |
| 21 | `manageAdminUsers.js` | **ENTFÄLLT** – Pocketbase Admin-UI verwaltet Admins | – | – |
| 22 | `verifySessionToken.js` | **ENTFÄLLT** – Pocketbase macht Session-Mgmt | – | – |
| 23 | `adminEntityProxy.js` | **ENTFÄLLT** – Frontend spricht direkt mit Pocketbase | – | – |
| 24 | `discordSetChannel.js` | **OPTIONAL** – nur nötig wenn Slash-Commands gewünscht | – | – |

**Resultat:** Statt **24 Backend-Funktionen** brauchen wir nach der Migration nur noch **~12 Hooks** in Pocketbase. Die ganze Auth-Infrastruktur entfällt.