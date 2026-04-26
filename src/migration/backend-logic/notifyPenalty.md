# notifyPenalty – Discord bei Penalty/Compensation

## Trigger
`onRecordAfterCreateRequest('dkp_transactions')` – nur wenn `type` in `['penalty','compensation']`.

## Logik
1. Wenn type ≠ penalty/compensation → skip
2. Channels mit `channels.penalties.enabled === true` holen
3. Embed bauen
4. Senden

## Embed
```json
{
  "title": "💰 DKP Compensation",
  "description": "**{player_name}**",
  "color": 65280,
  "fields": [
    { "name": "Amount", "value": "+50 DKP", "inline": true },
    { "name": "Reason", "value": "{source}", "inline": true },
    { "name": "Details", "value": "{note}", "inline": false },
    { "name": "🔗 Link", "value": "[View Leaderboard]({APP_BASE_URL}/Leaderboard)", "inline": false }
  ],
  "timestamp": "{ISO now}"
}
```

Bei `penalty`: Titel `⚠️ DKP Penalty`, Color `16711680` (rot).