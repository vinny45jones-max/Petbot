---
title: "Payload REST отдаёт неопубликованное: read: () => true при фильтре isPublished только на страницах"
date: 2026-11-25
module: pet-aggregator
problem_type: logic_error
domain: backend
symptoms:
  - "Анонимный GET /api/organizations?where[isPublished][equals]=false отвечает 200 и отдаёт скрытые записи с контактами"
  - "Страницы сайта скрытую организацию не показывают (404), поэтому утечку не видно глазами"
root_cause: auth_issue
resolution_type: code_fix
severity: high
stack: [payload-cms, next.js, playwright, vitest]
tags: [payload-access-control, rest-api, ispublished, where-constraint, security, seed]
related:
  - docs/solutions/payload/local-api-bypasses-access.md
  - docs/solutions/payload/next-route-shadows-payload-rest.md
---

# Payload REST отдаёт неопубликованное: `read: () => true` при фильтре `isPublished` только на страницах

## Проблема

У коллекции `organizations` стояло `read: () => true`, а «скрытость» держалась на `where: { isPublished: true }` в запросах страниц. Payload REST при этом отдавал коллекцию целиком: аноним получал неопубликованные организации вместе с телефонами и почтой. Нашлось перед посевом 63 реальных организаций (`npm run seed:orgs`), которые должны лежать скрытыми до согласия.

## Симптомы

- `GET /api/organizations?where[isPublished][equals]=false` без авторизации — 200 и записи.
- `/organizations/<slug>` скрытой организации — 404, карта сайта и донаты её тоже отсекают. Дыра только в REST.

## Что не сработало

- **Проверка на проде до посева.** На проде 0 неопубликованных, анонимный запрос возвращает 0 и до, и после правки — это ничего не доказывает. Нужна скрытая запись в тестовой базе и тест, который видели упавшим.
- **e2e на `next dev`.** Соседний спек (`organizations.spec.ts`) упал из-за холодной компиляции страницы за 5 секунд ожидания. На прод-сборке (`npm run ci:local`) он зелёный. Красный прогон нового спека на dev годится, зелёный итог — только с `ci:local`.
- **Ветка для администратора организации** (`or: [{ isPublished }, { admins: { in: [user.id] } }]`) не делалась: код сайта в `/api/organizations` не ходит, кабинеты читают через Local API (`overrideAccess: true`), доказать ветку end-to-end нечем.
- **e2e «модератор видит скрытые»** не делался: staff без 2FA Payload понижает до citizen, нужен полный проход 2FA. Покрыто только unit-тестом правила.

## Решение

```ts
// web/collections/Organizations.ts
read: ({ req: { user } }) => (isAdmin(user as any) ? true : { isPublished: { equals: true } }),
```

Тот же вид, что у `Comments` и `Animals`: staff видит всё, остальные получают where-ограничение. Схема БД не меняется, миграция не нужна.

## Почему это работает

`access.read` применяется к внешнему API (REST) и может вернуть не только boolean, но и `Where` — Payload добавляет его к любому запросу, включая чтение по id. Фильтр в запросе страницы — выбор конкретной страницы, а не защита коллекции. Local API по умолчанию идёт с `overrideAccess: true`, поэтому страницы, кабинеты и сиды правку не замечают.

## Профилактика

- unit `web/tests/unit/collections/organizations-access.test.ts` и e2e `web/tests/e2e/organizations-hidden.spec.ts`; для e2e тестовый сид создаёт скрытую организацию `test-hidden-shelter` (`seedTestHiddenOrg` в `web/scripts/seed.ts`, только вне production).
- Правило: если у коллекции есть поле публикации (`isPublished`, `status`), `read` возвращает where-ограничение для не-staff.
- Та же форма осталась у `IntakeFacilities` (`read: () => true`, есть `isPublished`). Сейчас все службы опубликованы; исправить до появления скрытых.
- Перед записью скрытых данных на прод убедиться, что деплой собран из коммита с правкой: `railway deployment list --service Petbot --json` → `meta.commitHash`.

## Связанное

- `docs/solutions/payload/local-api-bypasses-access.md` — обратная сторона: Local API правила доступа обходит.
- PR №2, коммит `5c3c6dd`.
