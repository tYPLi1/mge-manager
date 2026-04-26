# Ziel-Architektur

## Aktuell (Base44)
```
React Frontend ──► Base44 SDK ──► Base44 Cloud (Datenbank + Functions)
                                       │
                                       └──► Discord API
```

## Ziel (Self-Hosted auf Proxmox)
```
React Frontend ──► Pocketbase SDK ──► Pocketbase (Go Binary, SQLite)
                                            │
                                            └──► Discord API
                                            └──► Cron-Hooks (intern)
```

## Komponenten

### 1. Pocketbase (Backend)
- **Was:** Single-File-Binary, Go-Server, SQLite-Datenbank
- **Wo:** Eine LXC oder VM auf Proxmox (1 vCPU, 512 MB RAM reichen)
- **Bietet:**
  - REST + Realtime-API für alle Entitäten
  - Admin-UI auf Port 8090
  - Auth (eingebaut, ersetzt `AdminUser` + manuelle Hash-Logik)
  - File Storage
  - JS-Hooks (`pb_hooks/`) für Custom Backend-Logik (ersetzt Deno Functions)
  - Cron-Hooks (ersetzt Scheduled Automations)

### 2. React Frontend
- **Bleibt fast identisch** – nur der SDK-Import und die Auth-Logik werden ersetzt.
- Build mit Vite, Deployment als statische Dateien hinter einem Reverse Proxy (Caddy / Nginx).

### 3. Reverse Proxy (empfohlen)
- **Caddy** auf der gleichen LXC – automatisches HTTPS via Let's Encrypt
- Routet:
  - `https://dkp.deine-domain.tld/` → React-Frontend (statische Dateien)
  - `https://dkp.deine-domain.tld/api/*` → Pocketbase (Port 8090)
  - `https://dkp.deine-domain.tld/_/` → Pocketbase Admin-UI

## Mapping: Base44 → Pocketbase

| Base44-Konzept | Pocketbase-Äquivalent |
|---|---|
| `entities/*.json` (JSON Schema) | Collections (Schema in Admin-UI oder via `collections.json`) |
| `base44.entities.X.list/filter/get/create/update/delete` | `pb.collection('x').getList/getOne/create/update/delete` |
| `base44.entities.X.subscribe(callback)` | `pb.collection('x').subscribe('*', callback)` |
| `functions/*.js` (Deno) | `pb_hooks/*.pb.js` (Goja JS) ODER eigener kleiner Node-Service |
| Scheduled Automations | `cronAdd()` in `pb_hooks/main.pb.js` |
| Entity Automations (on create/update/delete) | `onRecordAfterCreateRequest()` in `pb_hooks/main.pb.js` |
| `AdminUser`-Entity + custom HMAC-Login | Pocketbase eingebaute `_admins` Collection (Email + Passwort) |
| Base44 Secrets (`Deno.env`) | Environment-Variablen oder Pocketbase Settings |
| RLS (Row-Level-Security) | Pocketbase Collection Rules (List/View/Create/Update/Delete Rules) |

## Wichtige Vereinfachungen durch Pocketbase

1. **Kein eigenes Login-System nötig** – Pocketbase hat Admin-Auth eingebaut. Die ganze Logik in `adminLogin.js`, `manageAdminUsers.js`, `verifySessionToken.js`, `AdminUser`-Entity entfällt.
2. **Realtime ohne Custom Code** – `pb.collection('x').subscribe()` funktioniert out-of-the-box.
3. **Datei-Uploads eingebaut** – kein separater File-Storage-Anbieter.
4. **Backups trivial** – einfach die SQLite-Datei kopieren.

## Empfehlung für Proxmox

```
Proxmox Host
└── LXC Container "dkp" (Debian 12, unprivileged)
    ├── /opt/pocketbase/pocketbase   (Binary)
    ├── /opt/pocketbase/pb_data/     (DB + Files)
    ├── /opt/pocketbase/pb_hooks/    (Custom Logic)
    ├── /opt/pocketbase/pb_public/   (React Build)
    └── /etc/caddy/Caddyfile         (Reverse Proxy)
```

Pocketbase als systemd-Service starten – fertig.