# DKP System – Migration zu Pocketbase (Self-Hosted auf Proxmox)

Dieser Ordner enthält **alle Informationen, die ein KI-Coding-Agent (z.B. Claude Code) oder ein Entwickler benötigt**, um das DKP-System Stück für Stück von Base44 auf eine selbst gehostete Pocketbase-Instanz zu migrieren.

## 📁 Inhalt dieses Ordners

| Datei / Ordner | Zweck |
|---|---|
| `CLAUDE_CODE_PROMPT.md` | **Der Master-Prompt** für Claude Code – Schritt für Schritt Anleitung |
| `ARCHITECTURE.md` | Übersicht über die Ziel-Architektur (Pocketbase + React) |
| `entities/SCHEMAS.json` | JSON-Schemata aller 12 Datenbank-Entitäten |
| `pocketbase/collections.json` | Importfertige Pocketbase-Collection-Definition |
| `backend-logic/` | Dokumentation jeder Backend-Funktion (Logik, Inputs, Outputs) |
| `automations/AUTOMATIONS.md` | Übersicht aller Cron-Jobs und Entity-Trigger |
| `frontend/MIGRATION_GUIDE.md` | Wie das Frontend von `base44 SDK` auf `pocketbase SDK` umzustellen ist |
| `data-export/EXPORT_INSTRUCTIONS.md` | Wie du deine Live-Daten aus Base44 exportierst |
| `secrets/SECRETS.md` | Welche Umgebungsvariablen gebraucht werden |

## 🚀 Empfohlene Vorgehensweise

1. **Lies `ARCHITECTURE.md`** – verstehe die Ziel-Architektur
2. **Exportiere die Live-Daten** nach Anleitung in `data-export/EXPORT_INSTRUCTIONS.md`
3. **Gib Claude Code den Prompt** aus `CLAUDE_CODE_PROMPT.md`
4. Claude Code arbeitet sich Phase für Phase durch (Pocketbase-Setup → Backend-Logik → Frontend)
5. Importiere am Ende deine Daten in Pocketbase

## ⚠️ Wichtig

- Dieser Ordner ist **rein dokumentarisch** – er ist nicht Teil der laufenden Base44-App.
- Deine Live-App auf Base44 läuft **unverändert weiter**, bis du die neue Pocketbase-Version bereit hast.
- Die Migration kann **inkrementell** gemacht werden (z.B. zuerst nur lesen via Pocketbase, dann schreiben).