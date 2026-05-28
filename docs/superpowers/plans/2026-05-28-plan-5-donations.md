# Plan 5: Donations (ExpressPay / ЕРИП) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Полный цикл пожертвований через ЕРИП/ExpressPay: форма доната на животное / организацию / общий фонд, создание счёта, идемпотентный webhook, чек донору, агрегаты помощи на карточках и в профилях, кабинеты `/me/donations` и `/org/[slug]/donations`, суточный reconciliation-cron.

**Architecture:** Платёжный слой изолирован в `lib/payments/*` (чистые ядра отдельно от HTTP-клиента с DI `fetch`). Поток §7.3: форма → `POST /api/donations/expresspay` создаёт `Donation(pending)` + счёт в ExpressPay → redirect/QR ЕРИП → пользователь платит → ExpressPay шлёт webhook на `/api/donations/expresspay/webhook` → идемпотентная пометка `paid` (по уникальному `providerInvoiceId`, с подтверждением статуса у провайдера) → email-чек. Суточный cron сверяет «зависшие» `pending`. Анти-бот (Turnstile) и rate-limit переиспользуются из Plan 4 (`lib/security/*`).

**Tech Stack:** Next.js 14 (App Router, RSC, Route Handlers) + Payload CMS 3 + Postgres + ExpressPay API (express-pay.by, ЕРИП) + Resend + `node:crypto` (HMAC-подпись) + Vitest + Playwright.

**Roadmap-позиция:** Plan 1–4 ✅ (foundation, catalog, posting/cabinets, content&trust+§17.6). **Plan 5 = донаты** (этот). Plan 6 = Quality + Launch (i18n, 2FA модераторов, «Шрифт крупнее», status page, beta, перевод платежей в прод-режим).

---

## Что уже существует (из Plan 1–4) — переиспользуем

- **Коллекции/типы:** `users`, `cities`, `media`, `audit-logs`, `notification-preferences`, `organizations`, `animals`, `adoption-inquiries`, `comments`, `report-flags`, `cruelty-reports`, `partner-applications`, `blog-posts`, `legal-articles`, `help-articles`, `glossary-terms`. **Plan 5 добавляет `donations`.**
- **lib/security (Plan 4):** `verifyTurnstile(token, ip?)` (`lib/security/turnstile.ts`), `checkRateLimit(key, limit, windowMs)` + `clientIp(req)` (`lib/security/rate-limit.ts`); client `TurnstileWidget` (`components/security/TurnstileWidget.tsx`).
- **lib/email:** `sendEmail({ to, subject, react })` (`lib/email/resend-client.ts`).
- **lib/auth:** `getCurrentUser()`, `requireUser()`, `requireOrgAdmin(slug)` (`lib/auth/current-user.ts`); `isAdmin`, `canManageOrganization` (`lib/auth/rbac.ts`).
- **lib/audit:** `recordAuditLog(...)` (`lib/audit/log.ts`).
- **lib (каталог):** `animalUrl` (`lib/animal-url.ts`), `formatAnimalTitle` (`lib/format.ts`).
- **components:** `catalog/AnimalCard`, `catalog/AnimalGrid`, `org/OrganizationCard`, `layout/Header`, `layout/Footer` (содержит ссылку `/help/general` из Plan 4 Task 11/18).
- **Поля `animals`:** `id`, `slug`, `petNumber`, `name`, `species`, `city`, `status`, `media`, `organization`, `ownerType` … (см. Plan 2/4). **Поля `organizations`:** `id`, `slug`, `name`, `isPublished`, `eripServiceCode` (nullable, §6), `donationBankDetails` (richText).

**Env-переменные Plan 5** (в `web/.env.example`):

```env
# ExpressPay (express-pay.by, ЕРИП)
EXPRESSPAY_API_BASE=https://api.express-pay.by/v1
EXPRESSPAY_TOKEN=
EXPRESSPAY_SECRET=            # секретное слово для подписи запросов/уведомлений (если включена в ЛК ExpressPay)
EXPRESSPAY_SERVICE_ID=        # номер услуги ЕРИП
EXPRESSPAY_USE_CARD=true      # true → cardinvoices (есть payment URL); false → invoices (номер ЕРИП для оплаты в банке)
# Письма
SUPERADMIN_EMAIL=
NEXT_PUBLIC_SITE_URL=https://example.by
```

> ⚠️ Точные имена полей запроса, набор полей в подписи и коды статусов ExpressPay подтвердить по актуальной документации express-pay.by на этапе интеграции (фаза 0/1). Архитектура потока от этого не зависит; помеченные ниже места — единственные точки стыковки.

---

## File Structure (Plan 5)

```
web/
  ├── collections/
  │   └── Donations.ts             # NEW
  ├── lib/payments/
  │   ├── amounts.ts               # NEW: пресеты сумм, parseAmount, formatByn (pure)
  │   ├── expresspay-signature.ts  # NEW: computeSignature, verifySignature (pure, HMAC-SHA1)
  │   ├── expresspay.ts            # NEW: ExpressPay-клиент (createInvoice, getInvoiceStatus; DI fetch)
  │   ├── donation.ts              # NEW: buildAccountNo, mapProviderStatus, receiptData (pure)
  │   └── aggregate.ts             # NEW: sumPaidByn, donorCount (pure)
  ├── lib/email/templates/
  │   └── donation-receipt.tsx     # NEW
  ├── app/
  │   ├── (public)/help/
  │   │   ├── page.tsx                       # NEW: хаб «Помочь»
  │   │   ├── general/page.tsx               # NEW: общий фонд
  │   │   ├── animal/[slug]/page.tsx         # NEW: донат на животное
  │   │   └── organization/[slug]/page.tsx   # NEW: донат на организацию
  │   ├── (account)/me/donations/page.tsx    # NEW
  │   ├── (account)/org/[slug]/donations/page.tsx # NEW
  │   └── api/donations/expresspay/
  │       ├── route.ts             # NEW: POST создать счёт
  │       └── webhook/route.ts     # NEW: POST идемпотентный webhook
  ├── components/donate/
  │   ├── DonationForm.tsx         # NEW (client)
  │   └── DonationSummary.tsx      # NEW (агрегаты на карточке/профиле)
  ├── scripts/
  │   └── donations-reconcile.ts   # NEW (cron)
  ├── app/(public)/animals/[city]/[species]/[slug]/page.tsx  # MODIFY: + DonationSummary + CTA «Помочь рублём»
  ├── app/(public)/organizations/[slug]/page.tsx             # MODIFY: + DonationSummary + CTA
  ├── package.json                 # MODIFY: + cron:reconcile
  ├── railway.json                 # MODIFY: + cron
  └── tests/
      ├── unit/payments/
      │   ├── amounts.test.ts
      │   ├── expresspay-signature.test.ts
      │   ├── expresspay.test.ts
      │   ├── donation.test.ts
      │   └── aggregate.test.ts
      └── e2e/
          ├── donate.spec.ts
          └── donations-cabinets.spec.ts
```

---

## Tasks

### Task 1: Коллекция Donations

**Files:**
- Create: `web/collections/Donations.ts`
- Modify: `web/payload.config.ts`
- Test: smoke в админке

