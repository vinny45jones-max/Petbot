---
title: "Railway monorepo: railway.json читается из Root Directory сервиса, не из корня репо"
date: 2026-05-29
module: pet-aggregator
problem_type: convention
domain: devops
severity: high
applies_when:
  - "деплоишь сабфолдер монорепо (web/) на Railway"
  - "пишешь railway.json/railway.toml для сервиса с заданным Root Directory"
  - "в одном репо несколько Railway-сервисов (web + боты)"
  - "настраиваешь env через railway MCP (set_variables / reference)"
stack: [Railway, Next.js, Payload, Postgres]
tags: [railway, monorepo, deploy, railway-json, reference-vars, healthcheck, github-integration, mcp]
related: [cross-plan-contract-drift]
---

# Railway monorepo: railway.json читается из Root Directory сервиса, не из корня репо

## Контекст

Репо `Petbot` — монорепо: Python-бот в корне (`bot.py`, `run_bot.py`) + Next.js-агрегатор в `web/`. На Railway (проект `reasonable-commitment`) три сервиса от одного GitHub-репо:

- `Petbot` — Root Directory `/web`, RAILPACK → веб-приложение
- `irapet_bot` — Root Directory `/` (корень), start `python run_bot.py`
- `Postgres`

План P1 T19 велел положить `railway.json` в КОРЕНЬ репо с `cd web && npm run build`. Это неверно для такой конфигурации.

## Суть

1. **railway.json читается из Root Directory сервиса, а не из корня репо.** У `Petbot` root=`/web` → конфиг должен лежать в `web/railway.json`. Корневой `railway.json` этим сервисом игнорируется. (Поэтому старый корневой `railway.json` с `python bot.py` не мешал Petbot деплоить web — он его просто не видел.)

2. **Не перезаписывай корневой railway.json под web.** Корневой конфиг обслуживает сервисы с root=`/` (здесь `irapet_bot`, живой Python-бот). Перезапись под Next сломала бы боту start-команду. → создавать `web/railway.json`, корень не трогать.

3. **Root Directory задан → никаких `cd web`.** Команды выполняются уже внутри `/web`. `cd web` сломается (нет `web/web`). RAILPACK сам детектит Next из `web/package.json` и делает build/start; railway.json нужен в основном для `healthcheckPath`.

4. **DATABASE_URL — через reference, а не копипаст.** `${{Postgres.DATABASE_URL}}` резолвится в ВНУТРЕННИЙ хост `postgres.railway.internal:5432` (без egress). Через MCP можно задать обычным `set_variables` со значением `${{...}}` — Railway трактует это как reference.

5. **GitHub-интеграция уже деплоит → deploy.yml не нужен.** Если сервис подключён к GitHub-репо (source repo), push в tracked-ветку автодеплоит. Отдельный GitHub Actions deploy-workflow создаст двойной деплой. План предлагал deploy.yml как альтернативу — при активной интеграции пропускать.

6. **Healthcheck защищает прод.** `healthcheckPath: /api/health`: если новый деплой не проходит healthcheck, Railway держит последний рабочий (старый остаётся жив). Бэд-деплой не роняет сайт.

## Почему это важно

Положив railway.json в корень (как в плане), получишь: сервис его не читает → деплоит по дефолту RAILPACK без healthcheck, а корневой конфиг попутно ломает соседний бот-сервис. Симптом не очевиден: «конфиг есть, но не применяется».

Перед написанием railway.json — `get_service_config` (или Railway UI): посмотреть Root Directory, Builder, Source repo. Конфиг писать под реальность сервиса, не под шаблон плана.

## Когда применять

- любой деплой сабфолдера монорепо на Railway
- несколько сервисов от одного репо с разными Root Directory
- настройка env/reference через MCP

## Примеры

`web/railway.json` (root=/web, без cd):
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": { "builder": "RAILPACK" },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3,
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30
  }
}
```

Env через MCP без лишнего редеплоя:
```
set_variables(skip_deploys: true, variables: {
  DATABASE_URL: "${{Postgres.DATABASE_URL}}",
  PAYLOAD_SECRET: "<64-hex>",
  NEXT_PUBLIC_APP_URL: "https://pethelp.up.railway.app"
})
```
`set_variables` триггерит редеплой, если не передать `skip_deploys: true`. `add_reference_variable` параметра skip нет → редеплоит.

## Гочи MCP

- Railway MCP-токен протухает в середине сессии: сначала `Failed to fetch ... backboard.railway.com`, потом `Unauthorized. Please run railway login`. При `Failed to fetch` запись часто ВСЁ РАВНО проходит — проверять `list_variables`, не ретраить вслепую.
- Деплой триггерится из GitHub push независимо от MCP-токена. Протухший MCP не блокирует деплой — результат проверяется публичным `/api/health`.

## Связанное

- [[cross-plan-contract-drift]] — план vs реальность; здесь план задал не ту локацию конфига
