# notifyAuctionResults – Discord wenn Auction confirmed wird

## Trigger
`onRecordAfterUpdateRequest('auctions')` – nur wenn `status` auf `confirmed` wechselt.

## Logik
1. `data.status !== 'confirmed'` → skip
2. Hole `auction_results` für diese auction_id, sort `rank` ASC, limit 10
3. Hole Settings: `auction_tiebreaker` (default `fcfs`), `auction_tiebreaker_fallback` (default `fcfs`)
4. Hole alle Channels mit `channels.results.enabled === true`
5. Baue Embed mit Top 10:
   ```
   1. **{player_name}** — {dkp_bid} DKP | Target: {target_score} | Medals: {hero_medals}
   ```
6. Wenn Ties → Tiebreaker-Hinweis-Field hinzufügen
7. Link-Field: `[View Results]({APP_BASE_URL}/Results)`

## Tiebreaker-Labels
- `fcfs` → "First to bid"
- `activity` → "Higher Activity Score"
- `last_event_dkp` → "Most DKP in last event"