- [ ] **Step 1: Создать `web/collections/Donations.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';

export const Donations: CollectionConfig = {
  slug: 'donations',
  labels: { singular: 'Пожертвование', plural: 'Пожертвования' },
  admin: { useAsTitle: 'id', defaultColumns: ['amountByn', 'targetType', 'status', 'createdAt'] },
  access: {
    // создаётся/обновляется только server-side (overrideAccess). Прямой публичный доступ закрыт.
    create: ({ req: { user } }) => isAdmin(user as any),
    read: ({ req: { user } }) => {
      if (isAdmin(user as any)) return true;
      if (!user) return false;
      return { donorUser: { equals: user.id } }; // донор видит свои; агрегаты считаются через overrideAccess
    },
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'donorUser', type: 'relationship', relationTo: 'users', index: true, admin: { description: 'null для гостевых донатов' } },
    { name: 'donorEmail', type: 'text', index: true },
    { name: 'donorPhone', type: 'text' },
    { name: 'donorName', type: 'text' },
    { name: 'amountByn', type: 'number', required: true, min: 1 },
    { name: 'currency', type: 'text', defaultValue: 'BYN' },
    {
      name: 'targetType', type: 'select', required: true, index: true, options: [
        { label: 'Организация', value: 'organization' },
        { label: 'Животное', value: 'animal' },
        { label: 'Общий фонд', value: 'general_fund' },
      ],
    },
    { name: 'organization', type: 'relationship', relationTo: 'organizations', index: true },
    { name: 'animal', type: 'relationship', relationTo: 'animals', index: true },
    { name: 'purpose', type: 'text', admin: { description: 'Корм / лечение / общее' } },
    {
      name: 'paymentProvider', type: 'select', defaultValue: 'expresspay_erip', options: [
        { label: 'ExpressPay (ЕРИП)', value: 'expresspay_erip' },
        { label: 'Банковский перевод (вручную)', value: 'bank_transfer_manual' },
      ],
    },
    { name: 'providerInvoiceId', type: 'text', unique: true, index: true, admin: { description: 'Уникален → идемпотентность webhook' } },
    { name: 'accountNo', type: 'text', index: true, admin: { description: 'Номер заказа в ExpressPay (наш)' } },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'pending', index: true, options: [
        { label: 'Ожидает оплаты', value: 'pending' },
        { label: 'Оплачено', value: 'paid' },
        { label: 'Не удалось', value: 'failed' },
        { label: 'Возврат', value: 'refunded' },
      ],
    },
    { name: 'paidAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
  ],
};
```

- [ ] **Step 2: Зарегистрировать в `web/payload.config.ts`**

```ts
import { Donations } from './collections/Donations';
// добавить Donations в конец массива collections
```

- [ ] **Step 3: Типы + smoke**

Run: `cd web && npx payload generate:types && npm run dev` → `/admin/collections/donations` доступна, поля на месте.

- [ ] **Step 4: Commit**

```bash
git add web/collections/Donations.ts web/payload.config.ts web/payload-types.ts
git commit -m "Plan 5 Task 1: коллекция Donations

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Суммы и формат BYN (pure)

**Files:**
- Create: `web/lib/payments/amounts.ts`
- Test: `web/tests/unit/payments/amounts.test.ts`

- [ ] **Step 1: Failing-тест**

```ts
import { describe, it, expect } from 'vitest';
import { PRESET_AMOUNTS, parseAmount, formatByn } from '@/lib/payments/amounts';

describe('amounts', () => {
  it('exposes presets', () => {
    expect(PRESET_AMOUNTS).toEqual([10, 25, 50, 100]);
  });
  it('parses valid amounts and rounds to 2 decimals', () => {
    expect(parseAmount('25')).toEqual({ ok: true, value: 25 });
    expect(parseAmount('9,90')).toEqual({ ok: true, value: 9.9 });
    expect(parseAmount('10.005')).toEqual({ ok: true, value: 10.01 });
  });
  it('rejects non-positive, NaN, too large', () => {
    expect(parseAmount('0').ok).toBe(false);
    expect(parseAmount('-5').ok).toBe(false);
    expect(parseAmount('abc').ok).toBe(false);
    expect(parseAmount('1000000').ok).toBe(false);
  });
  it('formats BYN', () => {
    expect(formatByn(25)).toContain('25');
    expect(formatByn(25)).toMatch(/BYN|р/i);
  });
});
```

- [ ] **Step 2: Запустить — fail.** Run: `cd web && npm test -- payments/amounts` → FAIL.

- [ ] **Step 3: Реализовать `web/lib/payments/amounts.ts`**

```ts
export const PRESET_AMOUNTS = [10, 25, 50, 100] as const;
export const MAX_AMOUNT = 100_000;

export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

/** Парсит сумму из строки (запятая или точка), округляет до копеек, валидирует диапазон. */
export function parseAmount(raw: string): ParseResult {
  const normalized = (raw ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return { ok: false, error: 'Введите сумму числом' };
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: 'Сумма должна быть больше нуля' };
  if (n > MAX_AMOUNT) return { ok: false, error: 'Слишком большая сумма' };
  const value = Math.round(n * 100) / 100;
  return { ok: true, value };
}

