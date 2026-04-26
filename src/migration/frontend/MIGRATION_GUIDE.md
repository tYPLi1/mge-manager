# Frontend-Migration: base44 SDK → Pocketbase SDK

Das React-Frontend kann fast unverändert übernommen werden. Es ändern sich nur:
1. Der SDK-Import & Client-Initialisierung
2. Die Methodennamen für CRUD/Subscribe
3. Die Auth-Logik

## 1. SDK-Setup

### Alt (`src/api/base44Client.js`)
```js
import { createClient } from '@base44/sdk'
export const base44 = createClient({ appId: 'xxx' })
```

### Neu (`src/api/pb.js`)
```js
import PocketBase from 'pocketbase'
export const pb = new PocketBase(import.meta.env.VITE_PB_URL || '/')
pb.autoCancellation(false) // für Realtime + parallele Calls
```

`.env`:
```
VITE_PB_URL=http://localhost:8090
```
Im Production-Build (hinter Caddy) reicht `/`.

## 2. Mapping-Tabelle

| Base44 | Pocketbase |
|---|---|
| `base44.entities.Player.list('-total_dkp', 500)` | `pb.collection('players').getFullList({ sort: '-total_dkp' })` |
| `base44.entities.Player.list()` | `pb.collection('players').getFullList()` |
| `base44.entities.Player.filter({ name: 'Foo' })` | `pb.collection('players').getFullList({ filter: 'name="Foo"' })` |
| `base44.entities.Player.filter({...}, '-created_date', 10)` | `pb.collection('players').getList(1, 10, { filter:'...', sort:'-created' })` |
| `base44.entities.Player.get(id)` | `pb.collection('players').getOne(id)` |
| `base44.entities.Player.create(data)` | `pb.collection('players').create(data)` |
| `base44.entities.Player.bulkCreate([...])` | Loop: `for (const d of data) await pb.collection('players').create(d)` |
| `base44.entities.Player.update(id, data)` | `pb.collection('players').update(id, data)` |
| `base44.entities.Player.delete(id)` | `pb.collection('players').delete(id)` |
| `base44.entities.Player.subscribe(cb)` | `pb.collection('players').subscribe('*', cb)` |
| `base44.functions.invoke('submitBid', payload)` | `pb.send('/api/custom/submit-bid', { method:'POST', body:payload })` |

### Wichtige Unterschiede
- **created_date → created**, **updated_date → updated** (Pocketbase Standard).
- **Filter-Syntax:** Pocketbase nutzt String-DSL: `'name = "Foo" && total_dkp > 100'`. Variablen: `pb.filter('name = {:name}', { name: 'Foo' })`.
- **Realtime-Event-Format:** `{ action: 'create'|'update'|'delete', record }` statt `{ type, data, id }` – Adapter bauen.
- **Kein bulkCreate** – einfacher Loop reicht.

## 3. Collection-Name-Konventionen

| Base44 | Pocketbase |
|---|---|
| `Player` | `players` |
| `Auction` | `auctions` |
| `Bid` | `bids` |
| `AuctionResult` | `auction_results` |
| `DKPTransaction` | `dkp_transactions` |
| `Penalty` | `penalties` |
| `OffenseResetLog` | `offense_reset_log` |
| `EventType` | `event_types` |
| `PowerHistory` | `power_history` |
| `AppSettings` | `app_settings` |
| `AdminUser` | (entfällt – Pocketbase `_admins`) |

## 4. Auth-Logik

### Login (`pages/AdminLogin.jsx`)
**Alt:** Custom `adminLogin` Backend-Function mit HMAC-Token-Storage in `localStorage.adminSession`.

**Neu:**
```js
import { pb } from '@/api/pb'

async function handleLogin(email, password) {
  await pb.admins.authWithPassword(email, password)
  navigate('/AdminDashboard')
}
```

### Auth-Check (`AuthContext.jsx`, `AdminSessionGuard.jsx`)
```js
const isAdmin = pb.authStore.isValid

useEffect(() => {
  return pb.authStore.onChange((token, model) => {
    setAuth({ token, model })
  })
}, [])
```

### Logout
```js
pb.authStore.clear()
```

### Auth-Persistenz
Pocketbase speichert Auth automatisch in `localStorage` (Key `pocketbase_auth`). Kein eigenes Session-Mgmt.

## 5. Anpassungen pro Page

| Page | Änderungsumfang |
|---|---|
| `Leaderboard.js` | Find&Replace SDK-Calls + collection-Namen |
| `Auction.js` | dito + `submitBid` → `pb.send('/api/custom/submit-bid', ...)` |
| `Results.js` | nur SDK-Replace |
| `Transactions.js` | nur SDK-Replace |
| `Punishments.js` | nur SDK-Replace |
| `Charts.js` | nur SDK-Replace |
| `Rules.js` | nur Settings-Read |
| `Admin*.js` | SDK-Replace + Auth via `pb.authStore` |
| `AdminLogin.js` | komplett neu (siehe oben) |
| `AdminUserManagement.js` | **entfällt** – Pocketbase Admin-UI macht das auf `/_/`  |

## 6. Subscribe-Adapter

```js
// src/api/subscribe.js
import { pb } from './pb'

export function subscribe(collection, callback) {
  return pb.collection(collection).subscribe('*', (e) => {
    callback({
      type: e.action,
      data: e.record,
      id: e.record.id
    })
  })
}
```

Verwendung:
```js
useEffect(() => {
  const unsub = subscribe('players', (event) => {
    if (event.type === 'create') setPlayers(p => [...p, event.data])
  })
  return () => unsub.then(fn => fn())
}, [])
```

## 7. Public Pages ohne Login

In Pocketbase werden Read-Rules direkt auf die Collection gesetzt (siehe `pocketbase/collections.json`):
- `players`: `listRule: ""` (jeder darf lesen)
- `app_settings`: nur bestimmte Keys public
- `auctions`: nur `status != 'draft'` für Public

→ Die alten `getPublicXxx`-Functions fallen weg.