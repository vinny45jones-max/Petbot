---
title: Фильтры из URL откатываются до конца router.push — нужен useOptimistic
date: 2026-10-07
module: Pet Aggregator BY (web/catalog)
problem_type: ui_bug
domain: frontend
symptoms:
  - "Playwright locator.check: Clicking the checkbox did not change its state"
  - Галочка или радио в фильтре каталога не ставится сразу, а появляется после загрузки новой страницы
  - Красные e2e только на .check(), тест с selectOption зелёный
root_cause: race_condition
resolution_type: code_fix
severity: medium
stack: [Next.js 16, React 19, Playwright]
tags: [use-optimistic, use-transition, search-params, router-push, controlled-input, e2e, seed-data]
---

# Фильтры из URL откатываются до конца router.push — нужен useOptimistic

## Проблема
`FilterPanel` (`web/components/catalog/FilterPanel.tsx`) — контролируемые `<input checked={...}>`, значение берётся из `useSearchParams()`. `onChange` вызывает `router.push(...)`, а навигация асинхронная: React сразу перерисовывает контрол со старым URL, и галочка откатывается до конца серверного рендера. Пользователь видит «залипание», быстрые клики теряют друг друга (второй читает старый URL).

## Симптомы
- `locator.check: Clicking the checkbox did not change its state` — Playwright проверяет состояние сразу после клика.
- Падали 3 теста `tests/e2e/filters.spec.ts` (radio «Кошки», «Только срочные», город «Минск»); `selectOption` для сортировки проходил — `<select>` Playwright не перепроверяет.

## Что не сработало
- Менять тест (ждать URL, кликать через `.click()`) — прячет реальный UX-баг, у живого пользователя он остаётся.

## Решение
Оптимистичная копия query-строки, обновление внутри transition — паттерн из `node_modules/next/dist/docs/01-app/02-guides/interactive-apps.md`:

```tsx
const searchParams = useSearchParams();
const [, startTransition] = useTransition();
const [query, setQuery] = useOptimistic(searchParams.toString());
const sp = new URLSearchParams(query); // контролы читают это, не searchParams

function update(mutate: (next: URLSearchParams) => void) {
  const next = new URLSearchParams(query); // от оптимистичного — быстрые клики складываются
  mutate(next);
  next.delete('page');
  startTransition(() => {
    setQuery(next.toString());
    router.push(`${pathname}?${next.toString()}`);
  });
}
```

Коммит `0bbe6b7`.

## Почему это работает
`useOptimistic` держит новое значение, пока transition в ожидании; `router.push` внутри `startTransition` держит transition открытым до конца навигации. Когда приходит новый URL, оптимистичное значение сбрасывается на реальное — оно уже совпадает.

## Гоча при проверке: устаревший seed в локальной БД
После фикса локально падали тесты с `/Осталось \d+ дн\./` (filters, catalog, urgent) — на странице было «СРОЧНО · Истекает срок». Причина не в коде: `scripts/seed.ts` ставит `intakeDate = сегодня − 3 дня` только при создании и пропускает существующих животных, а локальная dev-БД засеяна давно → дедлайн прошёл. В CI БД сеется заново — там зелёное.

Лечение — обновить животных из службы отлова через Local API, обязательно с `legalDeadlineDate: null` (иначе хук в `lib/animal-hooks.ts` берёт старый дедлайн как ручной override):

```ts
await payload.update({ collection: 'animals', id, data: {
  intakeDate: new Date(Date.now() - 3 * 86400000).toISOString(),
  intakeFacility: a.intakeFacility,
  legalDeadlineDate: null,
}});
```

## Профилактика
- Любой контрол, чьё значение живёт в URL и меняется через `router.push/replace`, — через `useOptimistic` + `startTransition`. Признак проблемы: `checked`/`value` читает `useSearchParams()` напрямую.
- e2e `filters.spec.ts` на `.check()` ловит регресс: Playwright падает, если состояние откатилось.
- Локально «Осталось N дн.» красное, а в CI зелёное → сначала освежить `intakeDate`, потом искать баг.

## Связанное
- `docs/solutions/devops/ci-green-not-local-green.md`
- `docs/solutions/frontend/next16-payload-upgrade.md`
