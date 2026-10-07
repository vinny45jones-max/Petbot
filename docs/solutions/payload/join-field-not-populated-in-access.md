---
title: Payload join-поле не популируется в access/auth — RBAC обязан запрашивать owning-сторону
date: 2026-06-15
module: pet-aggregator
problem_type: gotcha
domain: payload
severity: high
applies_when:
  - "RBAC/guard проверяет членство через M2M, выраженную как Payload join-поле"
  - "Предикат читает user.<joinField> в access-функции коллекции или после payload.auth()"
stack: [payload-cms, postgres, typescript, nextjs]
tags: [payload-join, rbac, access-control, payload-auth, security, contract-drift, hasmany-relationship]
related:
  - docs/solutions/devex/cross-plan-contract-drift.md
  - docs/solutions/payload/local-api-bypasses-access.md
---

# Payload join-поле не популируется в access/auth: RBAC читать через owning-сторону

## Контекст

T2 (Plan 3): типизация `requireOrgAdmin` уронила tsc на `canManageOrganization(user, orgId)` (Plan 1). Функция читала `user.organizations` как массив id-шников и делала `.map().includes()`. Но `User.organizations` — это Payload **`join`**-поле (`type: 'join', collection: 'organizations', on: 'admins'`), generated-форма `{ docs: (number|Organization)[], hasNextPage, totalDocs }`, а не массив. И id релейшена под Postgres — **число**, не строка.

## Суть

Два слоя бага, оба замаскированы повсеместным `as any`:

1. **Форма.** Чтение join как массива → `({docs}||[]).map` это `.map is not a function` (краш), либо `[]` если undefined.
2. **Популяция (главное).** Payload **не популирует join-поля** автоматически ни в `req.user` (access-функции), ни в результате `payload.auth()`. То есть `user.organizations` там почти всегда `undefined` → предикат тихо возвращает `false` → org_admin **залочен из своего кабинета**, а не падает заметно.

Итог: 106 unit-тестов были зелёные, потому что мокали фикцию `organizations: ['org-x']` через `as any` — проверяли форму данных, которой в runtime не существует.

## Решение

RBAC-проверку членства вести через **owning-сторону** связи (`Organizations.admins` — `relationship → users`), авторитетным async-запросом. Не зависит от популяции join:

```ts
// lib/auth/org-access.ts
export async function userAdministersOrg(payload, user, orgId): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if (user.role !== 'org_admin') return false;
  const { totalDocs } = await payload.find({
    collection: 'organizations', depth: 0, limit: 1,
    where: { and: [{ id: { equals: orgId } }, { admins: { in: [user.id] } }] },
  });
  return totalDocs > 0;
}
```

- `{ admins: { in: [user.id] } }` — корректный оператор для hasMany-relationship в Payload v3 (матчит доки, где user.id среди admins).
- Collection `access.update` может быть **async** → `Promise<boolean | Where>`. Animals/Organizations переведены на async + `req.payload`.
- `orgId: string | number` — не приводить к `String()`, id числовой.

## Почему это важно

Сломанный guard на security-вертикали (кабинет организации, T13–16) = либо краш, либо тихий lock-out легитимных org_admin. `as any` в каждом call-site глушил и tsc, и ревью — баг прожил два плана.

Verified: tsc 0, unit 107/107 (−4 фикции canManageOrganization, +5 на реальный запрос), адверсарное ревью диффа — находок нет. Драйвер: `85e4b11`.

## Когда применять

- Любая RBAC/membership-проверка, где связь выражена через Payload `join` (а не прямой `relationship`-массив на самом user).
- Правило: **join читать только когда явно популировал** (depth/`joins`); для авторитетной проверки — запрос owning-стороны.
- Остаточный нюанс (НЕ регрессия этого фикса): `Animals.ts update` опирается на `data?.organization` — при partial-update без этого поля org_admin падает в `ownerUser`-фильтр. Закрывается в T14 (server actions ставят поля явно).

## Связанное

- `docs/solutions/devex/cross-plan-contract-drift.md` — класс проблемы: ручной тип/мок Plan N расходится с generated-типами Plan M.
- `docs/solutions/payload/local-api-bypasses-access.md` — соседняя access-гоча; там же про число-id релейшена.
