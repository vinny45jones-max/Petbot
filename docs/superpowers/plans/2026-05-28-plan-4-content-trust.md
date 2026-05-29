# Plan 4: Content & Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Достроить публичный контент (главная, блог, юр.раздел, справка, глоссарий, статичные страницы), доверие и безопасность (Cloudflare Turnstile, rate-limit, антиспам, комментарии, жалобы, сообщения о жестокости, заявки приютов) и критическую вертикаль отлова (§17.6: ежедневный пересчёт срочности + email-алерты подписчикам + автопост в Telegram-канал).

**Architecture:** Контент-сущности — обычные Payload-коллекции с публичным `read` и админ-`write`, рендер через SSR-страницы (`getPayload`). Trust & Safety реализуется тонким слоем `lib/security/*` (Turnstile-верификация + rate-limit), подключаемым в публичные API-роуты (`/api/*/route.ts`). Антиспам комментариев — чистая эвристика + shadow-ban через `Comment.status`. §17.6 — чистое ядро пересчёта (`lib/urgency-recalc.ts`) + cron-скрипт (`scripts/urgency-recalc.ts`), запускаемый Railway Cron раз в сутки.

**Tech Stack:** Next.js 15 (App Router, RSC) + Payload CMS 3 + Postgres + Cloudflare Turnstile + Resend + Telegram Bot API + Vitest + Playwright (всё уже стоит из Plan 1).

**Обновлённый roadmap MVP (после реального исполнения Plan 1–3):**

1. Foundation ✅
2. Catalog + Orgs ✅
3. Posting + Adoption (cabinets) ✅
4. **Content & Trust + критическая вертикаль §17.6** ← этот план
5. Donations (ExpressPay/ЕРИП) + `/help/*` + `/me/donations` + `/org/[slug]/donations` + reconciliation cron
6. Quality + Launch (i18n, 2FA модераторов, «Шрифт крупнее», status page, beta, прод-платежи)

> Изначальный roadmap в Plan 1 называл «Content + Safety» планом 5, а «Critical Urgency» — планом 4. По решению владельца проекта эти два бакета объединены и идут как Plan 4; донаты сдвинулись на Plan 5. Часть «Critical Urgency» (страница `/animals/urgent`, `UrgencyBadge`, `lib/urgency.ts`, поля `urgencyLevel`/`urgencyRank`/`lostOrFound`) уже сделана в Plan 2 — здесь добавляется только то, чего нет: cron-пересчёт, hero-блок на главной, email-алерты, автопост.

---

## Что уже существует (из Plan 1–3) — переиспользуем, не дублируем

- **Коллекции:** `users`, `cities`, `media`, `audit-logs`, `notification-preferences` (P1); `organizations`, `intakeFacilities`, `animals` (P2); `adoption-inquiries` (P3).
- **lib/auth:** `getCurrentUser`, `requireUser`, `requireOrgAdmin` (`lib/auth/current-user.ts`); `isAdmin`, `canManageOrganization` (`lib/auth/rbac.ts`).
- **lib/email:** `sendEmail({ to, subject, react })` (`lib/email/resend-client.ts`); шаблоны в `lib/email/templates/*.tsx`.
- **lib/notify:** `notifyAdminChannel(text)` (`lib/notify/telegram.ts`); pure-билдеры `lib/notify/messages.ts`; `lib/notify/dispatch.ts`.
- **lib/audit:** `recordAuditLog(...)` (`lib/audit/log.ts`).
- **lib (каталог):** `slug.ts` (`slugify`, `slugifyRu`, `uniqueSlug`), `format.ts` (`formatAge`, `formatAnimalTitle`), `animal-url.ts` (`animalUrl`), `filters.ts`, `urgency.ts` (`computeUrgency`, `computeDeadline`, `daysUntil`), `lexical-plain.ts` (`extractPlainText`), `search.ts` (`searchAnimalIds`, `normalizeQuery`), `meta.ts`, `jsonld.ts`.
- **components:** `layout/Header.tsx`, `layout/Footer.tsx` (P1); `catalog/AnimalCard.tsx`, `catalog/AnimalGrid.tsx`, `catalog/Pagination.tsx`, `catalog/UrgencyBadge.tsx`, `org/OrganizationCard.tsx`, `JsonLd.tsx` (P2); shadcn `components/ui/*`.
- **app:** `(public)/layout.tsx`, `(public)/page.tsx` (главная-заглушка → переписываем в Task 10), `(public)/not-found.tsx` (404 → дополняем в Task 17); `animals/*`, `organizations/*`, `intake-facilities/*`.
- **Поля `animals` (camelCase):** `name`, `petNumber`, `slug`, `species`, `sex`, `ageYears`, `ageMonths`, `size`, `description`(richText), `descriptionPlain`, `healthStatus`(`healthy|needs_treatment|chronic_condition|recovering|unknown`), `healthNotes`, `isSterilized`, `isVaccinated`, `microchipId`, `city`, `ownerType`(`citizen|organization`), `ownerUser`, `organization`, `status`(`pending_review|published|adopted|archived`), `source`, `lostOrFound`(`none|lost|found`), `media`, `intakeFacility`, `intakeDate`, `legalDeadlineDate`, `urgencyLevel`(`normal|high|critical`), `urgencyRank`, `publishedAt`, `adoptedAt`. **Plan 4 добавляет одно поле: `specialStatus`.**

**Env-переменные, которые добавит этот план** (в `web/.env.example`):

```env
# Cloudflare Turnstile (anti-bot)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
# Email superadmin для жалоб/заявок приютов
SUPERADMIN_EMAIL=
# Публичный Telegram-канал проекта для автопоста срочных (числовой -100... или @username)
TELEGRAM_URGENT_CHAT_ID=
# Базовый URL сайта (если не добавлен в Plan 2)
NEXT_PUBLIC_SITE_URL=https://example.by
# IndexNow — мгновенная переиндексация в Яндекс/Bing (§16.7). Случайный 8–128 hex-символов; файл <key>.txt с этим же значением кладётся в web/public/
INDEXNOW_KEY=
```

---

## File Structure (Plan 4)

```
web/
  ├── collections/
  │   ├── BlogPosts.ts            # NEW
  │   ├── LegalArticles.ts        # NEW
  │   ├── HelpArticles.ts         # NEW
  │   ├── GlossaryTerms.ts        # NEW
  │   ├── Comments.ts             # NEW
  │   ├── ReportFlags.ts          # NEW
  │   ├── CrueltyReports.ts       # NEW
  │   ├── PartnerApplications.ts  # NEW
  │   ├── Animals.ts              # MODIFY: + поле specialStatus
  │   └── NotificationPreferences.ts # MODIFY: + urgentLastSentAt
  ├── lib/
  │   ├── security/
  │   │   ├── turnstile.ts        # NEW: verifyTurnstile (server)
  │   │   └── rate-limit.ts       # NEW: slidingWindowAllow (pure) + checkRateLimit (store)
  │   ├── content/
  │   │   └── validate.ts         # NEW: validateComment, validateCrueltyReport, validatePartnerApplication (pure)
  │   ├── comments/
  │   │   └── spam.ts             # NEW: scoreCommentSpam (pure эвристика)
  │   ├── badges.ts               # NEW: computeAnimalBadges (pure)
  │   ├── breadcrumbs.ts          # NEW: buildBreadcrumbs (pure)
  │   └── urgency-recalc.ts       # NEW: computeUrgencyTransitions (pure §17.6)
  ├── app/
  │   ├── (public)/
  │   │   ├── page.tsx                    # MODIFY: реальная главная
  │   │   ├── not-found.tsx               # MODIFY: + поиск/навигация
  │   │   ├── error.tsx                   # NEW: 500
  │   │   ├── blog/page.tsx               # NEW
  │   │   ├── blog/[slug]/page.tsx        # NEW
  │   │   ├── success-stories/page.tsx    # NEW
  │   │   ├── legal/page.tsx              # NEW
  │   │   ├── legal/[slug]/page.tsx       # NEW
  │   │   ├── about/page.tsx              # NEW
  │   │   ├── faq/page.tsx                # NEW
  │   │   ├── how-it-works/page.tsx       # NEW
  │   │   ├── safety/page.tsx             # NEW
  │   │   ├── help-center/page.tsx        # NEW
  │   │   ├── glossary/page.tsx           # NEW
  │   │   ├── report-cruelty/page.tsx     # NEW
  │   │   ├── contacts/page.tsx           # NEW
  │   │   ├── search/page.tsx             # NEW
  │   │   └── lost-and-found/page.tsx     # NEW
  │   └── api/
  │       ├── cruelty-reports/route.ts    # NEW
  │       ├── partner-applications/route.ts # NEW
  │       ├── comments/route.ts           # NEW
  │       └── reports/route.ts            # NEW
  ├── components/
  │   ├── catalog/
  │   │   ├── AnimalBadges.tsx     # NEW
  │   │   └── AnimalCard.tsx       # MODIFY: рендер AnimalBadges
  │   ├── layout/
  │   │   ├── Header.tsx           # MODIFY: ссылка «Сообщить о жестокости»
  │   │   ├── Footer.tsx           # MODIFY: ссылки на новые страницы
  │   │   └── Breadcrumbs.tsx      # NEW
  │   ├── home/
  │   │   ├── Hero.tsx             # NEW
  │   │   ├── UrgentHero.tsx       # NEW (§17.5)
  │   │   └── HomeSection.tsx      # NEW
  │   ├── security/TurnstileWidget.tsx   # NEW (client)
  │   ├── forms/
  │   │   ├── CrueltyReportForm.tsx      # NEW (client)
  │   │   └── PartnerApplicationForm.tsx # NEW (client)
  │   └── comments/CommentSection.tsx    # NEW (client)
  ├── lib/email/templates/
  │   ├── cruelty-received.tsx     # NEW
  │   ├── partner-application.tsx  # NEW
  │   └── urgent-alert.tsx         # NEW (§17.6)
  ├── lib/notify/messages.ts       # MODIFY: + urgentAnimalMessage
  ├── lib/notify/telegram.ts       # MODIFY: + notifyUrgentChannel
  ├── scripts/
  │   ├── urgency-recalc.ts        # NEW (cron entrypoint §17.6)
  │   └── seed-content.ts          # NEW: §17.8 LegalArticle + базовые HelpArticle/Glossary
  ├── actions/
  │   ├── register.ts              # MODIFY (Task 19): + Turnstile (если форма через action)
  │   └── animal.ts                # MODIFY (Task 19): + Turnstile в createAnimal
  └── tests/
      ├── unit/
      │   ├── security/rate-limit.test.ts
      │   ├── content/validate.test.ts
      │   ├── comments/spam.test.ts
      │   ├── badges.test.ts
      │   ├── breadcrumbs.test.ts
      │   └── urgency-recalc.test.ts
      └── e2e/
          ├── home.spec.ts
          ├── blog.spec.ts
          ├── legal.spec.ts
          ├── static-pages.spec.ts
          ├── report-cruelty.spec.ts
          ├── contacts.spec.ts
          ├── comments.spec.ts
          └── extra-pages.spec.ts
```

---

## Tasks

### Task 1: Trust-инфраструктура — Turnstile + rate-limit

**Files:**
- Create: `web/lib/security/turnstile.ts`
- Create: `web/lib/security/rate-limit.ts`
- Create: `web/components/security/TurnstileWidget.tsx`
- Modify: `web/.env.example`
- Test: `web/tests/unit/security/rate-limit.test.ts`

- [ ] **Step 1: Failing-тест чистого rate-limit ядра**

`web/tests/unit/security/rate-limit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { slidingWindowAllow } from '@/lib/security/rate-limit';

describe('slidingWindowAllow', () => {
  it('allows up to limit within window', () => {
    const now = 1_000_000;
    const hits = [now - 5000, now - 4000, now - 3000];
    expect(slidingWindowAllow(hits, { limit: 5, windowMs: 60_000, now })).toBe(true);
  });
  it('blocks when limit reached within window', () => {
    const now = 1_000_000;
    const hits = Array.from({ length: 5 }, (_, i) => now - i * 1000);
    expect(slidingWindowAllow(hits, { limit: 5, windowMs: 60_000, now })).toBe(false);
  });
  it('ignores hits outside the window', () => {
    const now = 1_000_000;
    const hits = [now - 120_000, now - 90_000];
    expect(slidingWindowAllow(hits, { limit: 5, windowMs: 60_000, now })).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить — fail**

Run: `cd web && npm test -- rate-limit`
Expected: FAIL — `slidingWindowAllow is not a function`.

- [ ] **Step 3: Реализовать `web/lib/security/rate-limit.ts`**

```ts
export interface RateOpts {
  limit: number;
  windowMs: number;
  now: number;
}

/** Чистая проверка: разрешён ли ещё один запрос при данных таймстампах попаданий. */
export function slidingWindowAllow(hits: number[], opts: RateOpts): boolean {
  const fresh = hits.filter((t) => t > opts.now - opts.windowMs);
  return fresh.length < opts.limit;
}

// --- Хранилище в памяти процесса (MVP, один инстанс Railway). В фазе 2 — Redis. ---
const store = new Map<string, number[]>();

/**
 * Регистрирует попадание и говорит, не превышен ли лимит.
 * key обычно `${route}:${ip}`. Возвращает true, если запрос разрешён.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const prev = store.get(key) ?? [];
  const fresh = prev.filter((t) => t > now - windowMs);
  const allowed = slidingWindowAllow(fresh, { limit, windowMs, now });
  if (allowed) {
    fresh.push(now);
    store.set(key, fresh);
  }
  return allowed;
}

/** Достаёт IP клиента из заголовков (Railway/CF проксируют через x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? 'unknown';
}
```

- [ ] **Step 4: Запустить — pass**

Run: `cd web && npm test -- rate-limit`
Expected: PASS — 3 passed.

- [ ] **Step 5: Реализовать `web/lib/security/turnstile.ts`**

```ts
/**
 * Серверная верификация Cloudflare Turnstile.
 * Если TURNSTILE_SECRET_KEY не задан (локалка/CI) — пропускает (возвращает true),
 * чтобы не блокировать разработку. В проде ключ обязателен.
 */
export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY not set, skipping verification');
    return true;
  }
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.append('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (e) {
    console.error('[turnstile] verify error', e);
    return false;
  }
}
```

- [ ] **Step 6: Реализовать `web/components/security/TurnstileWidget.tsx`**

```tsx
'use client';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => void };
  }
}

/** Рендерит Turnstile-виджет и кладёт токен в скрытый input name="cf-turnstile-response". */
export function TurnstileWidget() {
  const ref = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    const id = 'cf-turnstile-script';
    const onLoad = () => {
      if (window.turnstile && ref.current) {
        window.turnstile.render(ref.current, { sitekey: siteKey });
      }
    };
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.addEventListener('load', onLoad);
      document.head.appendChild(script);
    } else {
      onLoad();
    }
  }, [siteKey]);

  if (!siteKey) return null; // в dev без ключа виджет не нужен
  return <div ref={ref} className="my-3" />;
}
```

> Turnstile при рендере сам создаёт `<input name="cf-turnstile-response">` внутри контейнера, поэтому при сабмите обычной HTML-формы токен уезжает в `FormData` под этим именем. В API-роутах читаем его как `form.get('cf-turnstile-response')`.

- [ ] **Step 7: Дополнить `web/.env.example`**

```env
# Cloudflare Turnstile (anti-bot)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

- [ ] **Step 8: Commit**

```bash
git add web/lib/security web/components/security web/tests/unit/security web/.env.example
git commit -m "Plan 4 Task 1: Turnstile-верификация и rate-limit инфраструктура

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Чистая валидация контент-форм

**Files:**
- Create: `web/lib/content/validate.ts`
- Test: `web/tests/unit/content/validate.test.ts`

- [ ] **Step 1: Failing-тест**

`web/tests/unit/content/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateComment, validateCrueltyReport, validatePartnerApplication } from '@/lib/content/validate';

