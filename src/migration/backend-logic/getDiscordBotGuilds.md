# getDiscordBotGuilds – Liste aller Bot-Server inkl. Channels

## Zweck
Wird im Admin-Settings-Page genutzt für Server- und Channel-Auswahl.

## Endpoint
`POST /api/custom/discord/guilds` (admin-only)

## Logik
1. Auth-Check: nur eingeloggte Admins
2. `GET https://discord.com/api/v10/users/@me/guilds` mit Bot-Token
3. Pro Guild: `GET /guilds/{id}/channels`, filter `type==0||type==5`, sort `position`
4. **300ms Delay zwischen Calls** (Rate-Limit)
5. Response:
   ```json
   {
     "guilds": [
       { "id": "123", "name": "Mein Server", "icon": "...", "channels": [...] }
     ]
   }
   ``