# Master-Prompt für Claude Code

Kopiere den folgenden Block **als ersten Prompt** in Claude Code (in einem leeren Projektordner). Claude Code wird dich dann Phase für Phase durch die Migration führen.

---

## 📋 PROMPT START – kopiere ab hier

Du bist ein Senior-Entwickler. Wir migrieren ein bestehendes „DKP-System" (eine Web-App zur Verwaltung von Dragon Kill Points für eine Gaming-Gilde) von der **Base44-Plattform** auf eine **self-hosted Pocketbase-Instanz**, die auf einem Proxmox-Server läuft.

### Quellmaterial
Im Ordner `migration/` liegen alle nötigen Informationen:
- `ARCHITECTURE.md` – Ziel-Architektur (Pocketbase + React + Caddy auf Proxmox-LXC)
- `entities/SCHEMAS.json` – 12 Datenbank-Entitäten als JSON-Schema
- `pocketbase/collections.json` – Importfertiges Pocketbase-Schema
- `backend-logic/*.md` – Eine Datei pro Backend-Funktion mit Geschäftslogik, Input, Output
- `automations/AUTOMATIONS.md` – Liste aller Cron-Jobs und Entity-Trigger
- `frontend/MIGRATION_GUIDE.md` – Wie das React-Frontend angepasst wird
- `data-export/` – JSON-Dumps der Live-Daten (sobald exportiert)

**Lies diese Dateien gründlich, bevor du anfängst.**

### Tech-Stack (Ziel)
- **Backend:** Pocketbase v0.22+ (Go-Binary, SQLite, JS-Hooks via Goja)
- **Frontend:** React + Vite + Tailwind + shadcn/ui + react-router-dom (bestehend, nur Anpassung)
- **Proxy:** Caddy (automatisches HTTPS)
- **Deployment:** Eine LXC auf Proxmox, alles als systemd-Services

### Vorgehen – Phase für Phase

Arbeite die folgenden Phasen **strikt der Reihe nach** ab. Mach **NACH JEDER PHASE EINEN STOPP** und frag mich nach Bestätigung, bevor du weitermachst.

---

#### PHASE 1: Projekt-Setup & Pocketbase
1. Neuer Ordner `dkp-system/` mit Unterordnern:
   ```
   dkp-system/
   ├── pocketbase/         (Binary + pb_data + pb_hooks + pb_public)
   ├── frontend/           (React-App, neu mit Vite)
   ├── deploy/             (Caddyfile, systemd-Units, Setup-Skripte)
   └── README.md
   ```
2. Lade Pocketbase v0.22+ (Linux x64) herunter und lege es in `pocketbase/`
3. Schreibe ein Setup-Skript `deploy/install.sh`, das auf einer Debian-12-LXC alles einrichtet:
   - Pocketbase als systemd-Service
   - Caddy installieren + Caddyfile generieren
   - Firewall-Hinweise
4. Importiere `migration/pocketbase/collections.json` in Pocketbase (per CLI-Befehl oder Dokumentations-Schritt)
5. Schreibe `dkp-system/README.md` mit kompletter Setup-Anleitung

**STOPP – warte auf mein „weiter".**

---

#### PHASE 2: Backend-Hooks (Geschäftslogik)
Lies `migration/backend-logic/` **komplett**, bevor du anfängst.

Implementiere die Backend-Logik in `pocketbase/pb_hooks/`. Pocketbase nutzt **Goja JS** (kein npm – nur Standard-JS + Pocketbase-API).

Pflicht-Hooks:
1. **`submitBid.pb.js`** – sicheres Bid-Submission (siehe `backend-logic/submitBid.md`)
2. **`syncPlayerDKP.pb.js`** – wird auf `onRecordAfterCreate/Delete` von `dkp_transactions` getriggert
3. **`autoOpenAuctions.pb.js`** + **`autoCloseAuctions.pb.js`** – als `cronAdd("*/5 * * * *", ...)`
4. **`auctionReminder.pb.js`** – Cron `*/5 * * * *`, sendet Discord-Reminder 30 Min vor Auction-Close
5. **`autoResetPenalties.pb.js`** – Cron täglich `0 2 * * *`
6. **`notifyAuctionOpened.pb.js`** – `onRecordAfterUpdate` von `auctions` wenn `status` auf `open` wechselt
7. **`notifyAuctionResults.pb.js`** – `onRecordAfterUpdate` von `auctions` wenn `status` auf `confirmed` wechselt
8. **`notifyEventUpload.pb.js`** – manuell aufrufbar via Custom-Route
9. **`notifyPenalty.pb.js`** – `onRecordAfterCreate` von `dkp_transactions` wenn `type` in `['penalty','compensation']`
10. **`discordSend.pb.js`** – generischer Helper (sendDiscordMessage + sendDiscordEmbed kombiniert)
11. **`getDiscordBotGuilds.pb.js`** – Custom-Route `GET /api/discord/guilds`
12. **`importDkpLog.pb.js`** – Custom-Route `POST /api/import/dkp-log` (Excel-Upload via Frontend-Parsing)

