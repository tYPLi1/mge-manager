# discordSend – Discord-Send-Helper

Konsolidiert die alten Funktionen `sendDiscordMessage.js` und `sendDiscordEmbed.js`.

## Helper-Funktionen (in `pb_hooks/discordSend.pb.js`)

### `sendDiscordEmbed(channelId, embed)`
```js
function sendDiscordEmbed(channelId, embed) {
    sanitizeEmbed(embed)
    const res = $http.send({
        url: `https://discord.com/api/v10/channels/${channelId}/messages`,
        method: 'POST',
        headers: {
            'Authorization': `Bot ${$os.getenv('DISCORD_BOT_TOKEN')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ embeds: [embed] }),
        timeout: 10
    })
    return res.statusCode >= 200 && res.statusCode < 300
}
```

### `sendDiscordMessage(channelId, content)`
Sendet reine Textnachricht.

### `getTargetChannels(type)`
Liest `app_settings.discord_servers` (JSON) und gibt aktive Channel-IDs für gegebenen Typ zurück.

```js
function getTargetChannels(type) {
    const setting = $app.dao().findFirstRecordByData('app_settings', 'key', 'discord_servers')
    if (!setting) return []
    try {
        const servers = JSON.parse(setting.get('value'))
        const channels = []
        for (const server of servers) {
            const ch = server.channels && server.channels[type]
            if (ch && ch.enabled) {
                const channelId = ch.channelId || server.defaultChannelId
                if (channelId) channels.push(channelId)
            }
        }
        return channels
    } catch { return [] }
}
```

### `sanitizeEmbed(embed)`
- Felder ohne `name`/`value` entfernen
- Werte > 1024 Zeichen aufsplitten (mit `(cont.)`)
- Wenn weder `description` noch `fields` → `description = ' '`

## Channel-Typen
- `auction` (neue Auktion)
- `results` (Auktion-Ergebnisse)
- `events` (Event-Upload)
- `penalties` (Penalty/Compensation)
- `reminder` (30-Min-Reminder)
- `defaultChannelId` für manuelle Sends

## Struktur `discord_servers`
```json
[
  {
    "guildId": "123",
    "name": "Mein Server",
    "defaultChannelId": "456",
    "channels": {
      "auction":   { "enabled": true,  "channelId": "789" },
      "results":   { "enabled": true,  "channelId": null },
      "events":    { "enabled": false, "channelId": null },
      "penalties": { "enabled": true,  "channelId": null },
      "reminder":  { "enabled": true,  "channelId": null }
    }
  }
]
``