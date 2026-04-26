# notifyEventUpload – Discord nach Event-Upload

## Trigger
**Manuell** vom Admin-Dashboard aufgerufen via `POST /api/custom/notify-event-upload`.

## Request-Body
```json
{
  "eventName": "MEE",
  "eventDate": "2026-04-25",
  "playersUpdated": 42,
  "totalDkpDistributed": 1500,
  "rankings": [
    { "player_name": "Foo", "rank": 1, "dkp": 100 }
  ]
}
```

## Logik
1. Channels mit `channels.events.enabled === true` holen
2. Embed mit Top-5-Rankings, Player-Count, Total-DKP
3. An alle Channels senden

## Embed
```json
{
  "title": "📊 Event Data Uploaded",
  "description": "**{eventName}** - {eventDate}",
  "color": 9148141,
  "fields": [
    { "name": "Players Updated", "value": "{playersUpdated}", "inline": true },
    { "name": "Total DKP Distributed", "value": "{totalDkpDistributed}", "inline": true },
    { "name": "Top Rankings", "value": "1. **Foo** - Rank 1 (+100 DKP)", "inline": false },
    { "name": "🔗 Link", "value": "[View Leaderboard]({APP_BASE_URL}/Leaderboard)", "inline": false }
  ],
  "footer": { "text": "DKP System" }
}
``