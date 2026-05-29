---
title: Payload admin 500 в Next App Router — нужен (payload)/layout.tsx и multiple root layouts
date: 2026-05-29
module: pet-aggregator
problem_type: integration
domain: payload
severity: high
applies_when:
  - "Payload CMS 3 интегрируется в существующее Next.js App Router приложение со своим фронтом"
  - "/admin отдаёт 500: 'Cannot destructure property config ... as it is undefined'"
  - "Payload-роуты добавлены вручную (page.tsx + route.ts), без create-payload-app"
  - "Есть общий app/layout.tsx с <html>/<body>, а admin не открывается"
stack: [payload-cms, next.js, app-router, react]
tags: [payload, next-app-router, root-layout, route-groups, ConfigProvider, not-found, 500]
---

# Payload admin 500 — отсутствует (payload)/layout.tsx + конфликт root-layout

## Симптом

`/admin` (или `/admin/create-first-user`) → **HTTP 500**. В логе dev-сервера:

```
TypeError: Cannot destructure property 'config' of 'se(...)' as it is undefined.
    at ... (@payloadcms/ui/src/elements/CodeEditor/CodeEditor.tsx)
```

Строка в трейсе (CodeEditor:87, `rest.onChange`) — **обманка от sourcemap**. Реальная ошибка: хук `useConfig()` вернул `undefined`, т.е. компонент рендерится **вне `ConfigProvider`**. Это ошибка дерева провайдеров, не версии React (та кинула бы «Invalid hook call»).

## Корень

Payload-провайдеры (`ConfigProvider` и др.) монтирует **`RootLayout`** из `@payloadcms/next/layouts`, который подключается через **`app/(payload)/layout.tsx`**. Если этого файла нет (частая ошибка при ручной установке без `create-payload-app`), `/admin/*` наследует root-layout фронта **без** Payload-провайдеров → `useConfig()` undefined → 500.

Засада-ловушка: `RootLayout` рендерит **собственные `<html>` и `<body>`** (`@payloadcms/next/dist/layouts/Root/index.js`). Значит общий `app/layout.tsx` с `<html>/<body>` **несовместим** с admin — нельзя просто добавить `(payload)/layout.tsx` под существующий root-layout, получится вложенный `<html>` (невалидно, React 19 падает). Нужен паттерн **multiple root layouts**.

Сопутствующее (если уже была своя 15.5): Payload 3.85 `@payloadcms/*` peer-range на next = `>=15.2.9 <15.3.0 || >=15.3.9 <15.4.0 || >=15.4.11 <15.5.0 || >=16.2.6 <17`. `create-next-app@15` ставит 15.5.x — **вне range**. Пин `next@15.4` exact (caret вернёт 15.5).

## Решение (multiple root layouts)

Убрать общий `app/layout.tsx`, дать каждой группе свой root-layout:

```
app/
  (public)/layout.tsx        # <html lang><body> + шрифт + metadata + Header/Footer
  (public)/page.tsx
  (public)/error.tsx         # in-group error boundary (внутри (public) html)
  (public)/not-found.tsx     # контент 404 (html/body даёт (public)/layout)
  (public)/[...not-found]/page.tsx   # catch-all → notFound()
  (payload)/layout.tsx       # Payload RootLayout (свои <html>/<body>)
  (payload)/admin/[[...segments]]/page.tsx
  (payload)/api/[...slug]/route.ts
  global-error.tsx           # свой <html>/<body> — последний рубеж
  globals.css, favicon.ico
  # НЕТ app/layout.tsx
```

`app/(payload)/layout.tsx` (3.85; `RootLayout` И `handleServerFunctions` оба из `@payloadcms/next/layouts`):

```tsx
import type { ServerFunctionClient } from 'payload';
import config from '@payload-config';
import '@payloadcms/next/css';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import { importMap } from './admin/importMap.js';

const serverFunction: ServerFunctionClient = async function (args) {
  'use server';
  return handleServerFunctions({ ...args, config, importMap });
};

export default function PayloadAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  );
}
```

## Засада not-found

Глобальный `app/not-found.tsx` **требует root-layout**. Без `app/layout.tsx` → `/несуществующее` даёт 500:

```
⨯ app/not-found.tsx doesn't have a root layout.
```

Собственный `<html>` внутри `not-found.tsx` **не помогает** — Next хочет именно layout в дереве. Решение: catch-all в группе с root-layout —

```tsx
// app/(public)/[...not-found]/page.tsx
import { notFound } from 'next/navigation';
export default function CatchAllNotFound() { notFound(); }
```

Несопоставленные URL заходят в `(public)`, кидают `notFound()` → рендерится `(public)/not-found.tsx` внутри `(public)/layout.tsx`. `/admin` и `/api` перехватывает группа `(payload)` раньше (явные маршруты приоритетнее catch-all).

## Проверка

`next build` (а не только dev — dev снисходителен к нарушениям layout/route) + хиты: `/admin` 200 (форма create-first-user), `/` 200, `/zzz-nope` 404. Build покажет все роуты, включая `ƒ /[...not-found]`.

## Профилактика

- Ставишь Payload в существующий Next App Router фронт → сразу планируй `(payload)/layout.tsx` И multiple root layouts, не отдельный `(payload)/layout` под общий root.
- В плане-задаче «установить Payload» список файлов **обязан** включать `app/(payload)/layout.tsx` + реструктуру root-layout фронта + catch-all 404. Это был пропуск в Plan 1 Task 4 (см. [[cross-plan-contract-drift]] — класс «defined-but-unregistered», только для файлов скаффолда).
- Версии: пинить `next` exact в peer-range Payload; `npm ls next` не должен показывать `invalid`.

## Связанное

- `docs/solutions/devex/cross-plan-contract-drift.md`
- `docs/superpowers/plans/2026-05-28-plan-1-foundation.md` (Task 4)
- `@payloadcms/next/dist/layouts/Root/index.js` (RootLayout рендерит html/body)
