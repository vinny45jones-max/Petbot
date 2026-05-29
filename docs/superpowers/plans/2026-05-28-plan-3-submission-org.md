# Plan 3: Submission & Org Cabinet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать гражданам и приютам самостоятельно публиковать животных (wizard и CRUD), принимать заявки на усыновление (AdoptionInquiry) и управлять профилем организации — с модерацией перед публикацией и уведомлениями по email/Telegram.

**Architecture:** Поверх Plan 1 (auth/Users/Media/Resend/AuditLog) и Plan 2 (Animals/Organizations/IntakeFacilities, lib каталога). Создание животного — через server actions с RBAC: гражданин получает `ownerType=citizen` + `ownerUser`, админ организации — `ownerType=organization` + `organization` (и опционально `intakeFacility` для модели А службы отлова, §17.7). Все новые объявления уходят в `status=pending_review`; модератор апрувит в Payload-админке → `afterChange`-хук шлёт email владельцу. Заявка на усыновление пишет `AdoptionInquiry` и уведомляет владельца/организацию (email + Telegram админ-канал). Личные кабинеты (`/me/*`, `/org/[slug]/*`) — SSR с guard'ами через новый RSC-helper `getCurrentUser`.

**Tech Stack:** Next.js 14 (App Router, Server Actions, RSC), Payload CMS 3 (Local API), TypeScript, Tailwind + shadcn/ui, Resend + react-email, Telegram Bot API (уведомления), Vitest (unit), Playwright (e2e).

**Что уже готово (не переделывать):**
- Plan 1: `lib/auth/rbac.ts` (`isAdmin`, `canManageOrganization`), `lib/email/resend-client.ts` (`sendEmail({to,subject,react})`), `lib/audit/log.ts` (`recordAuditLog`), коллекции `users`/`media`/`audit-logs`/`notification-preferences`, Payload auth (cookie `payload-token`).
- Plan 2: коллекции `animals`/`organizations`/`intakeFacilities`, `lib/slug.ts`, `lib/format.ts`, `lib/animal-url.ts`, `lib/filters.ts`, `components/catalog/*` (включая `AnimalCard`, `AnimalGrid`). Карточка животного (`/animals/[city]/[species]/[slug]`) содержит кнопку-заглушку «Хочу взять домой» — заменяется в Task 16.

**Вне scope этого плана:** донаты/ЕРИП и страницы `/me/donations`, `/org/[slug]/donations` (отдельный платёжный план); cron `urgency_recalc_daily` и авто-алерты §17.6 (Plan 4); CrueltyReport-форма; внутренний чат (фаза 2).

---

## File Structure (Plan 3)

```
web/
  ├── collections/
  │   ├── AdoptionInquiries.ts      # NEW
  │   ├── Animals.ts                # MODIFY: afterChange-уведомления (publish/pending)
  │   └── Organizations.ts          # MODIFY: access update профиля org_admin'ом своих полей
  ├── lib/
  │   ├── auth/
  │   │   └── current-user.ts       # NEW: getCurrentUser, requireUser, requireOrgAdmin (RSC)
  │   ├── notify/
  │   │   ├── telegram.ts           # NEW: notifyAdminChannel (Bot API sendMessage)
  │   │   ├── messages.ts           # NEW: pure-билдеры текста уведомлений
  │   │   └── dispatch.ts           # NEW: notifyNewAnimal, notifyNewInquiry, notifyPublished (DI)
  │   ├── email/templates/
  │   │   ├── animal-published.tsx  # NEW
  │   │   ├── animal-rejected.tsx   # NEW (§16.7 отклонение)
  │   │   ├── inquiry-received.tsx  # NEW
  │   │   └── inquiry-confirmation.tsx  # NEW
  │   ├── animal-form.ts            # NEW: validateAnimalDraft (pure)
  │   └── image-resize.ts           # NEW: computeResizeDimensions (pure) + resizeImageFile (browser)
  ├── app/
  │   ├── (account)/
  │   │   ├── layout.tsx            # NEW: guard requireUser + nav
  │   │   ├── me/
  │   │   │   ├── page.tsx                      # NEW: дашборд
  │   │   │   ├── animals/page.tsx              # NEW: мои животные
  │   │   │   ├── animals/new/page.tsx          # NEW: wizard
  │   │   │   ├── animals/[id]/edit/page.tsx    # NEW
  │   │   │   └── inquiries/page.tsx            # NEW: мои заявки
  │   │   └── org/[slug]/
  │   │       ├── layout.tsx                    # NEW: guard requireOrgAdmin
  │   │       ├── page.tsx                      # NEW: дашборд
  │   │       ├── animals/page.tsx              # NEW: CRUD-список
  │   │       ├── animals/new/page.tsx          # NEW
  │   │       ├── animals/[id]/edit/page.tsx    # NEW
  │   │       ├── inquiries/page.tsx            # NEW: входящие заявки
  │   │       └── settings/page.tsx             # NEW: профиль организации
  │   └── api/
  │       └── inquiries/route.ts    # NEW: POST заявка adoption
  ├── actions/
  │   ├── animal.ts                 # NEW: createAnimal, updateAnimal, deleteAnimal, uploadPhoto (server actions)
  │   ├── inquiry.ts                # NEW: updateInquiryStatus
  │   └── organization.ts           # NEW: updateOrganizationProfile
  ├── components/
  │   ├── forms/
  │   │   ├── AnimalWizard.tsx      # NEW (client, 4 шага)
  │   │   ├── AnimalFormFields.tsx  # NEW (client, общие поля для wizard и edit)
  │   │   ├── PhotoUpload.tsx       # NEW (client, resize + preview)
  │   │   └── OrgSettingsForm.tsx   # NEW (client)
  │   ├── adopt/AdoptModal.tsx      # NEW (client)
  │   └── account/
  │       ├── MyAnimalRow.tsx       # NEW
  │       └── InquiryRow.tsx        # NEW (client, смена статуса)
  └── tests/
      ├── unit/
      │   ├── animal-form.test.ts
      │   ├── image-resize.test.ts
      │   └── notify-messages.test.ts
      └── e2e/
          ├── animal-submit.spec.ts
          ├── org-cabinet.spec.ts
          └── adoption-inquiry.spec.ts
```

---

## Tasks

### Task 1: AdoptionInquiries-коллекция

**Files:**
- Create: `web/collections/AdoptionInquiries.ts`
- Modify: `web/payload.config.ts`
- Test: smoke в админке

- [ ] **Step 1: Создать `web/collections/AdoptionInquiries.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';

export const AdoptionInquiries: CollectionConfig = {
  slug: 'adoption-inquiries',
  labels: { singular: 'Заявка на усыновление', plural: 'Заявки на усыновление' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['animal', 'applicant', 'status', 'createdAt'],
  },
  access: {
    // создаётся через server-side API (overrideAccess), поэтому create=true только для залогиненных
    create: ({ req: { user } }) => !!user,
    read: ({ req: { user } }) => {
      if (isAdmin(user as any)) return true;
      if (!user) return false;
      // заявитель видит свои; владелец/орг — через фильтр на animal владельца (упрощённо: только свои как applicant + admin)
      return { applicant: { equals: user.id } };
    },
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'animal', type: 'relationship', relationTo: 'animals', required: true, index: true },
    { name: 'applicant', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'message', type: 'textarea', required: true, maxLength: 2000 },
    { name: 'contactPhone', type: 'text' },
    { name: 'contactTelegram', type: 'text' },
    {
      name: 'status', type: 'select', defaultValue: 'new', index: true, options: [
        { label: 'Новая', value: 'new' },
        { label: 'На связи', value: 'contacted' },
        { label: 'Закрыта', value: 'closed' },
      ],
    },
  ],
};
```

> Видимость заявок для владельца/организации реализуется на уровне страниц (`/org/[slug]/inquiries`, `/me/...`) через серверные запросы с `overrideAccess`, а не через collection-level `read` — так проще и без полиморфных join'ов в access. Collection `read` остаётся строгим (заявитель + admin).

- [ ] **Step 2: Зарегистрировать в `web/payload.config.ts`**

```ts
import { AdoptionInquiries } from './collections/AdoptionInquiries';
// ...
collections: [Users, Cities, Media, AuditLogs, NotificationPreferences, MagicLinkTokens, Organizations, IntakeFacilities, Animals, AdoptionInquiries],
```

- [ ] **Step 3: Сгенерировать types**

Run: `cd web && npx payload generate:types`
Expected: появляется тип `AdoptionInquiry`.

- [ ] **Step 4: Smoke в админке**

Run: `cd web && npm run dev`
Открыть `/admin/collections/adoption-inquiries` — коллекция доступна, поля на месте.

- [ ] **Step 5: Commit**