describe('validateComment', () => {
  it('accepts a normal comment', () => {
    expect(validateComment({ body: 'Какой красивый пёс!' }).ok).toBe(true);
  });
  it('rejects empty and too long', () => {
    expect(validateComment({ body: '   ' }).ok).toBe(false);
    expect(validateComment({ body: 'x'.repeat(2001) }).ok).toBe(false);
  });
});

describe('validateCrueltyReport', () => {
  it('requires a description of >= 20 chars', () => {
    expect(validateCrueltyReport({ description: 'мало' }).ok).toBe(false);
    expect(validateCrueltyReport({ description: 'Во дворе держат собаку на цепи без воды и еды.' }).ok).toBe(true);
  });
});

describe('validatePartnerApplication', () => {
  it('requires name, contact and a 9-digit UNP', () => {
    expect(validatePartnerApplication({ name: '', contact: 'x', unp: '123456789' }).ok).toBe(false);
    expect(validatePartnerApplication({ name: 'Приют «Лапа»', contact: '+375291112233', unp: '12345678' }).ok).toBe(false);
    expect(validatePartnerApplication({ name: 'Приют «Лапа»', contact: '+375291112233', unp: '123456789' }).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить — fail**

Run: `cd web && npm test -- content/validate`
Expected: FAIL — функции не найдены.

- [ ] **Step 3: Реализовать `web/lib/content/validate.ts`**

```ts
export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const ok = (): ValidationResult => ({ ok: true, errors: [] });
const fail = (...errors: string[]): ValidationResult => ({ ok: false, errors });

export function validateComment(input: { body?: string }): ValidationResult {
  const body = (input.body ?? '').trim();
  if (body.length < 1) return fail('Комментарий пустой');
  if (body.length > 2000) return fail('Комментарий длиннее 2000 символов');
  return ok();
}

export function validateCrueltyReport(input: { description?: string; contact?: string }): ValidationResult {
  const desc = (input.description ?? '').trim();
  if (desc.length < 20) return fail('Опишите ситуацию подробнее (минимум 20 символов)');
  if (desc.length > 5000) return fail('Слишком длинное описание');
  return ok();
}

export function validatePartnerApplication(input: { name?: string; contact?: string; unp?: string }): ValidationResult {
  const errors: string[] = [];
  if (!(input.name ?? '').trim()) errors.push('Укажите название организации');
  if (!(input.contact ?? '').trim()) errors.push('Укажите контакт для связи');
  const unp = (input.unp ?? '').trim();
  if (unp && !/^\d{9}$/.test(unp)) errors.push('УНП должен состоять из 9 цифр');
  if (!unp) errors.push('Укажите УНП');
  return errors.length ? { ok: false, errors } : ok();
}
```

- [ ] **Step 4: Запустить — pass**

Run: `cd web && npm test -- content/validate`
Expected: PASS — все тесты зелёные.

- [ ] **Step 5: Commit**

```bash
git add web/lib/content web/tests/unit/content
git commit -m "Plan 4 Task 2: чистая валидация контент-форм

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Коллекции Comments + ReportFlags

**Files:**
- Create: `web/collections/Comments.ts`
- Create: `web/collections/ReportFlags.ts`
- Modify: `web/payload.config.ts`
- Test: smoke в админке

- [ ] **Step 1: Создать `web/collections/Comments.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';

export const Comments: CollectionConfig = {
  slug: 'comments',
  labels: { singular: 'Комментарий', plural: 'Комментарии' },
  admin: { useAsTitle: 'id', defaultColumns: ['author', 'targetType', 'targetId', 'status', 'createdAt'] },
  access: {
    // создаётся через /api/comments (overrideAccess); прямой публичный create запрещён
    create: ({ req: { user } }) => isAdmin(user as any),
    read: () => ({ status: { equals: 'published' } }), // публично видны только published
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'author', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'targetType', type: 'select', required: true, index: true, options: [
        { label: 'Животное', value: 'animal' },
        { label: 'Пост блога', value: 'blog_post' },
      ],
    },
    { name: 'targetId', type: 'text', required: true, index: true },
    { name: 'body', type: 'textarea', required: true, maxLength: 2000 },
    { name: 'parent', type: 'relationship', relationTo: 'comments' },
    {
      name: 'status', type: 'select', defaultValue: 'published', index: true, options: [
        { label: 'Опубликован', value: 'published' },
        { label: 'Скрыт (shadow-ban)', value: 'hidden' },
        { label: 'На жалобе', value: 'reported' },
      ],
    },
    { name: 'spamScore', type: 'number', defaultValue: 0, admin: { readOnly: true, position: 'sidebar' } },
  ],
};
```

> `read` намеренно отдаёт только `published`. Shadow-ban: автор видит свой `hidden`-коммент на странице (страница достаёт его через `overrideAccess` для самого автора), а остальные — нет. Это реализуется в `CommentSection` (Task 16).

- [ ] **Step 2: Создать `web/collections/ReportFlags.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';

export const ReportFlags: CollectionConfig = {
  slug: 'report-flags',
  labels: { singular: 'Жалоба', plural: 'Жалобы' },
  admin: { useAsTitle: 'id', defaultColumns: ['reporter', 'targetType', 'targetId', 'status', 'createdAt'] },
  access: {
    create: ({ req: { user } }) => isAdmin(user as any), // через /api/reports (overrideAccess)
    read: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'reporter', type: 'relationship', relationTo: 'users', index: true },
    {
      name: 'targetType', type: 'select', required: true, options: [
        { label: 'Животное', value: 'animal' },
        { label: 'Комментарий', value: 'comment' },
        { label: 'Организация', value: 'organization' },
      ],
    },
    { name: 'targetId', type: 'text', required: true, index: true },
    { name: 'reason', type: 'textarea', required: true, maxLength: 1000 },
    {
      name: 'status', type: 'select', defaultValue: 'new', index: true, options: [
        { label: 'Новая', value: 'new' },
        { label: 'В работе', value: 'in_progress' },
        { label: 'Закрыта', value: 'closed' },
      ],
    },
  ],
};
```

- [ ] **Step 3: Зарегистрировать в `web/payload.config.ts`**

```ts
import { Comments } from './collections/Comments';
import { ReportFlags } from './collections/ReportFlags';
// в массиве collections (добавить в конец):
collections: [
  Users, Cities, Media, AuditLogs, NotificationPreferences, MagicLinkTokens,
  Organizations, IntakeFacilities, Animals, AdoptionInquiries,
  Comments, ReportFlags,
],
```

- [ ] **Step 4: Сгенерировать типы**

Run: `cd web && npx payload generate:types`
Expected: появляются типы `Comment`, `ReportFlag`.

- [ ] **Step 5: Smoke**

Run: `cd web && npm run dev` → открыть `/admin/collections/comments` и `/admin/collections/report-flags` — поля на месте.

- [ ] **Step 6: Commit**

```bash
git add web/collections/Comments.ts web/collections/ReportFlags.ts web/payload.config.ts web/payload-types.ts
git commit -m "Plan 4 Task 3: коллекции Comments и ReportFlags

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Коллекции CrueltyReports + PartnerApplications

**Files:**
- Create: `web/collections/CrueltyReports.ts`
- Create: `web/collections/PartnerApplications.ts`
- Modify: `web/payload.config.ts`
- Test: smoke в админке

- [ ] **Step 1: Создать `web/collections/CrueltyReports.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';

export const CrueltyReports: CollectionConfig = {
  slug: 'cruelty-reports',
  labels: { singular: 'Сообщение о жестокости', plural: 'Сообщения о жестокости' },
  admin: { useAsTitle: 'id', defaultColumns: ['locationCity', 'status', 'createdAt'] },
  access: {
    create: ({ req: { user } }) => isAdmin(user as any), // через /api/cruelty-reports (overrideAccess, в т.ч. анонимно)
    read: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'description', type: 'textarea', required: true, maxLength: 5000 },
    { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'contact', type: 'text', admin: { description: 'Опционально, для анонимных пусто' } },
    { name: 'reporterUser', type: 'relationship', relationTo: 'users', admin: { description: 'null для анонимных' } },
    { name: 'locationCity', type: 'relationship', relationTo: 'cities', index: true },
    {
      name: 'status', type: 'select', defaultValue: 'new', index: true, options: [
        { label: 'Новое', value: 'new' },
        { label: 'В работе', value: 'in_progress' },
        { label: 'Закрыто', value: 'closed' },
      ],
    },
  ],
};
```

- [ ] **Step 2: Создать `web/collections/PartnerApplications.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';

export const PartnerApplications: CollectionConfig = {
  slug: 'partner-applications',
  labels: { singular: 'Заявка приюта', plural: 'Заявки приютов' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'unp', 'status', 'createdAt'] },
  access: {
    create: ({ req: { user } }) => isAdmin(user as any), // через /api/partner-applications (overrideAccess)
    read: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'unp', type: 'text', admin: { description: '9 цифр' } },
    { name: 'contact', type: 'text', required: true, admin: { description: 'Телефон/email/TG' } },
    { name: 'links', type: 'textarea', admin: { description: 'Ссылки на соцсети/сайт' } },
    { name: 'message', type: 'textarea' },
    {
      name: 'status', type: 'select', defaultValue: 'new', index: true, options: [
        { label: 'Новая', value: 'new' },
        { label: 'Проверяется', value: 'in_review' },
        { label: 'Подключён', value: 'approved' },
        { label: 'Отклонён', value: 'rejected' },
      ],
    },
  ],
};
```

- [ ] **Step 3: Зарегистрировать**

```ts
import { CrueltyReports } from './collections/CrueltyReports';
import { PartnerApplications } from './collections/PartnerApplications';
// добавить в конец массива collections: ..., CrueltyReports, PartnerApplications,
```

- [ ] **Step 4: Типы + smoke**

Run: `cd web && npx payload generate:types && npm run dev`
Открыть `/admin/collections/cruelty-reports` и `/admin/collections/partner-applications`.

- [ ] **Step 5: Commit**

```bash
git add web/collections/CrueltyReports.ts web/collections/PartnerApplications.ts web/payload.config.ts web/payload-types.ts
git commit -m "Plan 4 Task 4: коллекции CrueltyReports и PartnerApplications

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Коллекция BlogPosts

**Files:**
- Create: `web/collections/BlogPosts.ts`
- Modify: `web/payload.config.ts`
- Test: smoke в админке

- [ ] **Step 1: Создать `web/collections/BlogPosts.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';
import { slugifyRu, uniqueSlug } from '@/lib/slug';

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  labels: { singular: 'Пост блога', plural: 'Блог' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'category', 'status', 'publishedAt'] },
  access: {
    read: ({ req: { user } }) => {
      if (isAdmin(user as any)) return true;
      return { status: { equals: 'published' } };
    },
    create: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'category', type: 'select', defaultValue: 'news', index: true, options: [
        { label: 'Новости', value: 'news' },
        { label: 'Советы', value: 'tips' },
        { label: 'История успеха', value: 'success_story' },
      ],
    },
    { name: 'excerpt', type: 'textarea', maxLength: 300 },
    { name: 'coverPhoto', type: 'upload', relationTo: 'media' },
    { name: 'body', type: 'richText' },
    { name: 'author', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar' } },
    { name: 'tags', type: 'text', hasMany: true },
    {
      name: 'status', type: 'select', defaultValue: 'draft', index: true, options: [
        { label: 'Черновик', value: 'draft' },
        { label: 'Опубликован', value: 'published' },
      ],
    },
    { name: 'publishedAt', type: 'date', index: true, admin: { position: 'sidebar' } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (data && !data.slug && data.title) {
          const base = slugifyRu(data.title);
          data.slug = await uniqueSlug(base, async (s) => {
            const r = await req.payload.find({ collection: 'blog-posts', where: { slug: { equals: s } }, limit: 1, depth: 0 });
            return r.docs.length > 0;
          });
        }
        if (data && operation !== 'read' && data.status === 'published' && !data.publishedAt) {
          data.publishedAt = new Date().toISOString();
        }
        return data;
      },
    ],
  },
};
```

> Сигнатура `uniqueSlug(base, existsFn)` — из Plan 2 `lib/slug.ts`. Если фактическая сигнатура отличается (например, принимает payload+collection), адаптировать вызов под неё; поведение «слаг уникален в коллекции» обязательно.

- [ ] **Step 2: Зарегистрировать + типы + smoke**

```ts
import { BlogPosts } from './collections/BlogPosts';
// добавить BlogPosts в массив collections
```
Run: `cd web && npx payload generate:types && npm run dev` → `/admin/collections/blog-posts`, создать тестовый пост, проверить автослаг.

- [ ] **Step 3: Commit**

```bash
git add web/collections/BlogPosts.ts web/payload.config.ts web/payload-types.ts
git commit -m "Plan 4 Task 5: коллекция BlogPosts с автослагом

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Коллекция LegalArticles + seed статьи §17.8

**Files:**
- Create: `web/collections/LegalArticles.ts`
- Create: `web/scripts/seed-content.ts`
- Modify: `web/payload.config.ts`, `web/package.json` (скрипт `seed:content`)
- Test: smoke + запуск seed

- [ ] **Step 1: Создать `web/collections/LegalArticles.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';

export const LegalArticles: CollectionConfig = {
  slug: 'legal-articles',
  labels: { singular: 'Юр.статья', plural: 'Юридический раздел' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'category', 'updatedAt'] },
  access: {
    read: () => true, // юр.раздел всегда публичен
    create: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'category', type: 'select', required: true, defaultValue: 'general', index: true, options: [
        { label: 'Общее', value: 'general' },
        { label: 'Жестокое обращение', value: 'cruelty' },
        { label: 'Потерянные питомцы', value: 'lost_pet' },
        { label: 'Права при усыновлении', value: 'adoption_rights' },
      ],
    },
    { name: 'excerpt', type: 'textarea', maxLength: 300 },
    { name: 'body', type: 'richText' },
    {
      name: 'npaLinks', type: 'array', labels: { singular: 'Ссылка на НПА', plural: 'Ссылки на НПА' }, fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
  ],
};
```

- [ ] **Step 2: Зарегистрировать + типы**

```ts
import { LegalArticles } from './collections/LegalArticles';
// добавить LegalArticles в массив collections
```
Run: `cd web && npx payload generate:types`

- [ ] **Step 3: Создать `web/scripts/seed-content.ts` (идемпотентный seed §17.8 + базовый контент)**

