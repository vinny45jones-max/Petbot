---
title: "Worktree ветвить от локального HEAD, не от origin: EnterWorktree baseRef=fresh берёт устаревший origin"
date: 2026-05-30
module: pet-aggregator
problem_type: workflow
domain: devex
severity: medium
applies_when:
  - "локальный main впереди origin (несколько планов смёржено локально, но НЕ запушено)"
  - "стартую новый план/фичу в изолированном worktree через EnterWorktree"
stack: [git-worktree, claude-code, payload-cms, next.js]
tags: [git-worktree, enterworktree, baseref, stale-origin, isolated-workspace, baseline]
related:
  - docs/solutions/payload/push-based-raw-sql-via-oninit.md
---

# Worktree ветвить от локального HEAD, не от origin

## Контекст

Проект работает «merge локально, push отдельно»: Plan 1 и Plan 2 смёржены в локальный `main`, но `main` на 18 коммитов **впереди** `origin/main` (не запушено). Каждый следующий план стартует в изолированном worktree и **зависит от кода предыдущего** (Plan 3 нужны коллекции Plan 2).

Нативный `EnterWorktree` (Claude Code) создаёт worktree с настройкой `worktree.baseRef`:
- `fresh` (**дефолт**) — ветка от `origin/<default-branch>`;
- `head` — от текущего локального HEAD.

Дефолт `fresh` + устаревший origin = worktree БЕЗ кода смёрженных-но-не-запушенных планов → сломанный baseline (нет коллекций/lib, от которых зависит новый план; тесты и tsc валятся на отсутствующих импортах).

## Правило

Когда локальный `main` впереди origin, **worktree ветвить от локального HEAD**, не от origin. Два способа:

1. **Ручной git + вход по path** (надёжно, не зависит от настройки):
   ```bash
   git worktree add ".claude/worktrees/<branch>" -b <branch> HEAD
   ```
   затем `EnterWorktree(path: "<абсолютный путь к worktree>")` — скилл явно разрешает входить в уже созданный worktree по `path`.

2. Либо выставить `worktree.baseRef: "head"` в `.claude/settings.json` (повлияет на ВСЕ будущие worktree; для этого проекта это и есть правильный дефолт). Риск: настройка может читаться на старте сессии, не подхватиться mid-session — способ 1 детерминирован.

После входа — догнать setup, которого нет в свежем worktree: скопировать gitignored secrets (`web/.env`), `npm install --legacy-peer-deps`, и **верифицировать baseline** (`tsc --noEmit` + `vitest run`) ДО реализации задач.

## Почему

`git worktree add ... HEAD` явно фиксирует базовый ref = текущий локальный коммит, минуя любые дефолты инструмента. Вход по `path` отдаёт управление жизненным циклом обратно нативному скиллу (cleanup на exit). Так получаем и корректный baseline, и нативное управление.

## Профилактика

- **Перед созданием worktree проверь дрейф:** `git rev-list --count origin/main..main`. Если > 0 — НЕ использовать `EnterWorktree(name:…)` с дефолтным `fresh`; ветвить от HEAD (способ 1).
- **Всегда верифицируй baseline** (tsc + тесты) сразу после setup worktree — ловит и stale-origin, и кривой `npm install`.
- Worktree без `node_modules` и без gitignored `.env*` — копировать env вручную из основного дерева (в этом проекте активен `web/.env`, НЕ `.env.local`).
- Альтернатива на корню проблемы: пушить `main` в origin после каждого плана — тогда `fresh` снова безопасен. Пока политика «merge локально» — ветвить от HEAD.

## Связанное

- `docs/solutions/payload/push-based-raw-sql-via-oninit.md` — другой baseline-чувствительный момент (onInit гоняется на каждом boot в worktree тоже).