```bash
git add web/collections/AdoptionInquiries.ts web/payload.config.ts web/payload-types.ts
git commit -m "Plan 3 Task 1: AdoptionInquiries-коллекция

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: RSC-helper текущего пользователя + guard'ы

**Files:**
- Create: `web/lib/auth/current-user.ts`
- Test: `web/tests/e2e/org-cabinet.spec.ts` (guard-проверка появится здесь, расширяется в Task 13)

- [ ] **Step 1: Создать `web/lib/auth/current-user.ts`**

```ts
import { headers as nextHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { canManageOrganization } from '@/lib/auth/rbac';
import type { User } from '@/payload-types';

/** Текущий пользователь в RSC/server action, либо null. */
export async function getCurrentUser(): Promise<User | null> {
  const payload = await getPayload({ config });
  const h = nextHeaders();
  const { user } = await payload.auth({ headers: h as any });
  return (user as User) ?? null;
}

/** Требует логин; иначе redirect на /login. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Требует право управлять организацией orgId; иначе redirect. */
export async function requireOrgAdmin(orgId: string): Promise<User> {
  const user = await requireUser();
  if (!canManageOrganization(user as any, orgId)) redirect('/');
  return user;
}
```

> Next.js 14: `headers()` синхронный. При апгрейде на Next 15 — `await headers()` и убрать `as any`.

- [ ] **Step 2: e2e — кабинет требует логин**

`web/tests/e2e/org-cabinet.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('/me redirects anonymous to login', async ({ page }) => {
  await page.goto('/me');
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 3: Запустить (после Task 10, когда /me существует)**

Этот тест станет зелёным после Task 10 (создание `/me`). Пока — фиксируем helper и тест; запуск отложен.
Run: `cd web && npx playwright test org-cabinet` (ожидаемо упадёт до Task 10 — это нормально, тест опережает страницу).

- [ ] **Step 4: Commit**

```bash
git add web/lib/auth/current-user.ts web/tests/e2e/org-cabinet.spec.ts
git commit -m "Plan 3 Task 2: RSC getCurrentUser + requireUser/requireOrgAdmin guard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Уведомления — Telegram admin-канал + pure-билдеры текста

**Files:**
- Create: `web/lib/notify/telegram.ts`
- Create: `web/lib/notify/messages.ts`
- Modify: `web/.env.example` (+ `TELEGRAM_NOTIFY_CHAT_ID`)
- Test: `web/tests/unit/notify-messages.test.ts`

- [ ] **Step 1: Failing тест pure-билдеров**

`web/tests/unit/notify-messages.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { newAnimalAdminMessage, newInquiryMessage } from '@/lib/notify/messages';

describe('newAnimalAdminMessage', () => {
  it('mentions moderation and pet title', () => {
    const m = newAnimalAdminMessage({ petNumber: 12, name: 'Рекс', species: 'dog', city: 'Минск', adminUrl: 'https://x/admin/collections/animals/5' });
    expect(m).toContain('модерац');
    expect(m).toContain('Рекс');
    expect(m).toContain('№12');
    expect(m).toContain('https://x/admin/collections/animals/5');
  });
  it('handles missing name', () => {
    const m = newAnimalAdminMessage({ petNumber: 7, name: null, species: 'cat', city: 'Брест', adminUrl: 'u' });
    expect(m).toContain('№7');
  });
});

describe('newInquiryMessage', () => {
  it('includes applicant contacts and animal title', () => {
    const m = newInquiryMessage({ animalTitle: 'Мурка №3', applicantName: 'Иван', phone: '+375291112233', telegram: '@ivan' });
    expect(m).toContain('Мурка №3');
    expect(m).toContain('Иван');
    expect(m).toContain('+375291112233');
    expect(m).toContain('@ivan');
  });
});
```

- [ ] **Step 2: Реализовать `web/lib/notify/messages.ts`**

```ts
export interface NewAnimalMsg {
  petNumber: number;
  name?: string | null;
  species: string;
  city?: string;
  adminUrl: string;
}

const SPECIES_RU: Record<string, string> = { dog: 'собака', cat: 'кошка', other: 'животное' };

export function newAnimalAdminMessage(a: NewAnimalMsg): string {
  const title = a.name ? `${a.name} №${a.petNumber}` : `№${a.petNumber}`;
  return [
    'Новое объявление на модерацию',
    `${title} — ${SPECIES_RU[a.species] ?? 'животное'}${a.city ? `, ${a.city}` : ''}`,
    `Проверить: ${a.adminUrl}`,
  ].join('\n');
}

export interface NewInquiryMsg {
  animalTitle: string;
  applicantName?: string;
  phone?: string;
  telegram?: string;
}

export function newInquiryMessage(i: NewInquiryMsg): string {
  return [
    `Новая заявка на усыновление: ${i.animalTitle}`,
    i.applicantName ? `От: ${i.applicantName}` : null,
    i.phone ? `Телефон: ${i.phone}` : null,
    i.telegram ? `Telegram: ${i.telegram}` : null,
  ].filter(Boolean).join('\n');
}
```

- [ ] **Step 3: Запустить — pass**

Run: `cd web && npm test -- notify-messages`
Expected: PASS — 3 passed.

- [ ] **Step 4: Реализовать `web/lib/notify/telegram.ts`**

```ts
/**
 * Шлёт сообщение в админ-канал/чат проекта через Telegram Bot API.
 * Тихо логирует и не бросает, если конфиг отсутствует (уведомления не критичны для основного flow).
 */
export async function notifyAdminChannel(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  if (!token || !chatId) {
    console.warn('[notify] TELEGRAM_BOT_TOKEN/TELEGRAM_NOTIFY_CHAT_ID not set, skipping');
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) console.error('[notify] telegram sendMessage failed', res.status);
  } catch (e) {
    console.error('[notify] telegram error', e);
  }
}
```

- [ ] **Step 5: Дополнить `web/.env.example`**

Добавить строку:

```env
# Telegram-чат для уведомлений модераторам (числовой chat_id или @username)
TELEGRAM_NOTIFY_CHAT_ID=
```

- [ ] **Step 6: Commit**

```bash
git add web/lib/notify/telegram.ts web/lib/notify/messages.ts web/.env.example web/tests/unit/notify-messages.test.ts
git commit -m "Plan 3 Task 3: уведомления — Telegram admin-канал + pure-билдеры текста

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Email-шаблоны уведомлений + dispatch-слой

**Files:**
- Create: `web/lib/email/templates/animal-published.tsx`
- Create: `web/lib/email/templates/animal-rejected.tsx`
- Create: `web/lib/email/templates/inquiry-received.tsx`
- Create: `web/lib/email/templates/inquiry-confirmation.tsx`
- Create: `web/lib/notify/dispatch.ts`
- Test: покрыто unit на messages (Task 3) + integration через flow e2e

- [ ] **Step 1: Создать `web/lib/email/templates/animal-published.tsx`**

```tsx
import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

export default function AnimalPublished({ title, animalUrl }: { title: string; animalUrl: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Объявление опубликовано</Heading>
          <Text>Ваше объявление «{title}» прошло проверку и опубликовано.</Text>
          <Link href={animalUrl}>Открыть объявление</Link>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 1b: Создать `web/lib/email/templates/animal-rejected.tsx`** (§16.7 «Объявление отклонено»)

```tsx
import { Html, Body, Container, Heading, Text } from '@react-email/components';

export default function AnimalRejected({ title, reason }: { title: string; reason?: string | null }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Объявление отклонено</Heading>
          <Text>Ваше объявление «{title}» не прошло модерацию и было отклонено.</Text>
          {reason ? <Text>Причина: {reason}</Text> : null}
          <Text>Вы можете отредактировать объявление в личном кабинете и отправить его на проверку повторно.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Создать `web/lib/email/templates/inquiry-received.tsx`**

```tsx
import { Html, Body, Container, Heading, Text } from '@react-email/components';

export default function InquiryReceived({ animalTitle, applicantName, phone, telegram, message }: { animalTitle: string; applicantName?: string; phone?: string; telegram?: string; message: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Новая заявка на усыновление</Heading>
          <Text>Животное: {animalTitle}</Text>
          {applicantName ? <Text>От: {applicantName}</Text> : null}
          {phone ? <Text>Телефон: {phone}</Text> : null}
          {telegram ? <Text>Telegram: {telegram}</Text> : null}
          <Text>Сообщение: {message}</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 3: Создать `web/lib/email/templates/inquiry-confirmation.tsx`**

```tsx
import { Html, Body, Container, Heading, Text } from '@react-email/components';

export default function InquiryConfirmation({ animalTitle }: { animalTitle: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Заявка отправлена</Heading>
          <Text>Ваша заявка на усыновление «{animalTitle}» отправлена. Владелец свяжется с вами по указанным контактам.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 4: Создать `web/lib/notify/dispatch.ts`**

```ts
import { sendEmail } from '@/lib/email/resend-client';
import { notifyAdminChannel } from '@/lib/notify/telegram';
import { newAnimalAdminMessage, newInquiryMessage } from '@/lib/notify/messages';
import AnimalPublished from '@/lib/email/templates/animal-published';
import AnimalRejected from '@/lib/email/templates/animal-rejected';
import InquiryReceived from '@/lib/email/templates/inquiry-received';
import InquiryConfirmation from '@/lib/email/templates/inquiry-confirmation';

const BASE = process.env.APP_URL ?? 'http://localhost:3000';

/** Новое объявление на модерацию -> Telegram модераторам. */
export async function notifyNewAnimal(a: { id: string | number; petNumber: number; name?: string | null; species: string; city?: string }): Promise<void> {
  await notifyAdminChannel(newAnimalAdminMessage({
    petNumber: a.petNumber, name: a.name, species: a.species, city: a.city,
    adminUrl: `${BASE}/admin/collections/animals/${a.id}`,
  }));
}

/** Объявление опубликовано -> email владельцу. */
export async function notifyAnimalPublished(ownerEmail: string | null | undefined, title: string, animalUrl: string): Promise<void> {
  if (!ownerEmail) return;
  await sendEmail({ to: ownerEmail, subject: `Объявление «${title}» опубликовано`, react: AnimalPublished({ title, animalUrl }) });
}

/** Объявление отклонено модератором -> email владельцу (§16.7). */
export async function notifyAnimalRejected(ownerEmail: string | null | undefined, title: string, reason?: string | null): Promise<void> {
  if (!ownerEmail) return;
  await sendEmail({ to: ownerEmail, subject: `Объявление «${title}» отклонено`, react: AnimalRejected({ title, reason }) });
}

/** Новая заявка adoption -> email владельцу/орг + Telegram + подтверждение заявителю. */
export async function notifyNewInquiry(params: {
  ownerEmail?: string | null;
  applicantEmail?: string | null;
  animalTitle: string;
  applicantName?: string;
  phone?: string;
  telegram?: string;
  message: string;
}): Promise<void> {
  if (params.ownerEmail) {
    await sendEmail({
      to: params.ownerEmail,
      subject: `Заявка на усыновление: ${params.animalTitle}`,
      react: InquiryReceived({ animalTitle: params.animalTitle, applicantName: params.applicantName, phone: params.phone, telegram: params.telegram, message: params.message }),
    });
  }
  await notifyAdminChannel(newInquiryMessage({ animalTitle: params.animalTitle, applicantName: params.applicantName, phone: params.phone, telegram: params.telegram }));
  if (params.applicantEmail) {
    await sendEmail({ to: params.applicantEmail, subject: 'Заявка отправлена', react: InquiryConfirmation({ animalTitle: params.animalTitle }) });
  }
}
```

- [ ] **Step 5: Smoke-компиляция**

Run: `cd web && npx tsc --noEmit`
Expected: без ошибок типов в новых файлах.

- [ ] **Step 6: Commit**

```bash
git add web/lib/email/templates/animal-published.tsx web/lib/email/templates/animal-rejected.tsx web/lib/email/templates/inquiry-received.tsx web/lib/email/templates/inquiry-confirmation.tsx web/lib/notify/dispatch.ts
git commit -m "Plan 3 Task 4: email-шаблоны уведомлений + dispatch-слой

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Валидация черновика животного (pure)

**Files:**
- Create: `web/lib/animal-form.ts`
- Test: `web/tests/unit/animal-form.test.ts`

- [ ] **Step 1: Failing тест**

`web/tests/unit/animal-form.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateAnimalDraft } from '@/lib/animal-form';

const valid = {
  species: 'dog', sex: 'male', size: 'medium',
  city: 'city-id-1', description: 'Хороший пёс ищет дом, дружелюбный.',
  contactPhone: '+375291112233', photoCount: 1,
};

describe('validateAnimalDraft', () => {
  it('passes a complete draft', () => {
    expect(validateAnimalDraft(valid)).toEqual({ ok: true, errors: {} });
  });
  it('requires species', () => {
    const r = validateAnimalDraft({ ...valid, species: undefined as any });
    expect(r.ok).toBe(false);
    expect(r.errors.species).toBeTruthy();
  });
  it('requires at least one photo', () => {
    const r = validateAnimalDraft({ ...valid, photoCount: 0 });
    expect(r.errors.photos).toBeTruthy();
  });
  it('requires city', () => {
    expect(validateAnimalDraft({ ...valid, city: '' }).errors.city).toBeTruthy();
  });
  it('requires a minimal description', () => {
    expect(validateAnimalDraft({ ...valid, description: 'мало' }).errors.description).toBeTruthy();
  });
  it('requires at least one contact', () => {
    const r = validateAnimalDraft({ ...valid, contactPhone: '', contactTelegram: '' });
    expect(r.errors.contact).toBeTruthy();
  });
  it('rejects malformed Belarus phone', () => {
    expect(validateAnimalDraft({ ...valid, contactPhone: '12345' }).errors.contactPhone).toBeTruthy();
  });
  it('accepts contact via telegram only', () => {
    const r = validateAnimalDraft({ ...valid, contactPhone: '', contactTelegram: '@owner' });
    expect(r.ok).toBe(true);
  });
  it('rejects microchip that is not 15 digits', () => {
    expect(validateAnimalDraft({ ...valid, microchipId: '123' }).errors.microchipId).toBeTruthy();
    expect(validateAnimalDraft({ ...valid, microchipId: '123456789012345' }).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить — failing**

Run: `cd web && npm test -- animal-form`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `web/lib/animal-form.ts`**

```ts
export interface AnimalDraft {
  species?: 'dog' | 'cat' | 'other';
  sex?: 'male' | 'female' | 'unknown';
  size?: 'small' | 'medium' | 'large';
  name?: string;
  ageYears?: number;
  ageMonths?: number;
  city?: string;
  description?: string;
  healthStatus?: string;
  contactPhone?: string;
  contactTelegram?: string;
  microchipId?: string;
  photoCount?: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
}

const PHONE_RE = /^\+375\d{9}$/;
const MICROCHIP_RE = /^\d{15}$/;
const MIN_DESCRIPTION = 10;

export function validateAnimalDraft(d: AnimalDraft): ValidationResult {
  const errors: Record<string, string> = {};

  if (!d.species) errors.species = 'Укажите вид животного';
  if (!d.city) errors.city = 'Выберите город';
  if (!d.photoCount || d.photoCount < 1) errors.photos = 'Добавьте хотя бы одно фото';
  if (!d.description || d.description.trim().length < MIN_DESCRIPTION) {
    errors.description = `Опишите животное (минимум ${MIN_DESCRIPTION} символов)`;
  }

  const hasPhone = !!d.contactPhone?.trim();
  const hasTelegram = !!d.contactTelegram?.trim();
  if (!hasPhone && !hasTelegram) {
    errors.contact = 'Укажите хотя бы один контакт: телефон или Telegram';
  }
  if (hasPhone && !PHONE_RE.test(d.contactPhone!.trim())) {
    errors.contactPhone = 'Телефон в формате +375XXXXXXXXX';
  }
  if (d.microchipId && !MICROCHIP_RE.test(d.microchipId.trim())) {
    errors.microchipId = 'Чип — 15 цифр';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
```

- [ ] **Step 4: Запустить — pass**

Run: `cd web && npm test -- animal-form`
Expected: PASS — 9 passed.

- [ ] **Step 5: Commit**

```bash
git add web/lib/animal-form.ts web/tests/unit/animal-form.test.ts
git commit -m "Plan 3 Task 5: валидация черновика животного (pure)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Ресайз фото на клиенте (pure-вычисление + browser)

**Files:**
- Create: `web/lib/image-resize.ts`
- Test: `web/tests/unit/image-resize.test.ts`

- [ ] **Step 1: Failing тест вычисления размеров**

`web/tests/unit/image-resize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeResizeDimensions } from '@/lib/image-resize';

describe('computeResizeDimensions', () => {
  it('keeps dimensions under the cap unchanged', () => {
    expect(computeResizeDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
  it('scales down landscape by the longest side', () => {
    expect(computeResizeDimensions(3200, 2400, 1600)).toEqual({ width: 1600, height: 1200 });
  });
  it('scales down portrait by the longest side', () => {
    expect(computeResizeDimensions(2400, 3200, 1600)).toEqual({ width: 1200, height: 1600 });
  });
  it('rounds to integers', () => {
    const r = computeResizeDimensions(3000, 2001, 1600);
    expect(Number.isInteger(r.width)).toBe(true);
    expect(Number.isInteger(r.height)).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить — failing**

Run: `cd web && npm test -- image-resize`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `web/lib/image-resize.ts`**

```ts
export interface Dimensions { width: number; height: number }

export function computeResizeDimensions(width: number, height: number, maxSide: number): Dimensions {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Ресайз File через canvas до maxSide по длинной стороне. Только в браузере.
 * Возвращает новый File (jpeg) либо исходный, если ресайз не нужен/не удался.
 */
export async function resizeImageFile(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  if (typeof document === 'undefined' || !file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const { width, height } = computeResizeDimensions(bitmap.width, bitmap.height, maxSide);
  if (width === bitmap.width && height === bitmap.height) return file;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}
```

- [ ] **Step 4: Запустить — pass**

Run: `cd web && npm test -- image-resize`
Expected: PASS — 4 passed.

- [ ] **Step 5: Commit**

```bash
git add web/lib/image-resize.ts web/tests/unit/image-resize.test.ts
git commit -m "Plan 3 Task 6: клиентский ресайз фото (computeResizeDimensions + canvas)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Server actions — создание/редактирование/удаление животного + загрузка фото

**Files:**
- Create: `web/actions/animal.ts`
- Test: integration через e2e (Task 8, 14)

- [ ] **Step 1: Создать `web/actions/animal.ts`**

```ts
'use server';

import { getPayload } from 'payload';
import config from '@/payload.config';
import { getCurrentUser } from '@/lib/auth/current-user';
import { canManageOrganization, isAdmin } from '@/lib/auth/rbac';
import { recordAuditLog } from '@/lib/audit/log';
import { validateAnimalDraft, type AnimalDraft } from '@/lib/animal-form';
import { notifyNewAnimal } from '@/lib/notify/dispatch';

export interface CreateAnimalInput extends AnimalDraft {
  mediaIds: string[];
  organizationId?: string;   // при создании от лица организации
  intakeFacilityId?: string; // только для org_admin (модель А, §17.7)
  intakeDate?: string;
}

export type ActionResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 МБ

/** Загружает одно фото в Media через Local API, возвращает id. */
export async function uploadPhoto(formData: FormData): Promise<{ ok: boolean; id?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'unauthorized' };
  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'no file' };

  // Серверная валидация ДО создания Media (клиентский resize не доверяем).
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: 'Допустимы только JPEG, PNG или WebP' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'Файл больше 8 МБ' };
  }

  const payload = await getPayload({ config });
  const buffer = Buffer.from(await file.arrayBuffer());
  const created = await payload.create({
    collection: 'media',
    data: { alt: (formData.get('alt') as string) || 'Фото животного' },
    file: { data: buffer, mimetype: file.type, name: file.name, size: file.size },
  });
  return { ok: true, id: String(created.id) };
}

// Зависимость Plan 4: rate-limit на размещение (защита от спам-загрузок) —
// lib/security/rate-limit + Turnstile из Plan 4. Здесь только MIME/размер;
// частотный лимит и капча навешиваются поверх uploadPhoto/createAnimal в Plan 4.

function resolveOwnership(user: any, input: CreateAnimalInput) {
  if (input.organizationId) {
    if (!isAdmin(user) && !canManageOrganization(user, input.organizationId)) {
      return { error: 'forbidden' as const };
    }
    return { ownerType: 'organization' as const, organization: input.organizationId, ownerUser: undefined };
  }
  return { ownerType: 'citizen' as const, ownerUser: String(user.id), organization: undefined };
}

export async function createAnimal(input: CreateAnimalInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, errors: { auth: 'Требуется вход' } };

  const draft: AnimalDraft = { ...input, photoCount: input.mediaIds.length };
  const validation = validateAnimalDraft(draft);
  if (!validation.ok) return { ok: false, errors: validation.errors };

  const ownership = resolveOwnership(user, input);
  if ('error' in ownership) return { ok: false, errors: { org: 'Нет прав на эту организацию' } };

  const payload = await getPayload({ config });
  const created = await payload.create({
    collection: 'animals',
    data: {
      species: input.species, sex: input.sex ?? 'unknown', size: input.size,
      name: input.name, ageYears: input.ageYears, ageMonths: input.ageMonths,
      city: input.city, healthStatus: input.healthStatus ?? 'unknown',
      description: { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: input.description ?? '' }] }] } },
      microchipId: input.microchipId || undefined,
      media: input.mediaIds,
      status: 'pending_review',
      source: 'web_form',
      ...ownership,
      ...(input.intakeFacilityId && isAdmin(user) === false && canManageOrganization(user, input.organizationId ?? '')
        ? { intakeFacility: input.intakeFacilityId, intakeDate: input.intakeDate }
        : input.intakeFacilityId ? { intakeFacility: input.intakeFacilityId, intakeDate: input.intakeDate } : {}),
      // контакты сохраняем в healthNotes? нет — отдельных полей нет; кладём в описание-метаданные через отдельные поля при необходимости
    } as any,
    overrideAccess: false,
    user,
  });

  await recordAuditLog(payload, { actorId: String(user.id), action: 'animal.created', targetType: 'animal', targetId: String(created.id) });

  const cityName = typeof created.city === 'object' && created.city ? (created.city as any).nameRu : undefined;
  await notifyNewAnimal({ id: created.id, petNumber: (created as any).petNumber, name: created.name, species: created.species as string, city: cityName });

  return { ok: true, id: String(created.id) };
}

export async function updateAnimal(id: string, input: Partial<CreateAnimalInput>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, errors: { auth: 'Требуется вход' } };
  const payload = await getPayload({ config });

  // Загружаем существующее животное, чтобы знать тип владельца.
  // Animal access.update (Plan 2) отдаёт org-ветку только при наличии data.organization;
  // без него апдейт org-животного владельцем-организацией проваливается в ownerUser-фильтр.
  const existing: any = await payload.findByID({ collection: 'animals', id, depth: 0, overrideAccess: true }).catch(() => null);
  if (!existing) return { ok: false, errors: { auth: 'Объявление не найдено' } };

  const data: Record<string, any> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) {
    data.description = { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: input.description }] }] } };
  }
  if (input.healthStatus) data.healthStatus = input.healthStatus;
  if (input.size) data.size = input.size;
  if (input.sex) data.sex = input.sex;
  if (input.ageYears !== undefined) data.ageYears = input.ageYears;
  if (input.ageMonths !== undefined) data.ageMonths = input.ageMonths;
  if (input.mediaIds) data.media = input.mediaIds;

  // Для org-животного подмешиваем organization (id) в data — иначе access.update вернёт ownerUser-фильтр.
  if (existing.ownerType === 'organization') {
    data.organization = typeof existing.organization === 'object' && existing.organization
      ? String(existing.organization.id)
      : String(existing.organization);
  }

  try {
    await payload.update({ collection: 'animals', id, data: data as any, overrideAccess: false, user });
  } catch {
    return { ok: false, errors: { auth: 'Нет прав на это объявление' } };
  }
  await recordAuditLog(payload, { actorId: String(user.id), action: 'animal.updated', targetType: 'animal', targetId: id });
  return { ok: true, id };
}

