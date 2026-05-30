---
title: "Raw-SQL объекты (sequence, FTS) в push-based Payload — через onInit, не через migrate"
date: 2026-05-30
module: pet-aggregator
problem_type: integration_issue
domain: backend
symptoms:
  - "`next dev` / node-скрипт виснет на push-промпте: «You're about to delete search_vector column in animals table with N items — DATA LOSS WARNING — Accept warnings and push schema? (y/N)»"
  - "create животного падает: «The following field is invalid: petNumber» — pet_number_seq сброшен push'ем к 1, nextval даёт дубль по unique"
  - "`npx payload migrate` виснет (после push в БД лежит dev-маркер `dev|-1`), либо откатывает миграцию (нет таблицы payload_migrations на свежей БД)"
  - "`npx payload migrate:create` падает: ERR_REQUIRE_ASYNC_MODULE на Node 24"
root_cause: integration_drift
resolution_type: code_fix
severity: high
stack: [payload-cms, postgres, drizzle, next.js, node24]
tags: [payload-push, oninit, raw-sql, postgres-sequence, tsvector, fts, generated-column, expression-index]
related:
  - docs/solutions/payload/dual-env-config-imports.md
  - docs/solutions/payload/standalone-script-node-not-tsx.md
  - docs/solutions/payload/local-api-bypasses-access.md
  - docs/solutions/devops/railway-monorepo-deploy.md
---

# Raw-SQL объекты в push-based Payload — через onInit, не через migrate

## Проблема

Проект на Payload работает в **push-режиме** (dev: `postgresAdapter` push=true автосинкает схему; prod на Railway = `next start`, NODE_ENV=production, push off, `payload migrate` НЕ запускается — см. railway-monorepo-deploy). Когда нужен **raw-SQL объект, которого нет в Payload-схеме** — Postgres sequence для сквозной нумерации, tsvector + GIN для полнотекстового поиска, — план «через миграцию» ломается во всех окружениях, а наивный onInit конфликтует с push.

## Симптомы

```
# next dev / любой node-скрипт после того, как в animals появились строки:
? Warnings detected during schema push:
· You're about to delete search_vector column in animals table with 4 items
DATA LOSS WARNING ... Accept warnings and push schema to database? » (y/N)   ← виснет (нет stdin)

# создание животного:
ValidationError: The following field is invalid: petNumber   ← pet_number_seq = 1, а max(pet_number) = 4

# payload migrate:create (Node 24):
Error [ERR_REQUIRE_ASYNC_MODULE]: require() cannot be used on an ESM graph with top-level await
```

## Что не сработало

- **`payload migrate` (как в плане).** Три отдельных провала: (1) `migrate:create` под tsx на Node 24 → ERR_REQUIRE_ASYNC_MODULE (лечится `--disable-transpile`, как generate:types — см. dual-env-config-imports); (2) сгенерённый файл миграции импортит `MigrateUpArgs/MigrateDownArgs` без `type` → под `--disable-transpile` (нативный strip) падает «does not provide an export» (нужен `import { type MigrateUpArgs, ... }`); (3) после первого push в БД лежит pseudo-миграция `dev` с `batch=-1` → `payload migrate` виснет на промпте. И главное — **prod вообще не зовёт migrate**, так что файл миграции мёртв.
- **onInit со stored generated column.** `ALTER TABLE animals ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (...) STORED` + GIN. Работает ровно до первого push с данными в таблице: push видит «чужую» колонку (её нет в drizzle-схеме Payload) и требует подтверждения удаления (DATA LOSS) → в non-interactive (node/next dev) виснет.
- **Расчёт на стабильность sequence.** push при пересоздании схемы сбрасывает `pet_number_seq` к 1 (sequence не в его схеме), `CREATE SEQUENCE IF NOT EXISTS` не чинит уже существующий → nextval отдаёт номер ≤ max(pet_number) → unique-коллизия.

## Решение

Всё raw-SQL вынести в `payload.config` **onInit** — он гоняется на КАЖДОМ `getPayload` (dev push, prod `next start`, CI, скрипты), после того как push досинкал схему. Делать идемпотентно и так, чтобы push нечего было «удалять».