```ts
import 'dotenv/config';
import { getPayload } from 'payload';
import config from '../payload.config';

async function upsertLegal(payload: any, slug: string, data: Record<string, unknown>) {
  const found = await payload.find({ collection: 'legal-articles', where: { slug: { equals: slug } }, limit: 1 });
  if (found.docs.length) {
    await payload.update({ collection: 'legal-articles', id: found.docs[0].id, data });
    console.log(`[seed] updated legal: ${slug}`);
  } else {
    await payload.create({ collection: 'legal-articles', data: { slug, ...data } });
    console.log(`[seed] created legal: ${slug}`);
  }
}

async function main() {
  const payload = await getPayload({ config });

  await upsertLegal(payload, 'municipal-intake-rights', {
    title: 'Что делать, если ваше животное попало в службу отлова',
    category: 'lost_pet',
    excerpt: 'Пошаговая инструкция: куда звонить, какие документы взять, сроки востребования и как доказать собственность.',
    body: {
      root: {
        type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
        children: [
          { type: 'heading', tag: 'h2', version: 1, children: [{ type: 'text', text: 'Действуйте быстро', version: 1 }] },
          { type: 'paragraph', version: 1, children: [{ type: 'text', text: 'У служб отлова есть ограниченный срок содержания безнадзорных животных. Чем раньше вы обратитесь, тем выше шанс забрать питомца.', version: 1 }] },
          { type: 'heading', tag: 'h2', version: 1, children: [{ type: 'text', text: 'Шаги', version: 1 }] },
          { type: 'paragraph', version: 1, children: [{ type: 'text', text: '1. Позвоните в местную службу отлова и ЖКХ, уточните, есть ли ваше животное. 2. Возьмите документы, подтверждающие собственность: ветпаспорт, договор/чек, фото с питомцем, данные о чипе. 3. Уточните срок содержания и условия выдачи. 4. Приезжайте лично с документами.', version: 1 }] },
          { type: 'heading', tag: 'h2', version: 1, children: [{ type: 'text', text: 'Как доказать, что животное ваше', version: 1 }] },
          { type: 'paragraph', version: 1, children: [{ type: 'text', text: 'Лучшее доказательство — микрочип (15 цифр), зарегистрированный на вас. Также помогают ветпаспорт с отметками, фотографии и свидетели.', version: 1 }] },
        ],
      },
    },
    npaLinks: [
      { title: 'Закон Республики Беларусь № 361-З «Об обращении с животными»', url: 'https://pravo.by/' },
      { title: 'Постановления о содержании безнадзорных животных', url: 'https://pravo.by/' },
    ],
  });

  console.log('[seed] content done');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

> Структура `body` — формат Lexical (как у Payload richText). Текст НПА и ссылки уточняет юрист-партнёр в фазе 0; здесь — рабочий каркас.

- [ ] **Step 4: Добавить скрипт в `web/package.json`**

```json
"scripts": {
  "seed:content": "tsx scripts/seed-content.ts"
}
```

- [ ] **Step 5: Запустить seed + smoke**

Run: `cd web && npm run seed:content`
Expected: `[seed] created legal: municipal-intake-rights`. Повторный запуск → `updated`.

- [ ] **Step 6: Commit**

```bash
git add web/collections/LegalArticles.ts web/scripts/seed-content.ts web/payload.config.ts web/payload-types.ts web/package.json
git commit -m "Plan 4 Task 6: LegalArticles + seed статьи о службах отлова (§17.8)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Коллекции HelpArticles + GlossaryTerms

**Files:**
- Create: `web/collections/HelpArticles.ts`
- Create: `web/collections/GlossaryTerms.ts`
- Modify: `web/payload.config.ts`, `web/scripts/seed-content.ts` (+ базовые FAQ/глоссарий)
- Test: smoke

- [ ] **Step 1: Создать `web/collections/HelpArticles.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';

export const HelpArticles: CollectionConfig = {
  slug: 'help-articles',
  labels: { singular: 'Статья справки', plural: 'Справочный центр' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'category', 'order'] },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'category', type: 'select', required: true, defaultValue: 'faq', index: true, options: [
        { label: 'FAQ', value: 'faq' },
        { label: 'Как это работает', value: 'how_it_works' },
        { label: 'Безопасность', value: 'safety' },
        { label: 'Справка', value: 'guide' },
      ],
    },
    { name: 'body', type: 'richText' },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar', description: 'Порядок вывода' } },
  ],
};
```

- [ ] **Step 2: Создать `web/collections/GlossaryTerms.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';

export const GlossaryTerms: CollectionConfig = {
  slug: 'glossary-terms',
  labels: { singular: 'Термин', plural: 'Глоссарий' },
  admin: { useAsTitle: 'term', defaultColumns: ['term', 'slug'] },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'term', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'definition', type: 'textarea', required: true },
  ],
};
```

- [ ] **Step 3: Зарегистрировать + типы**

```ts
import { HelpArticles } from './collections/HelpArticles';
import { GlossaryTerms } from './collections/GlossaryTerms';
// добавить HelpArticles, GlossaryTerms в массив collections
```
Run: `cd web && npx payload generate:types`

- [ ] **Step 4: Дополнить `web/scripts/seed-content.ts` базовыми терминами и FAQ**

В конец `main()` перед `console.log('[seed] content done')` добавить:

```ts
  const glossary = [
    { slug: 'sterilization', term: 'Стерилизация', definition: 'Операция, после которой животное не может иметь потомство. Снижает число бездомных животных и полезна для здоровья.' },
    { slug: 'chipping', term: 'Чипирование', definition: 'Под кожу вживляется микрочип с 15-значным номером. По нему можно найти владельца потерянного животного.' },
    { slug: 'foster', term: 'Передержка', definition: 'Временное содержание животного дома у волонтёра, пока ищут постоянного хозяина.' },
    { slug: 'guardianship', term: 'Опека', definition: 'Финансовая или организационная помощь конкретному животному без его забора домой.' },
  ];
  for (const g of glossary) {
    const f = await payload.find({ collection: 'glossary-terms', where: { slug: { equals: g.slug } }, limit: 1 });
    if (!f.docs.length) { await payload.create({ collection: 'glossary-terms', data: g }); console.log(`[seed] glossary: ${g.slug}`); }
  }

  const faqs = [
    { slug: 'faq-how-to-post', category: 'faq' as const, title: 'Как разместить животное?', order: 1 },
    { slug: 'faq-is-it-free', category: 'faq' as const, title: 'Это бесплатно?', order: 2 },
    { slug: 'faq-how-adopt', category: 'faq' as const, title: 'Как взять животное домой?', order: 3 },
  ];
  for (const a of faqs) {
    const f = await payload.find({ collection: 'help-articles', where: { slug: { equals: a.slug } }, limit: 1 });
    if (!f.docs.length) {
      await payload.create({ collection: 'help-articles', data: {
        ...a,
        body: { root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children: [
          { type: 'paragraph', version: 1, children: [{ type: 'text', text: 'Ответ редактируется администратором в админке.', version: 1 }] },
        ] } },
      } });
      console.log(`[seed] faq: ${a.slug}`);
    }
  }
```

- [ ] **Step 5: Запустить seed + smoke**

Run: `cd web && npm run seed:content`
Expected: создаются glossary и faq записи.

- [ ] **Step 6: Commit**

```bash
git add web/collections/HelpArticles.ts web/collections/GlossaryTerms.ts web/payload.config.ts web/payload-types.ts web/scripts/seed-content.ts
git commit -m "Plan 4 Task 7: HelpArticles и GlossaryTerms + базовый seed

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Бейджи животных — поле specialStatus + чистый расчёт + UI

**Files:**
- Modify: `web/collections/Animals.ts` (+ поле `specialStatus`)
- Create: `web/lib/badges.ts`
- Create: `web/components/catalog/AnimalBadges.tsx`
- Modify: `web/components/catalog/AnimalCard.tsx` (рендер бейджей)
- Test: `web/tests/unit/badges.test.ts`

- [ ] **Step 1: Добавить поле `specialStatus` в `web/collections/Animals.ts`**

В массив `fields` (после `lostOrFound`) добавить:

```ts
    {
      name: 'specialStatus', type: 'select', hasMany: true, index: true, options: [
        { label: 'Забронирован', value: 'reserved' },
        { label: 'Нужна передержка', value: 'needs_temp_home' },
        { label: 'На карантине', value: 'quarantine' },
      ],
      admin: { description: 'Доп.метки для карточки' },
    },
```

Run: `cd web && npx payload generate:types` (тип `Animal` получит `specialStatus`).

- [ ] **Step 2: Failing-тест `web/tests/unit/badges.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { computeAnimalBadges } from '@/lib/badges';

describe('computeAnimalBadges', () => {
  it('critical urgency yields a red СРОЧНО badge first', () => {
    const b = computeAnimalBadges({ urgencyLevel: 'critical' });
    expect(b[0]).toMatchObject({ tone: 'critical' });
    expect(b[0].label.toLowerCase()).toContain('срочно');
  });
  it('shelter owner adds a Приют badge', () => {
    const b = computeAnimalBadges({ ownerType: 'organization' });
    expect(b.some((x) => x.label === 'Приют')).toBe(true);
  });
  it('adopted overrides others with single Пристроен badge', () => {
    const b = computeAnimalBadges({ status: 'adopted', urgencyLevel: 'critical' });
    expect(b).toHaveLength(1);
    expect(b[0].label).toBe('Пристроен');
  });
  it('maps lostOrFound and specialStatus and healthStatus', () => {
    const labels = computeAnimalBadges({
      lostOrFound: 'lost', specialStatus: ['reserved', 'quarantine'], healthStatus: 'needs_treatment',
    }).map((x) => x.label);
    expect(labels).toEqual(expect.arrayContaining(['Потерян', 'Забронирован', 'На карантине', 'Нужно лечение']));
  });
});
```

- [ ] **Step 3: Запустить — fail**

Run: `cd web && npm test -- badges`
Expected: FAIL — `computeAnimalBadges is not a function`.

- [ ] **Step 4: Реализовать `web/lib/badges.ts`**

```ts
export type BadgeTone = 'critical' | 'warning' | 'info' | 'success' | 'neutral';
export interface Badge { label: string; tone: BadgeTone }

export interface AnimalBadgeInput {
  status?: string | null;
  urgencyLevel?: string | null;
  ownerType?: string | null;
  lostOrFound?: string | null;
  healthStatus?: string | null;
  specialStatus?: string[] | null;
}

/** Чистый расчёт списка бейджей для карточки/детальной. Порядок = приоритет вывода. */
export function computeAnimalBadges(a: AnimalBadgeInput): Badge[] {
  if (a.status === 'adopted') return [{ label: 'Пристроен', tone: 'success' }];

  const badges: Badge[] = [];

  if (a.urgencyLevel === 'critical') badges.push({ label: 'СРОЧНО', tone: 'critical' });
  else if (a.urgencyLevel === 'high') badges.push({ label: 'Срочно', tone: 'warning' });

  if (a.lostOrFound === 'lost') badges.push({ label: 'Потерян', tone: 'warning' });
  else if (a.lostOrFound === 'found') badges.push({ label: 'Найден', tone: 'info' });

  const special = a.specialStatus ?? [];
  if (special.includes('reserved')) badges.push({ label: 'Забронирован', tone: 'info' });
  if (special.includes('needs_temp_home')) badges.push({ label: 'Нужна передержка', tone: 'warning' });
  if (special.includes('quarantine')) badges.push({ label: 'На карантине', tone: 'neutral' });

  if (a.healthStatus === 'needs_treatment') badges.push({ label: 'Нужно лечение', tone: 'warning' });

  if (a.ownerType === 'organization') badges.push({ label: 'Приют', tone: 'neutral' });

  return badges;
}
```

- [ ] **Step 5: Запустить — pass**

Run: `cd web && npm test -- badges`
Expected: PASS.

- [ ] **Step 6: Создать `web/components/catalog/AnimalBadges.tsx`**

```tsx
import { computeAnimalBadges, type AnimalBadgeInput, type BadgeTone } from '@/lib/badges';

const TONE: Record<BadgeTone, string> = {
  critical: 'bg-red-600 text-white',
  warning: 'bg-orange-500 text-white',
  info: 'bg-blue-600 text-white',
  success: 'bg-green-600 text-white',
  neutral: 'bg-gray-700 text-white',
};

