# Railway: инфраструктура в коде

`railway.ts` описывает проект Railway `reasonable-commitment` (окружение production): Postgres, сайт `Petbot` (`web/`), Telegram-бот `irapet_bot` (корень репо), их тома и переменные. Значения переменных в коде не хранятся (`preserve()` — оставить то, что задано в Railway).

Заменяет `railway.json` / `web/railway.json`: Railway перестаёт их читать с 01.12.2026.

## Как менять

1. Правка `railway.ts`.
2. `cd .railway && npm ci` (один раз, SDK `railway`).
3. Из корня репо: `railway config plan` — посмотреть, что изменится.
4. `railway config apply` — применить. Push в main сам по себе настройки не применяет.

Windows + Git Bash: SDK ищет CLI через переменную `_`, а Git Bash кладёт туда npm-обёртку, которую Windows не запускает («requires Railway CLI 5.42.1 or newer»). Запускать так:

```bash
RW='C:\Users\polsk\AppData\Roaming\npm\node_modules\@railway\cli\bin\railway.exe'
env _="$RW" "$RW" config plan
```

SDK лежит в `.railway/` (свой `package.json`), а не в корне: из корня Railpack собирает Python-бота, и `package.json` там мог бы сбить определение языка.
