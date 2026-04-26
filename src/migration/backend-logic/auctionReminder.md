# auctionReminder – Discord-Reminder 30 Min vor Auction-Close

## Zweck
Sendet Discord-Reminder in den `reminder`-Channel, wenn eine offene Auktion in 0–35 Min schliesst. Pro Auktion **nur einmal** (`reminder_sent` Flag).

## Cron
`*/5 * * * *`

## Logik
```
for auction in auctions where status='open':
    if auction.reminder_sent: continue
    if !auction.scheduled_close: continue
    diffMin = (closeAt - now) / 60000
    if diffMin > 0 && diffMin <= 35:
        - hole alle aktiven Bids (is_deleted=false)
        - baue Discord-Embed
        - sende an alle Channels mit channels.reminder.enabled
        - markiere reminder_sent = true
```

## Discord-Embed
```json
{
  "title": "⏰ Auction Ending Soon!",
  "description": "**{title}** closes in ~{minutesLeft} minutes!",
  "color": 16738101,
  "fields": [
    { "name": "Closes At", "value": "{closeTimeStr} UTC", "inline": true },
    { "name": "Active Bids", "value": "{count}", "inline": true },
    { "name": "🔒", "value": "Password required", "inline": true },
    { "name": "🔗 Link", "value": "[View Auction]({APP_BASE_URL}/Auction)", "inline": false }
  ],
  "footer": { "text": "DKP System — Last chance to bid!" }
}
``