export async function deleteAnimal(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const payload = await getPayload({ config });
  // мягкое закрытие: citizen-владелец архивирует, не удаляет физически
  try {
    await payload.update({ collection: 'animals', id, data: { status: 'archived' } as any, overrideAccess: false, user });
  } catch {
    return { ok: false };
  }
  await recordAuditLog(payload, { actorId: String(user.id), action: 'animal.archived', targetType: 'animal', targetId: id });
  return { ok: true };
}
```

> Контактные данные (телефон/TG) гражданина для adoption берутся из его профиля User (`phone`, `telegramUsername`) и из формы заявки (Task 16), а не дублируются в Animal. Поэтому в `createAnimal` поля `contactPhone/contactTelegram` используются только для валидации шага «Контакт» (подтверждение, что у пользователя есть связь) и сохраняются в профиль при отсутствии — упрощённо в MVP не сохраняем в Animal.

- [ ] **Step 2: Уточнение — сохранить контакт в профиль пользователя**

Добавить в `createAnimal` перед `notifyNewAnimal` (после `recordAuditLog`):

```ts
  // если у пользователя ещё нет контактов — сохранить введённые в профиль
  if (ownership.ownerType === 'citizen' && (!user.phone || !user.telegramUsername)) {
    await payload.update({
      collection: 'users', id: String(user.id),
      data: {
        phone: user.phone || input.contactPhone || undefined,
        telegramUsername: user.telegramUsername || (input.contactTelegram?.replace(/^@/, '')) || undefined,
      } as any,
      overrideAccess: true,
    });
  }
```

- [ ] **Step 3: Smoke-компиляция**

Run: `cd web && npx tsc --noEmit`
Expected: без ошибок типов.

- [ ] **Step 4: Commit**

```bash
git add web/actions/animal.ts
git commit -m "Plan 3 Task 7: server actions создания/редактирования/архивации животного + uploadPhoto

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Хук Animal afterChange — уведомление при публикации

**Files:**
- Modify: `web/collections/Animals.ts`
- Test: integration через e2e (Task 18) + ручная проверка

- [ ] **Step 1: Добавить `afterChange`-хук в `web/collections/Animals.ts`**

В объект `hooks` коллекции Animals (рядом с существующим `beforeChange`/`beforeValidate` из Plan 2) добавить массив `afterChange`:

```ts
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        const becamePublished = doc.status === 'published' && previousDoc?.status !== 'published';
        // отклонение модератором: pending_review -> archived (модель «архив = reject» в MVP)
        const becameRejected = doc.status === 'archived' && previousDoc?.status === 'pending_review';
        if (!becamePublished && !becameRejected) return;

        const { formatAnimalTitle } = await import('@/lib/format');
        // email владельцу: citizen -> ownerUser.email; org -> org.email
        let ownerEmail: string | null | undefined = null;
        if (doc.ownerUser) {
          const owner = await req.payload.findByID({ collection: 'users', id: typeof doc.ownerUser === 'object' ? doc.ownerUser.id : doc.ownerUser, depth: 0 }).catch(() => null);
          ownerEmail = (owner as any)?.email ?? null;
        } else if (doc.organization) {
          const org = await req.payload.findByID({ collection: 'organizations', id: typeof doc.organization === 'object' ? doc.organization.id : doc.organization, depth: 0 }).catch(() => null);
          ownerEmail = (org as any)?.email ?? null;
        }
        const title = formatAnimalTitle(doc);

        if (becamePublished) {
          const { notifyAnimalPublished } = await import('@/lib/notify/dispatch');
          const { animalUrl } = await import('@/lib/animal-url');
          const base = process.env.APP_URL ?? 'http://localhost:3000';
          // нужен populated city для URL; берём slug если есть, иначе by
          const url = `${base}${animalUrl({ slug: doc.slug, species: doc.species, city: typeof doc.city === 'object' ? doc.city : null })}`;
          await notifyAnimalPublished(ownerEmail, title, url);
        } else if (becameRejected) {
          // §16.7 «Объявление отклонено»: причину модератор может положить в moderationNote (если поле есть)
          const { notifyAnimalRejected } = await import('@/lib/notify/dispatch');
          await notifyAnimalRejected(ownerEmail, title, (doc as any).moderationNote ?? null);
        }
      },
    ],
```

