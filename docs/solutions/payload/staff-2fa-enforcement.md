---
title: 2FA для модераторов в Payload 3 — гейт в proxy обходится, проверять надо в Users.afterRead
date: 2026-11-11
module: pet-aggregator
problem_type: integration_issue
domain: payload
symptoms:
  - "Модератор без 2FA делает POST /api/users/login, берёт token и ходит в REST/GraphQL с заголовком Authorization: JWT <token> — proxy этого не видит"
  - "Users.access.admin закрывает админку, но не /api/* и не /api/graphql"
  - "activate 2FA отвечает not_enrolled, хотя секрет в БД записан"
  - "Свой jwt.sign({id, collection}, PAYLOAD_SECRET) — payload.auth возвращает user=null"
root_cause: auth_issue
resolution_type: code_fix
severity: critical
stack: [payload-cms, nextjs, otplib, jsonwebtoken, postgres]
tags: [payload-auth, two-factor, totp, jwt, proxy, access-control, security, hidden-fields]
related:
  - docs/solutions/payload/local-api-bypasses-access.md
  - docs/solutions/payload/parallel-logins-same-user-lose-sessions.md
  - docs/solutions/frontend/next16-payload-upgrade.md
---

# 2FA для модераторов в Payload 3 — гейт в proxy обходится, проверять надо в Users.afterRead

## Проблема
По плану 2FA-гейт стоял в middleware/proxy и смотрел cookie `payload-token`, а `Users.access.admin` закрывал админку. Финальное ревью нашло обход: Payload по умолчанию берёт токен и из заголовка `Authorization`, а `access.admin` действует только на UI админки и server functions. Модератору с одним паролем (без второго фактора) были доступны весь REST и GraphQL.

## Симптомы
- `curl -H "Authorization: JWT <token>" /api/users?limit=1000` от модератора без 2FA отдаёт всех пользователей.
- Роль в JWT (`saveToJWT`) живёт до 30 дней: повышенный до модератора или старый токен без `role` гейт в proxy не замечает.
- Cookie «2FA пройдена» `uid.exp.sig` переживала выход из аккаунта (12 ч).
- `findByID(..., overrideAccess: true)` не возвращает поле с `hidden: true`.

## Что не сработало
- **Гейт в proxy по cookie.** Токен может прийти заголовком, а роль в JWT устаревает. Proxy годится только для UX-редиректа `/admin → /2fa`.
- **Только `access.admin`.** Он не вызывается для REST и GraphQL коллекций.
- **Менять 82 вызова `isAdmin(user)` и `role === ...`.** Это долго, и что-нибудь обязательно забудешь.
- **Своя auth-strategy.** Стратегии перебираются по очереди, и если своя вернёт `null`, следом сработает стандартная JWT и выдаст немаскированного пользователя.

## Решение
1. **Токен только из cookie:** в `payload.config.ts` прописать `auth: { jwtOrder: ['cookie'] }`, у Users — `auth.removeTokenFromResponses: true`, чтобы логин не отдавал токен в JSON.
2. **Единая точка — `Users.hooks.afterRead`** (`web/lib/auth/twofa-session.ts`, `maskUnverifiedStaff`). Хук срабатывает, когда Payload поднимает пользователя по токену запроса: при `payload.auth({headers})` создаётся req с заголовками. Если документ — это владелец токена из cookie, он staff, а 2FA в этой сессии не пройдена, возвращаем `{...doc, role: 'citizen', twofaRequired: true}`. Тогда все проверки ролей (REST, GraphQL, админка, кабинеты Next) отказывают, и роль берётся из БД, а не из JWT. Чужие документы и вызовы без заголовка Cookie (сиды, cron, локальный API) хук не трогает.
3. **Cookie `twofa-ok` = `uid.sid.exp.hmac`.** `sid` берётся из `payload-token`, потому что в Payload 3.90 `useSessions` включён и в JWT есть `sid`. После выхода сессия удаляется, при новом входе `sid` новый, и старая cookie больше не подходит.
4. **Секрет и хеши кодов 2FA:** `hidden: true` и `access.read: () => false`, а читать их через `findByID({ overrideAccess: true, showHiddenFields: true })`.

## Почему это работает
- Payload проверяет JWT так (`node_modules/payload/dist/auth/strategies/jwt.js`):
  - подпись производным секретом `sha256(PAYLOAD_SECRET).hex.slice(0, 32)`, как в `payload/dist/index.js`;
  - защищённый заголовок `authVersion`;
  - `sid`, который должен быть в `user.sessions`.

  Пользователя после этого Payload поднимает `findByID` с `req`, а значит с `afterRead`. Маскирование в этом месте покрывает все пути аутентификации cookie-токеном.
- Без `jwtOrder: ['cookie']` токен из заголовка всё равно попал бы в тот же хук, но не смог бы пройти 2FA: в нём нет cookie `twofa-ok`. Отключать заголовок мы стали ради простоты рассуждений и чтобы не было второго канала.

## Профилактика
- E2E `web/tests/e2e/quality.spec.ts` «2FA модератора…» проверяет:
  - запрос с заголовком `Authorization` → 403;
  - в ответе логина нет `token`;
  - модератор без 2FA видит в `/api/users` только себя;
  - после выхода и повторного входа staff-эндпоинт снова 403.
- Unit `web/tests/unit/auth/twofa-session.test.ts` (cookie от прошлой сессии, чужой документ, вызов без Cookie). Фейковый payload в `twofa.test.ts` вырезает hidden-поля так же, как Payload.
- Правило: **права нельзя проверять в proxy/middleware Next по claims JWT**. Proxy только маршрутизирует, права проверяет Payload по данным из БД.

## Попутные грабли (Next 16, Payload 3.90)
- Next 16: `middleware.ts` переименован в `proxy.ts`, работает на Node runtime (можно `node:crypto`, `jsonwebtoken`). `NextResponse.rewrite(url, { status: 503 })` реально отдаёт 503 (проверено curl).
- Свой `jwt.sign(..., PAYLOAD_SECRET)` без `authVersion` и `sid` Payload не принимает: так сломан вход через Telegram и magic-link, см. И-25 в `docs/ПЛАН_ИЗМЕНЕНИЙ.md`. Сессию надо выдавать механизмом Payload.
- `verifyEmail` ставит `_verified` через `db.updateOne`, хуки коллекции не вызываются. Триггер «на подтверждение email» через `afterChange` не сработает.
- otplib 13: класса `authenticator` больше нет, API функциональный и асинхронный: `generateSecret`, `generate({secret})`, `verify({secret, token, epochTolerance: 30})` → `{ valid }`, `generateURI`.