**Auth:** Es wird **kein eigener `AdminUser`-Login** mehr gebraucht – Pocketbase Admin-Auth nutzen.

**Secrets:** Verwende Environment-Variablen, die per systemd-Unit gesetzt werden:
- `DISCORD_BOT_TOKEN`
- `APP_BASE_URL` (z.B. `https://dkp.example.com`)

**STOPP – warte auf mein „weiter".**

---

#### PHASE 3: Frontend-Migration
Lies `migration/frontend/MIGRATION_GUIDE.md`.

1. Kopiere die bestehende React-App (Pages, Components, UI) **unverändert** in `dkp-system/frontend/src/`
2. Ersetze `@/api/base44Client.js` durch `@/api/pb.js`:
   ```js
   import PocketBase from 'pocketbase'
   export const pb = new PocketBase(import.meta.env.VITE_PB_URL || '/')
   ```
3. **Globales Find&Replace** (siehe MIGRATION_GUIDE.md):
   - `base44.entities.X.list()` → `pb.collection('x').getFullList({sort:'-created'})`
   - `base44.entities.X.filter({...})` → `pb.collection('x').getFullList({filter: '...'})`
   - `base44.entities.X.create(data)` → `pb.collection('x').create(data)`
   - `base44.entities.X.update(id, data)` → `pb.collection('x').update(id, data)`
   - `base44.entities.X.delete(id)` → `pb.collection('x').delete(id)`
   - `base44.entities.X.subscribe(cb)` → `pb.collection('x').subscribe('*', cb)`
   - `base44.functions.invoke('name', payload)` → `pb.send('/api/custom/name', {method:'POST', body:payload})`
4. **Login-Page:** ersetze die custom Admin-Login-Logik durch `pb.admins.authWithPassword(email, password)`
5. `LayoutWrapper` und `AuthContext` anpassen → `pb.authStore.isValid` statt eigener Session
6. **Pflicht:** Teste jede Page einzeln (Leaderboard, Auction, Results, Transactions, Punishments, Charts, Rules, alle Admin-Pages)

**STOPP – warte auf mein „weiter".**

---

#### PHASE 4: Daten-Import & Deployment
1. Schreibe ein Skript `dkp-system/deploy/import-data.js`, das die JSON-Dumps aus `migration/data-export/` in Pocketbase importiert (richtige Reihenfolge: `players` → `event_types` → `app_settings` → `dkp_transactions` → `auctions` → `bids` → `auction_results` → `penalties` → `power_history` → `offense_reset_log`)
2. Caddyfile erstellen mit:
   - `/api/*` → Pocketbase :8090
   - `/_/*` → Pocketbase :8090 (Admin-UI)
   - `/*` → React-Build (`pb_public/`)
3. Frontend bauen (`npm run build`) und nach `pocketbase/pb_public/` kopieren
4. systemd-Unit aktivieren, alles starten, Smoke-Test

**STOPP – fertig. Übergabe an mich für finale Tests.**

---

### Wichtige Regeln
- **Kein npm-Code in `pb_hooks/`** – Pocketbase nutzt Goja, kein Node. Standard-`fetch`/`$http` ist verfügbar.
- **Keine Funktionalität verlieren** – jede aktuell laufende Logik muss 1:1 übernommen werden.
- **Inkrementell denken:** wenn etwas nicht direkt funktioniert, kommentiere es klar als `TODO` und mach weiter.
- **Sicherheit:** Bid-Submission (öffentlich, kein Login) muss alle Checks server-side machen (Cooldown, DKP-Balance, Duplikat, Password).
- **Deutsche UI-Texte beibehalten** wo vorhanden.

### Erste Aktion
Lies jetzt **alle Dateien** in `migration/`, fasse für mich in 10 Bullet Points zusammen, was du verstanden hast, und stelle dann **3 Verständnisfragen**, falls etwas unklar ist. Erst danach beginnst du mit Phase 1.

## 📋 PROMPT ENDE

---

## Tipps für die Nutzung

- Lade den **gesamten `migration/`-Ordner** zusammen mit dem Prompt in Claude Code hoch.
- Wenn Claude Code Daten braucht, exportiere sie nach Anleitung (`data-export/EXPORT_INSTRUCTIONS.md`) und lege sie in `migration/data-export/` ab.
- Wenn dir während der Migration etwas einfällt (z.B. „ich will jetzt auch noch Feature X"), warte damit bis die reine Migration fertig ist – sonst wird's chaotisch.