- [ ] **Step 2: Smoke-проверка**

Run: `cd web && npm run dev`
В админке создать животное (status `pending_review`), затем сменить на `published` и сохранить. В логах/Resend — письмо владельцу (если у владельца есть email и настроен RESEND_API_KEY).

- [ ] **Step 3: Commit**

```bash
git add web/collections/Animals.ts
git commit -m "Plan 3 Task 8: Animal afterChange — email владельцу при публикации

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Компоненты формы — PhotoUpload + AnimalFormFields + AnimalWizard

**Files:**
- Create: `web/components/forms/PhotoUpload.tsx`
- Create: `web/components/forms/AnimalFormFields.tsx`
- Create: `web/components/forms/AnimalWizard.tsx`
- Test: e2e в Task 10

- [ ] **Step 1: Создать `web/components/forms/PhotoUpload.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { resizeImageFile } from '@/lib/image-resize';
import { uploadPhoto } from '@/actions/animal';

export interface UploadedPhoto { id: string; previewUrl: string }

export function PhotoUpload({ value, onChange, max = 6 }: { value: UploadedPhoto[]; onChange: (p: UploadedPhoto[]) => void; max?: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    setBusy(true);
    const next = [...value];
    for (const file of Array.from(files).slice(0, max - value.length)) {
      try {
        const resized = await resizeImageFile(file);
        const fd = new FormData();
        fd.append('file', resized);
        fd.append('alt', 'Фото животного');
        const res = await uploadPhoto(fd);
        if (res.ok && res.id) next.push({ id: res.id, previewUrl: URL.createObjectURL(resized) });
        else setError('Не удалось загрузить фото');
      } catch {
        setError('Ошибка обработки фото');
      }
    }
    onChange(next);
    setBusy(false);
  }

  return (
    <div>
      <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-400">
        <input type="file" accept="image/*" multiple className="hidden" disabled={busy || value.length >= max} onChange={(e) => handleFiles(e.target.files)} />
        {busy ? 'Загрузка…' : `Перетащите или выберите фото (до ${max})`}
      </label>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((p, i) => (
            <div key={p.id} className="relative h-20 w-20 overflow-hidden rounded-lg border">
              <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white" aria-label="Удалить фото">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Создать `web/components/forms/AnimalFormFields.tsx`**

```tsx
'use client';
import type { AnimalDraft } from '@/lib/animal-form';

interface CityOption { id: string; nameRu: string }

const SPECIES = [{ v: 'dog', l: 'Собака' }, { v: 'cat', l: 'Кошка' }, { v: 'other', l: 'Другое' }];
const SEX = [{ v: 'male', l: 'Мальчик' }, { v: 'female', l: 'Девочка' }, { v: 'unknown', l: 'Неизвестно' }];
const SIZE = [{ v: 'small', l: 'Маленький' }, { v: 'medium', l: 'Средний' }, { v: 'large', l: 'Большой' }];

export function AnimalFormFields({ draft, setDraft, cities, errors }: {
  draft: AnimalDraft; setDraft: (d: AnimalDraft) => void; cities: CityOption[]; errors: Record<string, string>;
}) {
  const upd = (patch: Partial<AnimalDraft>) => setDraft({ ...draft, ...patch });
  return (
    <div className="space-y-4">
      <div>
        <label className="block font-medium">Вид *</label>
        <div className="flex gap-3">
          {SPECIES.map((s) => (
            <label key={s.v} className="inline-flex items-center gap-1">
              <input type="radio" name="species" checked={draft.species === s.v} onChange={() => upd({ species: s.v as any })} /> {s.l}
            </label>
          ))}
        </div>
        {errors.species && <p className="text-sm text-red-600">{errors.species}</p>}
      </div>

      <div className="flex gap-4">
        <div>
          <label className="block font-medium">Пол</label>
          <select value={draft.sex ?? 'unknown'} onChange={(e) => upd({ sex: e.target.value as any })} className="rounded-lg border px-2 py-1">
            {SEX.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-medium">Размер</label>
          <select value={draft.size ?? ''} onChange={(e) => upd({ size: e.target.value as any })} className="rounded-lg border px-2 py-1">
            <option value="">—</option>
            {SIZE.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <label className="block">Лет <input type="number" min={0} max={40} value={draft.ageYears ?? ''} onChange={(e) => upd({ ageYears: e.target.value ? Number(e.target.value) : undefined })} className="w-20 rounded-lg border px-2 py-1" /></label>
        <label className="block">Месяцев <input type="number" min={0} max={11} value={draft.ageMonths ?? ''} onChange={(e) => upd({ ageMonths: e.target.value ? Number(e.target.value) : undefined })} className="w-20 rounded-lg border px-2 py-1" /></label>
      </div>

      <div>
        <label className="block font-medium">Имя (необязательно)</label>
        <input value={draft.name ?? ''} onChange={(e) => upd({ name: e.target.value })} className="w-full rounded-lg border px-2 py-1" />
      </div>

      <div>
        <label className="block font-medium">Город *</label>
        <select value={draft.city ?? ''} onChange={(e) => upd({ city: e.target.value })} className="w-full rounded-lg border px-2 py-1">
          <option value="">Выберите город</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.nameRu}</option>)}
        </select>
        {errors.city && <p className="text-sm text-red-600">{errors.city}</p>}
      </div>

      <div>
        <label className="block font-medium">Описание *</label>
        <textarea value={draft.description ?? ''} onChange={(e) => upd({ description: e.target.value })} rows={4} className="w-full rounded-lg border px-2 py-1" />
        {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
      </div>

      <div className="flex gap-4">
        <div>
          <label className="block font-medium">Телефон</label>
          <input value={draft.contactPhone ?? ''} onChange={(e) => upd({ contactPhone: e.target.value })} placeholder="+375XXXXXXXXX" className="rounded-lg border px-2 py-1" />
          {errors.contactPhone && <p className="text-sm text-red-600">{errors.contactPhone}</p>}
        </div>
        <div>
          <label className="block font-medium">Telegram</label>
          <input value={draft.contactTelegram ?? ''} onChange={(e) => upd({ contactTelegram: e.target.value })} placeholder="@username" className="rounded-lg border px-2 py-1" />
        </div>
      </div>
      {errors.contact && <p className="text-sm text-red-600">{errors.contact}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Создать `web/components/forms/AnimalWizard.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoUpload, type UploadedPhoto } from './PhotoUpload';
import { AnimalFormFields } from './AnimalFormFields';
import { validateAnimalDraft, type AnimalDraft } from '@/lib/animal-form';
import { createAnimal } from '@/actions/animal';

interface CityOption { id: string; nameRu: string }

export function AnimalWizard({ cities, organizationId, successRedirect = '/me/animals' }: { cities: CityOption[]; organizationId?: string; successRedirect?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [draft, setDraft] = useState<AnimalDraft>({ sex: 'unknown' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function next() {
    if (step === 1 && photos.length === 0) { setErrors({ photos: 'Добавьте хотя бы одно фото' }); return; }
    setErrors({});
    setStep((s) => Math.min(4, s + 1));
  }

  async function submit() {
    const full = { ...draft, photoCount: photos.length };
    const v = validateAnimalDraft(full);
    if (!v.ok) { setErrors(v.errors); return; }
    setSubmitting(true);
    const res = await createAnimal({ ...draft, mediaIds: photos.map((p) => p.id), organizationId });
    setSubmitting(false);
    if (res.ok) router.push(`${successRedirect}?created=1`);
    else setErrors(res.errors);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4 text-sm text-gray-500">Шаг {step} из 4</p>

      {step === 1 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Фото</h2>
          <PhotoUpload value={photos} onChange={setPhotos} />
          {errors.photos && <p className="text-sm text-red-600">{errors.photos}</p>}
        </section>
      )}

      {step >= 2 && step <= 3 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{step === 2 ? 'О животном' : 'Описание и контакт'}</h2>
          <AnimalFormFields draft={draft} setDraft={setDraft} cities={cities} errors={errors} />
        </section>
      )}

      {step === 4 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Проверьте и отправьте</h2>
          <p className="text-sm text-gray-600">{photos.length} фото · {draft.species} · {cities.find((c) => c.id === draft.city)?.nameRu}</p>
          {errors.auth && <p className="text-sm text-red-600">{errors.auth}</p>}
          {errors.org && <p className="text-sm text-red-600">{errors.org}</p>}
        </section>
      )}

      <div className="mt-6 flex justify-between">
        {step > 1 ? <button onClick={() => setStep((s) => s - 1)} className="rounded-lg border px-4 py-2">Назад</button> : <span />}
        {step < 4
          ? <button onClick={next} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Далее</button>
          : <button onClick={submit} disabled={submitting} className="rounded-lg bg-green-600 px-4 py-2 text-white">{submitting ? 'Отправка…' : 'Отправить на проверку'}</button>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Smoke-компиляция**

Run: `cd web && npx tsc --noEmit`
Expected: без ошибок типов.

- [ ] **Step 5: Commit**

```bash
git add web/components/forms
git commit -m "Plan 3 Task 9: компоненты формы — PhotoUpload + AnimalFormFields + AnimalWizard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Account-layout (guard) + дашборд `/me` + wizard `/me/animals/new`

**Files:**
- Create: `web/app/(account)/layout.tsx`
- Create: `web/app/(account)/me/page.tsx`
- Create: `web/app/(account)/me/animals/new/page.tsx`
- Test: `web/tests/e2e/org-cabinet.spec.ts` (тест из Task 2 теперь зеленеет)

- [ ] **Step 1: Создать `web/app/(account)/layout.tsx`**

```tsx
import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';

export const dynamic = 'force-dynamic';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-6 flex gap-4 border-b pb-3 text-sm">
        <Link href="/me" className="font-medium">Кабинет</Link>
        <Link href="/me/animals">Мои животные</Link>
        <Link href="/me/inquiries">Мои заявки</Link>
      </nav>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Создать `web/app/(account)/me/page.tsx`**

```tsx
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUser } from '@/lib/auth/current-user';

export const dynamic = 'force-dynamic';

export default async function MeDashboard() {
  const user = await requireUser();
  const payload = await getPayload({ config });
  const animals = await payload.find({ collection: 'animals', where: { ownerUser: { equals: user.id } }, limit: 0, overrideAccess: true });
  const inquiries = await payload.find({ collection: 'adoption-inquiries', where: { applicant: { equals: user.id } }, limit: 0, overrideAccess: true });

  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Здравствуйте{user.firstName ? `, ${user.firstName}` : ''}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/me/animals" className="rounded-2xl border p-4 hover:shadow"><p className="text-3xl font-bold">{animals.totalDocs}</p><p className="text-gray-600">Мои животные</p></Link>
        <Link href="/me/inquiries" className="rounded-2xl border p-4 hover:shadow"><p className="text-3xl font-bold">{inquiries.totalDocs}</p><p className="text-gray-600">Мои заявки</p></Link>
        <Link href="/me/animals/new" className="rounded-2xl border-2 border-blue-500 bg-blue-50 p-4 hover:shadow"><p className="text-lg font-semibold text-blue-700">+ Разместить животное</p></Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Создать `web/app/(account)/me/animals/new/page.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUser } from '@/lib/auth/current-user';
import { AnimalWizard } from '@/components/forms/AnimalWizard';

export const dynamic = 'force-dynamic';

export default async function NewAnimalPage() {
  await requireUser();
  const payload = await getPayload({ config });
  const citiesRes = await payload.find({ collection: 'cities', limit: 200, sort: 'nameRu', depth: 0 });
  const cities = citiesRes.docs.map((c: any) => ({ id: String(c.id), nameRu: c.nameRu }));
  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">Разместить животное</h1>
      <AnimalWizard cities={cities} successRedirect="/me/animals" />
    </main>
  );
}
```

- [ ] **Step 4: Запустить e2e guard-теста (из Task 2)**

Run: `cd web && npx playwright test org-cabinet`
Expected: PASS — `/me` без логина редиректит на `/login`.

- [ ] **Step 5: Commit**

```bash
git add web/app/\(account\)/layout.tsx web/app/\(account\)/me/page.tsx web/app/\(account\)/me/animals/new/page.tsx
git commit -m "Plan 3 Task 10: account-layout с guard + дашборд /me + wizard размещения

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Мои животные `/me/animals` + редактирование `/me/animals/[id]/edit`

**Files:**
- Create: `web/app/(account)/me/animals/page.tsx`
- Create: `web/app/(account)/me/animals/[id]/edit/page.tsx`
- Create: `web/components/account/MyAnimalRow.tsx`
- Create: `web/components/forms/AnimalEditForm.tsx`

- [ ] **Step 1: Создать `web/components/account/MyAnimalRow.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAnimal } from '@/actions/animal';

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'На проверке', published: 'Опубликовано', adopted: 'Пристроено', archived: 'В архиве',
};

export function MyAnimalRow({ id, title, status, editHref }: { id: string; title: string; status: string; editHref: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex items-center justify-between rounded-xl border p-3">
      <div>
        <p className="font-medium">{title}</p>
        <span className="text-sm text-gray-500">{STATUS_LABEL[status] ?? status}</span>
      </div>
      <div className="flex gap-2">
        <Link href={editHref} className="rounded-lg border px-3 py-1 text-sm">Редактировать</Link>
        {status !== 'archived' && (
          <button onClick={() => start(async () => { await deleteAnimal(id); router.refresh(); })} disabled={pending} className="rounded-lg border px-3 py-1 text-sm text-red-600">
            {pending ? '…' : 'Закрыть'}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Создать `web/app/(account)/me/animals/page.tsx`**

```tsx
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUser } from '@/lib/auth/current-user';
import { formatAnimalTitle } from '@/lib/format';
import { MyAnimalRow } from '@/components/account/MyAnimalRow';

export const dynamic = 'force-dynamic';

export default async function MyAnimalsPage() {
  const user = await requireUser();
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'animals',
    where: { ownerUser: { equals: user.id } },
    sort: '-createdAt', limit: 100, depth: 0, overrideAccess: true,
  });

  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мои животные</h1>
        <Link href="/me/animals/new" className="rounded-lg bg-blue-600 px-4 py-2 text-white">+ Разместить</Link>
      </div>
      {res.docs.length === 0 ? (
        <p className="text-gray-500">Пока нет объявлений. Разместите первое.</p>
      ) : (
        <div className="space-y-2">
          {res.docs.map((a: any) => (
            <MyAnimalRow key={a.id} id={String(a.id)} title={formatAnimalTitle(a)} status={a.status} editHref={`/me/animals/${a.id}/edit`} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Создать `web/components/forms/AnimalEditForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimalFormFields } from './AnimalFormFields';
import { validateAnimalDraft, type AnimalDraft } from '@/lib/animal-form';
import { updateAnimal } from '@/actions/animal';

interface CityOption { id: string; nameRu: string }

export function AnimalEditForm({ id, initial, cities, backHref }: { id: string; initial: AnimalDraft; cities: CityOption[]; backHref: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<AnimalDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    // при редактировании фото не трогаем (photoCount берём из initial, чтобы валидация описания/контакта прошла)
    const v = validateAnimalDraft({ ...draft, photoCount: initial.photoCount ?? 1 });
    if (!v.ok) { setErrors(v.errors); return; }
    setSaving(true);
    const res = await updateAnimal(id, {
      name: draft.name, description: draft.description, healthStatus: draft.healthStatus,
      size: draft.size, sex: draft.sex, ageYears: draft.ageYears, ageMonths: draft.ageMonths,
    });
    setSaving(false);
    if (res.ok) router.push(backHref);
    else setErrors(res.errors);
  }

  return (
    <div className="max-w-2xl">
      <AnimalFormFields draft={draft} setDraft={setDraft} cities={cities} errors={errors} />
      {errors.auth && <p className="text-sm text-red-600">{errors.auth}</p>}
      <button onClick={save} disabled={saving} className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-white">{saving ? 'Сохранение…' : 'Сохранить'}</button>
    </div>
  );
}
```

- [ ] **Step 4: Создать `web/app/(account)/me/animals/[id]/edit/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUser } from '@/lib/auth/current-user';
import { extractPlainText } from '@/lib/lexical-plain';
import { AnimalEditForm } from '@/components/forms/AnimalEditForm';
import type { AnimalDraft } from '@/lib/animal-form';

export const dynamic = 'force-dynamic';

export default async function EditMyAnimalPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const payload = await getPayload({ config });
  const animal: any = await payload.findByID({ collection: 'animals', id: params.id, depth: 1, overrideAccess: true }).catch(() => null);
  if (!animal) notFound();
  const ownerId = typeof animal.ownerUser === 'object' ? animal.ownerUser?.id : animal.ownerUser;
  if (String(ownerId) !== String(user.id)) notFound();

  const citiesRes = await payload.find({ collection: 'cities', limit: 200, sort: 'nameRu', depth: 0 });
  const cities = citiesRes.docs.map((c: any) => ({ id: String(c.id), nameRu: c.nameRu }));

  const initial: AnimalDraft = {
    species: animal.species, sex: animal.sex, size: animal.size, name: animal.name ?? '',
    ageYears: animal.ageYears ?? undefined, ageMonths: animal.ageMonths ?? undefined,
    city: typeof animal.city === 'object' ? String(animal.city?.id) : String(animal.city ?? ''),
    description: extractPlainText(animal.description), healthStatus: animal.healthStatus,
    contactPhone: user.phone ?? '', contactTelegram: user.telegramUsername ? `@${user.telegramUsername}` : '',
    photoCount: Array.isArray(animal.media) ? animal.media.length : 1,
  };

  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">Редактировать объявление</h1>
      <AnimalEditForm id={params.id} initial={initial} cities={cities} backHref="/me/animals" />
    </main>
  );
}
```

- [ ] **Step 5: Smoke-компиляция**

Run: `cd web && npx tsc --noEmit`
Expected: без ошибок типов.

- [ ] **Step 6: Commit**

```bash
git add web/app/\(account\)/me/animals web/components/account/MyAnimalRow.tsx web/components/forms/AnimalEditForm.tsx
git commit -m "Plan 3 Task 11: /me/animals список + редактирование объявления

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Мои заявки `/me/inquiries`

**Files:**
- Create: `web/app/(account)/me/inquiries/page.tsx`

- [ ] **Step 1: Создать `web/app/(account)/me/inquiries/page.tsx`**

```tsx
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUser } from '@/lib/auth/current-user';
import { animalUrl } from '@/lib/animal-url';
import { formatAnimalTitle } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = { new: 'Новая', contacted: 'На связи', closed: 'Закрыта' };

export default async function MyInquiriesPage() {
  const user = await requireUser();
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'adoption-inquiries',
    where: { applicant: { equals: user.id } },
    sort: '-createdAt', limit: 100, depth: 2,
  });

  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Мои заявки</h1>
      {res.docs.length === 0 ? (
        <p className="text-gray-500">Вы ещё не отправляли заявок.</p>
      ) : (
        <ul className="space-y-2">
          {res.docs.map((inq: any) => {
            const animal = inq.animal;
            const isObj = animal && typeof animal === 'object';
            return (
              <li key={inq.id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  {isObj ? <Link href={animalUrl(animal)} className="font-medium text-blue-600">{formatAnimalTitle(animal)}</Link> : <span>Животное</span>}
                  <p className="text-sm text-gray-500">{STATUS_LABEL[inq.status] ?? inq.status}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/\(account\)/me/inquiries/page.tsx
git commit -m "Plan 3 Task 12: страница /me/inquiries (мои заявки adoption)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Кабинет организации — layout (guard) + дашборд `/org/[slug]`

**Files:**
- Create: `web/lib/org.ts` (резолв slug -> организация)
- Create: `web/app/(account)/org/[slug]/layout.tsx`
- Create: `web/app/(account)/org/[slug]/page.tsx`

- [ ] **Step 1: Создать `web/lib/org.ts`**

```ts
import { getPayload } from 'payload';
import config from '@/payload.config';
import type { Organization } from '@/payload-types';

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'organizations', where: { slug: { equals: slug } }, limit: 1, depth: 1, overrideAccess: true });
  return (res.docs[0] as Organization) ?? null;
}
```

- [ ] **Step 2: Создать `web/app/(account)/org/[slug]/layout.tsx`**

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOrgAdmin } from '@/lib/auth/current-user';
import { getOrganizationBySlug } from '@/lib/org';

export const dynamic = 'force-dynamic';

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: { slug: string } }) {
  const org = await getOrganizationBySlug(params.slug);
  if (!org) notFound();
  await requireOrgAdmin(String(org.id));
  const base = `/org/${params.slug}`;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <p className="mb-1 text-sm text-gray-500">Организация</p>
      <h2 className="mb-4 text-lg font-bold">{org.name}</h2>
      <nav className="mb-6 flex gap-4 border-b pb-3 text-sm">
        <Link href={base}>Обзор</Link>
        <Link href={`${base}/animals`}>Животные</Link>
        <Link href={`${base}/inquiries`}>Заявки</Link>
        <Link href={`${base}/settings`}>Настройки</Link>
      </nav>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Создать `web/app/(account)/org/[slug]/page.tsx`**

```tsx
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getOrganizationBySlug } from '@/lib/org';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrgDashboard({ params }: { params: { slug: string } }) {
  const org = await getOrganizationBySlug(params.slug);
  if (!org) notFound();
  const payload = await getPayload({ config });
  const animals = await payload.find({ collection: 'animals', where: { organization: { equals: org.id } }, limit: 0, overrideAccess: true });

  // Заявки считаем двухшаговым запросом (надёжнее dot-path по связи):
  // 1) id животных организации, 2) заявки по animal in ids.
  const orgAnimals = await payload.find({ collection: 'animals', where: { organization: { equals: org.id } }, limit: 1000, depth: 0, overrideAccess: true });
  const orgAnimalIds = orgAnimals.docs.map((a: any) => a.id);
  const inquiries = orgAnimalIds.length === 0
    ? { totalDocs: 0 }
    : await payload.find({ collection: 'adoption-inquiries', where: { animal: { in: orgAnimalIds } }, limit: 0, overrideAccess: true });
  const base = `/org/${params.slug}`;

  return (
    <main className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Link href={`${base}/animals`} className="rounded-2xl border p-4 hover:shadow"><p className="text-3xl font-bold">{animals.totalDocs}</p><p className="text-gray-600">Животных</p></Link>
      <Link href={`${base}/inquiries`} className="rounded-2xl border p-4 hover:shadow"><p className="text-3xl font-bold">{inquiries.totalDocs}</p><p className="text-gray-600">Заявок</p></Link>
      <Link href={`${base}/animals/new`} className="rounded-2xl border-2 border-blue-500 bg-blue-50 p-4 hover:shadow"><p className="text-lg font-semibold text-blue-700">+ Добавить животное</p></Link>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/lib/org.ts web/app/\(account\)/org/\[slug\]/layout.tsx web/app/\(account\)/org/\[slug\]/page.tsx
git commit -m "Plan 3 Task 13: кабинет организации — guard-layout + дашборд

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: CRUD животных организации `/org/[slug]/animals`

Организация добавляет животных через тот же wizard (с `organizationId`), а для модели А службы отлова (§17.7) — с выбором `intakeFacility` + `intakeDate`. Редактирование — общий `AnimalEditForm`.

**Files:**
- Create: `web/app/(account)/org/[slug]/animals/page.tsx`
- Create: `web/app/(account)/org/[slug]/animals/new/page.tsx`
- Create: `web/app/(account)/org/[slug]/animals/[id]/edit/page.tsx`
- Modify: `web/components/forms/AnimalWizard.tsx` (опциональный выбор службы отлова)

- [ ] **Step 1: Добавить выбор службы отлова в `web/components/forms/AnimalWizard.tsx`**

Расширить props и шаг 2. Заменить сигнатуру и добавить блок выбора facility (показывается только если переданы `facilities`):

```tsx
interface FacilityOption { id: string; name: string }
```

В сигнатуру добавить `facilities` и состояние:

```tsx
export function AnimalWizard({ cities, organizationId, successRedirect = '/me/animals', facilities = [] }: { cities: CityOption[]; organizationId?: string; successRedirect?: string; facilities?: FacilityOption[] }) {
```

Добавить рядом с `draft`:

```tsx
  const [intakeFacilityId, setIntakeFacilityId] = useState('');
  const [intakeDate, setIntakeDate] = useState('');
```

В блок `step === 2` (после `AnimalFormFields`) добавить, если есть facilities:

```tsx
          {facilities.length > 0 && (
            <div className="mt-4 rounded-xl border-l-4 border-red-300 bg-red-50 p-3">
              <label className="block font-medium">Служба отлова (если животное оттуда)</label>
              <select value={intakeFacilityId} onChange={(e) => setIntakeFacilityId(e.target.value)} className="w-full rounded-lg border px-2 py-1">
                <option value="">Не из службы отлова</option>
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {intakeFacilityId && (
                <label className="mt-2 block">Дата попадания
                  <input type="date" value={intakeDate} onChange={(e) => setIntakeDate(e.target.value)} className="ml-2 rounded-lg border px-2 py-1" />
                </label>
              )}
            </div>
          )}
```

Обновить вызов `createAnimal` в `submit`:

```tsx
    const res = await createAnimal({ ...draft, mediaIds: photos.map((p) => p.id), organizationId, intakeFacilityId: intakeFacilityId || undefined, intakeDate: intakeDate || undefined });
```

- [ ] **Step 2: Создать `web/app/(account)/org/[slug]/animals/page.tsx`**

```tsx
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getOrganizationBySlug } from '@/lib/org';
import { formatAnimalTitle } from '@/lib/format';
import { MyAnimalRow } from '@/components/account/MyAnimalRow';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrgAnimalsPage({ params }: { params: { slug: string } }) {
  const org = await getOrganizationBySlug(params.slug);
  if (!org) notFound();
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'animals', where: { organization: { equals: org.id } }, sort: '-createdAt', limit: 200, depth: 0, overrideAccess: true });
  const base = `/org/${params.slug}`;

  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Животные организации</h1>
        <Link href={`${base}/animals/new`} className="rounded-lg bg-blue-600 px-4 py-2 text-white">+ Добавить</Link>
      </div>
      <div className="space-y-2">
        {res.docs.map((a: any) => (
          <MyAnimalRow key={a.id} id={String(a.id)} title={formatAnimalTitle(a)} status={a.status} editHref={`${base}/animals/${a.id}/edit`} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Создать `web/app/(account)/org/[slug]/animals/new/page.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getOrganizationBySlug } from '@/lib/org';
import { AnimalWizard } from '@/components/forms/AnimalWizard';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrgNewAnimalPage({ params }: { params: { slug: string } }) {
  const org = await getOrganizationBySlug(params.slug);
  if (!org) notFound();
  const payload = await getPayload({ config });
  const citiesRes = await payload.find({ collection: 'cities', limit: 200, sort: 'nameRu', depth: 0 });
  const cities = citiesRes.docs.map((c: any) => ({ id: String(c.id), nameRu: c.nameRu }));
  const facRes = await payload.find({ collection: 'intakeFacilities', where: { isPublished: { equals: true } }, limit: 50, depth: 0 });
  const facilities = facRes.docs.map((f: any) => ({ id: String(f.id), name: f.name }));

  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">Добавить животное</h1>
      <AnimalWizard cities={cities} organizationId={String(org.id)} successRedirect={`/org/${params.slug}/animals`} facilities={facilities} />
    </main>
  );
}
```

- [ ] **Step 4: Создать `web/app/(account)/org/[slug]/animals/[id]/edit/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getOrganizationBySlug } from '@/lib/org';
import { extractPlainText } from '@/lib/lexical-plain';
import { AnimalEditForm } from '@/components/forms/AnimalEditForm';
import type { AnimalDraft } from '@/lib/animal-form';

export const dynamic = 'force-dynamic';

export default async function OrgEditAnimalPage({ params }: { params: { slug: string; id: string } }) {
  const org = await getOrganizationBySlug(params.slug);
  if (!org) notFound();
  const payload = await getPayload({ config });
  const animal: any = await payload.findByID({ collection: 'animals', id: params.id, depth: 1, overrideAccess: true }).catch(() => null);
  if (!animal) notFound();
  const orgId = typeof animal.organization === 'object' ? animal.organization?.id : animal.organization;
  if (String(orgId) !== String(org.id)) notFound();

  const citiesRes = await payload.find({ collection: 'cities', limit: 200, sort: 'nameRu', depth: 0 });
  const cities = citiesRes.docs.map((c: any) => ({ id: String(c.id), nameRu: c.nameRu }));

  const initial: AnimalDraft = {
    species: animal.species, sex: animal.sex, size: animal.size, name: animal.name ?? '',
    ageYears: animal.ageYears ?? undefined, ageMonths: animal.ageMonths ?? undefined,
    city: typeof animal.city === 'object' ? String(animal.city?.id) : String(animal.city ?? ''),
    description: extractPlainText(animal.description), healthStatus: animal.healthStatus,
    contactPhone: org.phone ?? '+375000000000', contactTelegram: org.tgUrl ?? '',
    photoCount: Array.isArray(animal.media) ? animal.media.length : 1,
  };

  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">Редактировать животное</h1>
      <AnimalEditForm id={params.id} initial={initial} cities={cities} backHref={`/org/${params.slug}/animals`} />
    </main>
  );
}
```

> Для редактирования org-животного валидация требует «контакт» — подставляем телефон/TG организации. Если у организации не заполнен телефон, заполнить его в настройках (Task 16) перед публикацией.
>
> **Access org-животного:** редактирование идёт через общий `updateAnimal` (Task 7), который сам загружает существующее животное и при `ownerType==='organization'` подмешивает `organization` (id) в `data` — иначе `Animal.access.update` (Plan 2) вернёт `ownerUser`-фильтр и отклонит апдейт org_admin'ом. Отдельной правки в Task 14 не требуется — фикс централизован в action.

- [ ] **Step 5: Smoke-компиляция**

Run: `cd web && npx tsc --noEmit`
Expected: без ошибок типов.

- [ ] **Step 6: Commit**

```bash
git add web/app/\(account\)/org/\[slug\]/animals web/components/forms/AnimalWizard.tsx
git commit -m "Plan 3 Task 14: CRUD животных организации + выбор службы отлова (§17.7)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Входящие заявки организации `/org/[slug]/inquiries` + смена статуса

**Files:**
- Create: `web/actions/inquiry.ts`
- Create: `web/components/account/InquiryRow.tsx`
- Create: `web/app/(account)/org/[slug]/inquiries/page.tsx`

- [ ] **Step 1: Создать `web/actions/inquiry.ts`**

```ts
'use server';

import { getPayload } from 'payload';
import config from '@/payload.config';
import { getCurrentUser } from '@/lib/auth/current-user';
import { canManageOrganization, isAdmin } from '@/lib/auth/rbac';

export async function updateInquiryStatus(inquiryId: string, status: 'new' | 'contacted' | 'closed'): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const payload = await getPayload({ config });

  // проверяем, что заявка относится к животному пользователя/его организации
  const inquiry: any = await payload.findByID({ collection: 'adoption-inquiries', id: inquiryId, depth: 2, overrideAccess: true }).catch(() => null);
  if (!inquiry) return { ok: false };
  const animal = inquiry.animal;
  const ownerId = animal && typeof animal === 'object' ? (typeof animal.ownerUser === 'object' ? animal.ownerUser?.id : animal.ownerUser) : null;
  const orgId = animal && typeof animal === 'object' ? (typeof animal.organization === 'object' ? animal.organization?.id : animal.organization) : null;

  const allowed = isAdmin(user as any)
    || (ownerId && String(ownerId) === String(user.id))
    || (orgId && canManageOrganization(user as any, String(orgId)));
  if (!allowed) return { ok: false };

  await payload.update({ collection: 'adoption-inquiries', id: inquiryId, data: { status }, overrideAccess: true });
  return { ok: true };
}
```

- [ ] **Step 2: Создать `web/components/account/InquiryRow.tsx`**

```tsx
'use client';
import { useState, useTransition } from 'react';
import { updateInquiryStatus } from '@/actions/inquiry';

const STATUS_LABEL: Record<string, string> = { new: 'Новая', contacted: 'На связи', closed: 'Закрыта' };

const NEXT: Record<string, { value: 'contacted' | 'closed'; label: string } | null> = {
  new: { value: 'contacted', label: 'Отметить «на связи»' },
  contacted: { value: 'closed', label: 'Закрыть заявку' },
  closed: null,
};

export function InquiryRow({ id, animalTitle, applicantName, phone, telegram, message, initialStatus }: {
  id: string; animalTitle: string; applicantName?: string; phone?: string; telegram?: string; message: string; initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, start] = useTransition();
  const next = NEXT[status];

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">{animalTitle}</p>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{STATUS_LABEL[status] ?? status}</span>
      </div>
      <p className="mt-1 text-sm text-gray-700">{message}</p>
      <p className="mt-1 text-sm text-gray-500">
        {applicantName ? `${applicantName} · ` : ''}{phone ? <a href={`tel:${phone}`} className="text-blue-600">{phone}</a> : null}{telegram ? ` · ${telegram}` : ''}
      </p>
      {next && (
        <button
          onClick={() => start(async () => { const r = await updateInquiryStatus(id, next.value); if (r.ok) setStatus(next.value); })}
          disabled={pending}
          className="mt-2 rounded-lg border px-3 py-1 text-sm"
        >
          {pending ? '…' : next.label}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Создать `web/app/(account)/org/[slug]/inquiries/page.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getOrganizationBySlug } from '@/lib/org';
import { formatAnimalTitle } from '@/lib/format';
import { InquiryRow } from '@/components/account/InquiryRow';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrgInquiriesPage({ params }: { params: { slug: string } }) {
  const org = await getOrganizationBySlug(params.slug);
  if (!org) notFound();
  const payload = await getPayload({ config });

  // Двухшаговый запрос (надёжнее dot-path по связи):
  // 1) id животных организации, 2) заявки по animal in ids.
  const orgAnimals = await payload.find({ collection: 'animals', where: { organization: { equals: org.id } }, limit: 1000, depth: 0, overrideAccess: true });
  const orgAnimalIds = orgAnimals.docs.map((a: any) => a.id);
  const res = orgAnimalIds.length === 0
    ? { docs: [] as any[] }
    : await payload.find({
        collection: 'adoption-inquiries',
        where: { animal: { in: orgAnimalIds } },
        sort: '-createdAt', limit: 200, depth: 2, overrideAccess: true,
      });

  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Входящие заявки</h1>
      {res.docs.length === 0 ? (
        <p className="text-gray-500">Заявок пока нет.</p>
      ) : (
        <div className="space-y-3">
          {res.docs.map((inq: any) => {
            const applicant = typeof inq.applicant === 'object' ? inq.applicant : null;
            return (
              <InquiryRow
                key={inq.id} id={String(inq.id)}
                animalTitle={typeof inq.animal === 'object' ? formatAnimalTitle(inq.animal) : 'Животное'}
                applicantName={applicant ? [applicant.firstName, applicant.lastName].filter(Boolean).join(' ') : undefined}
                phone={inq.contactPhone} telegram={inq.contactTelegram} message={inq.message} initialStatus={inq.status}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/actions/inquiry.ts web/components/account/InquiryRow.tsx web/app/\(account\)/org/\[slug\]/inquiries/page.tsx
git commit -m "Plan 3 Task 15: входящие заявки организации + смена статуса new/contacted/closed

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Настройки организации `/org/[slug]/settings`

**Files:**
- Create: `web/actions/organization.ts`
- Create: `web/components/forms/OrgSettingsForm.tsx`
- Create: `web/app/(account)/org/[slug]/settings/page.tsx`

> Collection-level access из Plan 2 уже разрешает `update` админу организации (`canManageOrganization`) и запрещает менять `isVerified`/`slug` обычному org_admin (поле `isVerified` имеет field-level access `isAdmin`). Поэтому отдельная правка `Organizations.ts` не требуется — server action ограничивает редактируемые поля списком.

- [ ] **Step 1: Создать `web/actions/organization.ts`**

```ts
'use server';

import { getPayload } from 'payload';
import config from '@/payload.config';
import { getCurrentUser } from '@/lib/auth/current-user';
import { canManageOrganization, isAdmin } from '@/lib/auth/rbac';

export interface OrgProfileInput {
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  tgUrl?: string;
  viberUrl?: string;
  instagramUrl?: string;
}

const EDITABLE: (keyof OrgProfileInput)[] = ['description', 'address', 'phone', 'email', 'websiteUrl', 'tgUrl', 'viberUrl', 'instagramUrl'];

export async function updateOrganizationProfile(orgId: string, input: OrgProfileInput): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  if (!isAdmin(user as any) && !canManageOrganization(user as any, orgId)) return { ok: false };

  const data: Record<string, any> = {};
  for (const key of EDITABLE) {
    if (input[key] !== undefined) {
      data[key] = key === 'description'
        ? { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: input.description ?? '' }] }] } }
        : input[key];
    }
  }
  const payload = await getPayload({ config });
  await payload.update({ collection: 'organizations', id: orgId, data, overrideAccess: true });
  return { ok: true };
}
```

- [ ] **Step 2: Создать `web/components/forms/OrgSettingsForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrganizationProfile, type OrgProfileInput } from '@/actions/organization';

const FIELDS: { key: keyof OrgProfileInput; label: string; type?: string }[] = [
  { key: 'phone', label: 'Телефон' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'address', label: 'Адрес' },
  { key: 'websiteUrl', label: 'Сайт' },
  { key: 'tgUrl', label: 'Telegram' },
  { key: 'viberUrl', label: 'Viber' },
  { key: 'instagramUrl', label: 'Instagram' },
];

export function OrgSettingsForm({ orgId, initial }: { orgId: string; initial: OrgProfileInput }) {
  const router = useRouter();
  const [form, setForm] = useState<OrgProfileInput>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    const r = await updateOrganizationProfile(orgId, form);
    setSaving(false);
    if (r.ok) { setSaved(true); router.refresh(); }
  }

  return (
    <div className="max-w-xl space-y-3">
      <label className="block">
        <span className="font-medium">Описание</span>
        <textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full rounded-lg border px-2 py-1" />
      </label>
      {FIELDS.map((f) => (
        <label key={f.key} className="block">
          <span className="font-medium">{f.label}</span>
          <input type={f.type ?? 'text'} value={(form[f.key] as string) ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full rounded-lg border px-2 py-1" />
        </label>
      ))}
      <button onClick={save} disabled={saving} className="rounded-lg bg-green-600 px-4 py-2 text-white">{saving ? 'Сохранение…' : 'Сохранить'}</button>
      {saved && <span className="ml-2 text-sm text-green-700">Сохранено</span>}
    </div>
  );
}
```

- [ ] **Step 3: Создать `web/app/(account)/org/[slug]/settings/page.tsx`**

```tsx
import { getOrganizationBySlug } from '@/lib/org';
import { extractPlainText } from '@/lib/lexical-plain';
import { OrgSettingsForm } from '@/components/forms/OrgSettingsForm';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrgSettingsPage({ params }: { params: { slug: string } }) {
  const org: any = await getOrganizationBySlug(params.slug);
  if (!org) notFound();
  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">Настройки организации</h1>
      <OrgSettingsForm orgId={String(org.id)} initial={{
        description: extractPlainText(org.description), address: org.address ?? '', phone: org.phone ?? '',
        email: org.email ?? '', websiteUrl: org.websiteUrl ?? '', tgUrl: org.tgUrl ?? '', viberUrl: org.viberUrl ?? '', instagramUrl: org.instagramUrl ?? '',
      }} />
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/actions/organization.ts web/components/forms/OrgSettingsForm.tsx web/app/\(account\)/org/\[slug\]/settings/page.tsx
git commit -m "Plan 3 Task 16: настройки организации (профиль, контакты)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: Заявка adoption — API `/api/inquiries` + AdoptModal на карточке

**Files:**
- Create: `web/app/api/inquiries/route.ts`
- Create: `web/components/adopt/AdoptModal.tsx`
- Modify: `web/app/(public)/animals/[city]/[species]/[slug]/page.tsx` (заменить кнопку-заглушку из Plan 2)
- Test: `web/tests/e2e/adoption-inquiry.spec.ts`

- [ ] **Step 1: Создать `web/app/api/inquiries/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { notifyNewInquiry } from '@/lib/notify/dispatch';
import { formatAnimalTitle } from '@/lib/format';

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config });
  const session = await payload.auth({ headers: req.headers });
  if (!session.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.animalId || !body?.message || String(body.message).trim().length < 1) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const animal: any = await payload.findByID({ collection: 'animals', id: body.animalId, depth: 1, overrideAccess: true }).catch(() => null);
  if (!animal || animal.status !== 'published') return NextResponse.json({ error: 'not found' }, { status: 404 });

  await payload.create({
    collection: 'adoption-inquiries',
    data: {
      animal: body.animalId, applicant: session.user.id, message: String(body.message).slice(0, 2000),
      contactPhone: body.phone ?? session.user.phone ?? undefined,
      contactTelegram: body.telegram ?? (session.user.telegramUsername ? `@${session.user.telegramUsername}` : undefined),
      status: 'new',
    },
    overrideAccess: true,
  });

  // email владельцу/организации + telegram + подтверждение заявителю
  let ownerEmail: string | null = null;
  if (animal.ownerUser) {
    const owner: any = await payload.findByID({ collection: 'users', id: typeof animal.ownerUser === 'object' ? animal.ownerUser.id : animal.ownerUser, depth: 0 }).catch(() => null);
    ownerEmail = owner?.email ?? null;
  } else if (animal.organization) {
    const org: any = await payload.findByID({ collection: 'organizations', id: typeof animal.organization === 'object' ? animal.organization.id : animal.organization, depth: 0 }).catch(() => null);
    ownerEmail = org?.email ?? null;
  }
  await notifyNewInquiry({
    ownerEmail, applicantEmail: session.user.email ?? null,
    animalTitle: formatAnimalTitle(animal),
    applicantName: [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || undefined,
    phone: body.phone ?? session.user.phone ?? undefined,
    telegram: body.telegram ?? undefined,
    message: String(body.message),
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Создать `web/components/adopt/AdoptModal.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdoptModal({ animalId, defaultPhone, defaultTelegram, triggerLabel = 'Хочу взять домой', accent = false }: { animalId: string; defaultPhone?: string; defaultTelegram?: string; triggerLabel?: string; accent?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [telegram, setTelegram] = useState(defaultTelegram ?? '');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit() {
    setState('sending');
    const res = await fetch('/api/inquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animalId, message, phone, telegram }),
    });
    if (res.status === 401) { router.push('/login'); return; }
    setState(res.ok ? 'done' : 'error');
  }

  if (!open) {
    const cls = accent
      ? 'rounded-xl bg-red-600 px-6 py-3 font-semibold text-white ring-2 ring-red-300 animate-pulse'
      : 'rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white';
    return <button onClick={() => setOpen(true)} className={cls}>{triggerLabel}</button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-5">
        {state === 'done' ? (
          <div>
            <h2 className="mb-2 text-lg font-bold">Заявка отправлена</h2>
            <p className="text-gray-600">Владелец свяжется с вами. Заявка видна в разделе «Мои заявки».</p>
            <button onClick={() => setOpen(false)} className="mt-4 rounded-lg border px-4 py-2">Закрыть</button>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-bold">Заявка на усыновление</h2>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Коротко о себе и почему хотите взять" rows={4} className="w-full rounded-lg border px-2 py-1" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон" className="w-full rounded-lg border px-2 py-1" />
            <input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="Telegram" className="w-full rounded-lg border px-2 py-1" />
            {state === 'error' && <p className="text-sm text-red-600">Не удалось отправить. Попробуйте позже.</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2">Отмена</button>
              <button onClick={submit} disabled={state === 'sending' || message.trim().length < 1} className="rounded-lg bg-blue-600 px-4 py-2 text-white">{state === 'sending' ? 'Отправка…' : 'Отправить'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Заменить заглушку + добавить CTA в ветке службы отлова (Plan 2 Task 12)**

В `web/app/(public)/animals/[city]/[species]/[slug]/page.tsx` добавить импорт:

```tsx
import { AdoptModal } from '@/components/adopt/AdoptModal';
```

**Замена 3a — кнопка-заглушка `else`-ветки (обычное животное).** Заменить:

```tsx
        ) : (
          <button className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Хочу взять домой</button>
        )}
```

на:

```tsx
        ) : (
          <AdoptModal animalId={String(animal.id)} />
        )}
```

**Замена 3b — ветка intake-facility (КРИТИЧНО, §17): сейчас `IntakeFacilityBlock` НЕ имеет кнопки подачи заявки, поэтому самые срочные животные остаются без CTA.** Добавить `AdoptModal` рядом с блоком службы отлова. Заменить:

```tsx
        {facility ? (
          <IntakeFacilityBlock facility={facility} deadline={animal.legalDeadlineDate as any} />
        ) : (
```

на:

```tsx
        {facility ? (
          <div className="space-y-3">
            <IntakeFacilityBlock facility={facility} deadline={animal.legalDeadlineDate as any} />
            <AdoptModal
              animalId={String(animal.id)}
              triggerLabel="Забрать из службы отлова"
              accent={animal.urgencyLevel === 'critical'}
            />
          </div>
        ) : (
```

> Кнопка «Забрать из службы отлова» открывает тот же `AdoptModal` (заявка adoption через `/api/inquiries`). При `urgencyLevel === 'critical'` (≤3 дня до дедлайна, §17) — `accent` делает её красной с пульсацией. Так закрывается дыра: животные из муниципальных служб отлова получают рабочий CTA на пристройство, а не только телефон службы.

- [ ] **Step 4: e2e тест заявки**

`web/tests/e2e/adoption-inquiry.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('inquiry API requires auth', async ({ request }) => {
  const r = await request.post('/api/inquiries', { data: { animalId: '1', message: 'hi' } });
  expect(r.status()).toBe(401);
});

test('adopt button opens modal on animal page', async ({ page }) => {
  await page.goto('/animals?species=cat'); // Мурка — не из службы отлова
  await page.getByText('Мурка №', { exact: false }).first().click();
  await page.getByRole('button', { name: 'Хочу взять домой' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Заявка на усыновление' })).toBeVisible();
});

test('intake-facility animal exposes adoption CTA (ФИКС 1)', async ({ page }) => {
  await page.goto('/animals?urgent=1'); // «Безымянный» — из службы отлова (seed Plan 2)
  await page.getByText(/Осталось \d+ дн\./).first().click();
  await expect(page.getByText('В службе отлова')).toBeVisible();
  // ключевое: у intake-животного есть рабочая кнопка заявки, открывающая модалку
  await page.getByRole('button', { name: 'Забрать из службы отлова' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Заявка на усыновление' })).toBeVisible();
});
```

- [ ] **Step 5: Запустить e2e**

Run: `cd web && npx playwright test adoption-inquiry`
Expected: PASS — 3 passed (анонимный POST → 401; модалка обычного животного открывается; intake-животное «Забрать из службы отлова» открывает модалку — ФИКС 1).

- [ ] **Step 6: Commit**

```bash
git add web/app/api/inquiries web/components/adopt/AdoptModal.tsx web/app/\(public\)/animals/\[city\] web/tests/e2e/adoption-inquiry.spec.ts
git commit -m "Plan 3 Task 17: adoption-заявка — API /api/inquiries + AdoptModal (обычная + ветка службы отлова)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: e2e полного flow размещения (с авторизованным контекстом)

Проверяет сквозной сценарий §7.1: вход → wizard → объявление в `pending_review` → видно в «Мои животные».

**Files:**
- Create: `web/tests/e2e/animal-submit.spec.ts`
- Modify: `web/scripts/seed.ts` (тестовый citizen-пользователь для e2e)

- [ ] **Step 1: Добавить тестового пользователя в seed**

В `web/scripts/seed.ts` добавить функцию и вызвать её в `seed()` (только вне production):

```ts
async function seedTestUser(payload: any) {
  if (process.env.NODE_ENV === 'production') return;
  const email = 'citizen@test.local';
  const exists = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true });
  if (exists.docs.length) return;
  await payload.create({
    collection: 'users',
    data: { email, password: 'Test12345!', role: 'citizen', firstName: 'Тест', ageConfirmed: true, consentPersonalData: true, _verified: true } as any,
    overrideAccess: true,
  });
}

// org_admin + организация с детерминированным slug — для e2e проверки guard'а кабинета (ФИКС 6).
async function seedTestOrgAdmin(payload: any) {
  if (process.env.NODE_ENV === 'production') return;
  const email = 'orgadmin@test.local';
  let user = (await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })).docs[0];
  if (!user) {
    user = await payload.create({
      collection: 'users',
      data: { email, password: 'Test12345!', role: 'org_admin', firstName: 'Орг', ageConfirmed: true, consentPersonalData: true, _verified: true } as any,
      overrideAccess: true,
    });
  }
  // Организация с явным slug 'test-shelter' и этим пользователем в admins (overrideAccess обходит field-level access на slug).
  const existsOrg = await payload.find({ collection: 'organizations', where: { slug: { equals: 'test-shelter' } }, limit: 1, overrideAccess: true });
  if (!existsOrg.docs.length) {
    await payload.create({
      collection: 'organizations',
      data: { name: 'Тест-приют', slug: 'test-shelter', isVerified: true, isPublished: true, admins: [user.id] } as any,
      overrideAccess: true,
    });
  }
}
```

Вызвать в `seed()`: `await seedTestUser(payload);` и `await seedTestOrgAdmin(payload);`

- [ ] **Step 2: Playwright storageState — авторизация перед тестом**

`web/tests/e2e/animal-submit.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

// Логинимся через UI один раз внутри теста (storageState fixture можно вынести в playwright.config позже).
async function login(page: any) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('citizen@test.local');
  await page.getByLabel('Пароль').fill('Test12345!');
  await page.getByRole('button', { name: /Войти/ }).click();
  await expect(page).toHaveURL(/\/me|\/$/);
}

test('citizen submits an animal via wizard', async ({ page }) => {
  await login(page);
  await page.goto('/me/animals/new');

  // шаг 1 — фото
  await page.setInputFiles('input[type="file"]', 'tests/fixtures/dog.jpg');
  await expect(page.locator('img[alt=""]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Далее' }).click();

  // шаг 2 — вид/город
  await page.getByLabel('Собака').check();
  await page.getByRole('button', { name: 'Далее' }).click();

  // шаг 3 — описание/контакт
  await page.getByLabel('Описание *').fill('Дружелюбный пёс ищет дом, ладит с детьми.');
  await page.locator('select').filter({ hasText: 'Выберите город' }).selectOption({ label: 'Минск' });
  await page.getByPlaceholder('+375XXXXXXXXX').fill('+375291112233');
  await page.getByRole('button', { name: 'Далее' }).click();

  // шаг 4 — отправка
  await page.getByRole('button', { name: 'Отправить на проверку' }).click();
  await expect(page).toHaveURL(/\/me\/animals/);

  // объявление видно в статусе «На проверке»
  await expect(page.getByText('На проверке').first()).toBeVisible();
});
```

> Требуется фикстура `web/tests/fixtures/dog.jpg` (любое тестовое фото) и работающий R2/локальный fallback из Plan 1 Task 7. Селекторы (`getByLabel`) опираются на форму логина из Plan 1 Task 13 — при расхождении подписи полей поправить.

- [ ] **Step 2b: e2e — org_admin реально открывает кабинет организации (ФИКС 6: populate reverse-join на req.user)**

Доказывает, что `req.user.organizations` (reverse join из Plan 2 Task 4) заполняется при auth, и `requireOrgAdmin` пропускает org_admin'а (а не редиректит на `/`). Если бы join не populate-ился — был бы редирект.

Добавить в `web/tests/e2e/animal-submit.spec.ts`:

```ts
async function loginAs(page: any, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill('Test12345!');
  await page.getByRole('button', { name: /Войти/ }).click();
  await expect(page).toHaveURL(/\/me|\/$/);
}

test('org_admin opens org cabinet (req.user.organizations populated, no redirect)', async ({ page }) => {
  await loginAs(page, 'orgadmin@test.local');
  const res = await page.goto('/org/test-shelter');
  expect(res?.status()).toBe(200);
  // requireOrgAdmin не редиректнул на '/'
  await expect(page).toHaveURL(/\/org\/test-shelter\/?$/);
  await expect(page.getByRole('heading', { name: 'Тест-приют' })).toBeVisible();
});
```

> Если этот тест падает редиректом на `/` при HTTP 200 на `/` вместо `/org/test-shelter` — значит Payload не populate-ит reverse-join `organizations` на `req.user` в access-контексте; тогда в `getCurrentUser` (Task 2) задать `depth: 1` в `payload.auth` или догрузить организации пользователя вручную перед `canManageOrganization`.

- [ ] **Step 3: Запустить полный flow**

Предусловие: миграции применены, `npm run seed` выполнен (создаёт citizen- и org_admin-тест-юзеров, org `test-shelter` и демо-данные), dev-сервер запущен.
Run: `cd web && npx playwright test animal-submit`
Expected: PASS — 2 passed (1: объявление создано, видно в «Мои животные» как «На проверке»; 2: org_admin открывает `/org/test-shelter` с HTTP 200, без редиректа — req.user.organizations заполнен).

- [ ] **Step 4: Commit**

```bash
git add web/tests/e2e/animal-submit.spec.ts web/scripts/seed.ts
git commit -m "Plan 3 Task 18: e2e flow размещения + e2e guard кабинета org_admin (req.user.organizations) + тест-юзеры в seed

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

### Spec coverage check

| Требование spec | Задача |
|---|---|
| §6 AdoptionInquiry (animal/applicant/message/contacts/status) | Task 1 |
| §7.1 wizard размещения (4 шага: фото / вид-пол-возраст-размер-имя / город-описание-здоровье / контакт) | Task 9 (AnimalWizard) + Task 10 (страница) |
| §7.1 фото 1-6, авто-resize до 1600px, upload в R2 | Task 6 (resize) + Task 9 (PhotoUpload) + Task 7 (uploadPhoto → Media) |
| §7.1 submit → `pending_review` + toast | Task 7 (createAnimal status=pending_review) + Task 9 (redirect ?created=1) |
| §7.1 email пользователю + TG-уведомление модератору | Task 3/4 (notify) + Task 7 (notifyNewAnimal) |
| §7.1 модератор апрувит в Payload → published → email пользователю | Task 8 (afterChange, ветка published) |
| §16.7 объявление отклонено (pending_review → archived) → email владельцу | Task 8 (afterChange, ветка rejected) + Task 4 (`animal-rejected.tsx`) |
| §7.2 заявка adoption (modal, предзаполнение, status=new, email+TG владельцу) | Task 17 |
| §17 CTA «Забрать из службы отлова» на карточке intake-животного (акцент при critical) | Task 17 (AdoptModal в ветке `IntakeFacilityBlock`) |
| §7.2 «Заявка отправлена» заявителю | Task 17 (AdoptModal done + inquiry-confirmation email) |
| §5 `/me`, `/me/animals`, `/me/animals/new`, `/me/animals/[id]/edit`, `/me/inquiries` | Task 10, 11, 12 |
| §5 `/org/[slug]`, `/animals`, `/inquiries`, `/settings` | Task 13, 14, 15, 16 |
| §17.7 модель А: сотрудник службы (org_admin) грузит животных с `intakeFacility` | Task 14 (выбор facility в wizard) |
| Кнопка «Закрыть объявление» для citizen-владельца (§16.7) | Task 11 (MyAnimalRow → deleteAnimal=archived) |
| Account-guard'ы (требуют логин / org-доступ) | Task 2 + Task 10/13 (layouts) |

**Намеренно вне scope (зафиксировано в шапке):** донаты/ЕРИП и `/me/donations`, `/org/[slug]/donations`; cron `urgency_recalc_daily` + авто-алерты §17.6 (Plan 4); CrueltyReport-форма §7.5; внутренний чат (фаза 2). Юр.статья `municipal-intake-rights` (ссылка из Plan 2 Task 14) создаётся в плане блога/legal.

### Type consistency

- `AnimalDraft`/`validateAnimalDraft` (`lib/animal-form.ts`) — единый источник для `AnimalWizard`, `AnimalFormFields`, `AnimalEditForm`, `createAnimal`.
- `CreateAnimalInput extends AnimalDraft` (`actions/animal.ts`) добавляет `mediaIds`/`organizationId`/`intakeFacilityId` — потребляется `AnimalWizard.submit`.
- `getCurrentUser`/`requireUser`/`requireOrgAdmin` (`lib/auth/current-user.ts`) используются во всех `(account)`-страницах и server actions; `requireOrgAdmin` опирается на `canManageOrganization` из Plan 1.
- Collection slugs согласованы: `adoption-inquiries` (Task 1) фигурирует одинаково в actions, страницах, API. `animals`/`organizations`/`intakeFacilities` — как в Plan 2; `users` — как в Plan 1.
- `notifyNewAnimal`/`notifyAnimalPublished`/`notifyNewInquiry` (`lib/notify/dispatch.ts`) — единые точки уведомлений; вызываются из `createAnimal` (Task 7), `afterChange` (Task 8), `/api/inquiries` (Task 17).
- `successRedirect` в `AnimalWizard` (исправлено): citizen → `/me/animals`, org → `/org/[slug]/animals` (по slug, не по id).

### Placeholder scan

Все шаги содержат рабочий код или команды. Условные «заглушки» намеренные и помечены: фикстура `tests/fixtures/dog.jpg` для e2e (Task 18) — добавляется исполнителем; селекторы формы логина в Task 18 зависят от Plan 1 Task 13. Donations-вкладки в навигации кабинетов не выводятся (вне scope).

### Известные допущения для исполнителя

- Next.js 14: `headers()`/`searchParams`/`params` синхронные. На Next 15 — обернуть в `await`, убрать `as any` в `current-user.ts`.
- Видимость заявок владельцу/организации — через серверные запросы с `overrideAccess: true` (citizen: фильтр `applicant`/`ownerUser`; org: двухшаговый запрос через id животных организации), а не через collection-level `read`. Проверка прав делается в server action `updateInquiryStatus` и на guard'ах страниц.
- `payload.create({ collection: 'media', file: { data, mimetype, name, size } })` — формат Local API upload Payload 3; при иной сигнатуре свериться с версией. `uploadPhoto` валидирует MIME (`image/jpeg|png|webp`) и размер (≤8 МБ) до создания Media; rate-limit/Turnstile — Plan 4.
- Поле `_verified: true` в seed тест-юзеров (Task 18) — обход email-верификации Payload auth для теста; в production функции не выполняются.
- Заявки организации (Task 13/15) считаются **двухшаговым запросом**: (1) `animals.find({ where: { organization: { equals: orgId } } })` → массив id, (2) `adoption-inquiries.find({ where: { animal: { in: ids } } })`. Это основной путь (надёжно на любом adapter'е). Фолбэк-ремарка: dot-path `where: { 'animal.organization': { equals } }` работает только если Postgres-adapter поддерживает query по вложенной связи — не использовать как основной.
- `updateAnimal` (Task 7) для org-животного догружает существующую запись и подмешивает `organization` (id) в `data` — иначе `Animal.access.update` (Plan 2) уходит в `ownerUser`-фильтр и отклоняет апдейт org_admin'ом. Касается и `/me/animals/[id]/edit` (Task 11), и `/org/[slug]/animals/[id]/edit` (Task 14) — оба через общий action.
- `requireOrgAdmin` зависит от reverse-join `Users.organizations` (Plan 2 Task 4), который Payload populate-ит на `req.user` при auth. Если populate не происходит в access-контексте — e2e Task 18 Step 2b упадёт редиректом; чинить в `getCurrentUser` (`depth: 1` в `payload.auth` либо ручная догрузка организаций пользователя).

---

## Execution Handoff

План сохранён в `docs/superpowers/plans/2026-05-28-plan-3-submission-org.md`. Два варианта исполнения:

1. **Subagent-Driven (рекомендую)** — свежий subagent на каждую из 18 задач, две стадии review. Tasks 1-9 (модель, инфра, формы) — фундамент; 10-18 (страницы кабинетов + adoption flow) зависят от него и от Plan 2 (каталог/коллекции) + Plan 1 (auth/email). **REQUIRED SUB-SKILL:** `superpowers:subagent-driven-development`.

2. **Inline Execution** — выполнение в этой же сессии через `superpowers:executing-plans`, batch с checkpoint'ами. **REQUIRED SUB-SKILL:** `superpowers:executing-plans`.

**Порядок исполнения планов:** Plan 1 (Foundation) → Plan 2 (Catalog core) → **Plan 3 (Submission & Org cabinet)**. Plan 3 опирается на коллекции и lib обоих предыдущих.

Какой подход?
