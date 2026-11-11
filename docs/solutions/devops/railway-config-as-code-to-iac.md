---
title: Railway railway.json → .railway/railway.ts (IaC) — переход без смены поведения
date: 2026-11-11
module: pet-aggregator
problem_type: migration
domain: devops
severity: high
applies_when:
  - "В репо есть railway.json / railway.toml (Railway перестаёт их читать 01.12.2026)"
  - "Один репо — несколько сервисов Railway с разными Root Directory"
stack: [railway, railway-cli, typescript]
tags: [railway, iac, config-as-code, deploy, windows, git-bash]
related:
  - docs/solutions/devops/railway-monorepo-deploy.md
  - docs/solutions/devops/payload-prod-migrations.md
---

# Railway: railway.json → `.railway/railway.ts`

## Контекст

В репо было два `railway.json`: `web/railway.json` (сайт Petbot, root `/web`: start, preDeploy `npm run migrate`, healthcheck) и корневой (бот `irapet_bot`, root `/`: `python bot.py`, restart ALWAYS). В дашборде у Petbot эти поля пустые, у бота стоит `python run_bot.py` — такого файла нет. Без переноса после 01.12 сайт перестал бы гонять миграции перед деплоем, а бот упал бы на старте.

## Как сделано

1. `railway config migrate` (dry-run) угадывает имена сервисов по папкам («Pet project», «web») — не годится. Вместо него `railway config pull` во временной папке, привязанной к проекту: импорт с реальными именами, томами и `preserve()` для переменных; план на нём — «up to date».
2. В импорт вручную дописать то, что раньше давали `railway.json` (start, preDeploy, healthcheck, restart). План должен показывать только эти поля, 0 удалений.
3. `railway config apply` — **сразу запускает передеплой** затронутых сервисов. Дождаться SUCCESS у обоих.
4. Только после этого удалить `railway.json` и запушить.

## Грабли

- **SDK нужен для plan/apply** (`npm install railway`). Класть его не в корень: из корня Railpack собирает Python-бота, `package.json` там может сбить определение языка. Свой `package.json` в `.railway/` работает (имя пакета задать явно — `npm init` падает на имени «.railway»), `.railway/node_modules/` в `.gitignore`.
- **Windows + Git Bash: «requires Railway CLI 5.42.1 or newer» при CLI 5.57.** SDK запускает CLI по `process.env._`, а Git Bash кладёт туда путь к npm-обёртке без `.exe`. Запуск: `env _="<путь>\railway.exe" "<путь>\railway.exe" config plan`.
- **Значения по умолчанию дают вечный дрейф.** `restartPolicyType: "ON_FAILURE"` и `restartPolicyMaxRetries: 10` Railway возвращает как `null` → plan после apply снова показывает изменения. Писать в файл только отличия от дефолта.

## Проверка

`railway config plan` → «already up to date»; `serviceInstance` через `railway api` показывает start/preDeploy/healthcheck; деплои после apply и после push без `railway.json` — SUCCESS, бот в логах начал polling, `/api/health/ready` 200.
