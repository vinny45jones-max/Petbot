---
title: Payload Local API обходит access — system-only коллекции закрывать create=false
date: 2026-05-29
module: pet-aggregator
problem_type: convention
domain: payload
severity: high
applies_when:
  - "Коллекция пишется только серверным кодом (хелпер/хук/вебхук/cron) через payload.create"
  - "Запись не должна создаваться публичным REST/GraphQL"
stack: [payload-cms, postgres, typescript]
tags: [payload-access-control, local-api, overrideaccess, rest-api, security, audit-log]
related:
  - docs/solutions/payload/standalone-script-node-not-tsx.md
---

# Payload Local API обходит access: закрывать `create` на system-only коллекциях

## Контекст

Ревью T8 нашёл 🔴: у `AuditLogs` стояло `create: () => true`. Намерение было «пишет только хелпер `recordAuditLog`», но `create: () => true` открывал **публичный** REST `POST /api/audit-logs` — любой мог подделать аудит-запись.

## Суть

Payload **Local API** (`payload.create/update/delete`) по умолчанию идёт с `overrideAccess: true` — **полностью игнорирует** `access`-функции коллекции. `access` применяется только к внешнему API (REST/GraphQL).

Следствие: коллекцию, в которую пишет **только серверный код**, надо закрывать `create: () => false` (и `update`/`delete` по необходимости). Хелпер через Local API всё равно пройдёт, а публичный create будет закрыт. `create: () => true` для работы хелпера **не нужен** и лишь открывает форж.

```ts
// ДО — публичный REST может форжить записи:
access: { create: () => true, update: () => false, delete: superadmin }

// ПОСЛЕ — пишет только серверный recordAuditLog (Local API), публичный create закрыт:
access: { create: () => false, update: () => false, delete: superadmin }
```

Хелпер не меняется — `payload.create({ collection: 'audit-logs', data })` работает при `create:()=>false`, т.к. Local API `overrideAccess:true` по умолчанию. (Если зовёшь Local API с `overrideAccess:false` — тогда нужен реальный `access`.)

## Почему это важно

`create: () => true` на «системной» коллекции = дыра: внешний клиент подделывает аудит, логи платежей, системные события. Verified: после `()=>false` тесты 18/18, `recordAuditLog` пишет (Local API).

## Когда применять

- audit-logs, webhook-логи платежей (P5 Donations), любые server-written коллекции в P2–P6.
- НЕ путать с user-facing коллекциями (animals, inquiries) — там `access` реальный и нужен.

## Примеры

См. `web/collections/AuditLogs.ts` — `create: () => false` + комментарий. Драйвер: ревью-фикс `964cef4`.

## Связанное

- `docs/solutions/payload/standalone-script-node-not-tsx.md` — другая гоча того же T6–10 блока.
- Смежная гоча T8: под Postgres ID релейшена — **число**, не строка; хелпер с `actorId: string` ломал generated-типы → `actorId: number`.
