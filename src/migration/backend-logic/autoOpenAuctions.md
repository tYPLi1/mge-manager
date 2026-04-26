# autoOpenAuctions / autoCloseAuctions – Cron alle 5 Min

## Zweck
- Drafts mit `scheduled_open` in der Vergangenheit → `open`
- Open mit `scheduled_close` in der Vergangenheit → `closed`

## Cron
`*/5 * * * *`

## Logik
```
now = new Date()

for auction in auctions where status='draft':
    if auction.scheduled_open && new Date(auction.scheduled_open) <= now:
        update status = 'open'

for auction in auctions where status='open':
    if auction.scheduled_close && new Date(auction.scheduled_close) <= now:
        update status = 'closed'
```

## Zeitzone
Datums-Strings als UTC parsen. Wenn String kein `Z`/Offset hat → `Z` anhängen.

## Pocketbase
```js
cronAdd('autoOpenCloseAuctions', '*/5 * * * *', () => {
    const now = new Date()
    const drafts = $app.dao().findRecordsByFilter('auctions', 'status="draft"', '', 0, 0)
    drafts.forEach(a => {
        const openAt = a.get('scheduled_open')
        if (openAt && new Date(openAt) <= now) {
            a.set('status', 'open')
            $app.dao().saveRecord(a)
        }
    })
    const open = $app.dao().findRecordsByFilter('auctions', 'status="open"', '', 0, 0)
    open.forEach(a => {
        const closeAt = a.get('scheduled_close')
        if (closeAt && new Date(closeAt) <= now) {
            a.set('status', 'closed')
            $app.dao().saveRecord(a)
        }
    })
})
``