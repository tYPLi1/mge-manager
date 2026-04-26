# notifyAuctionOpened – Discord wenn Auction geöffnet wird

## Trigger
`onRecordAfterUpdateRequest('auctions')` – nur wenn `status` auf `open` wechselt (vorher ≠ `open`).

## Logik
1. `data.status !== 'open'` → skip
2. Vorheriger Status auch `open` → skip (Doppelsend verhindern)
3. Hole `app_settings.discord_servers`, alle Channels mit `channels.auction.enabled === true`
4. Wenn `auction.discord_embed` (JSON-string) gesetzt → diesen Embed nehmen, ggf. `discord_extra_text` an `description` anhängen
5. Sonst: Standard-Embed bauen
6. Link-Field hinzufügen falls fehlt: `[View Auction]({APP_BASE_URL}/Auction)`
7. An alle Channels senden

## Standard-Embed
```json
{
  "title": "🔔 New Auction Opened!",
  "description": "{auction.title}",
  "color": 16096322,
  "fields": [
    { "name": "Status", "value": "OPEN", "inline": true },
    { "name": "Closes", "value": "{scheduled_close oder TBD}", "inline": true },
    { "name": "Password", "value": "||{bid_password}||", "inline": false },
    { "name": "🔗 Link", "value": "[View Auction]({APP_BASE_URL}/Auction)", "inline": false }
  ],
  "footer": { "text": "DKP System" }
}
``