const fmt = new Intl.NumberFormat('ru-BY', { style: 'currency', currency: 'BYN', minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Денежный формат BYN (ru-BY). */
export function formatByn(value: number): string {
  return fmt.format(value);
}
```

> Если в среде CI `Intl` с локалью `ru-BY` отдаёт строку без «BYN» (зависит от ICU), тест проверяет `BYN|р` — достаточно мягко. При необходимости заменить на ручной формат `${value} BYN`.

- [ ] **Step 4: Запустить — pass.** Run: `cd web && npm test -- payments/amounts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/payments/amounts.ts web/tests/unit/payments/amounts.test.ts
git commit -m "Plan 5 Task 2: суммы донатов и формат BYN (pure)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Подпись ExpressPay (pure, HMAC-SHA1)

**Files:**
- Create: `web/lib/payments/expresspay-signature.ts`
- Test: `web/tests/unit/payments/expresspay-signature.test.ts`

- [ ] **Step 1: Failing-тест**

```ts
import { describe, it, expect } from 'vitest';
import { computeSignature, verifySignature } from '@/lib/payments/expresspay-signature';

describe('expresspay signature', () => {
  it('computes a stable uppercase hex HMAC-SHA1', () => {
    const sig = computeSignature(['100', 'BYN', 'order-1'], 'secret');
    expect(sig).toMatch(/^[0-9A-F]{40}$/);
    expect(computeSignature(['100', 'BYN', 'order-1'], 'secret')).toBe(sig); // детерминирован
  });
  it('verifies a correct signature and rejects a wrong one', () => {
    const parts = ['100', 'BYN', 'order-1'];
    const sig = computeSignature(parts, 'secret');
    expect(verifySignature(parts, 'secret', sig)).toBe(true);
    expect(verifySignature(parts, 'secret', sig.toLowerCase())).toBe(true); // регистронезависимо
    expect(verifySignature(parts, 'secret', 'DEADBEEF')).toBe(false);
  });
  it('treats empty secret as signature disabled (allow)', () => {
    expect(verifySignature(['x'], '', 'whatever')).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить — fail.** Run: `cd web && npm test -- expresspay-signature` → FAIL.

- [ ] **Step 3: Реализовать `web/lib/payments/expresspay-signature.ts`**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

/** HMAC-SHA1 (hex, upper-case) над конкатенацией полей в фиксированном порядке. */
export function computeSignature(parts: Array<string | number>, secret: string): string {
  return createHmac('sha1', secret).update(parts.map((p) => String(p)).join('')).digest('hex').toUpperCase();
}

/** Константно-временная сверка. Пустой секрет = подпись выключена в ЛК ExpressPay → пропускаем. */
export function verifySignature(parts: Array<string | number>, secret: string, provided: string): boolean {
  if (!secret) return true;
  const expected = computeSignature(parts, secret);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from((provided ?? '').toUpperCase(), 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

> Точный список и порядок полей в подписи (для исходящего запроса и для входящего webhook) задаются документацией ExpressPay. `computeSignature` принимает уже подготовленный массив — порядок формируется в местах вызова (Task 4 и Task 7) и помечен как стыковочный.

- [ ] **Step 4: Запустить — pass.** Run: `cd web && npm test -- expresspay-signature` → PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/payments/expresspay-signature.ts web/tests/unit/payments/expresspay-signature.test.ts
git commit -m "Plan 5 Task 3: подпись ExpressPay HMAC-SHA1 (pure)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Клиент ExpressPay (DI fetch)

**Files:**
- Create: `web/lib/payments/expresspay.ts`
- Test: `web/tests/unit/payments/expresspay.test.ts`

- [ ] **Step 1: Failing-тест (инъекция fake fetch)**

```ts
import { describe, it, expect, vi } from 'vitest';
import { createInvoice, getInvoiceStatus } from '@/lib/payments/expresspay';

const cfg = { base: 'https://api.x/v1', token: 'T', secret: '', serviceId: '42', useCard: true };

describe('expresspay client', () => {
  it('createInvoice (card) returns invoiceId and paymentUrl', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({ CardInvoiceNo: '555', FormUrl: 'https://pay/555' }), { status: 200 }));
    const r = await createInvoice({ amount: 25, accountNo: 'order-1', info: 'Донат' }, cfg, fakeFetch as any);
    expect(r).toEqual({ invoiceId: '555', paymentUrl: 'https://pay/555', eripNumber: null });
    expect(fakeFetch).toHaveBeenCalledOnce();
    const url = (fakeFetch.mock.calls[0][0] as string);
    expect(url).toContain('https://api.x/v1/cardinvoices');
    expect(url).toContain('token=T');
  });

  it('createInvoice (ЕРИП) returns invoiceId and eripNumber', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({ InvoiceNo: '777' }), { status: 200 }));
    const r = await createInvoice({ amount: 10, accountNo: 'order-2', info: 'Донат' }, { ...cfg, useCard: false }, fakeFetch as any);
    expect(r).toEqual({ invoiceId: '777', paymentUrl: null, eripNumber: '777' });
  });

  it('getInvoiceStatus maps provider status to ours', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({ Status: 3 }), { status: 200 }));
    expect(await getInvoiceStatus('555', cfg, fakeFetch as any)).toBe('paid');
  });

  it('throws on non-2xx', async () => {
    const fakeFetch = vi.fn(async () => new Response('err', { status: 500 }));
    await expect(createInvoice({ amount: 1, accountNo: 'x', info: 'y' }, cfg, fakeFetch as any)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Запустить — fail.** Run: `cd web && npm test -- payments/expresspay` → FAIL.

- [ ] **Step 3: Реализовать `web/lib/payments/expresspay.ts`**

```ts
import { mapProviderStatus } from './donation';

export interface ExpressPayConfig {
  base: string;
  token: string;
  secret: string;
  serviceId: string;
  useCard: boolean;
}
export interface CreateInvoiceInput {
  amount: number;
  accountNo: string;
  info: string;
  returnUrl?: string;
  failUrl?: string;
}
export interface CreatedInvoice {
  invoiceId: string;
  paymentUrl: string | null;  // для card-инвойса
  eripNumber: string | null;  // для обычного ЕРИП-инвойса
}

type FetchFn = typeof fetch;

export function configFromEnv(): ExpressPayConfig {
  return {
    base: process.env.EXPRESSPAY_API_BASE ?? 'https://api.express-pay.by/v1',
    token: process.env.EXPRESSPAY_TOKEN ?? '',
    secret: process.env.EXPRESSPAY_SECRET ?? '',
    serviceId: process.env.EXPRESSPAY_SERVICE_ID ?? '',
    useCard: (process.env.EXPRESSPAY_USE_CARD ?? 'true') === 'true',
  };
}

/** Создаёт счёт в ExpressPay. card → возвращает FormUrl для оплаты картой; иначе → номер ЕРИП. */
export async function createInvoice(input: CreateInvoiceInput, cfg: ExpressPayConfig, doFetch: FetchFn = fetch): Promise<CreatedInvoice> {
  const endpoint = cfg.useCard ? 'cardinvoices' : 'invoices';
  const url = `${cfg.base}/${endpoint}?token=${encodeURIComponent(cfg.token)}`;

  // ⚠️ Имена полей сверить с документацией ExpressPay. Денежная сумма — строкой с точкой.
  const body = new URLSearchParams({
    ServiceId: cfg.serviceId,
    AccountNo: input.accountNo,
    Amount: input.amount.toFixed(2),
    Currency: '933', // BYN ISO-4217 numeric; уточнить (может требоваться 'BYN')
    Info: input.info,
    ...(input.returnUrl ? { ReturnUrl: input.returnUrl } : {}),
    ...(input.failUrl ? { FailUrl: input.failUrl } : {}),
  });

  const res = await doFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!res.ok) throw new Error(`ExpressPay createInvoice failed: ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;

  const invoiceId = String(data.CardInvoiceNo ?? data.InvoiceNo ?? data.Id ?? '');
  if (!invoiceId) throw new Error('ExpressPay: no invoice id in response');
  const paymentUrl = (data.FormUrl as string) ?? (data.PaymentUrl as string) ?? null;
  return {
    invoiceId,
    paymentUrl: cfg.useCard ? paymentUrl : null,
    eripNumber: cfg.useCard ? null : invoiceId,
  };
}

/** Запрашивает статус счёта и маппит в наш (pending|paid|failed|refunded). */
export async function getInvoiceStatus(invoiceId: string, cfg: ExpressPayConfig, doFetch: FetchFn = fetch): Promise<'pending' | 'paid' | 'failed' | 'refunded'> {
  const endpoint = cfg.useCard ? 'cardinvoices' : 'invoices';
  const url = `${cfg.base}/${endpoint}/${encodeURIComponent(invoiceId)}/status?token=${encodeURIComponent(cfg.token)}`;
  const res = await doFetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`ExpressPay status failed: ${res.status}`);
  const data = (await res.json()) as { Status?: number | string };
  return mapProviderStatus(data.Status);
}
```

- [ ] **Step 4: Запустить — pass.** Run: `cd web && npm test -- payments/expresspay` → PASS.

> `mapProviderStatus` определяется в Task 5 (`lib/payments/donation.ts`). Если выполняешь Task 4 раньше — сначала сделай Step 3 Task 5 (функция-маппер), затем вернись.

- [ ] **Step 5: Commit**

```bash
git add web/lib/payments/expresspay.ts web/tests/unit/payments/expresspay.test.ts
git commit -m "Plan 5 Task 4: клиент ExpressPay (createInvoice/getInvoiceStatus, DI fetch)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Чистые помощники доната (accountNo, статус-маппер, чек)

**Files:**
- Create: `web/lib/payments/donation.ts`
- Test: `web/tests/unit/payments/donation.test.ts`

- [ ] **Step 1: Failing-тест**

```ts
import { describe, it, expect } from 'vitest';
import { buildAccountNo, mapProviderStatus, receiptData } from '@/lib/payments/donation';

describe('donation helpers', () => {
  it('buildAccountNo is unique-ish and prefixed', () => {
    const a = buildAccountNo('abc123');
    expect(a).toContain('abc123');
    expect(a.startsWith('don-')).toBe(true);
  });
  it('mapProviderStatus maps known codes', () => {
    expect(mapProviderStatus(3)).toBe('paid');
    expect(mapProviderStatus('3')).toBe('paid');
    expect(mapProviderStatus(1)).toBe('pending');
    expect(mapProviderStatus(5)).toBe('failed');
    expect(mapProviderStatus(4)).toBe('refunded');
    expect(mapProviderStatus(999)).toBe('pending'); // неизвестный → не трогаем (pending)
  });
  it('receiptData formats target line', () => {
    const r = receiptData({ amountByn: 25, targetType: 'animal', targetLabel: 'Рекс №12' });
    expect(r.amountText).toContain('25');
    expect(r.targetText).toContain('Рекс №12');
  });
});
```

- [ ] **Step 2: Запустить — fail.** Run: `cd web && npm test -- payments/donation` → FAIL.

- [ ] **Step 3: Реализовать `web/lib/payments/donation.ts`**

```ts
import { formatByn } from './amounts';

/** Номер заказа для ExpressPay из id доната. Префикс + id (уникален). */
export function buildAccountNo(donationId: string | number): string {
  return `don-${donationId}`;
}

/**
 * Маппинг статуса ExpressPay → наш.
 * ⚠️ Коды сверить с документацией. Типичная схема: 1 ожидает, 3 оплачен, 4 возврат, 5 просрочен/отклонён.
 */
export function mapProviderStatus(code: number | string | undefined | null): 'pending' | 'paid' | 'failed' | 'refunded' {
  const c = Number(code);
  if (c === 3) return 'paid';
  if (c === 4) return 'refunded';
  if (c === 5) return 'failed';
  if (c === 1 || c === 2) return 'pending';
  return 'pending';
}

export interface ReceiptInput {
  amountByn: number;
  targetType: 'organization' | 'animal' | 'general_fund';
  targetLabel?: string | null;
}
export interface ReceiptData {
  amountText: string;
  targetText: string;
}

const TARGET_RU: Record<ReceiptInput['targetType'], string> = {
  organization: 'организации',
  animal: 'животному',
  general_fund: 'в общий фонд',
};

export function receiptData(i: ReceiptInput): ReceiptData {
  const tail = i.targetLabel ? ` (${i.targetLabel})` : '';
  return {
    amountText: formatByn(i.amountByn),
    targetText: i.targetType === 'general_fund' ? TARGET_RU.general_fund : `${TARGET_RU[i.targetType]}${tail}`,
  };
}
```

- [ ] **Step 4: Запустить — pass.** Run: `cd web && npm test -- payments/donation` → PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/payments/donation.ts web/tests/unit/payments/donation.test.ts
git commit -m "Plan 5 Task 5: чистые помощники доната (accountNo, статус-маппер, чек)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Агрегаты помощи (pure)

**Files:**
- Create: `web/lib/payments/aggregate.ts`
- Test: `web/tests/unit/payments/aggregate.test.ts`

- [ ] **Step 1: Failing-тест**

```ts
import { describe, it, expect } from 'vitest';
import { sumPaidByn, donorCount } from '@/lib/payments/aggregate';

const rows = [
  { amountByn: 25, status: 'paid', donorUser: 'u1', donorEmail: null },
  { amountByn: 10, status: 'paid', donorUser: 'u1', donorEmail: null },   // тот же донор
  { amountByn: 50, status: 'paid', donorUser: null, donorEmail: 'a@x' },
  { amountByn: 99, status: 'pending', donorUser: 'u9', donorEmail: null }, // не считается
];

describe('aggregate', () => {
  it('sums only paid', () => {
    expect(sumPaidByn(rows as any)).toBe(85);
  });
  it('counts distinct paid donors (by user or email)', () => {
    expect(donorCount(rows as any)).toBe(2);
  });
});
```

- [ ] **Step 2: Запустить — fail.** Run: `cd web && npm test -- payments/aggregate` → FAIL.

- [ ] **Step 3: Реализовать `web/lib/payments/aggregate.ts`**

```ts
export interface DonationRow {
  amountByn: number;
  status: string;
  donorUser?: string | number | null;
  donorEmail?: string | null;
}

const isPaid = (r: DonationRow) => r.status === 'paid';

/** Сумма оплаченных донатов. */
export function sumPaidByn(rows: DonationRow[]): number {
  const total = rows.filter(isPaid).reduce((s, r) => s + (r.amountByn || 0), 0);
  return Math.round(total * 100) / 100;
}

/** Число уникальных доноров (по user id, иначе по email). Без раскрытия сумм по каждому. */
export function donorCount(rows: DonationRow[]): number {
  const keys = new Set<string>();
  for (const r of rows.filter(isPaid)) {
    const key = r.donorUser != null ? `u:${r.donorUser}` : r.donorEmail ? `e:${r.donorEmail.toLowerCase()}` : null;
    if (key) keys.add(key);
  }
  return keys.size;
}
```

- [ ] **Step 4: Запустить — pass.** Run: `cd web && npm test -- payments/aggregate` → PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/payments/aggregate.ts web/tests/unit/payments/aggregate.test.ts
git commit -m "Plan 5 Task 6: агрегаты помощи (sumPaidByn, donorCount, pure)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: API создания счёта `/api/donations/expresspay`

**Files:**
- Create: `web/app/api/donations/expresspay/route.ts`
- Modify: `web/.env.example`
- Test: покрывается e2e (Task 11); ручной smoke

- [ ] **Step 1: Реализовать `web/app/api/donations/expresspay/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { parseAmount } from '@/lib/payments/amounts';
import { buildAccountNo } from '@/lib/payments/donation';
import { configFromEnv, createInvoice } from '@/lib/payments/expresspay';
import { getCurrentUser } from '@/lib/auth/current-user';

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkRateLimit(`donate:${ip}`, 15, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  }
  const form = await req.formData();
  if (!(await verifyTurnstile(form.get('cf-turnstile-response') as string | null, ip))) {
    return NextResponse.json({ error: 'Проверка не пройдена.' }, { status: 400 });
  }

  const amount = parseAmount((form.get('amount') as string) ?? '');
  if (!amount.ok) return NextResponse.json({ error: amount.error }, { status: 422 });

  const targetType = form.get('targetType') as string;
  if (!['organization', 'animal', 'general_fund'].includes(targetType)) {
    return NextResponse.json({ error: 'Некорректная цель.' }, { status: 422 });
  }
  const targetSlug = (form.get('targetSlug') as string) || null;
  const purpose = ((form.get('purpose') as string) || '').slice(0, 100) || undefined;
  const donorEmail = ((form.get('donorEmail') as string) || '').trim() || undefined;
  const donorPhone = ((form.get('donorPhone') as string) || '').trim() || undefined;
  const donorName = ((form.get('donorName') as string) || '').trim() || undefined;

  const payload = await getPayload({ config });
  const user = await getCurrentUser();

  // резолвим цель в id (animal/organization)
  let organizationId: string | number | undefined;
  let animalId: string | number | undefined;
  let targetLabel = 'Общий фонд';
  if (targetType === 'animal' && targetSlug) {
    const r = await payload.find({ collection: 'animals', where: { slug: { equals: targetSlug } }, limit: 1, depth: 0, overrideAccess: true });
    if (!r.docs[0]) return NextResponse.json({ error: 'Животное не найдено.' }, { status: 404 });
    animalId = r.docs[0].id; targetLabel = (r.docs[0] as any).name ? `${(r.docs[0] as any).name} №${(r.docs[0] as any).petNumber}` : `№${(r.docs[0] as any).petNumber}`;
  }
  if (targetType === 'organization' && targetSlug) {
    const r = await payload.find({ collection: 'organizations', where: { slug: { equals: targetSlug } }, limit: 1, depth: 0, overrideAccess: true });
    if (!r.docs[0]) return NextResponse.json({ error: 'Организация не найдена.' }, { status: 404 });
    organizationId = r.docs[0].id; targetLabel = (r.docs[0] as any).name;
  }

  // 1) создаём Donation(pending)
  const donation = await payload.create({
    collection: 'donations', overrideAccess: true,
    data: {
      donorUser: user?.id ?? undefined, donorEmail, donorPhone, donorName,
      amountByn: amount.value, currency: 'BYN', targetType,
      organization: organizationId, animal: animalId, purpose,
      paymentProvider: 'expresspay_erip', status: 'pending',
      accountNo: 'pending', // обновим ниже
    },
  });

  // 2) создаём счёт в ExpressPay
  const cfg = configFromEnv();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const accountNo = buildAccountNo(donation.id);
  try {
    const invoice = await createInvoice({
      amount: amount.value, accountNo, info: `Помощь: ${targetLabel}`,
      returnUrl: `${base}/help/thanks`, failUrl: `${base}/help/failed`,
    }, cfg);

    await payload.update({
      collection: 'donations', id: donation.id, overrideAccess: true,
      data: { accountNo, providerInvoiceId: invoice.invoiceId },
    });

    return NextResponse.json({ ok: true, paymentUrl: invoice.paymentUrl, eripNumber: invoice.eripNumber, donationId: donation.id });
  } catch (e) {
    await payload.update({ collection: 'donations', id: donation.id, overrideAccess: true, data: { status: 'failed', accountNo } });
    console.error('[donate] createInvoice error', e);
    return NextResponse.json({ error: 'Платёжный сервис недоступен. Попробуйте позже.' }, { status: 502 });
  }
}
```

- [ ] **Step 2: Дополнить `web/.env.example`** (блок ExpressPay из шапки плана).

- [ ] **Step 3: Smoke**

Run: `cd web && npm run dev` → `curl -X POST localhost:3000/api/donations/expresspay -F amount=25 -F targetType=general_fund` (без EXPRESSPAY_TOKEN → ожидаем 502 от createInvoice; с тестовым токеном — `paymentUrl`/`eripNumber`). Без токена допустимо: проверяем, что Donation создаётся и переходит в failed.

- [ ] **Step 4: Commit**

```bash
git add web/app/api/donations/expresspay/route.ts web/.env.example
git commit -m "Plan 5 Task 7: API создания счёта доната (ExpressPay)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Идемпотентный webhook + чек донору

**Files:**
- Create: `web/app/api/donations/expresspay/webhook/route.ts`
- Create: `web/lib/email/templates/donation-receipt.tsx`
- Test: ручной smoke + проверка идемпотентности

- [ ] **Step 1: Email-чек `web/lib/email/templates/donation-receipt.tsx`**

```tsx
export function DonationReceipt({ amountText, targetText, donorName }: { amountText: string; targetText: string; donorName?: string }) {
  return (
    <div>
      <h2>Спасибо за помощь{donorName ? `, ${donorName}` : ''}!</h2>
      <p>Мы получили ваше пожертвование {amountText} {targetText}.</p>
      <p>Это реально спасает жизни животных. Спасибо, что вы рядом.</p>
      <p style={{ color: '#888', fontSize: 12 }}>Это автоматический чек о платеже. Если вы не совершали оплату — напишите нам.</p>
    </div>
  );
}
```

- [ ] **Step 2: Реализовать `web/app/api/donations/expresspay/webhook/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { verifySignature } from '@/lib/payments/expresspay-signature';
import { configFromEnv, getInvoiceStatus } from '@/lib/payments/expresspay';
import { mapProviderStatus, receiptData } from '@/lib/payments/donation';
import { sendEmail } from '@/lib/email/resend-client';
import { DonationReceipt } from '@/lib/email/templates/donation-receipt';
import { recordAuditLog } from '@/lib/audit/log';

/**
 * Webhook ExpressPay. Идемпотентен: повторная доставка того же события не создаёт двойной обработки.
 * ⚠️ Формат полей/подписи уведомления — по документации ExpressPay. Здесь — устойчивый каркас.
 */
export async function POST(req: Request) {
  const cfg = configFromEnv();

  // ExpressPay шлёт x-www-form-urlencoded или JSON в зависимости от настройки — читаем оба
  let params: Record<string, string> = {};
  const ctype = req.headers.get('content-type') ?? '';
  if (ctype.includes('application/json')) {
    params = (await req.json().catch(() => ({}))) as Record<string, string>;
  } else {
    const form = await req.formData();
    form.forEach((v, k) => { params[k] = String(v); });
  }

  const invoiceId = String(params.InvoiceNo ?? params.CardInvoiceNo ?? params.Id ?? '');
  const providedSig = String(params.Signature ?? params.Sign ?? '');
  // поля подписи — уточнить порядок по докам; типично: ServiceId + InvoiceNo + Amount + ...
  const sigParts = [cfg.serviceId, invoiceId, String(params.Amount ?? '')];
  if (!verifySignature(sigParts, cfg.secret, providedSig)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  }
  if (!invoiceId) return NextResponse.json({ error: 'no invoice' }, { status: 400 });

  const payload = await getPayload({ config });
  const found = await payload.find({ collection: 'donations', where: { providerInvoiceId: { equals: invoiceId } }, limit: 1, overrideAccess: true, depth: 1 });
  const donation = found.docs[0] as any;
  if (!donation) return NextResponse.json({ ok: true, note: 'unknown invoice, ignored' }); // 200 — не ретраить

  // идемпотентность: уже финализирован → ничего не делаем
  if (donation.status === 'paid' || donation.status === 'refunded') {
    return NextResponse.json({ ok: true, note: 'already processed' });
  }

  // подтверждаем статус у провайдера (не доверяем только телу webhook)
  let confirmed: 'pending' | 'paid' | 'failed' | 'refunded';
  try {
    confirmed = await getInvoiceStatus(invoiceId, cfg);
  } catch {
    confirmed = mapProviderStatus(params.Status); // fallback на статус из тела
  }

  if (confirmed === 'paid') {
    await payload.update({ collection: 'donations', id: donation.id, overrideAccess: true, data: { status: 'paid', paidAt: new Date().toISOString() } });
    await recordAuditLog({ action: 'donation_paid', targetType: 'donation', targetId: String(donation.id), meta: { amount: donation.amountByn } } as any).catch(() => {});

    const label = donation.targetType === 'animal' && donation.animal && typeof donation.animal === 'object'
      ? ((donation.animal as any).name ? `${(donation.animal as any).name} №${(donation.animal as any).petNumber}` : `№${(donation.animal as any).petNumber}`)
      : donation.targetType === 'organization' && donation.organization && typeof donation.organization === 'object'
        ? (donation.organization as any).name : null;
    const rd = receiptData({ amountByn: donation.amountByn, targetType: donation.targetType, targetLabel: label });
    if (donation.donorEmail) {
      await sendEmail({ to: donation.donorEmail, subject: 'Чек о пожертвовании', react: DonationReceipt({ amountText: rd.amountText, targetText: rd.targetText, donorName: donation.donorName }) });
    }
  } else if (confirmed === 'failed' || confirmed === 'refunded') {
    await payload.update({ collection: 'donations', id: donation.id, overrideAccess: true, data: { status: confirmed } });
  }

  return NextResponse.json({ ok: true });
}
```

> `recordAuditLog` сигнатура — из Plan 1; если отличается, адаптировать вызов (обёрнут в `.catch`, чтобы аудит не ломал webhook).

- [ ] **Step 3: Тест идемпотентности (ручной)**

1. Создать донат (Task 7), получить `providerInvoiceId`.
2. В Payload admin вручную выставить donation `status=pending`.
3. Дважды отправить один и тот же webhook-POST с этим InvoiceNo (с правильной подписью или пустым `EXPRESSPAY_SECRET`).
4. Проверить: первый раз → `paid` + (если задан email и Resend) письмо; второй раз → `already processed`, без дубля письма.

- [ ] **Step 4: Commit**

```bash
git add web/app/api/donations/expresspay/webhook/route.ts web/lib/email/templates/donation-receipt.tsx
git commit -m "Plan 5 Task 8: идемпотентный webhook ExpressPay + чек донору

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Форма доната (client)

**Files:**
- Create: `web/components/donate/DonationForm.tsx`
- Test: покрывается e2e (Task 11)

- [ ] **Step 1: Реализовать `web/components/donate/DonationForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';
import { PRESET_AMOUNTS } from '@/lib/payments/amounts';

interface Props {
  targetType: 'organization' | 'animal' | 'general_fund';
  targetSlug?: string;
  targetTitle?: string;
}

export function DonationForm({ targetType, targetSlug, targetTitle }: Props) {
  const [amount, setAmount] = useState<string>('25');
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending'); setError('');
    const fd = new FormData(e.currentTarget);
    fd.set('amount', amount);
    fd.set('targetType', targetType);
    if (targetSlug) fd.set('targetSlug', targetSlug);
    const res = await fetch('/api/donations/expresspay', { method: 'POST', body: fd });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.paymentUrl) { window.location.href = d.paymentUrl; return; }
    if (res.ok && d.eripNumber) { window.location.href = `/help/erip/${d.eripNumber}`; return; }
    setError(d.error ?? 'Не удалось создать платёж'); setState('error');
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {targetTitle && <p className="text-gray-600">Помощь: <b>{targetTitle}</b></p>}

      <div className="flex flex-wrap gap-2">
        {PRESET_AMOUNTS.map((p) => (
          <button type="button" key={p} onClick={() => setAmount(String(p))}
            className={`rounded-xl border-2 px-4 py-2 font-semibold ${amount === String(p) ? 'border-blue-600 text-blue-600' : 'border-gray-300'}`}>
            {p} BYN
          </button>
        ))}
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
          aria-label="Своя сумма" className="w-28 rounded-xl border p-2" placeholder="Своя" />
      </div>

      <select name="purpose" className="w-full rounded-xl border p-3">
        <option value="general">На общее</option>
        <option value="food">На корм</option>
        <option value="treatment">На лечение</option>
      </select>

      <input name="donorName" placeholder="Ваше имя (необязательно)" className="w-full rounded-xl border p-3" />
      <input name="donorEmail" type="email" placeholder="Email для чека (необязательно)" className="w-full rounded-xl border p-3" />
      <input name="donorPhone" placeholder="Телефон (необязательно)" className="w-full rounded-xl border p-3" />

      <TurnstileWidget />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={state === 'sending'} className="w-full rounded-xl bg-green-600 px-6 py-3 font-semibold text-white disabled:opacity-50">
        {state === 'sending' ? 'Создаём платёж…' : 'Перейти к оплате'}
      </button>
      <p className="text-xs text-gray-500">Оплата через ЕРИП/ExpressPay. Деньги идут напрямую на цели проекта и приютов.</p>
    </form>
  );
}
```

> Маршрут `/help/erip/[number]` (страница с номером ЕРИП и инструкцией оплаты в банке) нужен только при `EXPRESSPAY_USE_CARD=false`. В MVP по умолчанию card-режим (redirect на `paymentUrl`); страницу ЕРИП-номера можно добавить позже (мини-таск Plan 6) — помечено.

- [ ] **Step 2: Commit**

```bash
git add web/components/donate/DonationForm.tsx
git commit -m "Plan 5 Task 9: форма доната (пресеты, своя сумма, Turnstile)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Страницы «Помочь» — хаб + 3 цели + thanks/failed

**Files:**
- Create: `web/app/(public)/help/page.tsx`
- Create: `web/app/(public)/help/general/page.tsx`
- Create: `web/app/(public)/help/animal/[slug]/page.tsx`
- Create: `web/app/(public)/help/organization/[slug]/page.tsx`
- Create: `web/app/(public)/help/thanks/page.tsx`
- Create: `web/app/(public)/help/failed/page.tsx`
- Test: `web/tests/e2e/donate.spec.ts`

- [ ] **Step 1: Хаб `web/app/(public)/help/page.tsx`**

```tsx
import Link from 'next/link';

export const metadata = { title: 'Помочь', description: 'Поддержите животных Беларуси: помощь конкретному животному, приюту или в общий фонд.' };

export default function HelpHubPage() {
  const cards = [
    { href: '/help/general', title: 'Общий фонд', desc: 'Помощь распределяется на самые срочные нужды.' },
    { href: '/animals', title: 'Конкретному животному', desc: 'Выберите животное и поддержите его лечение и содержание.' },
    { href: '/organizations', title: 'Приюту', desc: 'Поддержите приют или волонтёрскую организацию.' },
  ];
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Помочь</h1>
      <p className="mb-8 text-gray-600">Любая сумма помогает спасать жизни. Оплата через ЕРИП.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-2xl border p-5 hover:shadow-md">
            <h2 className="font-semibold">{c.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{c.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Общий фонд `web/app/(public)/help/general/page.tsx`**

```tsx
import { DonationForm } from '@/components/donate/DonationForm';
export const metadata = { title: 'Донат в общий фонд' };
export default function HelpGeneralPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Помощь в общий фонд</h1>
      <DonationForm targetType="general_fund" />
    </main>
  );
}
```

- [ ] **Step 3: Донат на животное `web/app/(public)/help/animal/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { DonationForm } from '@/components/donate/DonationForm';
import type { Animal } from '@/payload-types';

export default async function HelpAnimalPage({ params }: { params: { slug: string } }) {
  const payload = await getPayload({ config });
  const r = await payload.find({ collection: 'animals', where: { and: [{ slug: { equals: params.slug } }, { status: { equals: 'published' } }] }, limit: 1, depth: 0 });
  const animal = r.docs[0] as Animal | undefined;
  if (!animal) notFound();
  const title = (animal as any).name ? `${(animal as any).name} №${(animal as any).petNumber}` : `№${(animal as any).petNumber}`;
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Помочь животному</h1>
      <DonationForm targetType="animal" targetSlug={animal.slug as string} targetTitle={title} />
    </main>
  );
}
```

- [ ] **Step 4: Донат на организацию `web/app/(public)/help/organization/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { DonationForm } from '@/components/donate/DonationForm';
import type { Organization } from '@/payload-types';

export default async function HelpOrgPage({ params }: { params: { slug: string } }) {
  const payload = await getPayload({ config });
  const r = await payload.find({ collection: 'organizations', where: { and: [{ slug: { equals: params.slug } }, { isPublished: { equals: true } }] }, limit: 1, depth: 0 });
  const org = r.docs[0] as Organization | undefined;
  if (!org) notFound();
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Помочь приюту</h1>
      <DonationForm targetType="organization" targetSlug={org.slug as string} targetTitle={org.name as string} />
    </main>
  );
}
```

- [ ] **Step 5: thanks/failed страницы**

`web/app/(public)/help/thanks/page.tsx`:

```tsx
import Link from 'next/link';
export const metadata = { title: 'Спасибо за помощь' };
export default function ThanksPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Спасибо за помощь! 🐾</h1>
      <p className="mt-3 text-gray-600">Чек придёт на email, если вы его указали. Платёж может подтвердиться в течение нескольких минут.</p>
      <Link href="/animals" className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Смотреть животных</Link>
    </main>
  );
}
```

`web/app/(public)/help/failed/page.tsx` — аналогично, заголовок «Платёж не завершён», текст «Попробуйте ещё раз», ссылка на `/help`.

- [ ] **Step 6: e2e `web/tests/e2e/donate.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('help hub shows three targets', async ({ page }) => {
  await page.goto('/help');
  await expect(page.getByRole('heading', { name: 'Помочь' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Общий фонд/ })).toBeVisible();
});

test('general donation form renders presets and validates server-side', async ({ page }) => {
  await page.goto('/help/general');
  await expect(page.getByRole('button', { name: '25 BYN' })).toBeVisible();
  // без EXPRESSPAY_TOKEN сервер вернёт 502 (createInvoice) → форма покажет ошибку, но дойдёт до бэка
  await page.getByRole('button', { name: 'Перейти к оплате' }).click();
  await expect(page.getByText(/Платёжный сервис недоступен|Не удалось создать платёж/)).toBeVisible();
});
```

> e2e не выполняет реальную оплату (нет боевого токена в CI). Проверяет рендер и что сабмит доходит до API. Реальный happy-path — на staging с тестовым ExpressPay.

- [ ] **Step 7: Запустить e2e + commit**

Run: `cd web && npx playwright test donate`

```bash
git add web/app/\(public\)/help web/tests/e2e/donate.spec.ts
git commit -m "Plan 5 Task 10: страницы «Помочь» (хаб, 3 цели, thanks/failed)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Агрегаты помощи на карточке животного и в профиле организации

**Files:**
- Create: `web/components/donate/DonationSummary.tsx`
- Modify: `web/app/(public)/animals/[city]/[species]/[slug]/page.tsx`
- Modify: `web/app/(public)/organizations/[slug]/page.tsx`
- Test: покрывается e2e существующих страниц (smoke)

- [ ] **Step 1: `web/components/donate/DonationSummary.tsx`**

```tsx
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { sumPaidByn, donorCount, type DonationRow } from '@/lib/payments/aggregate';
import { formatByn } from '@/lib/payments/amounts';

interface Props {
  target: { type: 'animal' | 'organization'; id: string | number; slug: string };
}

export async function DonationSummary({ target }: Props) {
  const payload = await getPayload({ config });
  const field = target.type === 'animal' ? 'animal' : 'organization';
  const res = await payload.find({
    collection: 'donations', overrideAccess: true, depth: 0, limit: 1000,
    where: { and: [{ [field]: { equals: target.id } }, { status: { equals: 'paid' } }] },
  });
  const rows = res.docs as unknown as DonationRow[];
  const total = sumPaidByn(rows);
  const donors = donorCount(rows);
  const helpHref = `/help/${target.type === 'animal' ? 'animal' : 'organization'}/${target.slug}`;

  return (
    <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4">
      {total > 0 ? (
        <p className="font-medium text-green-800">Собрано {formatByn(total)} · доноров: {donors}</p>
      ) : (
        <p className="text-green-800">Станьте первым, кто поможет.</p>
      )}
      <Link href={helpHref} className="mt-3 inline-block rounded-xl bg-green-600 px-5 py-2 font-semibold text-white">Помочь рублём</Link>
    </div>
  );
}
```

- [ ] **Step 2: Вставить на карточке животного**

В `web/app/(public)/animals/[city]/[species]/[slug]/page.tsx` рядом с CTA (заменив/дополнив кнопку-обещание «Помочь рублём» из Plan 4):

```tsx
import { DonationSummary } from '@/components/donate/DonationSummary';
// в JSX боковой колонки:
{/* @ts-expect-error Async Server Component */}
<DonationSummary target={{ type: 'animal', id: animal.id, slug: animal.slug as string }} />
```

- [ ] **Step 3: Вставить в профиле организации**

В `web/app/(public)/organizations/[slug]/page.tsx`:

```tsx
import { DonationSummary } from '@/components/donate/DonationSummary';
// в JSX:
{/* @ts-expect-error Async Server Component */}
<DonationSummary target={{ type: 'organization', id: org.id, slug: org.slug as string }} />
```

- [ ] **Step 4: Smoke**

Run: `cd web && npm run dev` → открыть карточку животного и профиль организации; блок «Помочь рублём» виден; при отсутствии оплат — «Станьте первым».

- [ ] **Step 5: Commit**

```bash
git add web/components/donate/DonationSummary.tsx web/app/\(public\)/animals web/app/\(public\)/organizations
git commit -m "Plan 5 Task 11: агрегаты помощи на карточке и в профиле + CTA

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: `/me/donations` — мои донаты

**Files:**
- Create: `web/app/(account)/me/donations/page.tsx`
- Test: `web/tests/e2e/donations-cabinets.spec.ts` (часть)

- [ ] **Step 1: Реализовать `web/app/(account)/me/donations/page.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUser } from '@/lib/auth/current-user';
import { formatByn } from '@/lib/payments/amounts';

export default async function MyDonationsPage() {
  const user = await requireUser(); // редиректит на /login если гость (Plan 3)
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'donations', overrideAccess: true, depth: 1, limit: 200, sort: '-createdAt',
    where: { donorUser: { equals: user.id } },
  });
  const rows = res.docs as any[];

  const STATUS_RU: Record<string, string> = { pending: 'Ожидает', paid: 'Оплачено', failed: 'Ошибка', refunded: 'Возврат' };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Мои пожертвования</h1>
      {!rows.length && <p className="text-gray-500">Вы ещё не делали пожертвований. <a href="/help" className="text-blue-600 underline">Помочь</a>.</p>}
      <ul className="divide-y rounded-2xl border">
        {rows.map((d) => (
          <li key={d.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{formatByn(d.amountByn)}</p>
              <p className="text-sm text-gray-500">{new Date(d.createdAt).toLocaleDateString('ru-BY')}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm ${d.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{STATUS_RU[d.status] ?? d.status}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/\(account\)/me/donations
git commit -m "Plan 5 Task 12: страница /me/donations

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: `/org/[slug]/donations` — донаты организации

**Files:**
- Create: `web/app/(account)/org/[slug]/donations/page.tsx`
- Test: `web/tests/e2e/donations-cabinets.spec.ts` (часть)

- [ ] **Step 1: Реализовать `web/app/(account)/org/[slug]/donations/page.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireOrgAdmin } from '@/lib/auth/current-user';
import { sumPaidByn, donorCount, type DonationRow } from '@/lib/payments/aggregate';
import { formatByn } from '@/lib/payments/amounts';

export default async function OrgDonationsPage({ params }: { params: { slug: string } }) {
  const { organization } = await requireOrgAdmin(params.slug); // guard + объект организации (Plan 3)
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'donations', overrideAccess: true, depth: 0, limit: 1000, sort: '-createdAt',
    where: { organization: { equals: organization.id } },
  });
  const rows = res.docs as any[];
  const total = sumPaidByn(rows as DonationRow[]);
  const donors = donorCount(rows as DonationRow[]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Пожертвования организации</h1>
      <p className="mb-6 text-gray-600">Всего собрано: <b>{formatByn(total)}</b> · доноров: <b>{donors}</b></p>
      <ul className="divide-y rounded-2xl border">
        {rows.filter((d) => d.status === 'paid').map((d) => (
          <li key={d.id} className="flex items-center justify-between p-4">
            <span className="font-medium">{formatByn(d.amountByn)}</span>
            <span className="text-sm text-gray-500">{new Date(d.paidAt ?? d.createdAt).toLocaleDateString('ru-BY')}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

> Возвращаемая форма `requireOrgAdmin(slug)` предполагается `{ user, organization }` (Plan 3). Если функция возвращает только `user`/`boolean`, доработать: подтянуть организацию по slug отдельным `find` после guard.

- [ ] **Step 2: e2e `web/tests/e2e/donations-cabinets.spec.ts` (гостевой guard-smoke)**

```ts
import { test, expect } from '@playwright/test';

test('me/donations redirects guests to login', async ({ page }) => {
  await page.goto('/me/donations');
  await expect(page).toHaveURL(/\/login/);
});
```

> Полноценные кабинетные сценарии (с авторизованным контекстом) — в наборе с залогиненным storageState, паттерн из Plan 3.

- [ ] **Step 3: Запустить e2e + commit**

Run: `cd web && npx playwright test donations-cabinets`

```bash
git add web/app/\(account\)/org web/tests/e2e/donations-cabinets.spec.ts
git commit -m "Plan 5 Task 13: страница /org/[slug]/donations

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Reconciliation-cron + алерт о сбоях

**Files:**
- Create: `web/scripts/donations-reconcile.ts`
- Create: `web/lib/email/templates/reconcile-alert.tsx`
- Modify: `web/package.json` (+ `cron:reconcile`), `railway.json` (+ cron), `web/.env.example`
- Test: ручной прогон

- [ ] **Step 1: Email-алерт `web/lib/email/templates/reconcile-alert.tsx`**

```tsx
export function ReconcileAlert({ fixed, stillPending, failed }: { fixed: number; stillPending: number; failed: number }) {
  return (
    <div>
      <h2>Сверка донатов: отчёт</h2>
      <p>Подтверждено оплат (были pending): <b>{fixed}</b></p>
      <p>Помечено как ошибка/просрочка: <b>{failed}</b></p>
      <p>Осталось в ожидании: <b>{stillPending}</b></p>
    </div>
  );
}
```

- [ ] **Step 2: Скрипт `web/scripts/donations-reconcile.ts`**

```ts
import 'dotenv/config';
import { getPayload } from 'payload';
import config from '../payload.config';
import { configFromEnv, getInvoiceStatus } from '../lib/payments/expresspay';
import { sendEmail } from '../lib/email/resend-client';
import { ReconcileAlert } from '../lib/email/templates/reconcile-alert';

const STALE_MIN = 15; // не трогаем донаты моложе 15 минут (ещё платят)

async function main() {
  const payload = await getPayload({ config });
  const cfg = configFromEnv();
  const cutoff = new Date(Date.now() - STALE_MIN * 60 * 1000).toISOString();

  const res = await payload.find({
    collection: 'donations', overrideAccess: true, depth: 0, limit: 1000,
    where: { and: [{ status: { equals: 'pending' } }, { providerInvoiceId: { exists: true } }, { createdAt: { less_than: cutoff } }] },
  });

  let fixed = 0, failed = 0, stillPending = 0;
  for (const d of res.docs as any[]) {
    let status: 'pending' | 'paid' | 'failed' | 'refunded';
    try { status = await getInvoiceStatus(d.providerInvoiceId, cfg); }
    catch (e) { console.error('[reconcile] status error', d.id, e); stillPending++; continue; }

    if (status === 'paid') {
      await payload.update({ collection: 'donations', id: d.id, overrideAccess: true, data: { status: 'paid', paidAt: new Date().toISOString() } });
      fixed++;
      console.log(`[reconcile] ${d.id} → paid`);
    } else if (status === 'failed' || status === 'refunded') {
      await payload.update({ collection: 'donations', id: d.id, overrideAccess: true, data: { status } });
      failed++;
    } else {
      stillPending++;
    }
  }

  const to = process.env.SUPERADMIN_EMAIL;
  if (to && (fixed || failed)) {
    await sendEmail({ to, subject: `Сверка донатов: +${fixed} оплат, ${failed} ошибок`, react: ReconcileAlert({ fixed, failed, stillPending }) });
  }
  console.log(`[reconcile] done. fixed=${fixed} failed=${failed} stillPending=${stillPending}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

> Reconcile закрывает дыру, если webhook не дошёл (сеть/деплой). Чек донору при оплате через reconcile можно слать тем же путём, что в Task 8 — для MVP достаточно пометки `paid`; письмо опционально (добавить вызов `sendEmail` с `DonationReceipt`, если требуется).

- [ ] **Step 3: `package.json` + `railway.json` + `.env.example`**

`web/package.json` scripts: `"cron:reconcile": "tsx scripts/donations-reconcile.ts"`

`railway.json` — добавить cron (рядом с §17.6 из Plan 4), каждый час:

```json
{
  "crons": [
    { "schedule": "0 6 * * *", "command": "npm --prefix web run cron:urgency" },
    { "schedule": "0 * * * *", "command": "npm --prefix web run cron:reconcile" }
  ]
}
```

`.env.example` — `SUPERADMIN_EMAIL=` (если ещё не добавлен в Plan 4).

- [ ] **Step 4: Ручной прогон (smoke)**

Run: `cd web && npm run cron:reconcile`
Expected: `[reconcile] done. fixed=… failed=… stillPending=…` без ошибок (на пустых/тестовых данных fixed=0).

- [ ] **Step 5: Commit**

```bash
git add web/scripts/donations-reconcile.ts web/lib/email/templates/reconcile-alert.tsx web/package.json railway.json web/.env.example
git commit -m "Plan 5 Task 14: reconciliation-cron донатов + алерт superadmin

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

### Spec coverage check

| Требование спеки | Покрыто |
|---|---|
| §5 `/help`, `/help/general`, `/help/animal/[slug]`, `/help/organization/[slug]` | Tasks 10 |
| §5 `/me/donations` | Task 12 |
| §5 `/org/[slug]/donations` | Task 13 |
| §5 API `/api/donations/expresspay` + `/webhook` | Tasks 7, 8 |
| §6 Donation (все поля) | Task 1 |
| §7.3 поток ЕРИП (форма → счёт → redirect → webhook → paid → чек) | Tasks 7–10 |
| §7.3 п.11 агрегат помощи + счётчик доноров без раскрытия сумм | Tasks 6, 11 |
| §16.2 idempotent payment webhook | Task 8 |
| §16.2 reconciliation cron (раз в сутки/чаще) + алерт superadmin | Task 14 |
| §16.2 Turnstile + rate-limit на форму доната | Tasks 7, 9 |
| §16.2 денежный формат BYN (ru-BY) | Task 2 |
| §16.2 audit-log критических действий (оплата) | Task 8 (`recordAuditLog`) |

**Сознательно НЕ в этом плане:**
- Recurring donations (подписки) — фаза 2 (`DonationSubscription`).
- Прод-режим платежей, боевые ключи ExpressPay, договор с провайдером — Plan 6 / фаза 0–1 (юрлицо §[[project_legal_entity_plan]]).
- Страница `/help/erip/[number]` (инструкция оплаты по номеру ЕРИП) нужна только при `EXPRESSPAY_USE_CARD=false`; в MVP card-режим — добавить при необходимости (мини-таск).
- Возвраты (refund) инициируются вручную в ЛК ExpressPay; в системе только отражается статус `refunded` через webhook/reconcile.

### Type consistency

- Donation-поля camelCase: `donorUser`, `donorEmail`, `amountByn`, `targetType`, `providerInvoiceId` (unique → идемпотентность), `accountNo`, `status`, `paidAt`.
- `mapProviderStatus` используется и в клиенте (Task 4 `getInvoiceStatus`), и в webhook/reconcile — единый маппинг кодов.
- `verifySignature(parts, secret, provided)`: пустой `secret` → пропуск (подпись выключена) — согласовано с dev/CI.
- Платёжный поток: `createInvoice` возвращает `{ invoiceId, paymentUrl, eripNumber }`; `providerInvoiceId = invoiceId`; webhook ищет донат по `providerInvoiceId`.
- Переиспользование Plan 4: `verifyTurnstile`, `checkRateLimit`, `clientIp`, `TurnstileWidget`, `sendEmail`, `getCurrentUser/requireUser/requireOrgAdmin`.

### Placeholder scan

- Все шаги содержат конкретный код/команды. Точки стыковки с реальным API ExpressPay (имена полей запроса, порядок полей подписи, коды статусов, card-vs-ЕРИП endpoint) **явно помечены** `⚠️`/цитатой с инструкцией сверить по документации express-pay.by — это не плейсхолдеры, а параметры интеграции, которые нельзя выдумывать.

### Известные допущения для исполнителя

1. **ExpressPay API**: точные эндпоинты (`/cardinvoices` vs `/invoices`), имена полей (`AccountNo`, `Amount`, `Currency`, `ServiceId`, `ReturnUrl`), формат суммы, набор и порядок полей в подписи, коды `Status` — сверить по актуальной документации и тестовому кабинету express-pay.by. Изменения локализованы в `lib/payments/expresspay.ts`, `lib/payments/donation.ts` (`mapProviderStatus`) и в webhook (`sigParts`).
2. `requireOrgAdmin(slug)` возвращает `{ user, organization }` (Plan 3). Если иначе — подтянуть организацию по slug после guard.
3. `recordAuditLog` сигнатура из Plan 1; вызов обёрнут в `.catch`, аудит не критичен для webhook.
4. Turnstile/ExpressPay без ключей в dev/CI: форма доходит до API, createInvoice падает → 502; e2e это и проверяет (happy-path — на staging с тестовым ExpressPay).
5. Cron'ы (`cron:urgency` из Plan 4 + `cron:reconcile`) на Railway Cron с доступом к тем же env (DATABASE_URL, EXPRESSPAY_*, RESEND_*, NEXT_PUBLIC_SITE_URL).

## Execution Handoff

План сохранён в `docs/superpowers/plans/2026-05-28-plan-5-donations.md`. Два варианта исполнения:

**1. Subagent-Driven (рекомендуется)** — отдельный субагент на задачу, ревью между задачами. REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`.

**2. Inline Execution** — пакетами с чекпойнтами. REQUIRED SUB-SKILL: `superpowers:executing-plans`.

> Зависимость: Plan 5 опирается на `lib/security/*` (Turnstile, rate-limit) и компоненты из Plan 4, а также на коллекции/lib из Plan 1–2. Исполнять после Plan 1–4.
