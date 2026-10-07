---
title: Свой роут app/api/<slug> затеняет Payload REST — кастомные API держать под /api/public/*
date: 2026-10-07
module: pet-aggregator
problem_type: convention
domain: backend
severity: high
applies_when:
  - "Нужен свой Next-роут (форма, антиспам, rate-limit) для коллекции Payload"
  - "Имя роута совпадает со slug коллекции: app/api/comments, app/api/cruelty-reports"
stack: [payload-cms, nextjs, typescript]
tags: [payload-rest, nextjs-routing, catch-all, route-precedence, api-design]
related:
  - docs/solutions/payload/local-api-bypasses-access.md
  - docs/solutions/payload/next-multiple-root-layouts.md
---

# Свой роут `app/api/<slug>` затеняет Payload REST

## Контекст

Plan 4 (формы жалоб, заявки приюта, комментарии) по тексту плана клал свои POST-роуты в `app/api/cruelty-reports/route.ts`, `app/api/comments/route.ts` и т.п. Slug совпадает с коллекцией Payload.

## Суть

Payload REST живёт в catch-all `app/(payload)/api/[...slug]/route.ts`. В Next статичный сегмент приоритетнее catch-all: `app/api/comments/route.ts` перехватит `/api/comments` целиком, и Payload REST этой коллекции (`GET/POST /api/comments`) станет недоступен. Сборка не ругается: для Next это законный приоритет маршрутов, а не конфликт.

Что ломается: всё, что ходит в REST коллекции, — внешние клиенты, часть операций админки, `fetch` из клиентских компонентов. Ошибка всплывает поздно и не там, где сделали роут.

## Правило

Свои API-роуты, которые работают рядом с коллекциями Payload, класть под префикс, которого нет среди slug коллекций:

```text
app/api/public/cruelty-reports/route.ts      → POST /api/public/cruelty-reports
app/api/public/partner-applications/route.ts
app/api/public/comments/route.ts
app/api/public/comments/list/route.ts
app/api/public/reports/route.ts
```

Внутри роута писать через Local API (`payload.create(..., overrideAccess: true)`), а access коллекции держать закрытым для публики (см. `local-api-bypasses-access.md`).

## Проверка

После добавления роута проверить, что REST коллекции жив: `POST /api/<slug>` от админа → 201 (так проверено для `cruelty-reports` в Plan 4). Перед созданием `app/api/<x>/` сверить `<x>` со списком slug в `payload.config.ts`.

## Исключения

Роуты с именами, которых нет среди коллекций (`/api/health`, `/api/auth/*`, `/api/account/*`, `/api/cron/*`), безопасны. Но `auth` и `account` — не slug коллекций только пока такие коллекции не появились.
