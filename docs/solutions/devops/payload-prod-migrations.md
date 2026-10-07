# Payload в проде: схема только через migrations на preDeploy

**Когда:** 07.10.2026, первая выкатка Plans 2–3 на Railway.

## Симптом
Деплой SUCCESS, `/api/health` 200, но `/animals`, `/organizations`, sitemap — 500:
`relation "animals" does not exist`. Health проверял только `cities` (таблица Plan 1).

## Причина
- Payload push работает только при `NODE_ENV !== 'production'`; `next start` в проде схему не трогает.
- `payload migrate` на деплое не вызывался → прод-БД = то, что когда-то залили руками (Plan 1, маркер `dev|-1` в `payload_migrations`).
- На БД с маркером `dev` `payload migrate` уходит в интерактивный промпт → в non-interactive зависает.

## Решение (как `prisma migrate deploy` в linkedin-ts / eXhibit)
1. Baseline: на **пустой** БД `npm run migrate:create -- baseline` (удалить старые миграции и их `.json`-снимки, иначе получится дифф от старого снимка).
2. В сгенерённом файле: `import { type MigrateUpArgs, type MigrateDownArgs, sql }` — без `type` падает под `--disable-transpile`.
3. Скрипты: `"migrate": "payload migrate --disable-transpile"`, `"migrate:create": "payload migrate:create --disable-transpile"`; `engines.node = 24.x`.
4. `web/railway.json`: `"preDeployCommand": ["npm run migrate"]` — упала миграция → новая версия не стартует.
5. `/api/health/ready`: в prod сверяет `migrations` из `@/migrations` с `payload_migrations` → 503 со списком `pending`. Railway healthcheck → он.
6. CI: `NODE_ENV=production npm run migrate` на пустой БД + `npm run migrate:create -- drift-check --skip-empty` и провал, если `git status --porcelain migrations` не пуст (коллекции изменены без миграции).
7. Raw-SQL (sequence, FTS) остаётся в идемпотентном `onInit` — migrate-CLI его не создаёт, создаёт первый старт приложения.

## Переход существующей прод-БД (пустой)
`ALTER SCHEMA public RENAME TO backup_YYYYMMDD; CREATE SCHEMA public;` (обратимо) → push → preDeploy зальёт схему → справочники вернуть `INSERT … SELECT` из бэкапа (enum приводить через `::text::public.enum_…`, потом `setval` для id).

## Рабочий цикл
Изменил коллекцию → `npm run migrate:create -- <имя>` → закоммитить `.ts` + `.json` + `index.ts`. Локально dev-БД по-прежнему на push.
