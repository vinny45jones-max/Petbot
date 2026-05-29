---
title: "CI красный при локально зелёном: env-parity, отсутствующий eslint, lhci, axe heading-order"
date: 2026-05-29
module: pet-aggregator
problem_type: pitfall
domain: devops
severity: high
applies_when:
  - "первый прогон GitHub Actions CI после настройки (P1 T19-T20)"
  - "e2e тестирует условно-рендерящийся (env-gated) UI"
  - "в CI есть шаг npm run lint или lhci"
  - "локально всё зелёное, а CI падает"
stack: [GitHub Actions, Next.js, Playwright, ESLint, Lighthouse, axe-core, Payload]
tags: [ci, e2e, env-parity, eslint, flat-config, lighthouse, lhci, axe, a11y, next-lint]
related: [next15-async-apis, railway-monorepo-deploy]
---

# CI красный при локально зелёном: env-parity, отсутствующий eslint, lhci, axe heading-order

## Контекст

P1 T19-20 добавили GitHub Actions CI (typecheck → lint → unit → e2e → build → lighthouse) + axe a11y-тесты. Локально всё зелёное (typecheck 0, lint 0 err, unit 26/26, build, a11y), но первый push дал красный CI. Каталог причин — все маскируются локальной зеленью.

## Суть (каталог гоч)

1. **Env-gated UI: e2e зелёный локально, красный в CI.**
   `login/page.tsx` рендерит блок Telegram-логина только при `process.env.TELEGRAM_BOT_USERNAME` (`{botUsername && (...)}`). e2e `auth.spec.ts` ждёт текст «Войти через Telegram». Локально переменная в `.env.local` → блок есть → зелено. В CI переменной нет → блока нет → тест падает.
   **Фикс:** задать gating-env в CI-шаге e2e (placeholder достаточно — любой непустой делает условие truthy; env наследуется в дочерний `npm run dev` webServer playwright).
   **Правило:** e2e на условно-рендерящемся UI требует в CI те же env, что включают рендер локально. Иначе тест проверяет конфиг, а не код.

2. **ESLint вообще не настроен → CI lint падает.**
   Этот вариант create-next-app не поставил eslint (нет `eslint`/`eslint-config-next` в devDeps, нет конфига). `next lint` в CI падает/висит на интерактивном промпте. T1 «настроить lint» по факту не выполнил это.
   **Фикс:** flat-config `eslint.config.mjs` (FlatCompat + `next/core-web-vitals`+`next/typescript`), deps `eslint@^9` + `eslint-config-next@<пин next>` + `@eslint/eslintrc@^3`.

3. **После установки eslint `next build` начинает линтить.**
   Без eslint `next build` молча скипает lint. Поставил eslint → build гоняет lint и падает на error-уровне. Значит lint обязан быть 0 **errors** (warnings ок). `@typescript-eslint/no-explicit-any` на placeholder-`any` (до генерации payload-types) → понизить до `warn`, иначе и lint, и build красные.

4. **lhci: нужен build ПЕРЕД stationary start + target для upload.**
   `lighthouserc.js` `startServerCommand: 'npm run start'` (= `next start`) требует прод-сборку. План добавил шаг lhci, но НЕ добавил `npm run build` перед ним → `next start` без `.next` падает. Добавить `- run: npm run build` (с env DATABASE_URL+PAYLOAD_SECRET) до lhci.
   `lhci autorun` без `upload.target` может упасть на upload-стадии → пин `upload: { target: 'filesystem' }`.
   Только `categories:accessibility` стоит `error` (гейт); perf/seo — `warn` (не валят CI). a11y-гейт подкреплён axe (см. п.5) → проходит.

5. **axe heading-order: общий компонент бьёт ВСЕ страницы.**
   Footer с `<h3>`-заголовками колонок после `<h1>` страницы → `heading-order` «Heading levels should only increase by one» на каждой странице (footer общий). Локально ловится только если гоняешь axe e2e.
   **Фикс:** footer-заголовки → `<h2>` (h1→h2 ок; понижения уровня axe разрешает).

## Почему это важно

Локальная зелень обманчива по нескольким независимым причинам сразу: `.env.local` (env-parity), отсутствие eslint в build (скип lint), Windows-специфика lhci (см. ниже). Вывод: первый CI воспринимать как настоящий гейт, гонять до зелёного итеративно; не верить «локально же работает».

**lhci на Windows локально не показатель:** падает `EPERM, Permission denied` при чистке temp Chrome (`chrome-launcher destroyTmp`/`rmSync`) уже ПОСЛЕ прогона аудита. Это баг очистки на Windows, не провал аудита. На ubuntu CI ок. Для локальной валидации a11y-гейта опираться на axe (0 нарушений ⇒ LH accessibility ≈1.0).

## Когда применять

- первый CI после настройки пайплайна
- e2e на env-gated UI (фиче-флаги, опциональные интеграции)
- добавляешь lint/lighthouse в CI
- «локально зелено — CI красно»

## Примеры

CI e2e-шаг с gating-env (`.github/workflows/ci.yml`):
```yaml
      - run: cd web && npm run test:e2e
        env:
          DATABASE_URL: postgresql://pet:pet@localhost:5432/pet_aggregator_test
          PAYLOAD_SECRET: ci-test-secret-32-characters-aaaa
          TELEGRAM_BOT_USERNAME: pet_aggregator_bot   # иначе login-e2e падает
      - run: cd web && npm run build                  # обязателен ПЕРЕД lhci
        env: { DATABASE_URL: ..., PAYLOAD_SECRET: ... }
      - name: Lighthouse CI
        run: cd web && npx lhci autorun
        env: { DATABASE_URL: ..., PAYLOAD_SECRET: ... }
```

eslint flat-config (`web/eslint.config.mjs`):
```js
import { FlatCompat } from '@eslint/eslintrc';
const compat = new FlatCompat({ baseDirectory: __dirname });
export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { rules: { '@typescript-eslint/no-explicit-any': 'warn' } },  // placeholder до payload-types
  { ignores: ['.next/**', 'node_modules/**', 'tests/**', '*.config.*'] },
];
```

## Связанное

- [[next15-async-apis]] — другой случай «typecheck зелёный, build красный» (нужно гонять build, не только typecheck)
- [[railway-monorepo-deploy]] — деплой того же P1 T19
