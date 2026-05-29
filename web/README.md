# Pet Aggregator BY — Web

Next.js 15 + Payload CMS 3 веб-приложение белорусского агрегатора животных.

## Локальная разработка

### Требования

- Node.js 20+
- Docker + Docker Compose (для Postgres)

### Старт

```bash
docker compose up -d postgres   # из корня репозитория
cd web
cp .env.example .env.local
# Заполнить .env.local своими значениями (минимум DATABASE_URL + PAYLOAD_SECRET)
npm install
npx payload generate:importmap
npm run dev
```

Открыть `http://localhost:3000`. Админка: `/admin` (первый юзер регистрируется через UI).

### Seed данных

```bash
npm run seed
```

### Тесты

```bash
npm test          # unit (Vitest)
npm run test:e2e  # e2e (Playwright)
npm run typecheck # TypeScript
npm run lint      # ESLint
```

## Переменные окружения

Полный список — в `.env.example`. Обязательные для запуска:

- `DATABASE_URL` — строка подключения Postgres
- `PAYLOAD_SECRET` — секрет ≥32 символов для подписи токенов

Опциональные (интеграции включаются по мере готовности): `TELEGRAM_BOT_USERNAME`/`TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`, `R2_*`, `SENTRY_DSN`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`.

## Деплой

Railway, проект `reasonable-commitment`, сервис `Petbot` (Root Directory `/web`, builder RAILPACK).
Push в `main` → автодеплой через GitHub-интеграцию Railway.
Конфиг деплоя — `web/railway.json` (healthcheck `/api/health`).
Env-vars прописываются в Railway dashboard.

## Структура

- `app/` — Next.js App Router
- `collections/` — Payload коллекции
- `lib/` — бизнес-логика, чистые функции
- `components/` — React-компоненты
- `tests/` — Vitest unit + Playwright e2e

## Документация

- Spec: `../docs/superpowers/specs/2026-05-28-pet-aggregator-design.md`
- План MVP: `../docs/superpowers/plans/`
- Ресёрч: `../docs/research/2026-05-28-pet-aggregator-research.md`
- База знаний / паттерны: `../docs/solutions/`
