---
title: "Next 15: cookies/searchParams/useSearchParams асинхронны — plan-код пишет их синхронно"
date: 2026-05-29
module: pet-aggregator
problem_type: convention
domain: frontend
severity: high
applies_when:
  - "Page или Layout читает searchParams или params"
  - "route handler, server action или хелпер трогает cookies() или headers()"
  - "client-компонент использует useSearchParams()"
  - "исполняешь verbatim-код из планов P1-P6 (писались под Next 14)"
stack: [Next.js, React, Payload, Playwright, TypeScript]
tags: [next15, async-apis, searchparams, cookies, suspense, app-router, typecheck, build]
related: [next-multiple-root-layouts]
---

# Next 15: cookies/searchParams/useSearchParams асинхронны — plan-код пишет их синхронно

## Контекст

Планы P1-P6 содержат code-сниппеты, написанные под Next 14 (синхронные `cookies()`, `searchParams`). Проект реально на Next 15.4.x (пин из-за peer-range Payload 3.85). При copy-verbatim исполнении страниц и роутов код либо не проходит `tsc`, либо падает в `next build`. Бьёт в каждой задаче, где есть страница/роут с этими API (auth-страницы T11-16, далее каталог/фильтры P2+).

## Суть

Next 15 сделал асинхронными ранее синхронные API. Три правки при исполнении plan-кода:

1. **Server cookies/headers.** `cookies()` и `headers()` возвращают `Promise`. Перед `.get()/.set()` нужен `await`. Хелпер, который их вызывает, делать `async` (возврат `Promise<...>`), у всех вызовов ставить `await`.

2. **Page/Layout props.** `searchParams` и `params` в пропсах страницы/лейаута теперь `Promise<{...}>`. Функцию делать `async`, типизировать проп как `Promise<>`, разворачивать через `const sp = await searchParams`.

3. **Client `useSearchParams()`.** Требует обёртки в `<Suspense>` (иначе build-блокер `useSearchParams() should be wrapped in a suspense boundary`). Выносим компонент с хуком внутрь `<Suspense>`.

## Почему это важно

Симптомы расходятся по стадиям проверки — и это ловушка:

- правки (1) и (2) ловит `tsc --noEmit` (тип `Promise` не совместим с синхронным доступом, PageProps-констрейнт);
- правка (3) **typecheck НЕ ловит** — только `next build` падает. tsc зелёный, build красный.

Вывод: на задачах, трогающих client-компоненты с `useSearchParams`, гонять `next build`, а не только typecheck + unit. Иначе (3) проскочит до деплоя.

## Когда применять

- любая Page/Layout с `searchParams`/`params`
- route handler / server action / хелпер с `cookies()`/`headers()`
- client-компонент с `useSearchParams()`

## Примеры

До → после (коммиты этой сессии).

**(1) cookies в session-хелпере** (`lib/auth/session.ts`, 0eefcec):
```ts
// план (синхронно — рантайм-ошибка Next 15):
export function setSessionCookie(token: string): void {
  cookies().set(COOKIE, token, { httpOnly: true, ... });
}
// фикс:
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, token, { httpOnly: true, ... });
}
// у вызова (route consume/verify): await setSessionCookie(token);
```

**(2) searchParams в page** (`app/(public)/verify-email/page.tsx`, 8ecd191):
```tsx
// план: export default function P({ searchParams }: { searchParams: { sent?: string } }) { if (searchParams.sent) ...
// фикс:
export default async function P({ searchParams }: { searchParams: Promise<{ sent?: string; token?: string }> }) {
  const sp = await searchParams;
  if (sp.sent) { ... }
}
```

**(3) useSearchParams + Suspense** (`app/(public)/reset-password/page.tsx`, 8ecd191):
```tsx
// план: 'use client' страница напрямую дёргает useSearchParams() → next build падает.
// фикс: вынести в дочерний компонент, обернуть в <Suspense>:
function ResetPasswordForm() { const token = useSearchParams().get('token') || ''; ... }
export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordForm /></Suspense>;
}
```

## Связанное

- [[next-multiple-root-layouts]] — другая Next 15 + Payload layout-гоча (T4)
- session-state память: «Критические поправки плана #1» (Next 15.4.x async)
