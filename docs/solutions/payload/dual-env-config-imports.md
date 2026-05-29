---
title: Payload CLI vs Next — импорты в payload.config/collections (Node 24, ERR_MODULE_NOT_FOUND / ERR_REQUIRE_ASYNC_MODULE)
date: 2026-05-29
module: pet-aggregator
problem_type: integration
domain: payload
severity: high
applies_when:
  - "payload generate:types / generate:importmap падает с ERR_MODULE_NOT_FOUND или ERR_REQUIRE_ASYNC_MODULE"
  - "В payload.config.ts появился первый relative-импорт коллекции (collections/*)"
  - "Коллекции импортируют хелперы через tsconfig-alias @/"
  - "Node 22+/24, Windows, путь с пробелом"
stack: [payload-cms, next.js, node24, tsx, typescript]
tags: [payload-cli, esm, module-resolution, tsconfig-paths, allowImportingTsExtensions, disable-transpile]
---

# Payload CLI vs Next: импорты в конфиге и коллекциях

## Симптом

`npm run dev` / `next build` работают, но `npx payload generate:types` (или `generate:importmap`) падает, как только в граф `payload.config.ts` попадает первый локальный импорт:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../collections/Users'      # extensionless relative
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@/lib'                       # tsconfig-paths alias
Error ... { code: 'ERR_REQUIRE_ASYNC_MODULE' }                                  # tsx transpile на Node 24
```

## Корень

Два разных загрузчика одного и того же файла:

- **Next-рантайм** (dev/build) резолвит и extensionless relative (`./collections/Users`), и tsconfig-paths (`@/lib/...`) — у него bundler-resolution.
- **Payload CLI** грузит `payload.config.ts` через Node-ESM (на Node 24). Node-ESM **не** добавляет расширения и **не** знает про tsconfig `paths`. Поэтому `./collections/Users` и `@/lib/...` для него не существуют. А режим с `tsx`-транспиляцией на Node 24 спотыкается об `ERR_REQUIRE_ASYNC_MODULE` (require() асинхронного ESM).

`import type {...}` не считается — он стирается при транспиляции/type-stripping, до резолва не доходит. Падают только **value**-импорты.

## Решение

В `payload.config.ts` и во **всех** `collections/*.ts` (и любых модулях, которые они тянут value-импортом) — **относительные пути с явным `.ts`**:

```ts
// payload.config.ts
import { Users } from './collections/Users.ts';     // не './collections/Users'
collections: [Users],

// collections/Users.ts
import { isAdmin } from '../lib/auth/rbac.ts';       // не '@/lib/auth/rbac'

// lib/auth/rbac.ts — type-only можно оставить алиасом, он стирается:
import type { User } from '@/payload-types';
```

`tsconfig.json` (флаг легален при `noEmit: true`):

```jsonc
{ "compilerOptions": { "allowImportingTsExtensions": true } }
```

CLI звать через npm-обёртки с `--disable-transpile` (нативный TS Node 24, минует tsx-баг):

```jsonc
// package.json scripts
"generate:types": "payload generate:types --disable-transpile",
"generate:importmap": "payload generate:importmap --disable-transpile"
```

`--disable-transpile` обязателен И требует расширений (native ESM) — поэтому `.ts` и флаг идут в паре.

## Проверка

Оба окружения должны быть зелёными — проверять ОБА после правок графа конфига:
- CLI: `npm run generate:types` → «Types written…», нужный union в `payload-types.ts`.
- Next: `npm run build` → Compiled successfully; `tsc --noEmit` чисто (без `.ts` + флаг будет `TS5097`).

## Профилактика

- Любая новая коллекция/хелпер в графе `payload.config` — сразу относительный `.ts`-импорт, не `@/`, не extensionless. Касается каждой collection-задачи (Pet Aggregator Plan 1 T5–T9 и далее).
- `import type` — единственное исключение, где `@/` безопасен.
- Один и тот же файл грузят два резолвера — «работает в `next dev`» НЕ значит «работает в `payload` CLI». Гонять обе команды.

## Связанное

- `docs/solutions/payload/next-multiple-root-layouts.md`
- `docs/superpowers/plans/2026-05-28-plan-1-foundation.md` (T5; T6–T9 — те же импорты)
- Замечание памяти проекта: критическая поправка №4 «Dual-env импорты».