```ts
// payload.config.ts
import { sql } from 'drizzle-orm';

export default buildConfig({
  // ...
  onInit: async (payload) => {
    const db = (payload.db as any).drizzle;

    // 1) Sequence + САМОКОРРЕКЦИЯ до max(pet_number) — переживает сброс push'ем, без коллизий.
    await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS pet_number_seq START WITH 1 INCREMENT BY 1`);
    await db.execute(sql`
      DO $$
      DECLARE m bigint; cur bigint;
      BEGIN
        SELECT COALESCE(MAX(pet_number), 0) INTO m FROM animals;
        SELECT last_value INTO cur FROM pet_number_seq;
        IF m >= cur THEN PERFORM setval('pet_number_seq', m, true); END IF;  -- только вперёд
      END $$;
    `);

    // 2) FTS как EXPRESSION GIN-индекс, БЕЗ stored-колонки (push нечего удалять → не виснет).
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS animals_search_idx ON animals USING GIN ((
        setweight(to_tsvector('russian', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('russian', coalesce(description_plain, '')), 'B')
      ))
    `);
  },
});
```

Запрос FTS считает тот же tsvector **inline** (выражение обязано совпадать с индексом, иначе планировщик его не возьмёт):

```ts
const tsv = sql`(setweight(to_tsvector('russian', coalesce(name, '')), 'A') || setweight(to_tsvector('russian', coalesce(description_plain, '')), 'B'))`;
await db.execute(sql`SELECT id FROM animals WHERE status='published'
  AND ${tsv} @@ plainto_tsquery('russian', ${q})
  ORDER BY ts_rank(${tsv}, plainto_tsquery('russian', ${q})) DESC LIMIT ${limit}`);
```

## Почему это работает

- **onInit вместо migrate.** push управляет таблицами/колонками во всех окружениях; миграции в этом проекте не исполняются (dev — конфликт с dev-маркером, prod — `next start` без migrate). onInit — единственная точка, гарантированно отрабатывающая везде. `IF NOT EXISTS` + `setval … true` делают его идемпотентным и безопасным на повторных boot'ах.
- **Expression-индекс, а не stored-колонка.** Колонка попадает в introspection push'а как «лишняя» → попытка удаления → data-loss промпт → hang. Индекс по выражению push тоже может пересоздать, но это НЕ data-loss → без промпта; а корректность запроса не зависит от наличия индекса (только скорость).
- **setval только вперёд.** Защищает от сброса sequence push'ем и от импорта данных мимо sequence: nextval всегда > max(pet_number), номера не переиспользуются.

## Профилактика

- **Любой raw-SQL объект (sequence, FTS, частичные/выражательные индексы, расширения) в этом проекте — только через `onInit`, идемпотентно.** Не плодить миграции: они не исполняются ни в dev, ни в prod. Касается Plan 3–6 (cron-пересчёт urgency, доп. индексы и т.п.).
- **Никаких stored generated columns поверх push-схемы** — push будет их удалять. Нужен материализованный результат — либо регистрировать колонку через `afterSchemaInit` Payload (чтобы push о ней знал), либо expression-индекс + inline-выражение.
- **Счётчики на sequence всегда самокорректировать** `setval(seq, max(col), true)` в onInit.
- Если когда-нибудь подключать `payload migrate` на деплое (Railway releaseCommand): звать с `--disable-transpile`, в файлах миграций импортить `MigrateUpArgs/MigrateDownArgs` как `type`, и отключить push в prod — иначе те же грабли.

## Связанное

- `docs/solutions/payload/dual-env-config-imports.md` — `--disable-transpile` для payload CLI на Node 24 (тот же класс).
- `docs/solutions/payload/standalone-script-node-not-tsx.md` — запуск seed/maintenance-скриптов нативным node + загрузка env.
- `docs/solutions/payload/local-api-bypasses-access.md` — Local API в onInit/скриптах обходит access.
- `docs/solutions/devops/railway-monorepo-deploy.md` — prod = `next start`, миграции не запускаются.
