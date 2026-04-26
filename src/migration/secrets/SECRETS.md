# Environment-Variablen (Secrets)

In Pocketbase werden Secrets als Environment-Variablen über die systemd-Unit gesetzt – nicht in der Datenbank.

## Pflicht-Variablen

| Name | Zweck | Wert übernehmen aus |
|---|---|---|
| `DISCORD_BOT_TOKEN` | Authorization-Header für alle Discord-API-Calls | Bestehender Base44-Secret (gleicher Wert!) |
| `APP_BASE_URL` | wird in Discord-Embeds als Link verwendet (z.B. `https://dkp.deine-domain.tld`) | Neue URL deiner self-hosted Instanz |

## Entfallen (nicht mehr nötig)

- ❌ `ADMIN_MANAGEMENT_PASSWORD` – ersetzt durch Pocketbase Admin-Auth
- ❌ `BASE44_APP_ID` – nicht mehr relevant
- ❌ `BASE44_SERVICE_ROLE_KEY` etc. – entfällt komplett

## Optional

| Name | Zweck |
|---|---|
| `DISCORD_PUBLIC_KEY` | Nur falls du Discord-Slash-Commands implementieren willst (aktuell nicht im Einsatz) |

## systemd-Unit (Beispiel)

```ini
# /etc/systemd/system/pocketbase.service
[Unit]
Description=Pocketbase
After=network.target

[Service]
Type=simple
User=pocketbase
WorkingDirectory=/opt/pocketbase
Environment="DISCORD_BOT_TOKEN=xxx"
Environment="APP_BASE_URL=https://dkp.example.com"
ExecStart=/opt/pocketbase/pocketbase serve --http=127.0.0.1:8090
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Nach jeder Änderung: `systemctl daemon-reload && systemctl restart pocketbase