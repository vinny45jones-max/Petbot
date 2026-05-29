---
title: Standalone Payload-скрипт падает под tsx (@next/env loadEnvConfig undefined) — запускать нативным Node 24
date: 2026-05-29
module: pet-aggregator
problem_type: runtime_error
domain: payload
symptoms:
  - "TypeError: Cannot destructure property 'loadEnvConfig' of 'import_env.default' as it is undefined (payload/dist/bin/loadEnv.js)"
  - "Краш на import { getPayload } from 'payload' в скрипте, запущенном через tsx — до любого обращения к БД"
  - "DATABASE_URL / PAYLOAD_SECRET пустые: dotenv/config грузит только .env, а секреты лежат в .env.local"
root_cause: integration_drift
resolution_type: env_setup
severity: high
stack: [payload-cms, next.js, node24, tsx, dotenv, typescript]
tags: [payload-local-api, seed-script, esm-cjs-interop, next-env, dotenv, env-local]
related:
  - docs/solutions/payload/dual-env-config-imports.md
  - docs/solutions/payload/next-multiple-root-layouts.md
---

# Standalone Payload-скрипт: запускать нативным Node, не tsx

## Проблема

Скрипт с локальным Payload API (`getPayload({ config })`) — сид, миграция, обслуживание — крашится под `tsx scripts/seed.ts` ещё до подключения к БД. Отдельно: даже починив запуск, секреты не подхватываются, потому что план использовал `import 'dotenv/config'`, который грузит только `.env`, а `DATABASE_URL`/`PAYLOAD_SECRET` лежат в `.env.local` (Next-конвенция).

## Симптомы

```
TypeError: Cannot destructure property 'loadEnvConfig' of 'import_env.default' as it is undefined.
    at loadedEnvFiles (.../payload/dist/bin/loadEnv.js:3:9)
    at .../payload/dist/exports/node.js:4:25
```

Падает прямо на `import { getPayload } from 'payload'` (index тянет `exports/node.js` → `bin/loadEnv.js`, тот исполняется при импорте). Admin-панель и SSR при этом работают — баг только в standalone-запуске.

## Что не сработало

- **`import 'dotenv/config'` (как в плане).** Грузит только `.env`. В проекте `.env` отсутствует, секреты в `.env.local` → `connectionString`/`secret` пустые, getPayload падает на коннекте.
- **Запуск через `tsx scripts/seed.ts`.** Краш в `loadEnv.js` (см. симптом) до любой полезной работы. tsx/esbuild ломает CJS-interop `@next/env`.

## Решение

Запускать нативным **Node 24** (стрипает `.ts` по умолчанию, ESM-синтаксис автодетектится) и грузить `.env.local` явно до `payload.config`:

`package.json`:
```json
"seed": "node scripts/seed.ts"
```

`scripts/seed.ts` (верх):
```ts
import { config as loadEnv } from 'dotenv';
import { getPayload } from 'payload';
import { citiesBY } from '../lib/seeds/cities-by.ts';

loadEnv({ path: '.env.local' }); // секреты Next-конвенции
loadEnv();                       // .env как fallback, не перезапишет заданное

async function main() {
  // динамически: payload.config читает process.env при вычислении — env уже загружен
  const { default: config } = await import('../payload.config.ts');
  const payload = await getPayload({ config });
  // ...
}
```

Под Node `getPayload` запускает push-схему сам (dev, `NODE_ENV !== 'production'`) — отдельный `next dev` для миграции не нужен.

## Почему это работает

`@next/env` — CJS-модуль с `__esModule: true`, именованным `loadEnvConfig` и **без** `default`-экспорта. Payload `loadEnv.js` делает:

```js
import nextEnvImport from '@next/env';
const { loadEnvConfig } = nextEnvImport;  // строка 3
```

- **tsx/esbuild:** видит `__esModule: true` → `__importDefault` возвращает модуль как есть → `nextEnvImport.default` = `undefined` → деструктуризация падает.
- **Нативный Node:** для CJS-зависимости default-импорт = `module.exports`, где `loadEnvConfig` есть → работает.
- **Next-бандлер (webpack/turbopack):** полифиллит interop, потому admin/SSR никогда не падали.

Бонус под Node: штатный payload `loadEnv` (через `@next/env`) сам грузит `.env.local` — мой ручной dotenv становится подстраховкой, но оставлен для явности и независимости от внутренностей Payload.

## Профилактика

- **Любой** standalone-скрипт с локальным Payload API запускать `node script.ts`, НЕ `tsx`/`ts-node`. Закрепить в `package.json` scripts.
- В CI (Plan 1 T19) сид/миграции гонять тем же `node`, иначе пайплайн словит тот же краш.
- Секреты грузить из `.env.local` (или штатным payload loadEnv), не полагаться на `dotenv/config` → `.env`.
- Граница применимости: остальные `getPayload` в Plan 1 (T11–T17) живут в Next-роутах/SSR — там interop полифиллится бандлером, бага нет. Правило про `node` касается только standalone-скриптов: CI-сид (T19) и сиды/миграции Планов 2–6.

## Связанное

- `docs/solutions/payload/dual-env-config-imports.md` — тот же класс ESM/CJS-граблей, но вокруг `payload generate:types/importmap` и импортов в конфиге.
- `docs/solutions/payload/next-multiple-root-layouts.md` — T4-фикс admin-панели.
