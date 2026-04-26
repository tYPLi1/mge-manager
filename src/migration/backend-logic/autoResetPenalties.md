# autoResetPenalties – Tägliche Penalty-Reset-Prüfung

## Cron
Täglich `0 2 * * *`.

## Konfiguration
Aus `app_settings.penalty_config` (JSON):
```json
{ "level1_reset_days": 30, "level2_reset_days": 60, "level3_reset_days": 90 }
```
Kein Wert → kein Auto-Reset für dieses Level.

## Logik
```
config = JSON.parse(app_settings.penalty_config) || {}
resetDays = { 1: config.level1_reset_days, 2: ..., 3: ... }

today = today at 00:00:00

for penalty in penalties where status='probation':
    days = resetDays[penalty.level]
    if !days || !penalty.offense_date: continue
    diffDays = floor((today - offense_date) / 86400000)
    if diffDays >= days:
        update penalty.status = 'reset'
``