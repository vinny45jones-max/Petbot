# Деплой сайта Pet Help

Сайт — это статический Vite/React проект в папке `web/`. Ниже два варианта деплоя. Начинать лучше с Vercel — быстрее и без доп. файлов.

## Вариант 1. Vercel (рекомендуется)

1. Зайти на <https://vercel.com>, войти через GitHub.
2. "Add New Project" → выбрать репозиторий `Pet project`.
3. В настройках проекта указать:
   - **Root Directory:** `web`
   - **Framework Preset:** Vite (должно определиться автоматически)
   - **Build Command:** `npm run build` (по умолчанию)
   - **Output Directory:** `dist` (по умолчанию)
4. Нажать **Deploy**. Через ~1 минуту Vercel выдаст URL вида `pet-project-xxx.vercel.app`.
5. При каждом `git push` в ветку `main` Vercel будет пересобирать и публиковать сайт автоматически.

Переменные окружения **не нужны** — весь сайт статический.

## Вариант 2. Railway (в одном проекте с ботом)

В проекте уже есть один Railway service для Python-бота. Сайт можно добавить вторым service в тот же проект.

1. В существующем Railway project → **New Service → GitHub Repo** → тот же репозиторий.
2. В **Settings → Source** указать **Root Directory:** `web`.
3. Railway должен сам прочитать `web/railway.json` и понять:
   - build: `npm ci && npm run build`
   - start: `npm run start` (запускает `serve -s dist` на порту `$PORT`)
4. В **Settings → Networking** → **Generate Domain**, чтобы получить публичный адрес.
5. Переменные окружения не нужны.

## Что проверено и готово

- `web/package.json` — добавлен `serve` в dependencies и скрипт `npm run start`.
- `web/railway.json` — конфиг для Railway.
- `web/index.html` — `meta description` актуален (волонтёрский проект Ирины Комоловой).
- `vite build` отрабатывает без ошибок (`dist/` ~250 KB, gzip ~75 KB).
- Все удалённые файлы-заготовки (`favicon.svg`, `App.css`, `assets/hero.png` и т.п.) нигде не импортируются.

## Локальная проверка прод-сборки

```bash
cd web
npm ci
npm run build
npm run start   # http://localhost:3000
```
