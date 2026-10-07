# Апгрейд Next 15.4 → 16.3 с Payload 3

**Когда:** 07.10.2026. Next 15.4.x перестал получать security-патчи (CVE июль–сентябрь 2026 закрыты только в 15.5.x и 16.3.8), а Payload не поддерживает 15.5 (peer: `>=15.4.11 <15.5.0 || >=16.3.3`). Выход — только Next 16.

## Что сломалось и как чинили

| Симптом | Причина | Фикс |
|---|---|---|
| `npm install` ERESOLVE `payload@3.90.2` | lock держит 3.85 | удалить `package-lock.json` + `node_modules`, `npm install` |
| build: `TypeError: e.split is not a function` в `app/sitemap.ts` | Next 16: `id` в `sitemap({ id })` при `generateSitemaps` — **Promise**; tsc не ловит, сигнатура ручная | `sitemap(props: { id: Promise<string> })`, `const id = await props.id` |
| `next lint` нет | удалён в 16 | `"lint": "eslint ."`, конфиг на `eslint-config-next/core-web-vitals` + `/typescript` напрямую (без FlatCompat) |
| lint error `setState synchronously within an effect` | react-hooks v7 в eslint-config-next 16 | чтение localStorage через `useSyncExternalStore` (server snapshot = скрыто) |
| tsc: `reactCompiler` нет в `ExperimentalConfig` | вынесен на верхний уровень | удалить (false — дефолт) |
| `web/AGENTS.md`, `web/CLAUDE.md` появились сами | `next dev` генерирует, указывают на `node_modules/next/dist/docs/` | коммитить (иначе вечно dirty) |
| `tsconfig.json`: `jsx: react-jsx`, `.next/dev/types` | Next 16 правит сам при build | коммитить |

## Окружение
- Node ≥20.9 обязателен; Node 20 EOL 30.04.2026 → CI и `engines.node` = 22.
- Локальный build требует живую БД (sitemap/generateStaticParams ходят в Payload). Порт 5432 может держать «призрак» `com.docker.backend` → поднять тот же том на другом порту и передать `DATABASE_URL`.

## Проверка
unit 123/123, tsc 0, lint 0 errors, build 0, `next start` — 10 маршрутов 200 (/, /animals, /admin, sitemap, robots…). e2e `auth`/`catalog urgent` падают и на Next 15 — проблема фикстур, не апгрейда.