export function AnimalBadges({ animal, className = '' }: { animal: AnimalBadgeInput; className?: string }) {
  const badges = computeAnimalBadges(animal);
  if (!badges.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {badges.map((b, i) => (
        <span key={i} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[b.tone]}`}>{b.label}</span>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Подключить в `web/components/catalog/AnimalCard.tsx`**

Импорт и рендер поверх/под фото карточки (адаптировать к существующей вёрстке P2):

```tsx
import { AnimalBadges } from './AnimalBadges';
// ... внутри карточки, в блоке с фото:
<AnimalBadges animal={animal as any} className="absolute left-2 top-2" />
```

Контейнер фото в `AnimalCard` сделать `relative`, если ещё не.

- [ ] **Step 8: Commit**

```bash
git add web/collections/Animals.ts web/payload-types.ts web/lib/badges.ts web/components/catalog/AnimalBadges.tsx web/components/catalog/AnimalCard.tsx web/tests/unit/badges.test.ts
git commit -m "Plan 4 Task 8: бейджи животных (specialStatus + computeAnimalBadges + UI)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Антиспам комментариев (чистая эвристика)

**Files:**
- Create: `web/lib/comments/spam.ts`
- Test: `web/tests/unit/comments/spam.test.ts`

- [ ] **Step 1: Failing-тест**

`web/tests/unit/comments/spam.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { scoreCommentSpam } from '@/lib/comments/spam';

describe('scoreCommentSpam', () => {
  it('clean text scores low and is allowed', () => {
    const r = scoreCommentSpam({ body: 'Очень хочу помочь этому котику!', recentByAuthor: [] });
    expect(r.score).toBeLessThan(50);
    expect(r.shadowBan).toBe(false);
  });
  it('many links raise the score', () => {
    const r = scoreCommentSpam({ body: 'http://a.com http://b.com http://c.com купить дёшево', recentByAuthor: [] });
    expect(r.score).toBeGreaterThanOrEqual(50);
    expect(r.shadowBan).toBe(true);
  });
  it('duplicate of recent comment is flagged', () => {
    const r = scoreCommentSpam({ body: 'одно и то же', recentByAuthor: ['одно и то же'] });
    expect(r.shadowBan).toBe(true);
  });
  it('burst posting (too many recent) is flagged', () => {
    const r = scoreCommentSpam({ body: 'норм текст', recentByAuthor: ['a', 'b', 'c', 'd', 'e'] });
    expect(r.shadowBan).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить — fail**

Run: `cd web && npm test -- comments/spam`
Expected: FAIL.

- [ ] **Step 3: Реализовать `web/lib/comments/spam.ts`**

```ts
export interface SpamInput {
  body: string;
  recentByAuthor: string[]; // тексты недавних комментов автора (за окно времени)
}
export interface SpamResult {
  score: number;       // 0..100
  shadowBan: boolean;  // >= 50 → скрыть незаметно
  reasons: string[];
}

const LINK_RE = /https?:\/\/|www\.|t\.me\//gi;

export function scoreCommentSpam(input: SpamInput): SpamResult {
  const reasons: string[] = [];
  let score = 0;
  const body = input.body.trim();

  const links = (body.match(LINK_RE) ?? []).length;
  if (links >= 1) { score += 25 * links; reasons.push(`links:${links}`); }

  const letters = body.replace(/[^a-zа-яё]/gi, '').length;
  const caps = body.replace(/[^A-ZА-ЯЁ]/g, '').length;
  if (letters > 10 && caps / letters > 0.6) { score += 20; reasons.push('caps'); }

  if (input.recentByAuthor.some((t) => t.trim().toLowerCase() === body.toLowerCase())) {
    score += 60; reasons.push('duplicate');
  }

  if (input.recentByAuthor.length >= 5) { score += 40; reasons.push('burst'); }

  const spamWords = ['казино', 'заработок', 'крипт', 'инвест', 'porn', 'viagra'];
  if (spamWords.some((w) => body.toLowerCase().includes(w))) { score += 40; reasons.push('spamword'); }

  score = Math.min(100, score);
  return { score, shadowBan: score >= 50, reasons };
}
```

- [ ] **Step 4: Запустить — pass**

Run: `cd web && npm test -- comments/spam`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/comments web/tests/unit/comments
git commit -m "Plan 4 Task 9: антиспам комментариев (эвристика + shadow-ban)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Хлебные крошки

**Files:**
- Create: `web/lib/breadcrumbs.ts`
- Create: `web/components/layout/Breadcrumbs.tsx`
- Test: `web/tests/unit/breadcrumbs.test.ts`

- [ ] **Step 1: Failing-тест**

`web/tests/unit/breadcrumbs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';

describe('buildBreadcrumbs', () => {
  it('always starts with home', () => {
    const c = buildBreadcrumbs([{ label: 'Блог', href: '/blog' }]);
    expect(c[0]).toEqual({ label: 'Главная', href: '/' });
    expect(c[1]).toEqual({ label: 'Блог', href: '/blog' });
  });
  it('last item has no href (current page)', () => {
    const c = buildBreadcrumbs([{ label: 'Блог', href: '/blog' }, { label: 'Пост', href: '/blog/x' }]);
    expect(c[c.length - 1].href).toBeUndefined();
  });
});
```

- [ ] **Step 2: Запустить — fail.** Run: `cd web && npm test -- breadcrumbs` → FAIL.

- [ ] **Step 3: Реализовать `web/lib/breadcrumbs.ts`**

```ts
export interface Crumb { label: string; href?: string }

/** Добавляет «Главная» в начало; у последнего элемента убирает href (текущая страница). */
export function buildBreadcrumbs(trail: Crumb[]): Crumb[] {
  const all: Crumb[] = [{ label: 'Главная', href: '/' }, ...trail];
  return all.map((c, i) => (i === all.length - 1 ? { label: c.label } : c));
}
```

- [ ] **Step 4: Запустить — pass.** Run: `cd web && npm test -- breadcrumbs` → PASS.

- [ ] **Step 5: Реализовать `web/components/layout/Breadcrumbs.tsx`**

```tsx
import Link from 'next/link';
import { buildBreadcrumbs, type Crumb } from '@/lib/breadcrumbs';

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const crumbs = buildBreadcrumbs(trail);
  return (
    <nav aria-label="Хлебные крошки" className="mx-auto max-w-5xl px-4 py-3 text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {c.href ? <Link href={c.href} className="hover:underline">{c.label}</Link> : <span className="text-gray-800">{c.label}</span>}
            {i < crumbs.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add web/lib/breadcrumbs.ts web/components/layout/Breadcrumbs.tsx web/tests/unit/breadcrumbs.test.ts
git commit -m "Plan 4 Task 10: хлебные крошки (pure + компонент)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Главная страница (hero + срочные + 6 животных + 4 приюта)

**Files:**
- Modify: `web/app/(public)/page.tsx`
- Create: `web/components/home/Hero.tsx`
- Create: `web/components/home/UrgentHero.tsx`
- Create: `web/components/home/HomeSection.tsx`
- Test: `web/tests/e2e/home.spec.ts`

- [ ] **Step 1: Создать `web/components/home/Hero.tsx`**

```tsx
import Link from 'next/link';

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold md:text-5xl">Найдите друга. Спасите жизнь.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Животные Беларуси, которые ищут дом. Возьмите питомца, помогите рублём или станьте волонтёром.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/animals" className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Найти питомца</Link>
          <Link href="/help/general" className="rounded-xl border-2 border-blue-600 px-6 py-3 font-semibold text-blue-600">Помочь рублём</Link>
          <Link href="/me/animals/new" className="rounded-xl border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700">Разместить животное</Link>
        </div>
      </div>
    </section>
  );
}
```

> Ссылка `/help/general` ведёт на страницу донатов из Plan 5; до его реализации она вернёт 404 — это ожидаемо и допустимо (кнопка-обещание). Можно временно указать `/contacts`.

- [ ] **Step 2: Создать `web/components/home/UrgentHero.tsx` (§17.5)**

```tsx
import Link from 'next/link';
import { AnimalCard } from '@/components/catalog/AnimalCard';
import type { Animal } from '@/payload-types';

export function UrgentHero({ animals }: { animals: Animal[] }) {
  if (!animals.length) return null; // не показываем, если критических нет
  return (
    <section className="border-y-2 border-red-200 bg-red-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="text-2xl font-bold text-red-700">Срочно нужна помощь — осталось менее 3 дней</h2>
        <p className="mt-1 text-red-600">Этим животным грозит усыпление по срокам содержания. Заберите или поделитесь.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {animals.map((a) => <AnimalCard key={a.id} animal={a as any} />)}
        </div>
        <Link href="/animals/urgent" className="mt-6 inline-block font-semibold text-red-700 underline">Все срочные →</Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Создать `web/components/home/HomeSection.tsx`**

```tsx
import Link from 'next/link';

export function HomeSection({ title, moreHref, children }: { title: string; moreHref: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Link href={moreHref} className="font-semibold text-blue-600 hover:underline">Смотреть все →</Link>
      </div>
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Переписать `web/app/(public)/page.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import { Hero } from '@/components/home/Hero';
import { UrgentHero } from '@/components/home/UrgentHero';
import { HomeSection } from '@/components/home/HomeSection';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';
import { OrganizationCard } from '@/components/org/OrganizationCard';
import type { Animal, Organization } from '@/payload-types';

export const revalidate = 300; // ISR 5 минут

export default async function HomePage() {
  const payload = await getPayload({ config });

  const [critical, fresh, orgs] = await Promise.all([
    payload.find({
      collection: 'animals', depth: 2, limit: 3,
      where: { and: [{ status: { equals: 'published' } }, { urgencyLevel: { equals: 'critical' } }] },
      sort: 'legalDeadlineDate',
    }),
    payload.find({
      collection: 'animals', depth: 2, limit: 6,
      where: { status: { equals: 'published' } }, sort: '-publishedAt',
    }),
    payload.find({
      collection: 'organizations', depth: 1, limit: 4,
      where: { isPublished: { equals: true } }, sort: '-createdAt',
    }),
  ]);

  return (
    <main>
      <Hero />
      <UrgentHero animals={critical.docs as Animal[]} />
      <HomeSection title="Свежие объявления" moreHref="/animals">
        <AnimalGrid animals={fresh.docs as Animal[]} />
      </HomeSection>
      <HomeSection title="Приюты и волонтёры" moreHref="/organizations">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(orgs.docs as Organization[]).map((o) => <OrganizationCard key={o.id} org={o as any} />)}
        </div>
      </HomeSection>
    </main>
  );
}
```

> Поле `isPublished` у организаций — из Plan 2. Если фактическое имя отличается (`is_published`/`status`), подставить корректное.

- [ ] **Step 5: e2e `web/tests/e2e/home.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('home shows hero and sections', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Найдите друга/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Свежие объявления' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Найти питомца' })).toBeVisible();
});
```

- [ ] **Step 6: Запустить e2e**

Run: `cd web && npx playwright test home`
Expected: PASS (нужен запущенный dev/preview и сид-данные).

- [ ] **Step 7: Commit**

```bash
git add web/app/\(public\)/page.tsx web/components/home web/tests/e2e/home.spec.ts
git commit -m "Plan 4 Task 11: реальная главная (hero, срочные §17.5, свежие, приюты)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Блог — список, пост, истории успеха

**Files:**
- Create: `web/app/(public)/blog/page.tsx`
- Create: `web/app/(public)/blog/[slug]/page.tsx`
- Create: `web/app/(public)/success-stories/page.tsx`
- Test: `web/tests/e2e/blog.spec.ts`

- [ ] **Step 1: `web/app/(public)/blog/page.tsx`**

```tsx
import Link from 'next/link';
import Image from 'next/image';
import { getPayload } from 'payload';
import config from '@/payload.config';
import type { BlogPost } from '@/payload-types';

export const revalidate = 300;
export const metadata = { title: 'Блог — новости и советы', description: 'Новости проекта, советы по уходу и истории спасения животных.' };

export default async function BlogListPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'blog-posts', depth: 1, limit: 24, where: { status: { equals: 'published' } }, sort: '-publishedAt' });
  const posts = res.docs as BlogPost[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Блог</h1>
      {!posts.length && <p className="text-gray-500">Пока нет публикаций.</p>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => {
          const cover = p.coverPhoto && typeof p.coverPhoto === 'object' ? (p.coverPhoto as any).url : null;
          return (
            <Link key={p.id} href={`/blog/${p.slug}`} className="block overflow-hidden rounded-2xl border hover:shadow-md">
              {cover && <div className="relative aspect-[16/9] bg-gray-100"><Image src={cover} alt={p.title} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover" /></div>}
              <div className="p-4">
                <h2 className="font-semibold">{p.title}</h2>
                {p.excerpt && <p className="mt-1 text-sm text-gray-600">{p.excerpt}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: `web/app/(public)/blog/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { RichText } from '@/components/RichText';
import type { BlogPost } from '@/payload-types';

export const revalidate = 300;

async function getPost(slug: string): Promise<BlogPost | null> {
  const payload = await getPayload({ config });
  const r = await payload.find({ collection: 'blog-posts', where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] }, limit: 1, depth: 2 });
  return (r.docs[0] as BlogPost) ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) return { title: 'Пост не найден' };
  return { title: post.title, description: post.excerpt ?? undefined, openGraph: { title: post.title, description: post.excerpt ?? undefined } };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();
  const cover = post.coverPhoto && typeof post.coverPhoto === 'object' ? (post.coverPhoto as any).url : null;

  return (
    <>
      <Breadcrumbs trail={[{ label: 'Блог', href: '/blog' }, { label: post.title, href: `/blog/${post.slug}` }]} />
      <article className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-3xl font-bold">{post.title}</h1>
        {cover && <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-2xl bg-gray-100"><Image src={cover} alt={post.title} fill sizes="(max-width:768px) 100vw, 768px" className="object-cover" priority /></div>}
        <div className="prose mt-6 max-w-none"><RichText content={post.body} /></div>
      </article>
    </>
  );
}
```

> `RichText` — компонент рендера Lexical. Если в Plan 2/3 такого нет, создать тонкую обёртку над `@payloadcms/richtext-lexical/react` (`RichText` из пакета) или над `serializeLexical`. См. Step 3.

- [ ] **Step 3: Создать `web/components/RichText.tsx` (если ещё нет)**

```tsx
import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react';

export function RichText({ content }: { content: any }) {
  if (!content) return null;
  return <LexicalRichText data={content} />;
}
```

> Если версия пакета не экспортирует `RichText` из `/react`, использовать доступный сериализатор Lexical из установленной версии Payload. Цель: отрендерить richText в HTML.

- [ ] **Step 4: `web/app/(public)/success-stories/page.tsx`**

```tsx
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import type { BlogPost } from '@/payload-types';

export const revalidate = 300;
export const metadata = { title: 'Истории успеха', description: 'Животные, которые нашли дом благодаря неравнодушным людям.' };

export default async function SuccessStoriesPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'blog-posts', limit: 24, where: { and: [{ status: { equals: 'published' } }, { category: { equals: 'success_story' } }] }, sort: '-publishedAt' });
  const posts = res.docs as BlogPost[];
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Истории успеха</h1>
      {!posts.length && <p className="text-gray-500">Скоро здесь появятся первые истории.</p>}
      <ul className="space-y-3">
        {posts.map((p) => <li key={p.id}><Link href={`/blog/${p.slug}`} className="font-semibold text-blue-600 hover:underline">{p.title}</Link></li>)}
      </ul>
    </main>
  );
}
```

- [ ] **Step 5: e2e `web/tests/e2e/blog.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('blog list renders', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.getByRole('heading', { name: 'Блог' })).toBeVisible();
});
test('success stories page renders', async ({ page }) => {
  await page.goto('/success-stories');
  await expect(page.getByRole('heading', { name: 'Истории успеха' })).toBeVisible();
});
```

- [ ] **Step 6: Запустить e2e + commit**

Run: `cd web && npx playwright test blog`

```bash
git add web/app/\(public\)/blog web/app/\(public\)/success-stories web/components/RichText.tsx web/tests/e2e/blog.spec.ts
git commit -m "Plan 4 Task 12: блог (список, пост, истории успеха)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Юридический раздел — хаб и статья

**Files:**
- Create: `web/app/(public)/legal/page.tsx`
- Create: `web/app/(public)/legal/[slug]/page.tsx`
- Test: `web/tests/e2e/legal.spec.ts`

- [ ] **Step 1: `web/app/(public)/legal/page.tsx` (хаб по 4 категориям)**

```tsx
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import type { LegalArticle } from '@/payload-types';

export const revalidate = 600;
export const metadata = { title: 'Юридический раздел', description: 'Права владельцев животных, ответственность за жестокость, что делать с потерянными питомцами.' };

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'general', label: 'Общее' },
  { value: 'cruelty', label: 'Жестокое обращение' },
  { value: 'lost_pet', label: 'Потерянные питомцы' },
  { value: 'adoption_rights', label: 'Права при усыновлении' },
];

export default async function LegalHubPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'legal-articles', limit: 200, depth: 0, sort: 'title' });
  const articles = res.docs as LegalArticle[];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Юридический раздел</h1>
      <p className="mb-8 text-gray-600">Понятные инструкции и ссылки на законы Республики Беларусь.</p>
      <div className="space-y-8">
        {CATEGORIES.map((c) => {
          const items = articles.filter((a) => a.category === c.value);
          if (!items.length) return null;
          return (
            <section key={c.value}>
              <h2 className="mb-3 text-xl font-semibold">{c.label}</h2>
              <ul className="space-y-2">
                {items.map((a) => (
                  <li key={a.id}>
                    <Link href={`/legal/${a.slug}`} className="font-medium text-blue-600 hover:underline">{a.title}</Link>
                    {a.excerpt && <p className="text-sm text-gray-600">{a.excerpt}</p>}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: `web/app/(public)/legal/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { RichText } from '@/components/RichText';
import type { LegalArticle } from '@/payload-types';

export const revalidate = 600;

async function getArticle(slug: string): Promise<LegalArticle | null> {
  const payload = await getPayload({ config });
  const r = await payload.find({ collection: 'legal-articles', where: { slug: { equals: slug } }, limit: 1, depth: 0 });
  return (r.docs[0] as LegalArticle) ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const a = await getArticle(params.slug);
  if (!a) return { title: 'Статья не найдена' };
  return { title: a.title, description: a.excerpt ?? undefined };
}

export default async function LegalArticlePage({ params }: { params: { slug: string } }) {
  const a = await getArticle(params.slug);
  if (!a) notFound();
  const links = Array.isArray(a.npaLinks) ? a.npaLinks : [];

  return (
    <>
      <Breadcrumbs trail={[{ label: 'Юр.раздел', href: '/legal' }, { label: a.title, href: `/legal/${a.slug}` }]} />
      <article className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-3xl font-bold">{a.title}</h1>
        <div className="prose mt-6 max-w-none"><RichText content={a.body} /></div>
        {links.length > 0 && (
          <section className="mt-8 rounded-2xl bg-gray-50 p-4">
            <h2 className="mb-2 font-semibold">Ссылки на НПА</h2>
            <ul className="list-inside list-disc space-y-1">
              {links.map((l: any, i: number) => (
                <li key={i}><a href={l.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{l.title}</a></li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  );
}
```

- [ ] **Step 3: e2e `web/tests/e2e/legal.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('legal hub renders', async ({ page }) => {
  await page.goto('/legal');
  await expect(page.getByRole('heading', { name: 'Юридический раздел' })).toBeVisible();
});
test('intake-rights article renders (seeded)', async ({ page }) => {
  await page.goto('/legal/municipal-intake-rights');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('службу отлова');
});
```

- [ ] **Step 4: Запустить e2e + commit**

Run: `cd web && npm run seed:content && npx playwright test legal`

```bash
git add web/app/\(public\)/legal web/tests/e2e/legal.spec.ts
git commit -m "Plan 4 Task 13: юридический раздел (хаб + статья + НПА-ссылки)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Статичные и справочные страницы

**Files:**
- Create: `web/app/(public)/about/page.tsx`
- Create: `web/app/(public)/faq/page.tsx`
- Create: `web/app/(public)/how-it-works/page.tsx`
- Create: `web/app/(public)/safety/page.tsx`
- Create: `web/app/(public)/help-center/page.tsx`
- Create: `web/app/(public)/glossary/page.tsx`
- Create: `web/components/content/HelpArticleList.tsx`
- Test: `web/tests/e2e/static-pages.spec.ts`

- [ ] **Step 1: Создать переиспользуемый `web/components/content/HelpArticleList.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import { RichText } from '@/components/RichText';
import type { HelpArticle } from '@/payload-types';

export async function HelpArticleList({ category }: { category: string }) {
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'help-articles', where: { category: { equals: category } }, limit: 200, sort: 'order', depth: 0 });
  const items = res.docs as HelpArticle[];
  if (!items.length) return <p className="text-gray-500">Раздел скоро наполнится.</p>;
  return (
    <div className="space-y-6">
      {items.map((a) => (
        <section key={a.id} className="rounded-2xl border p-4">
          <h2 className="font-semibold">{a.title}</h2>
          <div className="prose mt-2 max-w-none"><RichText content={a.body} /></div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `web/app/(public)/about/page.tsx` (статичный текст)**

```tsx
export const metadata = { title: 'О проекте', description: 'Зачем мы существуем: помочь животным Беларуси найти дом и не допустить усыпления.' };

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 prose">
      <h1>О проекте</h1>
      <p>Мы — общенациональный агрегатор животных Беларуси, которые ищут дом. Объединяем приюты, волонтёров и неравнодушных людей на одной площадке.</p>
      <p>Наша главная цель — спасать животных из муниципальных служб отлова до истечения срока содержания, когда им грозит усыпление. Чем больше людей увидит животное вовремя, тем выше его шанс на жизнь.</p>
      <p>Площадка бесплатна для размещения животных. Поддержать проект и приюты можно через раздел «Помочь».</p>
    </main>
  );
}
```

- [ ] **Step 3: FAQ / how-it-works / safety / help-center (через HelpArticleList)**

`web/app/(public)/faq/page.tsx`:

```tsx
import { HelpArticleList } from '@/components/content/HelpArticleList';
export const metadata = { title: 'Частые вопросы (FAQ)', description: 'Ответы на популярные вопросы о размещении и усыновлении животных.' };
export const revalidate = 600;
export default function FaqPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Частые вопросы</h1>
      {/* @ts-expect-error Async Server Component */}
      <HelpArticleList category="faq" />
    </main>
  );
}
```

`web/app/(public)/how-it-works/page.tsx` — то же, `category="how_it_works"`, заголовок «Как это работает».
`web/app/(public)/safety/page.tsx` — `category="safety"`, заголовок «Безопасность».
`web/app/(public)/help-center/page.tsx` — `category="guide"`, заголовок «Справочный центр».

(Скопировать шаблон FAQ, заменив `category`, `metadata` и заголовок.)

- [ ] **Step 4: `web/app/(public)/glossary/page.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import type { GlossaryTerm } from '@/payload-types';

export const revalidate = 600;
export const metadata = { title: 'Глоссарий', description: 'Простыми словами: стерилизация, чипирование, передержка, опека.' };

export default async function GlossaryPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'glossary-terms', limit: 300, sort: 'term', depth: 0 });
  const terms = res.docs as GlossaryTerm[];
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Глоссарий</h1>
      <dl className="space-y-4">
        {terms.map((t) => (
          <div key={t.id} id={t.slug}>
            <dt className="font-semibold">{t.term}</dt>
            <dd className="text-gray-700">{t.definition}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
```

- [ ] **Step 5: e2e `web/tests/e2e/static-pages.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

for (const [path, heading] of [
  ['/about', 'О проекте'],
  ['/faq', 'Частые вопросы'],
  ['/how-it-works', 'Как это работает'],
  ['/safety', 'Безопасность'],
  ['/help-center', 'Справочный центр'],
  ['/glossary', 'Глоссарий'],
] as const) {
  test(`page ${path} renders`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  });
}
```

- [ ] **Step 6: Запустить e2e + commit**

Run: `cd web && npm run seed:content && npx playwright test static-pages`

```bash
git add web/app/\(public\)/about web/app/\(public\)/faq web/app/\(public\)/how-it-works web/app/\(public\)/safety web/app/\(public\)/help-center web/app/\(public\)/glossary web/components/content web/tests/e2e/static-pages.spec.ts
git commit -m "Plan 4 Task 14: статичные и справочные страницы (about/faq/how-it-works/safety/help-center/glossary)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Сообщить о жестокости — страница + API

**Files:**
- Create: `web/app/(public)/report-cruelty/page.tsx`
- Create: `web/components/forms/CrueltyReportForm.tsx`
- Create: `web/app/api/cruelty-reports/route.ts`
- Create: `web/lib/email/templates/cruelty-received.tsx`
- Test: `web/tests/e2e/report-cruelty.spec.ts`

- [ ] **Step 1: Email-шаблон `web/lib/email/templates/cruelty-received.tsx`**

```tsx
export function CrueltyReceived({ description, contact, adminUrl }: { description: string; contact?: string; adminUrl: string }) {
  return (
    <div>
      <h2>Новое сообщение о жестоком обращении</h2>
      <p><b>Описание:</b> {description}</p>
      {contact && <p><b>Контакт:</b> {contact}</p>}
      <p><a href={adminUrl}>Открыть в админке</a></p>
    </div>
  );
}
```

- [ ] **Step 2: API `web/app/api/cruelty-reports/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { validateCrueltyReport } from '@/lib/content/validate';
import { getCurrentUser } from '@/lib/auth/current-user';
import { sendEmail } from '@/lib/email/resend-client';
import { CrueltyReceived } from '@/lib/email/templates/cruelty-received';

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkRateLimit(`cruelty:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком много обращений. Попробуйте позже.' }, { status: 429 });
  }
  const form = await req.formData();
  const token = form.get('cf-turnstile-response') as string | null;
  if (!(await verifyTurnstile(token, ip))) {
    return NextResponse.json({ error: 'Проверка не пройдена. Обновите страницу.' }, { status: 400 });
  }

  const description = (form.get('description') as string) ?? '';
  const contact = (form.get('contact') as string) || undefined;
  const v = validateCrueltyReport({ description, contact });
  if (!v.ok) return NextResponse.json({ error: v.errors.join('. ') }, { status: 422 });

  const payload = await getPayload({ config });
  const user = await getCurrentUser();

  const doc = await payload.create({
    collection: 'cruelty-reports',
    overrideAccess: true,
    data: { description, contact, reporterUser: user?.id ?? undefined, status: 'new' },
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const adminUrl = `${base}/admin/collections/cruelty-reports/${doc.id}`;
  const to = process.env.SUPERADMIN_EMAIL;
  if (to) {
    await sendEmail({ to, subject: 'Новое сообщение о жестокости', react: CrueltyReceived({ description, contact, adminUrl }) });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Форма `web/components/forms/CrueltyReportForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';

export function CrueltyReportForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending'); setError('');
    const res = await fetch('/api/cruelty-reports', { method: 'POST', body: new FormData(e.currentTarget) });
    if (res.ok) setState('done');
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Ошибка отправки'); setState('error'); }
  }

  if (state === 'done') return <p className="rounded-xl bg-green-50 p-4 text-green-700">Спасибо. Сообщение получено, мы свяжемся при необходимости.</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <textarea name="description" required minLength={20} rows={6} placeholder="Опишите ситуацию: что, где, когда" className="w-full rounded-xl border p-3" />
      <input name="contact" placeholder="Ваш контакт (необязательно)" className="w-full rounded-xl border p-3" />
      <TurnstileWidget />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={state === 'sending'} className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white disabled:opacity-50">
        {state === 'sending' ? 'Отправка…' : 'Отправить сообщение'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Страница `web/app/(public)/report-cruelty/page.tsx` (инфо + форма)**

```tsx
import { CrueltyReportForm } from '@/components/forms/CrueltyReportForm';

export const metadata = { title: 'Сообщить о жестоком обращении', description: 'Куда обращаться при жестоком обращении с животными в Беларуси: МВД, ветстанции, нормы закона.' };

export default function ReportCrueltyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Сообщить о жестоком обращении</h1>

      <section className="mt-6 rounded-2xl bg-amber-50 p-4">
        <h2 className="font-semibold">Куда обращаться</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-gray-800">
          <li>Милиция — <a href="tel:102" className="text-blue-600">102</a> (при явной угрозе жизни животного/человека)</li>
          <li>Местная ветеринарная станция — фиксация состояния животного</li>
          <li>Районная администрация / служба ЖКХ — по вопросам содержания и отлова</li>
        </ul>
        <p className="mt-3 text-sm text-gray-600">
          Правовая база: ст. 339-1 УК РБ (жестокое обращение), ст. 16.29 КоАП, Закон № 361-З. Подробнее — в <a href="/legal" className="text-blue-600 underline">юридическом разделе</a>.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold">Сообщить нам</h2>
        <p className="mb-4 text-gray-600">Можно анонимно. Мы не публикуем обращения, используем их для помощи и связи с компетентными органами.</p>
        <CrueltyReportForm />
      </section>
    </main>
  );
}
```

- [ ] **Step 5: e2e `web/tests/e2e/report-cruelty.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('report-cruelty page shows info and form', async ({ page }) => {
  await page.goto('/report-cruelty');
  await expect(page.getByRole('heading', { name: 'Сообщить о жестоком обращении' })).toBeVisible();
  await expect(page.getByPlaceholder(/Опишите ситуацию/)).toBeVisible();
});

test('submitting a valid report succeeds (turnstile skipped in test env)', async ({ page }) => {
  await page.goto('/report-cruelty');
  await page.getByPlaceholder(/Опишите ситуацию/).fill('Во дворе на цепи держат собаку без воды и еды несколько дней.');
  await page.getByRole('button', { name: /Отправить сообщение/ }).click();
  await expect(page.getByText(/Спасибо\. Сообщение получено/)).toBeVisible();
});
```

> Тест успешного сабмита проходит, т.к. в test/CI `TURNSTILE_SECRET_KEY` не задан → `verifyTurnstile` пропускает. `SUPERADMIN_EMAIL` тоже может быть пуст → письмо не шлётся, запись создаётся.

- [ ] **Step 6: Запустить e2e + commit**

Run: `cd web && npx playwright test report-cruelty`

```bash
git add web/app/\(public\)/report-cruelty web/components/forms/CrueltyReportForm.tsx web/app/api/cruelty-reports web/lib/email/templates/cruelty-received.tsx web/tests/e2e/report-cruelty.spec.ts
git commit -m "Plan 4 Task 15: страница и API сообщений о жестокости (Turnstile + rate-limit)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Контакты — заявка на подключение приюта (§7.4)

**Files:**
- Create: `web/app/(public)/contacts/page.tsx`
- Create: `web/components/forms/PartnerApplicationForm.tsx`
- Create: `web/app/api/partner-applications/route.ts`
- Create: `web/lib/email/templates/partner-application.tsx`
- Test: `web/tests/e2e/contacts.spec.ts`

- [ ] **Step 1: Email-шаблон `web/lib/email/templates/partner-application.tsx`**

```tsx
export function PartnerApplicationEmail({ name, unp, contact, links, message, adminUrl }: { name: string; unp?: string; contact: string; links?: string; message?: string; adminUrl: string }) {
  return (
    <div>
      <h2>Новая заявка на подключение приюта</h2>
      <p><b>Организация:</b> {name}</p>
      {unp && <p><b>УНП:</b> {unp}</p>}
      <p><b>Контакт:</b> {contact}</p>
      {links && <p><b>Ссылки:</b> {links}</p>}
      {message && <p><b>Сообщение:</b> {message}</p>}
      <p><a href={adminUrl}>Открыть в админке</a></p>
    </div>
  );
}
```

- [ ] **Step 2: API `web/app/api/partner-applications/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { validatePartnerApplication } from '@/lib/content/validate';
import { sendEmail } from '@/lib/email/resend-client';
import { PartnerApplicationEmail } from '@/lib/email/templates/partner-application';

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkRateLimit(`partner:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком много заявок. Попробуйте позже.' }, { status: 429 });
  }
  const form = await req.formData();
  if (!(await verifyTurnstile(form.get('cf-turnstile-response') as string | null, ip))) {
    return NextResponse.json({ error: 'Проверка не пройдена.' }, { status: 400 });
  }

  const name = (form.get('name') as string) ?? '';
  const unp = ((form.get('unp') as string) || '').trim() || undefined;
  const contact = (form.get('contact') as string) ?? '';
  const links = ((form.get('links') as string) || '').trim() || undefined;
  const message = ((form.get('message') as string) || '').trim() || undefined;

  const v = validatePartnerApplication({ name, unp, contact });
  if (!v.ok) return NextResponse.json({ error: v.errors.join('. ') }, { status: 422 });

  const payload = await getPayload({ config });
  const doc = await payload.create({
    collection: 'partner-applications',
    overrideAccess: true,
    data: { name, unp, contact, links, message, status: 'new' },
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const to = process.env.SUPERADMIN_EMAIL;
  if (to) {
    await sendEmail({
      to, subject: `Заявка приюта: ${name}`,
      react: PartnerApplicationEmail({ name, unp, contact, links, message, adminUrl: `${base}/admin/collections/partner-applications/${doc.id}` }),
    });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Форма `web/components/forms/PartnerApplicationForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';

export function PartnerApplicationForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending'); setError('');
    const res = await fetch('/api/partner-applications', { method: 'POST', body: new FormData(e.currentTarget) });
    if (res.ok) setState('done');
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Ошибка'); setState('error'); }
  }

  if (state === 'done') return <p className="rounded-xl bg-green-50 p-4 text-green-700">Заявка отправлена. Мы свяжемся с вами.</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input name="name" required placeholder="Название организации" className="w-full rounded-xl border p-3" />
      <input name="unp" placeholder="УНП (9 цифр)" className="w-full rounded-xl border p-3" />
      <input name="contact" required placeholder="Контакт: телефон / email / Telegram" className="w-full rounded-xl border p-3" />
      <input name="links" placeholder="Ссылки на соцсети / сайт" className="w-full rounded-xl border p-3" />
      <textarea name="message" rows={4} placeholder="Коротко о вас (необязательно)" className="w-full rounded-xl border p-3" />
      <TurnstileWidget />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={state === 'sending'} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50">
        {state === 'sending' ? 'Отправка…' : 'Подключить приют'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Страница `web/app/(public)/contacts/page.tsx`**

```tsx
import { PartnerApplicationForm } from '@/components/forms/PartnerApplicationForm';

export const metadata = { title: 'Контакты и подключение приюта', description: 'Свяжитесь с нами или подайте заявку на подключение приюта к платформе.' };

export default function ContactsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Контакты</h1>
      <p className="mt-4 text-gray-600">По общим вопросам пишите на <a href="mailto:hello@example.by" className="text-blue-600">hello@example.by</a>.</p>

      <section className="mt-10">
        <h2 className="mb-2 text-xl font-semibold">Подключить приют</h2>
        <p className="mb-4 text-gray-600">Если вы представляете приют или службу отлова — оставьте заявку, и мы создадим вам кабинет.</p>
        <PartnerApplicationForm />
      </section>
    </main>
  );
}
```

- [ ] **Step 5: e2e `web/tests/e2e/contacts.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('partner application submits', async ({ page }) => {
  await page.goto('/contacts');
  await expect(page.getByRole('heading', { name: 'Контакты' })).toBeVisible();
  await page.getByPlaceholder('Название организации').fill('Приют «Лапа»');
  await page.getByPlaceholder('УНП (9 цифр)').fill('123456789');
  await page.getByPlaceholder(/Контакт:/).fill('+375291112233');
  await page.getByRole('button', { name: 'Подключить приют' }).click();
  await expect(page.getByText(/Заявка отправлена/)).toBeVisible();
});
```

- [ ] **Step 6: Запустить e2e + commit**

Run: `cd web && npx playwright test contacts`

```bash
git add web/app/\(public\)/contacts web/components/forms/PartnerApplicationForm.tsx web/app/api/partner-applications web/lib/email/templates/partner-application.tsx web/tests/e2e/contacts.spec.ts
git commit -m "Plan 4 Task 16: контакты + заявка приюта (§7.4, Turnstile + rate-limit)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: Комментарии — UI + API (комментарии и жалобы)

**Files:**
- Create: `web/components/comments/CommentSection.tsx`
- Create: `web/app/api/comments/route.ts`
- Create: `web/app/api/reports/route.ts`
- Modify: `web/app/(public)/animals/[city]/[species]/[slug]/page.tsx` (вставить CommentSection)
- Modify: `web/app/(public)/blog/[slug]/page.tsx` (вставить CommentSection)
- Test: `web/tests/e2e/comments.spec.ts`

- [ ] **Step 1: API публикации комментария `web/app/api/comments/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { validateComment } from '@/lib/content/validate';
import { scoreCommentSpam } from '@/lib/comments/spam';
import { getCurrentUser } from '@/lib/auth/current-user';

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkRateLimit(`comment:${ip}`, 10, 5 * 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком часто. Подождите немного.' }, { status: 429 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Войдите, чтобы комментировать.' }, { status: 401 });

  const form = await req.formData();
  if (!(await verifyTurnstile(form.get('cf-turnstile-response') as string | null, ip))) {
    return NextResponse.json({ error: 'Проверка не пройдена.' }, { status: 400 });
  }

  const body = (form.get('body') as string) ?? '';
  const targetType = form.get('targetType') as string;
  const targetId = form.get('targetId') as string;
  if (!['animal', 'blog_post'].includes(targetType) || !targetId) {
    return NextResponse.json({ error: 'Некорректная цель комментария.' }, { status: 422 });
  }
  const v = validateComment({ body });
  if (!v.ok) return NextResponse.json({ error: v.errors.join('. ') }, { status: 422 });

  const payload = await getPayload({ config });
  const recent = await payload.find({
    collection: 'comments', overrideAccess: true, depth: 0, limit: 5,
    where: { author: { equals: user.id } }, sort: '-createdAt',
  });
  const spam = scoreCommentSpam({ body, recentByAuthor: recent.docs.map((d: any) => d.body ?? '') });

  await payload.create({
    collection: 'comments', overrideAccess: true,
    data: { author: user.id, targetType, targetId, body: body.trim(), status: spam.shadowBan ? 'hidden' : 'published', spamScore: spam.score },
  });

  // shadow-ban: автору отвечаем «успешно», даже если коммент скрыт
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: API жалобы `web/app/api/reports/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { getCurrentUser } from '@/lib/auth/current-user';

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkRateLimit(`report:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком много жалоб.' }, { status: 429 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Войдите, чтобы пожаловаться.' }, { status: 401 });

  const { targetType, targetId, reason } = await req.json().catch(() => ({}));
  if (!['animal', 'comment', 'organization'].includes(targetType) || !targetId || !reason) {
    return NextResponse.json({ error: 'Некорректная жалоба.' }, { status: 422 });
  }

  const payload = await getPayload({ config });
  await payload.create({
    collection: 'report-flags', overrideAccess: true,
    data: { reporter: user.id, targetType, targetId: String(targetId), reason: String(reason).slice(0, 1000), status: 'new' },
  });

  // если жалоба на комментарий — помечаем его reported для приоритета модерации
  if (targetType === 'comment') {
    try { await payload.update({ collection: 'comments', id: targetId, overrideAccess: true, data: { status: 'reported' } }); } catch {}
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: `web/components/comments/CommentSection.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';

interface CommentDTO { id: string; body: string; authorName: string; createdAt: string }

export function CommentSection({ targetType, targetId, isAuthed }: { targetType: 'animal' | 'blog_post'; targetId: string; isAuthed: boolean }) {
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    const res = await fetch(`/api/comments/list?targetType=${targetType}&targetId=${targetId}`);
    if (res.ok) setComments((await res.json()).comments ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [targetId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true); setError('');
    const fd = new FormData(e.currentTarget);
    fd.set('targetType', targetType); fd.set('targetId', targetId);
    const res = await fetch('/api/comments', { method: 'POST', body: fd });
    if (res.ok) { (e.target as HTMLFormElement).reset(); await load(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Ошибка'); }
    setSending(false);
  }

  return (
    <section className="mx-auto mt-10 max-w-3xl px-4">
      <h2 className="mb-4 text-xl font-semibold">Комментарии</h2>
      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl border p-3">
            <p className="text-sm font-medium">{c.authorName}</p>
            <p className="whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
        {!comments.length && <li className="text-gray-500">Будьте первым, кто оставит комментарий.</li>}
      </ul>

      {isAuthed ? (
        <form onSubmit={onSubmit} className="mt-4 space-y-2">
          <textarea name="body" required rows={3} maxLength={2000} placeholder="Ваш комментарий" className="w-full rounded-xl border p-3" />
          <TurnstileWidget />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={sending} className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{sending ? 'Отправка…' : 'Отправить'}</button>
        </form>
      ) : (
        <p className="mt-4 text-gray-600">Чтобы оставить комментарий, <a href="/login" className="text-blue-600 underline">войдите</a>.</p>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Лист-эндпоинт `web/app/api/comments/list/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getCurrentUser } from '@/lib/auth/current-user';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetType = searchParams.get('targetType') ?? '';
  const targetId = searchParams.get('targetId') ?? '';
  if (!targetType || !targetId) return NextResponse.json({ comments: [] });

  const payload = await getPayload({ config });
  const user = await getCurrentUser();

  // публичные published + (для автора) его собственные hidden (shadow-ban виден только ему)
  const orClauses: any[] = [{ status: { equals: 'published' } }];
  if (user) orClauses.push({ and: [{ author: { equals: user.id } }, { status: { equals: 'hidden' } }] });

  const res = await payload.find({
    collection: 'comments', overrideAccess: true, depth: 1, limit: 200, sort: 'createdAt',
    where: { and: [{ targetType: { equals: targetType } }, { targetId: { equals: targetId } }, { or: orClauses }] },
  });
  const comments = res.docs.map((c: any) => ({
    id: c.id,
    body: c.body,
    authorName: typeof c.author === 'object' ? [c.author.firstName, c.author.lastName].filter(Boolean).join(' ') || 'Пользователь' : 'Пользователь',
    createdAt: c.createdAt,
  }));
  return NextResponse.json({ comments });
}
```

- [ ] **Step 5: Вставить `CommentSection` на детальную животного и пост блога**

В `web/app/(public)/animals/[city]/[species]/[slug]/page.tsx` перед закрывающим `</main>`:

```tsx
import { CommentSection } from '@/components/comments/CommentSection';
import { getCurrentUser } from '@/lib/auth/current-user';
// ... в теле функции (page — async):
const viewer = await getCurrentUser();
// ... в JSX:
<CommentSection targetType="animal" targetId={String(animal.id)} isAuthed={!!viewer} />
```

В `web/app/(public)/blog/[slug]/page.tsx` после `</article>` аналогично с `targetType="blog_post"` и `targetId={String(post.id)}`.

- [ ] **Step 6: e2e `web/tests/e2e/comments.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('comment form prompts login for guests', async ({ page }) => {
  // открыть любой опубликованный пост блога из сид-данных
  await page.goto('/blog');
  const firstPost = page.locator('a[href^="/blog/"]').first();
  await firstPost.click();
  await expect(page.getByRole('heading', { name: 'Комментарии' })).toBeVisible();
  await expect(page.getByText(/войдите/)).toBeVisible();
});
```

> Тест с авторизованным постингом комментария — в e2e-наборе с залогиненным контекстом (паттерн из Plan 3 `adoption-inquiry.spec.ts`). Здесь — гостевой smoke.

- [ ] **Step 7: Запустить e2e + commit**

Run: `cd web && npx playwright test comments`

```bash
git add web/components/comments web/app/api/comments web/app/api/reports web/app/\(public\)/animals web/app/\(public\)/blog web/tests/e2e/comments.spec.ts
git commit -m "Plan 4 Task 17: комментарии и жалобы (антиспам, shadow-ban, Turnstile, rate-limit)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: Поиск, lost&found, навигация, 404/500

**Files:**
- Create: `web/app/(public)/search/page.tsx`
- Create: `web/app/(public)/lost-and-found/page.tsx`
- Create: `web/app/(public)/error.tsx`
- Modify: `web/app/(public)/not-found.tsx`
- Modify: `web/components/layout/Header.tsx`
- Modify: `web/components/layout/Footer.tsx`
- Test: `web/tests/e2e/extra-pages.spec.ts`

- [ ] **Step 1: `web/app/(public)/search/page.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';
import { searchAnimalIds } from '@/lib/search';
import type { Animal } from '@/payload-types';

export const metadata = { title: 'Поиск' };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();
  let animals: Animal[] = [];
  if (q) {
    const payload = await getPayload({ config });
    const ids = await searchAnimalIds(payload, q); // из Plan 2 lib/search.ts
    if (ids.length) {
      const res = await payload.find({ collection: 'animals', depth: 2, limit: 48, where: { and: [{ id: { in: ids } }, { status: { equals: 'published' } }] } });
      animals = res.docs as Animal[];
    }
  }
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Поиск</h1>
      <form action="/search" method="get" className="mb-6">
        <input name="q" defaultValue={q} placeholder="Кличка, город, описание…" className="w-full rounded-xl border p-3" />
      </form>
      {q && <p className="mb-4 text-gray-600">Результаты по запросу «{q}»: {animals.length}</p>}
      <AnimalGrid animals={animals} />
    </main>
  );
}
```

> Сигнатура `searchAnimalIds(payload, q)` — из Plan 2. Если она иная (например, `searchAnimalIds(q)` или возвращает `{ids}`), адаптировать вызов.

- [ ] **Step 2: `web/app/(public)/lost-and-found/page.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';
import type { Animal } from '@/payload-types';

export const revalidate = 120;
export const metadata = { title: 'Потеряны и найдены', description: 'Объявления о потерянных и найденных животных в Беларуси.' };

export default async function LostFoundPage({ searchParams }: { searchParams: { type?: string } }) {
  const type = searchParams.type === 'found' ? 'found' : searchParams.type === 'lost' ? 'lost' : null;
  const payload = await getPayload({ config });
  const where: any = { and: [{ status: { equals: 'published' } }, type ? { lostOrFound: { equals: type } } : { lostOrFound: { in: ['lost', 'found'] } }] };
  const res = await payload.find({ collection: 'animals', depth: 2, limit: 48, where, sort: '-publishedAt' });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Потеряны и найдены</h1>
      <nav className="mb-6 flex gap-3 text-sm">
        <a href="/lost-and-found" className="underline">Все</a>
        <a href="/lost-and-found?type=lost" className="underline">Потеряны</a>
        <a href="/lost-and-found?type=found" className="underline">Найдены</a>
      </nav>
      <AnimalGrid animals={res.docs as Animal[]} />
    </main>
  );
}
```

- [ ] **Step 3: `web/app/(public)/error.tsx` (500)**

```tsx
'use client';
import Link from 'next/link';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Что-то пошло не так</h1>
      <p className="mt-3 text-gray-600">Мы уже разбираемся. Попробуйте обновить страницу или вернуться на главную.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white">Обновить</button>
        <Link href="/" className="rounded-xl border-2 border-gray-300 px-5 py-2 font-semibold">На главную</Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Дополнить `web/app/(public)/not-found.tsx` (поиск + навигация)**

Заменить содержимое на:

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-4xl font-bold">Страница не найдена</h1>
      <p className="mt-3 text-gray-600">Возможно, она удалена или адрес введён с ошибкой.</p>
      <form action="/search" method="get" className="mx-auto mt-6 max-w-sm">
        <input name="q" placeholder="Искать животное…" className="w-full rounded-xl border p-3" />
      </form>
      <nav className="mt-6 flex flex-wrap justify-center gap-3 text-blue-600">
        <Link href="/" className="underline">Главная</Link>
        <Link href="/animals" className="underline">Каталог</Link>
        <Link href="/organizations" className="underline">Приюты</Link>
        <Link href="/help-center" className="underline">Справка</Link>
      </nav>
    </main>
  );
}
```

- [ ] **Step 5: Дополнить навигацию `Header.tsx` и `Footer.tsx`**

В `web/components/layout/Header.tsx` добавить в основную навигацию пункт (рядом с «Каталог»/«Приюты»):

```tsx
<Link href="/report-cruelty" className="text-red-600 hover:underline">Сообщить о жестокости</Link>
```

В `web/components/layout/Footer.tsx` добавить колонки ссылок (включить новые страницы):

```tsx
<nav className="grid grid-cols-2 gap-2 text-sm text-gray-600 sm:grid-cols-4">
  <Link href="/about">О проекте</Link>
  <Link href="/how-it-works">Как это работает</Link>
  <Link href="/safety">Безопасность</Link>
  <Link href="/success-stories">Истории успеха</Link>
  <Link href="/blog">Блог</Link>
  <Link href="/legal">Юр.раздел</Link>
  <Link href="/faq">FAQ</Link>
  <Link href="/glossary">Глоссарий</Link>
  <Link href="/help-center">Справка</Link>
  <Link href="/lost-and-found">Потеряны/найдены</Link>
  <Link href="/contacts">Контакты</Link>
  <Link href="/report-cruelty">Сообщить о жестокости</Link>
  <Link href="/privacy">Конфиденциальность</Link>
  <Link href="/terms">Правила</Link>
  <Link href="/cookie-policy">Cookie</Link>
</nav>
```

> Вставлять, сохраняя существующую разметку футера из Plan 1 (логотип, копирайт). Если футер уже содержит часть ссылок — дополнить недостающими, не дублируя.

- [ ] **Step 6: e2e `web/tests/e2e/extra-pages.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('search page renders and accepts query', async ({ page }) => {
  await page.goto('/search?q=кот');
  await expect(page.getByRole('heading', { name: 'Поиск' })).toBeVisible();
});
test('lost-and-found renders with filters', async ({ page }) => {
  await page.goto('/lost-and-found');
  await expect(page.getByRole('heading', { name: 'Потеряны и найдены' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Потеряны' })).toBeVisible();
});
test('404 page has search and nav', async ({ page }) => {
  await page.goto('/no-such-page-xyz');
  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
  await expect(page.getByPlaceholder('Искать животное…')).toBeVisible();
});
```

- [ ] **Step 7: Запустить e2e + commit**

Run: `cd web && npx playwright test extra-pages`

```bash
git add web/app/\(public\)/search web/app/\(public\)/lost-and-found web/app/\(public\)/error.tsx web/app/\(public\)/not-found.tsx web/components/layout/Header.tsx web/components/layout/Footer.tsx web/tests/e2e/extra-pages.spec.ts
git commit -m "Plan 4 Task 18: поиск, потеряны/найдены, 404/500, навигация

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 19: §17.6 — cron пересчёта срочности + email-алерты + автопост в Telegram

**Files:**
- Modify: `web/collections/NotificationPreferences.ts` (+ `urgentLastSentAt`)
- Create: `web/lib/urgency-recalc.ts`
- Modify: `web/lib/notify/messages.ts` (+ `urgentAnimalMessage`)
- Modify: `web/lib/notify/telegram.ts` (+ `notifyUrgentChannel`)
- Create: `web/lib/email/templates/urgent-alert.tsx`
- Create: `web/scripts/urgency-recalc.ts`
- Modify: `web/package.json` (+ `cron:urgency`), `web/.env.example` (+ `TELEGRAM_URGENT_CHAT_ID`), `railway.json` (cron)
- Test: `web/tests/unit/urgency-recalc.test.ts`

- [ ] **Step 1: Failing-тест чистого ядра `web/tests/unit/urgency-recalc.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { computeUrgencyTransitions } from '@/lib/urgency-recalc';

const now = new Date('2026-06-01T00:00:00Z');

describe('computeUrgencyTransitions', () => {
  it('promotes to critical when <=3 days left and flags becameCritical', () => {
    const t = computeUrgencyTransitions([
      { id: '1', urgencyLevel: 'high', legalDeadlineDate: '2026-06-03T00:00:00Z' },
    ], now);
    expect(t[0]).toMatchObject({ id: '1', newLevel: 'critical', becameCritical: true });
    expect(t[0].newRank).toBe(2);
  });
  it('no transition when level unchanged', () => {
    const t = computeUrgencyTransitions([
      { id: '2', urgencyLevel: 'normal', legalDeadlineDate: '2026-07-15T00:00:00Z' },
    ], now);
    expect(t[0].changed).toBe(false);
    expect(t[0].becameCritical).toBe(false);
  });
  it('past deadline stays critical', () => {
    const t = computeUrgencyTransitions([
      { id: '3', urgencyLevel: 'critical', legalDeadlineDate: '2026-05-20T00:00:00Z' },
    ], now);
    expect(t[0].newLevel).toBe('critical');
  });
});
```

- [ ] **Step 2: Запустить — fail.** Run: `cd web && npm test -- urgency-recalc` → FAIL.

- [ ] **Step 3: Реализовать `web/lib/urgency-recalc.ts`**

```ts
import { computeUrgency, daysUntil } from '@/lib/urgency';

export interface UrgencyInputRow {
  id: string;
  urgencyLevel: string | null;
  legalDeadlineDate: string | null;
}
export interface UrgencyTransition {
  id: string;
  oldLevel: string;
  newLevel: 'normal' | 'high' | 'critical';
  newRank: number;
  changed: boolean;
  becameCritical: boolean;
  becameHigh: boolean;
}

const RANK: Record<string, number> = { normal: 0, high: 1, critical: 2 };

/** Чистый пересчёт уровня срочности и определение переходов. now передаётся явно (тестируемость). */
export function computeUrgencyTransitions(rows: UrgencyInputRow[], now: Date): UrgencyTransition[] {
  return rows.map((r) => {
    const old = r.urgencyLevel ?? 'normal';
    const days = daysUntil(r.legalDeadlineDate, now); // из Plan 2; null если дедлайна нет
    const next = computeUrgency(days);                 // 'normal'|'high'|'critical'
    const changed = next !== old;
    return {
      id: r.id,
      oldLevel: old,
      newLevel: next,
      newRank: RANK[next],
      changed,
      becameCritical: changed && next === 'critical',
      becameHigh: changed && next === 'high',
    };
  });
}
```

> Предполагается, что `daysUntil(deadline, now)` и `computeUrgency(days)` из Plan 2 дают пороги §17.4 (≤3 → critical, ≤7 → high). Если `computeUrgency` принимает иной аргумент (например, дату), адаптировать; контракт порогов обязателен.

- [ ] **Step 4: Запустить — pass.** Run: `cd web && npm test -- urgency-recalc` → PASS.

- [ ] **Step 5: Pure-билдер `urgentAnimalMessage` в `web/lib/notify/messages.ts`**

Добавить:

```ts
export interface UrgentMsg {
  title: string;        // «Рекс №12» или «№12»
  city?: string | null;
  daysLeft: number | null;
  url: string;
  facility?: string | null;
}

export function urgentAnimalMessage(a: UrgentMsg): string {
  const left = a.daysLeft != null ? `Осталось ${a.daysLeft} дн.` : 'Истекает срок содержания';
  return [
    `🔴 СРОЧНО: ${a.title}${a.city ? `, ${a.city}` : ''}`,
    a.facility ? `Служба отлова: ${a.facility}` : null,
    left,
    `Забрать/поделиться: ${a.url}`,
  ].filter(Boolean).join('\n');
}
```

- [ ] **Step 6: `notifyUrgentChannel` в `web/lib/notify/telegram.ts`**

Добавить функцию (рядом с `notifyAdminChannel`):

```ts
/** Автопост в публичный канал проекта о срочном животном. Тихо пропускает без конфигурации. */
export async function notifyUrgentChannel(text: string, photoUrl?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_URGENT_CHAT_ID;
  if (!token || !chatId) {
    console.warn('[notify] TELEGRAM_URGENT_CHAT_ID not set, skipping urgent autopost');
    return;
  }
  try {
    const url = photoUrl
      ? `https://api.telegram.org/bot${token}/sendPhoto`
      : `https://api.telegram.org/bot${token}/sendMessage`;
    const body = photoUrl
      ? { chat_id: chatId, photo: photoUrl, caption: text }
      : { chat_id: chatId, text, disable_web_page_preview: false };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) console.error('[notify] urgent post failed', res.status);
  } catch (e) {
    console.error('[notify] urgent post error', e);
  }
}
```

- [ ] **Step 7: Email-шаблон `web/lib/email/templates/urgent-alert.tsx`**

```tsx
export function UrgentAlert({ items, city }: { items: { title: string; url: string; daysLeft: number | null }[]; city: string }) {
  return (
    <div>
      <h2>Срочные животные рядом ({city})</h2>
      <p>Этим животным грозит усыпление по срокам содержания. Если можете забрать или поделиться — это спасёт жизнь.</p>
      <ul>
        {items.map((i, idx) => (
          <li key={idx}><a href={i.url}>{i.title}</a> — {i.daysLeft != null ? `осталось ${i.daysLeft} дн.` : 'истекает срок'}</li>
        ))}
      </ul>
      <p style={{ color: '#888', fontSize: 12 }}>Вы получили это письмо, потому что подписались на срочные уведомления по городу. Отписаться можно в профиле.</p>
    </div>
  );
}
```

- [ ] **Step 8: Поле троттлинга в `web/collections/NotificationPreferences.ts`**

`emailUrgentInCities` (relationship → cities, hasMany) уже существует (Plan 1); добавляем только троттлинг-поле `urgentLastSentAt`.

Добавить в `fields`:

```ts
    { name: 'urgentLastSentAt', type: 'date', admin: { readOnly: true, position: 'sidebar', description: 'Троттлинг: не чаще 1 письма в сутки' } },
```
Run: `cd web && npx payload generate:types`

- [ ] **Step 9: Cron-скрипт `web/scripts/urgency-recalc.ts`**

```ts
import 'dotenv/config';
import { getPayload } from 'payload';
import config from '../payload.config';
import { computeUrgencyTransitions } from '../lib/urgency-recalc';
import { urgentAnimalMessage } from '../lib/notify/messages';
import { notifyUrgentChannel } from '../lib/notify/telegram';
import { daysUntil } from '../lib/urgency';
import { sendEmail } from '../lib/email/resend-client';
import { UrgentAlert } from '../lib/email/templates/urgent-alert';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? '';

function animalTitle(a: any): string {
  return a.name ? `${a.name} №${a.petNumber}` : `№${a.petNumber}`;
}
function animalPublicUrl(a: any): string {
  // /animals/[city]/[species]/[slug]; при отсутствии города — короткий путь
  return `${BASE}/animals/${a?.city?.slug ?? 'by'}/${a.species}/${a.slug}`;
}

async function main() {
  const payload = await getPayload({ config });
  const now = new Date();

  // 1) выбрать всех животных со службой отлова и дедлайном
  const res = await payload.find({
    collection: 'animals', overrideAccess: true, depth: 1, limit: 1000,
    where: { and: [{ intakeFacility: { exists: true } }, { legalDeadlineDate: { exists: true } }, { status: { equals: 'published' } }] },
  });
  const rows = res.docs.map((a: any) => ({ id: String(a.id), urgencyLevel: a.urgencyLevel, legalDeadlineDate: a.legalDeadlineDate }));
  const transitions = computeUrgencyTransitions(rows, now);

  // 2) применить изменения уровня/ранга
  const byId = new Map(res.docs.map((a: any) => [String(a.id), a]));
  const newlyCritical: any[] = [];
  for (const t of transitions) {
    if (t.changed) {
      await payload.update({ collection: 'animals', id: t.id, overrideAccess: true, data: { urgencyLevel: t.newLevel, urgencyRank: t.newRank } });
      console.log(`[urgency] ${t.id}: ${t.oldLevel} -> ${t.newLevel}`);
    }
    if (t.becameCritical) newlyCritical.push(byId.get(t.id));
  }

  // 3) автопост в Telegram-канал для новых critical
  for (const a of newlyCritical) {
    const days = daysUntil(a.legalDeadlineDate, now);
    const photo = Array.isArray(a.media) && a.media[0] && typeof a.media[0] === 'object' ? (a.media[0] as any).url : undefined;
    const text = urgentAnimalMessage({
      title: animalTitle(a), city: a?.city?.nameRu ?? null, daysLeft: days,
      url: animalPublicUrl(a), facility: a?.intakeFacility?.name ?? null,
    });
    await notifyUrgentChannel(text, photo);
  }

  // 4) email-дайджест подписчикам (троттлинг 1/сутки), только если есть новые critical
  if (newlyCritical.length) {
    const prefsRes = await payload.find({
      collection: 'notification-preferences', overrideAccess: true, depth: 2, limit: 5000,
      where: { emailUrgentInCities: { exists: true } },
    });
    const dayMs = 24 * 60 * 60 * 1000;
    for (const pref of prefsRes.docs as any[]) {
      const last = pref.urgentLastSentAt ? new Date(pref.urgentLastSentAt).getTime() : 0;
      if (now.getTime() - last < dayMs) continue; // троттлинг

      const cityIds = (pref.emailUrgentInCities ?? []).map((c: any) => String(typeof c === 'object' ? c.id : c));
      const matched = newlyCritical.filter((a) => a?.city && cityIds.includes(String(a.city.id ?? a.city)));
      if (!matched.length) continue;

      const user = typeof pref.user === 'object' ? pref.user : await payload.findByID({ collection: 'users', id: pref.user, depth: 0 });
      const email = (user as any)?.email;
      if (!email) continue;

      const cityName = matched[0]?.city?.nameRu ?? 'вашем городе';
      await sendEmail({
        to: email, subject: 'Срочные животные рядом — нужна помощь',
        react: UrgentAlert({ city: cityName, items: matched.map((a) => ({ title: animalTitle(a), url: animalPublicUrl(a), daysLeft: daysUntil(a.legalDeadlineDate, now) })) }),
      });
      await payload.update({ collection: 'notification-preferences', id: pref.id, overrideAccess: true, data: { urgentLastSentAt: now.toISOString() } });
    }
  }

  console.log(`[urgency] done. transitions=${transitions.filter((t) => t.changed).length}, newlyCritical=${newlyCritical.length}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

> Поле связи `NotificationPreference.user` предполагается из Plan 1 (Task 9). Если имя иное (`owner`/`userId`), подставить. Поле `City.slug` — из Plan 2 (Task 8); `City.nameRu` — из Plan 1.

- [ ] **Step 10: `web/package.json` + `web/.env.example` + `railway.json`**

В `package.json` scripts:

```json
"cron:urgency": "tsx scripts/urgency-recalc.ts"
```

В `.env.example`:

```env
# Публичный Telegram-канал проекта для автопоста срочных
TELEGRAM_URGENT_CHAT_ID=
SUPERADMIN_EMAIL=
```

В `railway.json` (или отдельный Railway Cron-сервис) — задача раз в сутки в 06:00:

```json
{
  "crons": [
    { "schedule": "0 6 * * *", "command": "npm --prefix web run cron:urgency" }
  ]
}
```

> Если в проекте используется отдельный Railway Cron service, завести его с командой `npm --prefix web run cron:urgency` и тем же расписанием. Cron должен иметь доступ к тем же env (DATABASE_URL, TELEGRAM_*, RESEND_*, NEXT_PUBLIC_SITE_URL).

- [ ] **Step 11: Прогон вручную (smoke)**

Run: `cd web && npm run cron:urgency`
Expected: лог `[urgency] done. transitions=…, newlyCritical=…` без ошибок (на сид-данных).

- [ ] **Step 12: Commit**

```bash
git add web/lib/urgency-recalc.ts web/lib/notify/messages.ts web/lib/notify/telegram.ts web/lib/email/templates/urgent-alert.tsx web/collections/NotificationPreferences.ts web/payload-types.ts web/scripts/urgency-recalc.ts web/package.json web/.env.example railway.json web/tests/unit/urgency-recalc.test.ts
git commit -m "Plan 4 Task 19: §17.6 cron пересчёта срочности + email-алерты + автопост в Telegram

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 20: Ретрофит Turnstile + rate-limit в существующие формы (P1/P3)

**Files:**
- Modify: `web/app/api/inquiries/route.ts` (adoption — P3)
- Modify: `web/actions/animal.ts` (createAnimal — P3) ИЛИ соответствующий API
- Modify: форма регистрации (P1: `components/auth/RegisterForm.tsx` + её обработчик/route)
- Modify: `web/components/adopt/AdoptModal.tsx`, `web/components/forms/AnimalWizard.tsx`, `web/components/auth/RegisterForm.tsx` (+ `TurnstileWidget`)
- Test: расширить существующие e2e (`adoption-inquiry`, `animal-submit`, `register`) — проверка, что формы сабмитятся (Turnstile skip в test)

- [ ] **Step 1: adoption API `web/app/api/inquiries/route.ts`**

В начало `POST` (после получения тела/формы) добавить rate-limit + Turnstile:

```ts
import { verifyTurnstile } from '@/lib/security/turnstile';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
// ...
const ip = clientIp(req);
if (!checkRateLimit(`inquiry:${ip}`, 10, 60 * 60 * 1000)) {
  return NextResponse.json({ error: 'Слишком много заявок.' }, { status: 429 });
}
// токен берём из тела (если форму перевели на FormData) или из JSON-поля turnstileToken:
const turnstileToken = /* form.get('cf-turnstile-response') | body.turnstileToken */ null;
if (!(await verifyTurnstile(turnstileToken, ip))) {
  return NextResponse.json({ error: 'Проверка не пройдена.' }, { status: 400 });
}
```

> Если `/api/inquiries` принимает JSON (Plan 3), добавить в тело поле `turnstileToken` и читать его. В `AdoptModal` добавить `<TurnstileWidget />` и передавать токен из скрытого input (`document.querySelector('[name="cf-turnstile-response"]')`) в JSON.

- [ ] **Step 2: createAnimal (`web/actions/animal.ts`)**

Если размещение идёт через server action — добавить параметр `turnstileToken` и проверку в начале `createAnimal`:

```ts
import { verifyTurnstile } from '@/lib/security/turnstile';
// в начале createAnimal(...):
if (!(await verifyTurnstile(turnstileToken))) {
  return { ok: false, error: 'Проверка не пройдена.' };
}
```

В `AnimalWizard.tsx` на шаге сабмита добавить `<TurnstileWidget />` и пробросить токен в action.

- [ ] **Step 3: Регистрация (P1)**

В `RegisterForm.tsx` добавить `<TurnstileWidget />`; в обработчике регистрации (route/action из Plan 1) добавить `verifyTurnstile` + `checkRateLimit(\`register:${ip}\`, 10, 60*60*1000)` (10 регистраций/час/IP, §16.2).

- [ ] **Step 4: Прогон существующих e2e**

Run: `cd web && npx playwright test adoption-inquiry animal-submit register`
Expected: PASS (Turnstile в test-окружении пропускается, т.к. секрет не задан).

- [ ] **Step 5: Commit**

```bash
git add web/app/api/inquiries web/actions/animal.ts web/components/adopt/AdoptModal.tsx web/components/forms/AnimalWizard.tsx web/components/auth/RegisterForm.tsx
git commit -m "Plan 4 Task 20: ретрофит Turnstile + rate-limit в формы регистрации/размещения/заявки

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 21: §16.7 — IndexNow (мгновенная переиндексация в Яндекс/Bing)

При публикации животного (`status` → `published`) пингуем IndexNow API, чтобы Яндекс и Bing переобошли карточку за минуты, а не дни. Критично для срочных животных из служб отлова: время до индексации = время до пристройства.

**Files:**
- Create: `web/lib/seo/indexnow.ts`
- Create: `web/public/<INDEXNOW_KEY>.txt` (verification-файл; содержимое = значение ключа)
- Modify: `web/collections/Animals.ts` (+ `afterChange`-хук — пинг при переходе в `published`)
- Modify: `web/.env.example` (+ `INDEXNOW_KEY`)

- [ ] **Step 1: Хелпер `web/lib/seo/indexnow.ts`**

```ts
// Пинг IndexNow (Яндекс/Bing): мгновенная переиндексация URL. §16.7.
// Никогда не бросает — SEO не должен ломать публикацию.
export async function pingIndexNow(urls: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!key || !base || !urls.length) return; // в dev/CI без ключа — no-op
  const host = new URL(base).host;
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${base.replace(/\/$/, '')}/${key}.txt`,
        urlList: urls.map((u) => (u.startsWith('http') ? u : `${base.replace(/\/$/, '')}${u}`)),
      }),
    });
  } catch (e) {
    console.error('[indexnow] ping failed', e);
  }
}
```

> Верификация владения: положи в `web/public/<INDEXNOW_KEY>.txt` файл, единственная строка которого — само значение `INDEXNOW_KEY`. IndexNow дергает `keyLocation` и сверяет.

- [ ] **Step 2: `afterChange`-хук в `web/collections/Animals.ts`**

В объект коллекции добавить (или дополнить существующий) `hooks.afterChange`:

```ts
import { pingIndexNow } from '@/lib/seo/indexnow';
import { animalUrl } from '@/lib/animal-url';
// ...
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation }) => {
        const becamePublished =
          doc?.status === 'published' &&
          (operation === 'create' ? true : previousDoc?.status !== 'published');
        if (becamePublished) {
          await pingIndexNow([animalUrl(doc)]);
        }
        return doc;
      },
    ],
  },
```

> Если у `Animals` уже есть другие `afterChange`-хуки — добавить функцию в массив, не перезаписывать. Если сигнатура `animalUrl` отличается (принимает `slug`/`id` вместо объекта) — подставить корректный вызов; цель — абсолютный или корневой путь карточки.

- [ ] **Step 3: `web/.env.example`**

Добавить (если ещё нет из общего блока env):

```env
# IndexNow — переиндексация Яндекс/Bing при публикации (§16.7).
# Случайная hex-строка 8–128 символов; такой же файл <INDEXNOW_KEY>.txt в web/public/
INDEXNOW_KEY=
```

- [ ] **Step 4: Commit**

```bash
git add web/lib/seo/indexnow.ts web/collections/Animals.ts web/.env.example
git commit -m "Plan 4 Task 21: IndexNow-пинг при публикации животного (§16.7)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 22: «Похожие животные» под карточкой (§16.2)

**Files:**
- Create: `web/lib/similar.ts`
- Create: `web/components/catalog/SimilarAnimals.tsx`
- Modify: `web/app/(public)/animals/[city]/[species]/[slug]/page.tsx`
- Test: `web/tests/unit/similar.test.ts`

- [ ] **Step 1: Failing-тест `web/tests/unit/similar.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { buildSimilarWhere } from '@/lib/similar';

describe('buildSimilarWhere', () => {
  it('matches same species, excludes self, requires published', () => {
    const w = buildSimilarWhere({ id: 5, species: 'dog' });
    expect(w.and).toEqual(expect.arrayContaining([
      { status: { equals: 'published' } },
      { id: { not_equals: 5 } },
      { species: { equals: 'dog' } },
    ]));
  });
  it('adds city clause, normalizing object to id', () => {
    const w = buildSimilarWhere({ id: 5, species: 'cat', city: { id: 7 } as any });
    expect(w.and).toEqual(expect.arrayContaining([{ city: { equals: 7 } }]));
  });
  it('omits city clause when absent', () => {
    const w = buildSimilarWhere({ id: 5, species: 'cat', city: null });
    expect(w.and.some((c: any) => 'city' in c)).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — fail.** Run: `cd web && npm test -- similar` → FAIL.

- [ ] **Step 3: Реализовать `web/lib/similar.ts`**

```ts
export interface SimilarInput {
  id: string | number;
  species: string;
  city?: string | number | { id: string | number } | null;
}

/** Where для подбора похожих: тот же вид, тот же город (если есть), опубликованные, кроме самого животного. */
export function buildSimilarWhere(a: SimilarInput) {
  const and: any[] = [
    { status: { equals: 'published' } },
    { id: { not_equals: a.id } },
    { species: { equals: a.species } },
  ];
  if (a.city) {
    const cityId = typeof a.city === 'object' ? (a.city as any).id : a.city;
    if (cityId) and.push({ city: { equals: cityId } });
  }
  return { and };
}
```

- [ ] **Step 4: Запустить — pass.** Run: `cd web && npm test -- similar` → PASS.

- [ ] **Step 5: Реализовать `web/components/catalog/SimilarAnimals.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';
import { buildSimilarWhere, type SimilarInput } from '@/lib/similar';
import type { Animal } from '@/payload-types';

export async function SimilarAnimals({ animal }: { animal: SimilarInput }) {
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'animals', depth: 2, limit: 4, where: buildSimilarWhere(animal), sort: '-publishedAt' });
  const animals = res.docs as Animal[];
  if (!animals.length) return null;
  return (
    <section className="mx-auto mt-12 max-w-5xl px-4">
      <h2 className="mb-4 text-xl font-semibold">Похожие животные</h2>
      <AnimalGrid animals={animals} />
    </section>
  );
}
```

- [ ] **Step 6: Подключить на детальной странице**

В `web/app/(public)/animals/[city]/[species]/[slug]/page.tsx` перед `CommentSection` (Task 17) добавить:

```tsx
import { SimilarAnimals } from '@/components/catalog/SimilarAnimals';
// в JSX:
<SimilarAnimals animal={{ id: animal.id, species: animal.species, city: animal.city as any }} />
```

- [ ] **Step 7: Commit**

```bash
git add web/lib/similar.ts web/components/catalog/SimilarAnimals.tsx web/app/\(public\)/animals web/tests/unit/similar.test.ts
git commit -m "Plan 4 Task 22: похожие животные под карточкой

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 23: Inline-тултипы глоссария (low-literacy §8)

**Files:**
- Create: `web/lib/glossary-annotate.ts`
- Create: `web/components/content/GlossaryText.tsx`
- Modify: `web/app/(public)/glossary/page.tsx` (кросс-линки определений)
- Test: `web/tests/unit/glossary-annotate.test.ts`

- [ ] **Step 1: Failing-тест `web/tests/unit/glossary-annotate.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { annotateGlossaryTerms } from '@/lib/glossary-annotate';

const terms = [
  { term: 'стерилизация', slug: 'sterilization' },
  { term: 'чип', slug: 'chipping' },
];

describe('annotateGlossaryTerms', () => {
  it('marks a matched term with its slug', () => {
    const segs = annotateGlossaryTerms('Стерилизация важна', terms);
    expect(segs.find((s) => s.slug === 'sterilization')).toBeTruthy();
    expect(segs.map((s) => s.text).join('')).toBe('Стерилизация важна');
  });
  it('marks each term at most once', () => {
    const segs = annotateGlossaryTerms('чип и ещё раз чип', terms);
    expect(segs.filter((s) => s.slug === 'chipping')).toHaveLength(1);
  });
  it('respects word boundaries (no partial match inside a word)', () => {
    const segs = annotateGlossaryTerms('чиппендейл', terms);
    expect(segs.some((s) => s.slug)).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — fail.** Run: `cd web && npm test -- glossary-annotate` → FAIL.

- [ ] **Step 3: Реализовать `web/lib/glossary-annotate.ts`**

```ts
export interface GTerm { term: string; slug: string }
export type Segment = { text: string; slug?: string };

const WORD = /[a-zа-яё0-9]/i;

/** Размечает первое вхождение каждого термина (по границам слова, без перекрытий). Чистая. */
export function annotateGlossaryTerms(text: string, terms: GTerm[]): Segment[] {
  const marks: { start: number; end: number; slug: string }[] = [];
  const used = new Set<string>();
  const lower = text.toLowerCase();
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);

  for (const t of sorted) {
    if (used.has(t.slug)) continue;
    const needle = t.term.toLowerCase();
    if (!needle) continue;
    let from = 0, idx = -1;
    while ((idx = lower.indexOf(needle, from)) !== -1) {
      const start = idx, end = idx + needle.length;
      const boundaryL = start === 0 || !WORD.test(text[start - 1]);
      const boundaryR = end === text.length || !WORD.test(text[end]);
      const overlaps = marks.some((m) => start < m.end && end > m.start);
      if (boundaryL && boundaryR && !overlaps) { marks.push({ start, end, slug: t.slug }); used.add(t.slug); break; }
      from = idx + needle.length;
    }
  }

  marks.sort((a, b) => a.start - b.start);
  const segs: Segment[] = [];
  let pos = 0;
  for (const m of marks) {
    if (m.start > pos) segs.push({ text: text.slice(pos, m.start) });
    segs.push({ text: text.slice(m.start, m.end), slug: m.slug });
    pos = m.end;
  }
  if (pos < text.length) segs.push({ text: text.slice(pos) });
  return segs;
}
```

- [ ] **Step 4: Запустить — pass.** Run: `cd web && npm test -- glossary-annotate` → PASS.

- [ ] **Step 5: Реализовать `web/components/content/GlossaryText.tsx`**

```tsx
import Link from 'next/link';
import { annotateGlossaryTerms, type GTerm } from '@/lib/glossary-annotate';

/** Рендерит plain-текст, превращая известные термины в ссылки на /glossary#slug (пунктир). */
export function GlossaryText({ text, terms }: { text: string; terms: GTerm[] }) {
  const segs = annotateGlossaryTerms(text, terms);
  return (
    <>
      {segs.map((s, i) =>
        s.slug
          ? <Link key={i} href={`/glossary#${s.slug}`} className="underline decoration-dotted underline-offset-2" title="Открыть в глоссарии">{s.text}</Link>
          : <span key={i}>{s.text}</span>,
      )}
    </>
  );
}
```

- [ ] **Step 6: Кросс-линки в `web/app/(public)/glossary/page.tsx`**

Заменить рендер определения `<dd className="text-gray-700">{t.definition}</dd>` на:

```tsx
import { GlossaryText } from '@/components/content/GlossaryText';
// ...
<dd className="text-gray-700">
  <GlossaryText text={t.definition} terms={terms.filter((x) => x.slug !== t.slug).map((x) => ({ term: x.term, slug: x.slug }))} />
</dd>
```

> Так определение термина автоматически линкует другие термины глоссария, упомянутые в нём. `GlossaryText` переиспользуем в фазе 2 для plain-полей (комментарии, краткие описания). Полная разметка внутри richText (Lexical) — фаза 2.

- [ ] **Step 7: Commit**

```bash
git add web/lib/glossary-annotate.ts web/components/content/GlossaryText.tsx web/app/\(public\)/glossary web/tests/unit/glossary-annotate.test.ts
git commit -m "Plan 4 Task 23: inline-тултипы глоссария (annotate + GlossaryText + кросс-линки)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

### Spec coverage check

| Требование спеки | Покрыто |
|---|---|
| §5 Главная (герой, 6 животных, 4 приюта, CTA) | Task 11 |
| §5 `/blog`, `/blog/[slug]` | Task 12 |
| §5 `/legal`, `/legal/[slug]` | Task 13 |
| §5 `/about`, `/contacts` (форма приюта §7.4) | Task 14, 16 |
| §5 `/report-cruelty` (§7.5) | Task 15 |
| §5 `/search` | Task 18 |
| §6 BlogPost, LegalArticle, Comment, ReportFlag, CrueltyReport, HelpArticle, Glossary | Tasks 3–7 |
| §6 PartnerApplication (под §7.4) | Task 4 |
| §16.2/§16.7 Turnstile на формы | Tasks 1, 15, 16, 17, 20 |
| §16.2/§16.7 rate limiting | Tasks 1, 15–17, 20 |
| §16.2 антиспам комментариев + shadow-ban | Tasks 9, 17 |
| §16.2/§16.7 бейджи (Срочно/Передержка/Карантин/Забронирован/Пристроен) | Task 8 |
| §16.2/§16.7 вертикаль «Найдено/Потеряно» | Task 8 (поле уже есть), 18 (страница) |
| §16.2 FAQ/Как это работает/Безопасность/Истории успеха/Глоссарий/help-center | Tasks 12, 14 |
| §16.2/§16.7 404/500 с поиском и навигацией | Task 18 |
| §16.2/§16.7 хлебные крошки | Tasks 10, 12, 13 |
| §16.2 footer обязательные ссылки | Task 18 |
| §17.5 hero-блок срочных на главной | Task 11 |
| §17.6 cron urgency_recalc_daily | Task 19 |
| §17.6 email-алерты подписчикам (+ троттлинг) | Task 19 |
| §17.6 автопост в Telegram-канал | Task 19 |
| §17.6 NotificationPreference.notify_urgent_in_city | Task 19 |
| §17.8 статья municipal-intake-rights | Task 6 (seed) |
| §16.7 IndexNow (мгновенная переиндексация Яндекс/Bing) | Task 21 |
| §16.2 похожие животные | Task 22 |
| §8 inline-глоссарий (low-literacy) | Task 23 |

**Сознательно НЕ в этом плане (по решению/roadmap):**
- Донаты/ЕРИП и `/help/*`, `/me/donations`, `/org/[slug]/donations` → Plan 5.
- 2FA модераторов, «Шрифт крупнее», onboarding-walkthrough, status page, i18n, image sitemap → Plan 6.
- ✅ Inline-тултипы глоссария (low-literacy §8) — Task 23 (`annotateGlossaryTerms` + `GlossaryText`, кросс-линки на `/glossary`). Полная разметка внутри richText — фаза 2.
- ✅ «Похожие животные» под карточкой (§16.2) — Task 22 (`buildSimilarWhere` по виду+городу + `SimilarAnimals`).
- «Закрыть объявление»/«Я нашёл хозяина» для citizen — относится к posting (Plan 3); если не сделано там — мини-таск в Plan 6.

### Type consistency

- Поля `animals` — camelCase, совпадают с Plan 2 (`urgencyLevel`, `urgencyRank`, `lostOrFound`, `legalDeadlineDate`, `intakeFacility`, `publishedAt`, `status`, `ownerType`, `healthStatus`). Новое поле — `specialStatus` (select hasMany).
- `computeAnimalBadges` принимает `AnimalBadgeInput` (подмножество полей `Animal`) — в карточке передаётся `animal as any`.
- `computeUrgencyTransitions` опирается на `computeUrgency`/`daysUntil` из Plan 2 `lib/urgency.ts` — пороги §17.4.
- API-контракты: `sendEmail({to,subject,react})`, `getCurrentUser()`, `isAdmin`, `checkRateLimit(key,limit,windowMs)`, `verifyTurnstile(token,ip?)` — единообразны во всех роутах.
- Slug-коллекции: `blog-posts`, `legal-articles`, `help-articles`, `glossary-terms`, `comments`, `report-flags`, `cruelty-reports`, `partner-applications` — везде kebab-case, как у P1–P3.

### Placeholder scan

- Все шаги содержат конкретный код/команды/тексты. Контент юр.статьи и НПА-ссылки — рабочий каркас (финальный текст пишет юрист в фазе 0, помечено явно).
- Места с допущениями о сигнатурах из P1/P2 (`uniqueSlug`, `searchAnimalIds`, `computeUrgency`, `NotificationPreference.user`, `isPublished`, `RichText`) помечены цитатой-предупреждением с инструкцией адаптации — это не плейсхолдеры, а явные точки стыковки.

### Известные допущения для исполнителя

1. `lib/slug.ts`, `lib/urgency.ts`, `lib/search.ts`, `lib/format.ts`, `components/catalog/*`, `components/org/OrganizationCard.tsx` существуют из Plan 2 с указанными экспортами. Перед Task 8/11/18/19 убедиться в фактических сигнатурах (`npx payload generate:types` уже прогнан, импорты разрешаются).
2. `RichText`-рендер Lexical: версия `@payloadcms/richtext-lexical` определяет точный импорт; Task 12 Step 3 даёт дефолт, при несовпадении — взять сериализатор из установленной версии.
3. Rate-limit в памяти процесса корректен для одного инстанса Railway (MVP). При горизонтальном масштабировании (фаза 2) заменить хранилище на Redis, сохранив `slidingWindowAllow` как ядро.
4. Turnstile в dev/CI без `TURNSTILE_SECRET_KEY` пропускается — поэтому e2e сабмиты форм проходят без реального токена.
5. Cron §17.6: запускать через Railway Cron с доступом к тем же env, что и веб-сервис.

## Execution Handoff

Плагин готов и сохранён в `docs/superpowers/plans/2026-05-28-plan-4-content-trust.md`. Два варианта исполнения:

**1. Subagent-Driven (рекомендуется)** — отдельный субагент на задачу, ревью между задачами, быстрая итерация. REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`.

**2. Inline Execution** — выполнять задачи в этой сессии пакетами с чекпойнтами. REQUIRED SUB-SKILL: `superpowers:executing-plans`.

Какой подход выбираешь?
