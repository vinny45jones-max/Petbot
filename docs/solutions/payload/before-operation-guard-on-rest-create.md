---
title: Защита анонимной регистрации через beforeOperation — что на самом деле приходит как «REST create»
date: 2026-11-10
module: pet-aggregator
problem_type: gotcha
domain: backend
severity: high
applies_when:
  - "Нужно навесить Turnstile / rate-limit на POST /api/users (регистрация идёт в Payload REST, своего роута нет)"
  - "Хук коллекции различает REST и Local API по req.payloadAPI"
  - "Правка коллекции «не работает» в next dev"
stack: [payload-cms, nextjs, typescript]
tags: [payload-hooks, before-operation, registration, turnstile, rate-limit, first-register, hmr]
related:
  - docs/solutions/payload/next-route-shadows-payload-rest.md
  - docs/solutions/payload/local-api-bypasses-access.md
  - docs/solutions/payload/field-access-create-default-allow.md
---

# Защита регистрации через `beforeOperation`

## Контекст

Регистрация — это `POST /api/users` прямо в Payload REST. Свой роут `app/api/users` затенил бы весь REST коллекции (см. `next-route-shadows-payload-rest.md`), поэтому Turnstile и лимит 10/час на IP навешены хуком `hooks.beforeOperation` коллекции `Users` (`web/lib/auth/registration-guard.ts`).

## Суть

Условие «аноним регистрируется сам» = `operation === 'create' && req.payloadAPI === 'REST' && !req.user`. Этого мало:

1. **`/api/users/first-register` тоже подходит под условие.** `registerFirstUser` вызывает `payload.create({ req })`, а `createLocalReq` сохраняет `payloadAPI` исходного запроса (`req.payloadAPI || 'local'`). Итог: создание первого администратора из админки приходит в хук как `create` + `REST` + без пользователя. При включённом Turnstile админка токен не шлёт → 400, и первого пользователя создать нельзя. Фикс: дополнительно смотреть `req.pathname` — защита только для пути, оканчивающегося на `/users`.
2. **Local API без `req` — действительно `local`** (сид, `findOrCreateUserByTelegram`): хук их пропускает. Но любой вызов `payload.create({ req })` из REST-обработчика наследует `REST`.
3. **Токен передаётся заголовком** (`x-turnstile-token`), а не в теле: тело — данные документа, лишнее поле Payload отбросит или отвалидирует.
4. **`APIError(message, status, undefined, true)`** — четвёртый аргумент `isPublic`, иначе текст ошибки клиенту не показывается.

## Гоча при проверке: коллекции не подхватываются HMR

В `next dev` правка `collections/*.ts` (новый хук) не применилась к уже поднятому серверу: 13 запросов подряд шли мимо хука, 429 не было. После рестарта dev-сервера — 11-й запрос → 429. Прежде чем искать ошибку в хуке, перезапустить dev.

Вторая ловушка: лимит хранится в памяти процесса — ручная проверка 429 исчерпывает квоту для e2e с того же IP (`unknown`). После проверки снова перезапустить сервер.

## Как проверить

```bash
# 11 пустых анонимных запросов: 10 × 400 (валидация), 11-й — 429
for i in $(seq 1 11); do curl -s -o /dev/null -X POST -H "Content-Type: application/json" -d '{}' -w "%{http_code} " http://localhost:3100/api/users; done
```

Unit: `web/tests/unit/registration-guard.test.ts` (REST-аноним, 429, 400, Local API/админка/другие операции, first-register).
