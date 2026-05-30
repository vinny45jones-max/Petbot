---
title: "Payload field access: на чувствительных полях нужен create-guard, не только update"
date: 2026-05-30
module: pet-aggregator
problem_type: logic_error
domain: payload
severity: critical
symptoms:
  - "POST /api/users с role:superadmin создаёт суперадмина анонимом"
  - "клиентское поле (role, isBlocked) принимается из тела на create"
root_cause: auth_issue
resolution_type: code_fix
stack: [payload-cms, nextjs, typescript]
tags: [payload-access-control, field-access, privilege-escalation, rest-api, security, registration, audit]
related:
  - docs/solutions/payload/local-api-bypasses-access.md
---

# Payload field access: на чувствительных полях нужен `create`-guard, не только `update`

## Контекст

Ревью Plan 1 нашёл 🔴 в `web/collections/Users.ts`. У коллекции `create: () => true` (открытая регистрация — реальная фича, `RegisterForm` шлёт `POST /api/users`). У поля `role` стоял только `update`-guard (`user?.role === 'superadmin'`), у `isBlocked` — только `update: isAdmin`. На **create** оба поля брались из тела запроса как есть.

Эксплойт был живой на проде:

```
POST https://<host>/api/users
{ "email":"x@x", "password":"...", "role":"superadmin",
  "ageConfirmed":true, "consentPersonalData":true }
```

→ создавался **суперадмин**. `verify: true` не спасает: атакующий владеет почтой, подтверждает сам, логинится.

## Суть

Payload применяет field-level access **раздельно по операциям**: `create`, `read`, `update`. Если у поля задан только `update`, то на операции `create` действует **дефолт — allow**, и значение поля принимается из внешнего тела (REST/GraphQL).

Следствие: `update`-guard на поле **не защищает** create. Чувствительные поля (роль, флаги блокировки/верификации, владелец-релейшен) нужно закрывать **и на `create`**:

```ts
// ДО — на create поле принимается из тела (privilege escalation):
access: { update: ({ req: { user } }) => user?.role === 'superadmin' }

// ПОСЛЕ — create тоже под guard:
access: {
  create: ({ req: { user } }) => user?.role === 'superadmin',
  update: ({ req: { user } }) => user?.role === 'superadmin',
}
```

Когда field `create` access возвращает `false`, Payload **отбрасывает** поле из операции, и применяется `defaultValue` (`role` → `citizen`, `isBlocked` → `false`). Поэтому открытую регистрацию закрывать не нужно — достаточно снять с анонима право задавать привилегированные поля.

Local API (Telegram-логин через `payload.create`, seed) идёт с `overrideAccess: true` и не затронут — там роль ставит серверный код. Это парная гоча к [[local-api-bypasses-access]]: тот док про коллекционный `create` и Local API, этот — про **field-level** `create` и внешний API.

## Почему это важно

`update`-only guard на роли = тихая дыра привилегий: коллекционный `create` открыт (регистрация), а поле роли на create берётся из тела. Любой внешний клиент регистрируется суперадмином/модератором. Особенно критично перед Plan 2–3, где появляются `org_admin` и self-service формы.

Verified: после фикса unit-тест на предикаты 7/7, полный suite 33/33, `tsc` чисто. Драйвер-коммит `e6e632e`.

## Когда применять

- Любое поле, чьё значение задаёт **сервер/привилегированная роль**, а не сам регистрирующийся: роль, флаги `isBlocked`/`isVerified`/`isStaff`, владелец-релейшен, баланс, тариф.
- Коллекции с открытым или полуоткрытым `create` (регистрация, публичные формы) в P2–P6.
- Правило-ограничитель: на чувствительном поле задавать `create` И `update` guard. Только `update` = пропущенный create-вектор.
- НЕ путать с обычными user-полями (`firstName`, `phone`) — их аноним задаёт на себя законно.

## Примеры

См. `web/collections/Users.ts` — поля `role` (`create`/`update` → superadmin) и `isBlocked` (`create`/`update` → isAdmin). Тест: `web/tests/unit/collections/users-access.test.ts` — проверяет предикаты `access.create` напрямую (anon/citizen/moderator → false, superadmin → true).

## Связанное

- `docs/solutions/payload/local-api-bypasses-access.md` — парная гоча: Local API `overrideAccess` + коллекционный `create` на system-only коллекциях.
