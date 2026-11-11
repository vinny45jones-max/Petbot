---
title: ExpressPay (ЕРИП / карта) — что на самом деле в API и как проверить без договора
date: 2026-11-11
module: pet-aggregator
problem_type: integration
domain: payments
severity: high
applies_when:
  - "Интеграция приёма платежей в Беларуси через ExpressPay (express-pay.by): счета ЕРИП, оплата картой, уведомления"
  - "План или пример кода написан «по памяти» и помечен как требующий сверки с документацией"
stack: [expresspay, nextjs, payload-cms, node-crypto]
tags: [expresspay, erip, payments, webhook, hmac-sha1, sandbox, idempotency]
related:
  - docs/superpowers/plans/2026-05-28-plan-5-donations.md
---

# ExpressPay: что в API на самом деле

Документация: https://express-pay.by/docs/api/v1 (одна длинная страница, ~200 тыс. символов; читать частями). Сверено 11.11.2026. План Plan 5 ошибался в пяти местах — ниже правильное.

## Адреса и токен

- Прод `https://api.express-pay.by/v1`, песочница `https://sandbox-api.express-pay.by/v1`.
- Токен — в query: `?token=...`. Номер услуги в запросе не нужен: услуга определяется токеном.

## Подпись запросов

- HMAC-SHA1, ключ — секретное слово из ЛК, результат upper-case hex, параметр `&signature=` в query.
- Подписываются **значения** полей, склеенные в порядке, заданном для метода; отсутствующие поля дают пустую строку:
  - счёт ЕРИП: token, accountno, amount, currency, expiration, info, surname, firstname, patronymic, city, street, house, building, apartment, isnameeditable, isaddresseditable, isamounteditable, emailnotification, returninvoiceurl;
  - статус счёта ЕРИП: token, invoiceno;
  - счёт по карте: token, accountno, expiration, amount, currency, info, returnurl, failurl, language, …;
  - форма оплаты: token, cardinvoiceno;
  - статус карты: token, cardinvoiceno, language.
- Если подпись в ЛК выключена — параметр не нужен.

## Счета

- `Amount` — **с запятой**: `"25,00"`. `Currency` — числом ISO 4217: `933` (BYN).
- ЕРИП: `POST /invoices` → `InvoiceNo`, `InvoiceUrl`. Плательщик в ЕРИП вводит **наш `AccountNo`** (до 30 символов).
- Карта — **два запроса**: `POST /cardinvoices` (поля AccountNo, Expiration `yyyyMMdd`, Amount, Currency, Info, ReturnUrl, FailUrl, Language) → `CardInvoiceNo`; затем `GET /cardinvoices/{no}/payment` → `FormUrl` (туда редирект).
- Ошибки приходят телом при HTTP 200: ЕРИП — `{ Error: { Code, Msg } }`, карта — `{ ErrorCode, ErrorMessage }`. Проверять тело, не только статус.

## Статусы — у ЕРИП и карты разные коды

- ЕРИП `Status`: 1 ждёт, 2 просрочен, 3 оплачен, 4 частично, 5 отменён, 6 оплачен картой, 7 возврат, 8 частичный возврат.
- Карта `CardInvoiceStatus`: 0 зарегистрирован, 1 холд, 2 оплачен, 3 отмена, 4 возврат, 5 3-D Secure, 6 отклонён.

## Уведомления (webhook)

- POST form-полями: `Data` — JSON-строка, `Signature` — HMAC-SHA1 **сырой строки Data** (только если подпись включена в ЛК).
- В Data: `CmdType` (1 платёж, 2 отмена, 3 смена статуса), `Status`, `AccountNo`, `InvoiceNo`, `CardInvoiceNo` (если картой), `Amount` (с запятой), `Created`.
- Ответ 200 = принято; иначе повторы через 30 с, 3 мин, 30 мин, 3 ч.
- Телу не доверять: найти платёж по своему `AccountNo` и подтвердить статус запросом к API по номеру счёта **из своей БД**. Тогда поддельное уведомление ничего не сделает даже без подписи.

## Песочница (проверка без договора)

Токены из документации, работают без регистрации:

| Токен | Что | Подпись |
|---|---|---|
| `a75b74cbcfe446509e8ee874f421bd64` | счета ЕРИП | выключена |
| `a75b74cbcfe446509e8ee874f421bd66` | счета ЕРИП | секрет `sandbox.expresspay.by` |
| `a75b74cbcfe446509e8ee874f421bd67` | оплата картой | секрет `sandbox.expresspay.by` |

`bd65` с этим секретом даёт 401 — у него другой секрет. Песочница возвращает тестовые счета с **фиксированными** статусами (ЕРИП — «ждёт», карта — «отклонён»), поэтому путь «оплачено» вживую не воспроизвести — только unit-тестами.

## Как это устроено в проекте

- `web/lib/payments/` — чистые функции и клиент с подменяемым `fetch`; роуты — тонкие обёртки над сервисами с зависимостями (`start-donation`, `handle-notification`, `reconcile`).
- Без `EXPRESSPAY_TOKEN` приём выключен: API 503, формы «скоро заработает», сверка пропускается.
- URL для уведомлений в ЛК: `<сайт>/api/donations/expresspay/webhook`. Сверка зависших: `POST /api/cron/donations-reconcile` (Bearer `CRON_SECRET`), раз в час из Railway cron-сервиса (`npm run cron:reconcile`).
