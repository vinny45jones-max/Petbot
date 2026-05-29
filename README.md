# Pet Aggregator BY

Белорусский веб-агрегатор животных: помогает пристраивать животных и снижает риск
усыпления в муниципальных службах отлова. Подробности — в `docs/`.

Репозиторий содержит две части:

## Веб-агрегатор

Основной продукт — Next.js 15 + Payload CMS 3. Код в `web/`.
См. [`web/README.md`](web/README.md).

## Telegram-бот (legacy)

Вспомогательный канал (фаза 2): бот-генератор объявлений о пристройстве на aiogram.
Точка входа — `bot.py`. Конфиг деплоя — корневой `railway.json`.

## Документация

- Ресёрч: [`docs/research/`](docs/research/)
- Спецификация: [`docs/superpowers/specs/`](docs/superpowers/specs/)
- Планы MVP: [`docs/superpowers/plans/`](docs/superpowers/plans/)
- База знаний (решения, паттерны): [`docs/solutions/`](docs/solutions/)
