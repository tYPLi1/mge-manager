# submitBid – Sicheres Bid-Submission

## Zweck
Öffentlicher Endpoint (kein Login nötig) zum Abgeben eines Gebots. **Alle Validierungen müssen server-side passieren**.

## Endpoint (neu)
`POST /api/custom/submit-bid`

## Request-Body
```json
{
  "auction_id": "...",
  "player_id": "...",
  "dkp_bid": 50,
  "bid_password": "optional",
  "want_friendly_zone": false
}
```

## Validierungen (in dieser Reihenfolge)
1. **Pflichtfelder vorhanden?** (`auction_id`, `player_id`, `dkp_bid`)
2. **`dkp_bid` ist eine nicht-negative Zahl?**
3. **Auction existiert?** Sonst → 404
4. **Auction-Status ist `open`?** Sonst → 400
5. **Wenn `auction.has_password === true`:** `bid_password` muss übereinstimmen
6. **Player existiert?** Sonst → 404
7. **Cooldown:** wenn `player.cooldown_until` in Zukunft → 400
8. **Auction-Ban:** wenn `player.auction_ban_count > 0` → 400
9. **Verfügbares DKP:** `currentDkp = total_dkp + dkp_spent` (dkp_spent ist negativ!)
10. **Negativcheck:** wenn `currentDkp < 0` → 400 (Datenfehler)
11. **Bid-Höhe:** wenn `dkp_bid > currentDkp` → 400
12. **Duplikat:** existiert bereits ein Bid für `auction_id + player_id` mit `is_deleted=false`? → 400
13. **Friendly Zone:** wenn `want_friendly_zone === true` UND Setting `friendly_zone_enabled === 'true'` UND `currentDkp <= friendly_zone_threshold` (default 50) → setze `friendlyZone = true`

## Bei Erfolg
Erstelle Bid-Record:
```js
{
  auction_id, player_id,
  player_name: player.name,
  dkp_bid: parseInt(dkp_bid),
  want_friendly_zone: friendlyZone,
  is_deleted: false
}
```
→ `200 { success: true, bid }`

## Wichtige Gotchas
- `dkp_spent` wird **negativ** gespeichert! `total_dkp + dkp_spent` ergibt das Guthaben.
- `parseInt(dkp_bid)` – Gebote sind Integers.
- Setting-Werte sind Strings; `'true' === 'true'` checken.