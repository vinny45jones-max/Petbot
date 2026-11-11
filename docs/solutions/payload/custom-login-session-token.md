---
title: Свой вход (Telegram, magic-link) в Payload 3 — сессию выпускать функциями Payload, а не jsonwebtoken
date: 2026-11-11
module: pet-aggregator
problem_type: auth-bug
domain: payload
severity: critical
applies_when:
  - "Вход не через /api/users/login (OAuth, Telegram, magic-link), а cookie payload-token ставим сами"
  - "После «успешного» входа payload.auth / /api/users/me отдают user=null"
  - "Одноразовая ссылка из письма в Chrome отвечает «уже использована» с первого клика"
stack: [payload-cms, nextjs, jose]
tags: [payload-auth, jwt, sessions, magic-link, critical-ch]
related:
  - docs/solutions/payload/parallel-logins-same-user-lose-sessions.md
  - docs/solutions/payload/staff-2fa-enforcement.md
---

# Свой вход в Payload 3: токен и сессия

## Симптом

Вход через Telegram и magic-link отвечал 200 / редиректом в кабинет и ставил cookie `payload-token`, но сайт видел гостя: `/api/users/me` → `user: null`, в шапке «Войти». Вход по email/паролю работал.

## Причины (три, все нужны)

1. **Токен не того формата.** Свой `jsonwebtoken.sign(..., PAYLOAD_SECRET)`. Payload 3.90 (`auth/strategies/jwt.js`) проверяет:
   - секретом `payload.secret` = `sha256(PAYLOAD_SECRET).hex.slice(0, 32)`, не сырым;
   - заголовок JWT `authVersion === JWT_AUTH_VERSION`;
   - при `auth.useSessions` (по умолчанию) — `sid` в токене и запись с этим id в `users.sessions`.
2. **`auth.verify: true`.** Стратегия JWT пускает только `_verified`. Пользователь, созданный `payload.create` из Telegram, получал `_verified=false` (и Payload слал письмо подтверждения на служебный `tg-…@telegram.local`).
3. **Chrome открывает GET дважды.** `withPayload` ставит на все ответы `Accept-CH`/`Critical-CH: Sec-CH-Prefers-Color-Scheme`. При первом заходе на origin Chrome перезапрашивает страницу с хинтом (внутренний 307 на тот же URL). Одноразовый токен тратился первым запросом, второй → «неверный токен». То же делают почтовые сканеры ссылок.

## Решение

- `web/lib/auth/session.ts` повторяет `operations/login`: `payload.db.findOne` (сырой документ) → `addSessionToUser` (`payload/shared`) → `getFieldsToSign` → `jwtSign({ secret: payload.secret, tokenExpiration })` (`payload`). Cookie maxAge = `auth.tokenExpiration`.
- Telegram-пользователь создаётся с `_verified: true` и `disableVerificationEmail: true`; ранее созданных неподтверждённых — подтверждаем при входе. Magic-link подтверждает почту (`_verified: true`).
- Ссылка из письма → страница `/login/magic?token=…` (GET без побочных эффектов, `referrer: no-referrer`), форма сама отправляет POST на `/api/auth/magic-link/consume`, там тратится токен, 303 → `/me`. GET старого адреса API только перенаправляет на страницу.

## Как ловить

- Проверять вход не по наличию cookie, а по `GET /api/users/me` → `user` не null (e2e `tests/e2e/login-telegram-magic.spec.ts`).
- Любой одноразовый токен в ссылке — тратить только на POST.
- Диагностика двойного GET: Playwright `page.on('response')` + `allHeaders()` — у первого 307 будет только `location` на тот же URL (синтетический редирект браузера).
- `jose` в vitest под jsdom: «payload must be an instance of Uint8Array» → `// @vitest-environment node` в файле теста.
