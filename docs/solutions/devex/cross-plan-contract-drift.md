---
title: Межплановый дрейф контрактов в серии планов реализации
date: 2026-05-29
module: pet-aggregator
problem_type: workflow
domain: devex
severity: high
applies_when:
  - "Ревью серии из ≥2 планов реализации, где поздние планы ссылаются на символы ранних"
  - "Перед исполнением мульти-планового спека fresh-субагентами по очереди"
  - "План говорит «как в Plan N» / «сигнатура из Plan N — адаптировать»"
  - "Новый план дописан в уже существующую серию"
stack: [payload-cms, next.js, planning-docs]
tags: [cross-plan, contract-drift, plan-review, multi-plan-spec, payload-collections, consistency-check, code-review]
---

# Межплановый дрейф контрактов в серии планов реализации

## Контекст

Spec разбит на N последовательных планов (Pet Aggregator: P1–P6), которые исполняются fresh-субагентами по очереди. Каждый план берёт ранние как ground truth и переиспользует их функции, коллекции, поля. Изолированное ревью каждого плана по отдельности (что делали для P1–4 против writing-plans + spec-coverage) **пропускает целый класс багов — дрейф контрактов между планами.**

Эмпирика проекта: из 3 найденных блокеров **3/3 — этот класс**, ни одного чисто внутрипланового. Per-plan ревью их не ловит by construction: каждый план внутри себя выглядит корректно, ломается только стык с соседом.

## Суть

**Targeted chain-consistency pass** — не перечитка всего, а грепы «ОПРЕДЕЛЕНИЕ vs ВСЕ call-sites» через все планы для ~8 shared-контрактов, со сверкой арности/формы/регистрации.

Что грепать:
- **Сигнатуры функций**: `recordAuditLog`, `sendEmail`, `getCurrentUser`, `verifyTurnstile`/`checkRateLimit`/`clientIp`, `issueSessionToken`. Def-строка vs каждый вызов — сверить число и форму аргументов.
- **Регистрация коллекций/модулей**: каждый снапшот массива `collections: [...]` должен нести предыдущие коллекции вперёд (carry-forward). Грепнуть все `collections: [` и сверить набор.
- **enum-значения vs хардкод-наборы**: роли (`citizen/org_admin/moderator/superadmin`) против `{moderator, superadmin}`-сетов в разных планах; должны совпадать с rbac-хелпером (`isAdmin`).
- **Deferral-цепочки**: план говорит «сделано в Plan N» — реально ли там (welcome-email, close-listing, 2FA).
- **Токен-claims vs edge-логика**: если middleware читает поле из JWT — выпускается ли это поле в токен (`saveToJWT` для Payload-native логина).

**Два высокодоходных класса дрейфа:**

1. **Defined-but-unregistered.** Коллекция/модуль создаётся в плане A, но явные снапшоты массива регистрации в планах B+ её НЕ включают → literal-исполнитель перезапишет массив по снапшоту и дропнет → рантайм-фейл.
2. **Signature/arity mismatch.** Функция определена `(a, b)` в плане A, зовётся `(b)` в плане D — часто прикрыто `as any` + нотой «адаптировать». Тихо падает или делает не то.

## Почему это важно

Эти баги невидимы для per-plan ревью — стык между документами не входит в скоуп ни одного из них. Фикс в доке стоит одной правки, пока код не написан; тот же дрейф после имплементации — дебаг fresh-субагентом без контекста посреди сборки (дорого, путано). ROI прохода: 3/3 блокеров проекта — этот класс.

## Когда применять

- Перед исполнением любой серии из ≥2 планов, ссылающихся на общие символы.
- Сразу после написания нового плана в существующей серии.
- Триггер-фразы в плане: «как в Plan N», «сигнатура из Plan N», `as any` + «адаптировать вызов» — это красный флаг дрейфа, а не глушитель.

## Примеры

**Класс 1 — MagicLinkTokens (defined-but-unregistered).** P1 Task 14 создавал коллекцию `magic-link-tokens`, но регистрацию описывал прозой «Подключить в payload.config.ts» БЕЗ кода массива. Явные снапшоты `collections: [Users, Cities, Media, AuditLogs, NotificationPreferences, …]` в P2–P4 её не включали. Literal-исполнитель дропнул бы → `payload.create({collection:'magic-link-tokens'})` падает рантайм → **magic-link логин (1 из 3 способов входа) мёртв.**

Фикс: P1 показывает явный массив с `MagicLinkTokens` + import; добавлено во все снапшоты P2–P4. Профилактика — снапшот массива всегда полным, никогда прозой.

**Класс 2 — recordAuditLog (signature/arity).**
```ts
// P1 def: 2 арга, actor required
export async function recordAuditLog(payload: Payload, entry: AuditEntry): Promise<void>
// AuditLogs.actor: { required: true }

// P5 вызов (ДО): 1 арг, без payload/actorId, прикрыто as any + .catch
await recordAuditLog({ action: 'donation_paid', targetType: 'donation', targetId, meta } as any).catch(()=>{});
// → payload undefined → краш, заглушён .catch → аудит платежей §16.2 молча НЕ пишется

// ПОСЛЕ:
await recordAuditLog(payload, { action: 'donation_paid', targetType: 'donation', targetId, meta }).catch(()=>{});
// + P1: actor required:false, actorId?: optional (системные действия — вебхуки/cron — без юзера)
```

## Профилактика (встроить в writing-plans)

- Каждый снапшот массива/конфига показывать **полным** — никогда прозой «подключить X» без кода (нарушает «No Placeholders»).
- В шапке плана — таблица shared-контрактов с точными сигнатурами («Что уже существует — переиспользуем»). Этот проект уже делает частично; ужесточить.
- `as any` + «адаптировать вызов» в плане = красный флаг, требует сверки с def, а не доверия ноте.
- Audit/event-модели с самого начала: `actor` optional, чтобы системные действия (вебхуки/cron) писались без юзера.
- Если edge-middleware читает claim из JWT — в плане, где определяется поле, явно ставить `saveToJWT: true` (Payload-native логин иначе не положит кастомное поле в токен).

## Связанное

- `docs/superpowers/plans/2026-05-28-plan-1-foundation.md` (recordAuditLog def, MagicLinkTokens, saveToJWT)
- `docs/superpowers/plans/2026-05-28-plan-5-donations.md` (recordAuditLog call-site)
- `docs/superpowers/plans/2026-05-28-plan-6-quality-launch.md` (2FA-гейт, saveToJWT-блокер)
- `docs/superpowers/specs/2026-05-28-pet-aggregator-design.md` (§16.8 — финальный набор коллекций фаза 1)
