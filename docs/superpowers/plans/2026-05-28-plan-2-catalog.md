# Plan 2: Catalog Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Построить публичный каталог животных, организаций и муниципальных служб отлова с критической вертикалью «обратный отсчёт до эвтаназии», полнотекстовым поиском и SEO. Наполнение — через Payload-админку и seed; self-service формы (citizen wizard, кабинет org_admin) — отдельный Plan 3.

**Architecture:** Поверх фундамента Plan 1 (Next.js 14 App Router + Payload CMS 3 + Postgres + Cloudflare R2 + готовые коллекции Users/Cities/Media и `lib/auth/rbac`) добавляются три связанные коллекции — Organization, IntakeFacility, Animal. Публичные страницы — SSR через Payload Local API. Критическая вертикаль отлова реализована через `Animal.intakeFacility` + `legalDeadlineDate` + `urgencyLevel` (поле денормализовано для сортировки/фильтра; live-countdown в UI считается из `legalDeadlineDate`; ежедневный пересчёт cron'ом — в Plan 4). Many-to-many «организация ↔ админы» делается штатным Payload relationship + join-field, поэтому синхронная `canManageOrganization` из Plan 1 работает без изменений. Поиск — Postgres full-text (`tsvector` generated column + GIN). SEO — JSON-LD, split-sitemap, canonical URLs.

**Tech Stack:** Next.js 14 (App Router, RSC), Payload CMS 3 (Postgres adapter, drizzle), TypeScript, Tailwind + shadcn/ui, Cloudflare R2, Vitest (unit), Playwright (e2e).

**Что уже готово из Plan 1 (не переделывать):**
- `web/collections/Users.ts` (5 ролей), `web/collections/Cities.ts`, `web/collections/Media.ts`, `web/collections/AuditLogs.ts`, `web/collections/NotificationPreferences.ts`
- `web/lib/auth/rbac.ts` — `isAdmin`, `canModerateContent`, `canManageOrganization(user, orgId)` (читает `user.organizations`)
- `web/lib/seeds/cities-by.ts` + `web/scripts/seed.ts`
- `web/lib/storage/r2-adapter.ts`, `web/payload.config.ts`, `web/payload-types.ts`
- Vitest + Playwright сконфигурированы; алиас `@/` = `web/`

---

## File Structure (Plan 2)

```
web/
  ├── collections/
  │   ├── Organizations.ts          # NEW
  │   ├── IntakeFacilities.ts       # NEW
  │   ├── Animals.ts                # NEW
  │   ├── Users.ts                  # MODIFY: + join-field organizations
  │   └── Cities.ts                 # MODIFY: + slug
  ├── lib/
  │   ├── slug.ts                   # NEW: slugify, slugifyRu, uniqueSlug
  │   ├── pet-number.ts             # NEW: nextPetNumber (Postgres sequence)
  │   ├── urgency.ts                # NEW: computeDeadline, computeUrgency, daysUntil
  │   ├── lexical-plain.ts          # NEW: extractPlainText (richText → text)
  │   ├── animal-hooks.ts           # NEW: makeAnimalBeforeChangeHook (DI, pure-testable)
  │   ├── search.ts                 # NEW: normalizeQuery + searchAnimalIds
  │   ├── filters.ts                # NEW: parseAnimalFilters, buildAnimalWhere, sortForFilters
  │   ├── animal-url.ts             # NEW: animalUrl, parseAnimalPath
  │   ├── jsonld.ts                 # NEW: buildAnimalJsonLd, buildOrganizationJsonLd
  │   ├── meta.ts                   # NEW: buildAnimalMeta, buildOrgMeta
  │   ├── sitemap-data.ts           # NEW: чанкование URL для split-sitemap
  │   └── seeds/
  │       ├── intake-facilities-by.ts   # NEW: 6-10 служб отлова РБ
  │       └── demo-catalog.ts           # NEW: демо Organization + Animal для dev
  ├── migrations/
  │   ├── <ts>_pet_number_sequence.ts   # NEW: CREATE SEQUENCE
  │   └── <ts>_animal_fts.ts            # NEW: description_plain + search_vector + GIN
  ├── scripts/
  │   ├── seed.ts                   # MODIFY: + города slug, + intake facilities, + демо
  │   └── migrate-pet-counter.ts    # NEW: one-shot перенос pet_counter.txt → sequence
  ├── app/
  │   ├── (public)/
  │   │   ├── animals/
  │   │   │   ├── page.tsx                          # NEW: каталог
  │   │   │   ├── urgent/page.tsx                   # NEW: только срочные
  │   │   │   └── [city]/[species]/[slug]/page.tsx  # NEW: карточка
  │   │   ├── organizations/
  │   │   │   ├── page.tsx                          # NEW
  │   │   │   └── [slug]/page.tsx                   # NEW
  │   │   └── intake-facilities/
  │   │       ├── page.tsx                          # NEW
  │   │       └── [slug]/page.tsx                   # NEW
  │   ├── sitemap.ts                # NEW: generateSitemaps (split)
  │   └── robots.ts                 # NEW
  ├── components/
  │   ├── catalog/
  │   │   ├── AnimalCard.tsx        # NEW
  │   │   ├── AnimalGrid.tsx        # NEW
  │   │   ├── Pagination.tsx        # NEW
  │   │   ├── FilterPanel.tsx       # NEW (client, URL-sync)
  │   │   ├── SortSelect.tsx        # NEW (client)
  │   │   ├── UrgencyBadge.tsx      # NEW (client countdown)
  │   │   ├── PhotoCarousel.tsx     # NEW (client)
  │   │   └── IntakeFacilityBlock.tsx   # NEW
  │   ├── org/OrganizationCard.tsx  # NEW
  │   └── JsonLd.tsx                # NEW
  └── tests/
      ├── unit/
      │   ├── slug.test.ts
      │   ├── pet-number.test.ts
      │   ├── urgency.test.ts
      │   ├── lexical-plain.test.ts
      │   ├── animal-hooks.test.ts
      │   ├── search.test.ts
      │   ├── filters.test.ts
      │   ├── animal-url.test.ts
      │   ├── jsonld.test.ts
      │   ├── meta.test.ts
      │   ├── sitemap-data.test.ts
      │   └── seeds/intake-facilities-by.test.ts
      └── e2e/
          ├── catalog.spec.ts
          ├── animal-detail.spec.ts
          ├── filters.spec.ts
          ├── organizations.spec.ts
          ├── intake-facilities.spec.ts
          └── urgent.spec.ts
```

---

## Tasks

### Task 1: `lib/slug.ts` — slugify + транслитерация + uniqueness

**Files:**
- Create: `web/lib/slug.ts`
- Test: `web/tests/unit/slug.test.ts`

- [ ] **Step 1: Написать failing тест**

`web/tests/unit/slug.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { slugify, slugifyRu, uniqueSlug } from '@/lib/slug';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('strips punctuation', () => {
    expect(slugify('Rex!! (the) dog?')).toBe('rex-the-dog');
  });
  it('collapses multiple separators', () => {
    expect(slugify('a   --  b')).toBe('a-b');
  });
  it('trims leading/trailing dashes', () => {
    expect(slugify('  -hi-  ')).toBe('hi');
  });
  it('truncates to maxLength on a word boundary', () => {
    expect(slugify('one two three four five', { maxLength: 7 })).toBe('one-two');
  });
});

describe('slugifyRu', () => {
  it('transliterates Cyrillic to latin', () => {
    expect(slugifyRu('Минск')).toBe('minsk');
    expect(slugifyRu('Рекс пёс')).toBe('reks-pyos');
    expect(slugifyRu('Щучин')).toBe('shchuchin');
  });
  it('keeps latin and digits intact', () => {
    expect(slugifyRu('Кот Barsik 7')).toBe('kot-barsik-7');
  });
  it('falls back to empty string for only-symbols', () => {
    expect(slugifyRu('!!!')).toBe('');
  });
});

describe('uniqueSlug', () => {
  it('returns base when free', async () => {
    const taken = new Set<string>();
    expect(await uniqueSlug('rex', async (s) => taken.has(s))).toBe('rex');
  });
  it('appends -2, -3 on collisions', async () => {
    const taken = new Set(['rex', 'rex-2']);
    expect(await uniqueSlug('rex', async (s) => taken.has(s))).toBe('rex-3');
  });
});
```

- [ ] **Step 2: Запустить — failing**

Run: `cd web && npm test -- slug`
Expected: FAIL — `Cannot find module '@/lib/slug'`.

- [ ] **Step 3: Реализовать `web/lib/slug.ts`**

```ts
const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  і: 'i', ў: 'u', // белорусские
};

export interface SlugifyOptions {
  maxLength?: number;
}

export function slugify(input: string, opts: SlugifyOptions = {}): string {
  let s = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // диакритика
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (opts.maxLength && s.length > opts.maxLength) {
    s = s.slice(0, opts.maxLength);
    const lastDash = s.lastIndexOf('-');
    if (lastDash > 0) s = s.slice(0, lastDash);
    s = s.replace(/-+$/g, '');
  }
  return s;
}

export function slugifyRu(input: string, opts: SlugifyOptions = {}): string {
  const transliterated = Array.from(input.toLowerCase())
    .map((ch) => (ch in CYRILLIC_MAP ? CYRILLIC_MAP[ch] : ch))
    .join('');
  return slugify(transliterated, opts);
}

/**
 * Подбирает свободный slug. existsFn возвращает true, если slug занят.
 */
export async function uniqueSlug(
  base: string,
  existsFn: (candidate: string) => Promise<boolean>,
): Promise<string> {
  if (!(await existsFn(base))) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!(await existsFn(candidate))) return candidate;
  }
  throw new Error(`uniqueSlug: exhausted suffixes for "${base}"`);
}
```

- [ ] **Step 4: Запустить — pass**

Run: `cd web && npm test -- slug`
Expected: PASS — 11 passed.

- [ ] **Step 5: Commit**

```bash
git add web/lib/slug.ts web/tests/unit/slug.test.ts
git commit -m "Plan 2 Task 1: lib/slug — slugify + транслитерация кириллицы + uniqueSlug

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `lib/pet-number.ts` + Postgres sequence + миграция счётчика

Сквозная нумерация `№N` переносится из старого `pet_counter.txt` (файл Pet BOT) в атомарный Postgres sequence. `nextPetNumber` вызывается в `beforeChange`-хуке Animal при создании.

**Files:**
- Create: `web/lib/pet-number.ts`
- Create: `web/migrations/<timestamp>_pet_number_sequence.ts`
- Create: `web/scripts/migrate-pet-counter.ts`
- Test: `web/tests/unit/pet-number.test.ts`

- [ ] **Step 1: Написать failing тест**

`web/tests/unit/pet-number.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { nextPetNumber } from '@/lib/pet-number';

describe('nextPetNumber', () => {
  it('returns the integer from nextval()', async () => {
    const payload = {
      db: { drizzle: { execute: vi.fn().mockResolvedValue({ rows: [{ nextval: '42' }] }) } },
    } as any;
    const n = await nextPetNumber(payload);
    expect(n).toBe(42);
    expect(payload.db.drizzle.execute).toHaveBeenCalledOnce();
  });

  it('throws if sequence returns no rows', async () => {
    const payload = {
      db: { drizzle: { execute: vi.fn().mockResolvedValue({ rows: [] }) } },
    } as any;
    await expect(nextPetNumber(payload)).rejects.toThrow(/pet_number_seq/);
  });
});
```

- [ ] **Step 2: Запустить — failing**

Run: `cd web && npm test -- pet-number`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `web/lib/pet-number.ts`**

```ts
import type { Payload } from 'payload';
import { sql } from 'drizzle-orm';

/**
 * Атомарно выдаёт следующий номер питомца из Postgres sequence.
 * Sequence создаётся миграцией <ts>_pet_number_sequence.
 */
export async function nextPetNumber(payload: Payload): Promise<number> {
  const result: any = await (payload.db as any).drizzle.execute(
    sql`SELECT nextval('pet_number_seq')`,
  );
  const row = result?.rows?.[0];
  const value = row?.nextval ?? row?.['nextval'];
  if (value === undefined || value === null) {
    throw new Error("nextPetNumber: pet_number_seq returned no value");
  }
  return Number(value);
}
```

- [ ] **Step 4: Запустить — pass**

Run: `cd web && npm test -- pet-number`
Expected: PASS — 2 passed.

- [ ] **Step 5: Создать миграцию sequence**

Run: `cd web && npx payload migrate:create pet_number_sequence`
Затем заменить содержимое сгенерированного `web/migrations/<timestamp>_pet_number_sequence.ts` на:

```ts
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS pet_number_seq START WITH 1 INCREMENT BY 1`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP SEQUENCE IF EXISTS pet_number_seq`);
}
```

- [ ] **Step 6: Создать one-shot скрипт переноса счётчика**

`web/scripts/migrate-pet-counter.ts`:

```ts
import { getPayload } from 'payload';
import { sql } from 'drizzle-orm';
import { readFileSync, existsSync } from 'node:fs';
import config from '../payload.config';

/**
 * Переносит значение из старого pet_counter.txt в pet_number_seq.
 * Запуск один раз: npx tsx scripts/migrate-pet-counter.ts ../pet_counter.txt
 */
async function main() {
  const path = process.argv[2] ?? '../pet_counter.txt';
  let start = 1;
  if (existsSync(path)) {
    const raw = readFileSync(path, 'utf-8').trim();
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) start = parsed;
  }
  const payload = await getPayload({ config });
  await (payload.db as any).drizzle.execute(
    sql`SELECT setval('pet_number_seq', ${start}, false)`,
  );
  console.log(`pet_number_seq set to start at ${start}`);
  process.exit(0);
}

main();
```

`setval(seq, start, false)` означает «следующий `nextval` вернёт `start`».

- [ ] **Step 7: Применить миграцию**

Run: `cd web && npx payload migrate`
Expected: миграция `pet_number_sequence` применена без ошибок.

- [ ] **Step 8: Commit**

```bash
git add web/lib/pet-number.ts web/tests/unit/pet-number.test.ts web/migrations web/scripts/migrate-pet-counter.ts
git commit -m "Plan 2 Task 2: pet_number Postgres sequence + nextPetNumber + перенос pet_counter.txt

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `lib/urgency.ts` — расчёт дедлайна и уровня срочности

Критическая вертикаль §17. `computeDeadline` = `intakeDate + holdDays`. `computeUrgency`: `critical` если ≤3 дня, `high` если ≤7, иначе `normal`. Используется и в хуке Animal (запись поля), и в UI (live countdown).

**Files:**
- Create: `web/lib/urgency.ts`
- Test: `web/tests/unit/urgency.test.ts`

- [ ] **Step 1: Написать failing тест**

`web/tests/unit/urgency.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeDeadline, daysUntil, computeUrgency } from '@/lib/urgency';

const NOW = new Date('2026-05-28T12:00:00Z');

describe('computeDeadline', () => {
  it('adds holdDays to intake date', () => {
    const d = computeDeadline(new Date('2026-05-28T00:00:00Z'), 5);
    expect(d.toISOString()).toBe('2026-06-02T00:00:00.000Z');
  });
});

describe('daysUntil', () => {
  it('counts whole days remaining, rounding up', () => {
    expect(daysUntil(new Date('2026-05-31T12:00:00Z'), NOW)).toBe(3);
  });
  it('returns 0 on the deadline day', () => {
    expect(daysUntil(new Date('2026-05-28T20:00:00Z'), NOW)).toBe(1);
    expect(daysUntil(new Date('2026-05-28T00:00:00Z'), NOW)).toBe(0);
  });
  it('returns negative when past', () => {
    expect(daysUntil(new Date('2026-05-26T12:00:00Z'), NOW)).toBe(-2);
  });
});

describe('computeUrgency', () => {
  it('returns normal when no deadline', () => {
    expect(computeUrgency(null, NOW)).toBe('normal');
  });
  it('returns critical when <= 3 days', () => {
    expect(computeUrgency(new Date('2026-05-31T12:00:00Z'), NOW)).toBe('critical');
  });
  it('returns high when <= 7 days', () => {
    expect(computeUrgency(new Date('2026-06-04T12:00:00Z'), NOW)).toBe('high');
  });
  it('returns normal when > 7 days', () => {
    expect(computeUrgency(new Date('2026-06-20T12:00:00Z'), NOW)).toBe('normal');
  });
  it('returns critical even when overdue (still at risk)', () => {
    expect(computeUrgency(new Date('2026-05-27T12:00:00Z'), NOW)).toBe('critical');
  });
});
```

- [ ] **Step 2: Запустить — failing**

Run: `cd web && npm test -- urgency`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `web/lib/urgency.ts`**

```ts
export type UrgencyLevel = 'normal' | 'high' | 'critical';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeDeadline(intakeDate: Date, holdDays: number): Date {
  return new Date(intakeDate.getTime() + holdDays * MS_PER_DAY);
}

/** Полных дней до дедлайна от now, с округлением вверх. Отрицательно если просрочено. */
export function daysUntil(deadline: Date, now: Date): number {
  return Math.ceil((deadline.getTime() - now.getTime()) / MS_PER_DAY);
}

export function computeUrgency(deadline: Date | null, now: Date): UrgencyLevel {
  if (!deadline) return 'normal';
  const days = daysUntil(deadline, now);
  if (days <= 3) return 'critical';
  if (days <= 7) return 'high';
  return 'normal';
}

/** Числовой ранг для сортировки каталога: critical сверху. */
export const URGENCY_RANK: Record<UrgencyLevel, number> = { normal: 0, high: 1, critical: 2 };
```

- [ ] **Step 4: Запустить — pass**

Run: `cd web && npm test -- urgency`
Expected: PASS — 10 passed.

- [ ] **Step 5: Commit**

```bash
git add web/lib/urgency.ts web/tests/unit/urgency.test.ts
git commit -m "Plan 2 Task 3: lib/urgency — дедлайн + уровень срочности (критическая вертикаль §17)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Organizations-коллекция + M2M «организация ↔ админы»

M2M делается штатным Payload relationship: `Organizations.admins` (hasMany → users) + reverse join-field `Users.organizations`. Тогда `req.user.organizations` заполняется автоматически, и `canManageOrganization` из Plan 1 работает без правок.

**Files:**
- Create: `web/collections/Organizations.ts`
- Modify: `web/collections/Users.ts` (добавить join-field)
- Modify: `web/payload.config.ts` (зарегистрировать коллекцию)
- Test: `web/tests/unit/slug.test.ts` уже покрывает slug; здесь — smoke в админке

- [ ] **Step 1: Создать `web/collections/Organizations.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin, canManageOrganization } from '@/lib/auth/rbac';
import { slugifyRu, uniqueSlug } from '@/lib/slug';

export const Organizations: CollectionConfig = {
  slug: 'organizations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'city', 'isVerified', 'isPublished', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user }, id }) =>
      isAdmin(user as any) || (id ? canManageOrganization(user as any, String(id)) : false),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'Генерируется из названия, если пусто' },
    },
    { name: 'unp', type: 'text', admin: { description: 'УНП организации' } },
    { name: 'description', type: 'richText' },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'coverPhoto', type: 'upload', relationTo: 'media' },
    { name: 'city', type: 'relationship', relationTo: 'cities', index: true },
    { name: 'address', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'tgUrl', type: 'text' },
    { name: 'viberUrl', type: 'text' },
    { name: 'vkUrl', type: 'text' },
    { name: 'instagramUrl', type: 'text' },
    { name: 'websiteUrl', type: 'text' },
    { name: 'donationBankDetails', type: 'richText' },
    { name: 'eripServiceCode', type: 'text' },
    { name: 'isVerified', type: 'checkbox', defaultValue: false, access: { update: ({ req: { user } }) => isAdmin(user as any) } },
    { name: 'isPublished', type: 'checkbox', defaultValue: false },
    {
      name: 'admins',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: { description: 'Пользователи-администраторы этой организации' },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data) return data;
        if (!data.slug && data.name) {
          const base = slugifyRu(data.name) || 'org';
          data.slug = await uniqueSlug(base, async (candidate) => {
            const existing = await req.payload.find({
              collection: 'organizations',
              where: { slug: { equals: candidate } },
              limit: 1,
              depth: 0,
            });
            const hit = existing.docs[0];
            return !!hit && (operation === 'create' || hit.id !== originalDoc?.id);
          });
        }
        return data;
      },
    ],
  },
};
```

- [ ] **Step 2: Добавить reverse join-field в `web/collections/Users.ts`**

В массив `fields` коллекции Users добавить (после `lastSeenAt`):

```ts
    {
      name: 'organizations',
      type: 'join',
      collection: 'organizations',
      on: 'admins',
      admin: { description: 'Организации, где пользователь — админ', readOnly: true },
    },
```

Это reverse-связь от `Organizations.admins`. Payload отдаёт её как массив организаций в `req.user.organizations`, что и ожидает `canManageOrganization`.

- [ ] **Step 3: Зарегистрировать коллекцию в `web/payload.config.ts`**

```ts
import { Organizations } from './collections/Organizations';
// ...
collections: [Users, Cities, Media, AuditLogs, NotificationPreferences, Organizations],
```

- [ ] **Step 4: Сгенерировать types**

Run: `cd web && npx payload generate:types`
Expected: в `web/payload-types.ts` появляется тип `Organization`, у `User` появляется поле `organizations`.

- [ ] **Step 5: Применить схему и smoke-проверка**

Run: `cd web && npm run dev`
Открыть `/admin/collections/organizations`, создать организацию без slug → убедиться, что slug сгенерировался из названия. Добавить себя в `admins`. Открыть свой `/admin/collections/users/<id>` → поле «Организации» показывает связь.

- [ ] **Step 6: Commit**

```bash
git add web/collections/Organizations.ts web/collections/Users.ts web/payload.config.ts web/payload-types.ts
git commit -m "Plan 2 Task 4: Organizations-коллекция + M2M админы через relationship/join

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: IntakeFacilities-коллекция (службы отлова, §17.3)

**Files:**
- Create: `web/collections/IntakeFacilities.ts`
- Modify: `web/payload.config.ts`
- Test: smoke в админке

- [ ] **Step 1: Создать `web/collections/IntakeFacilities.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';
import { slugifyRu, uniqueSlug } from '@/lib/slug';

export const IntakeFacilities: CollectionConfig = {
  slug: 'intakeFacilities',
  labels: { singular: 'Служба отлова', plural: 'Службы отлова' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'city', 'legalHoldDays', 'isMunicipal', 'isPublished'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    { name: 'city', type: 'relationship', relationTo: 'cities', index: true },
    { name: 'address', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'email' },
    {
      name: 'legalHoldDays',
      type: 'number',
      required: true,
      defaultValue: 5,
      min: 1,
      admin: { description: 'Дней содержания по закону до возможной эвтаназии (хранится в БД, правит модератор)' },
    },
    { name: 'description', type: 'richText' },
    { name: 'contactTgUrl', type: 'text' },
    { name: 'viberUrl', type: 'text' },
    {
      name: 'isMunicipal',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Муниципальная служба (а не частный приют)' },
    },
    { name: 'isPublished', type: 'checkbox', defaultValue: false },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data) return data;
        if (!data.slug && data.name) {
          const base = slugifyRu(data.name) || 'facility';
          data.slug = await uniqueSlug(base, async (candidate) => {
            const existing = await req.payload.find({
              collection: 'intakeFacilities',
              where: { slug: { equals: candidate } },
              limit: 1,
              depth: 0,
            });
            const hit = existing.docs[0];
            return !!hit && (operation === 'create' || hit.id !== originalDoc?.id);
          });
        }
        return data;
      },
    ],
  },
};
```

- [ ] **Step 2: Зарегистрировать в `web/payload.config.ts`**

```ts
import { IntakeFacilities } from './collections/IntakeFacilities';
// ...
collections: [Users, Cities, Media, AuditLogs, NotificationPreferences, Organizations, IntakeFacilities],
```

- [ ] **Step 3: Сгенерировать types**

Run: `cd web && npx payload generate:types`
Expected: появляется тип `IntakeFacility`.

- [ ] **Step 4: Smoke в админке**

Run: `cd web && npm run dev`
Создать тестовую службу без slug → slug сгенерировался; `legalHoldDays` по умолчанию 5.

- [ ] **Step 5: Commit**

```bash
git add web/collections/IntakeFacilities.ts web/payload.config.ts web/payload-types.ts
git commit -m "Plan 2 Task 5: IntakeFacilities-коллекция (муниципальные службы отлова, §17.3)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Animals-коллекция + beforeChange-хук (slug, pet_number, дедлайн, urgency)

Логика хука вынесена в чистую DI-функцию `makeAnimalBeforeChangeHook`, тестируется без БД. Хук при создании назначает `petNumber`, строит `slug = <petNumber>-<имя|вид>` (уникален, т.к. petNumber уникален), считает `legalDeadlineDate` и `urgencyLevel`.

**Files:**
- Create: `web/lib/animal-hooks.ts`
- Create: `web/collections/Animals.ts`
- Modify: `web/collections/Cities.ts` (добавить slug — нужен для URL карточки)
- Modify: `web/payload.config.ts`
- Test: `web/tests/unit/animal-hooks.test.ts`

- [ ] **Step 1: Написать failing тест хука**

`web/tests/unit/animal-hooks.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { makeAnimalBeforeChangeHook } from '@/lib/animal-hooks';

const NOW = new Date('2026-05-28T12:00:00Z');

function deps(overrides: Partial<Parameters<typeof makeAnimalBeforeChangeHook>[0]> = {}) {
  return {
    nextPetNumber: vi.fn().mockResolvedValue(123),
    getFacilityHoldDays: vi.fn().mockResolvedValue(5),
    now: () => NOW,
    ...overrides,
  };
}

describe('makeAnimalBeforeChangeHook', () => {
  it('assigns petNumber and slug on create', async () => {
    const hook = makeAnimalBeforeChangeHook(deps());
    const data = await hook({ operation: 'create', data: { name: 'Рекс', species: 'dog' } } as any);
    expect(data.petNumber).toBe(123);
    expect(data.slug).toBe('123-reks');
  });

  it('uses species when name is empty', async () => {
    const hook = makeAnimalBeforeChangeHook(deps());
    const data = await hook({ operation: 'create', data: { species: 'cat' } } as any);
    expect(data.slug).toBe('123-cat');
  });

  it('does not reassign petNumber on update', async () => {
    const d = deps();
    const hook = makeAnimalBeforeChangeHook(d);
    const data = await hook({
      operation: 'update',
      data: { name: 'Рекс', species: 'dog' },
      originalDoc: { petNumber: 7, slug: '7-reks' },
    } as any);
    expect(d.nextPetNumber).not.toHaveBeenCalled();
    expect(data.petNumber).toBe(7);
    expect(data.slug).toBe('7-reks');
  });

  it('computes deadline and critical urgency from intake facility', async () => {
    const hook = makeAnimalBeforeChangeHook(deps());
    const data = await hook({
      operation: 'create',
      data: { species: 'dog', intakeFacility: 'fac1', intakeDate: '2026-05-28T00:00:00Z' },
    } as any);
    expect(new Date(data.legalDeadlineDate).toISOString()).toBe('2026-06-02T00:00:00.000Z');
    expect(data.urgencyLevel).toBe('critical'); // 5 дней -> high? нет: дедлайн 02.06, сегодня 28.05 -> 5 дн -> high
  });

  it('respects manual legalDeadlineDate override', async () => {
    const d = deps();
    const hook = makeAnimalBeforeChangeHook(d);
    const data = await hook({
      operation: 'create',
      data: { species: 'dog', intakeFacility: 'fac1', intakeDate: '2026-05-28T00:00:00Z', legalDeadlineDate: '2026-05-30T00:00:00Z' },
    } as any);
    expect(d.getFacilityHoldDays).not.toHaveBeenCalled();
    expect(data.urgencyLevel).toBe('critical'); // 2 дня
    expect(data.urgencyRank).toBe(2);
  });

  it('sets normal urgency without facility', async () => {
    const hook = makeAnimalBeforeChangeHook(deps());
    const data = await hook({ operation: 'create', data: { species: 'cat' } } as any);
    expect(data.legalDeadlineDate ?? null).toBeNull();
    expect(data.urgencyLevel).toBe('normal');
    expect(data.urgencyRank).toBe(0);
  });
});
```

> Примечание: в 4-м тесте дедлайн 02.06 при `now=28.05` даёт `daysUntil = 5` → `high`. Исправляем ожидание ниже в реализации теста на `'high'` перед запуском (см. Step 2).

- [ ] **Step 2: Исправить ожидание в тесте**

В тесте «computes deadline and critical urgency» поменять последнюю строку на:

```ts
    expect(data.urgencyLevel).toBe('high'); // дедлайн 02.06, now 28.05 => 5 дней => high
```

И переименовать `it(...)` в `'computes deadline and high urgency from intake facility'`.

- [ ] **Step 3: Запустить — failing**

Run: `cd web && npm test -- animal-hooks`
Expected: FAIL — модуль не найден.

- [ ] **Step 4: Реализовать `web/lib/animal-hooks.ts`**

```ts
import { slugifyRu } from '@/lib/slug';
import { computeDeadline, computeUrgency, URGENCY_RANK } from '@/lib/urgency';

const SPECIES_FALLBACK: Record<string, string> = { dog: 'dog', cat: 'cat', other: 'animal' };

export interface AnimalHookDeps {
  nextPetNumber: () => Promise<number>;
  getFacilityHoldDays: (facilityId: string) => Promise<number>;
  now: () => Date;
}

/**
 * beforeChange-хук Animal: petNumber + slug при создании, дедлайн + urgency всегда.
 * Чистая логика с инъекцией зависимостей — тестируется без БД.
 */
export function makeAnimalBeforeChangeHook(deps: AnimalHookDeps) {
  return async ({ data, operation, originalDoc }: any) => {
    if (!data) return data;

    // petNumber + slug — только при создании, стабильны на update
    if (operation === 'create') {
      data.petNumber = await deps.nextPetNumber();
      const label = data.name ? slugifyRu(data.name) : SPECIES_FALLBACK[data.species] ?? 'animal';
      data.slug = `${data.petNumber}-${label || 'pet'}`;
    } else {
      if (originalDoc?.petNumber != null) data.petNumber = originalDoc.petNumber;
      if (originalDoc?.slug && !data.slug) data.slug = originalDoc.slug;
    }

    // дедлайн: вручную заданный имеет приоритет, иначе считаем из facility
    let deadline: Date | null = null;
    if (data.legalDeadlineDate) {
      deadline = new Date(data.legalDeadlineDate);
    } else if (data.intakeFacility && data.intakeDate) {
      const facilityId = typeof data.intakeFacility === 'object' ? data.intakeFacility.id : data.intakeFacility;
      const holdDays = await deps.getFacilityHoldDays(String(facilityId));
      deadline = computeDeadline(new Date(data.intakeDate), holdDays);
      data.legalDeadlineDate = deadline.toISOString();
    }

    const level = computeUrgency(deadline, deps.now());
    data.urgencyLevel = level;
    data.urgencyRank = URGENCY_RANK[level];
    return data;
  };
}
```

- [ ] **Step 5: Запустить — pass**

Run: `cd web && npm test -- animal-hooks`
Expected: PASS — 6 passed.

- [ ] **Step 6: Добавить slug в `web/collections/Cities.ts`**

В массив `fields` Cities добавить после `nameBe`:

```ts
    { name: 'slug', type: 'text', unique: true, index: true, admin: { position: 'sidebar' } },
```

(Backfill значений для существующих городов — в Task 8, seed.)

- [ ] **Step 7: Создать `web/collections/Animals.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin, canManageOrganization } from '@/lib/auth/rbac';
import { nextPetNumber } from '@/lib/pet-number';
import { makeAnimalBeforeChangeHook } from '@/lib/animal-hooks';

const beforeChangeCore = makeAnimalBeforeChangeHook({
  nextPetNumber: () => { throw new Error('replaced per-request'); },
  getFacilityHoldDays: async () => 5,
  now: () => new Date(),
});

export const Animals: CollectionConfig = {
  slug: 'animals',
  labels: { singular: 'Животное', plural: 'Животные' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['petNumber', 'name', 'species', 'status', 'urgencyLevel', 'city', 'updatedAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (isAdmin(user as any)) return true;
      return { status: { equals: 'published' } };
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user }, data }) => {
      if (isAdmin(user as any)) return true;
      if (!user) return false;
      const orgId = data?.organization ? String(data.organization) : null;
      if (orgId && canManageOrganization(user as any, orgId)) return true;
      return { ownerUser: { equals: user.id } };
    },
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'name', type: 'text', index: true, admin: { description: 'Кличка (может быть пустой)' } },
    { name: 'petNumber', type: 'number', unique: true, index: true, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'slug', type: 'text', unique: true, index: true, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'species', type: 'select', required: true, index: true, options: [
        { label: 'Собака', value: 'dog' },
        { label: 'Кошка', value: 'cat' },
        { label: 'Другое', value: 'other' },
      ],
    },
    {
      name: 'sex', type: 'select', defaultValue: 'unknown', options: [
        { label: 'Мальчик', value: 'male' },
        { label: 'Девочка', value: 'female' },
        { label: 'Неизвестно', value: 'unknown' },
      ],
    },
    { name: 'ageYears', type: 'number', min: 0, max: 40 },
    { name: 'ageMonths', type: 'number', min: 0, max: 11 },
    {
      name: 'size', type: 'select', options: [
        { label: 'Маленький', value: 'small' },
        { label: 'Средний', value: 'medium' },
        { label: 'Большой', value: 'large' },
      ],
    },
    { name: 'description', type: 'richText' },
    { name: 'descriptionPlain', type: 'textarea', admin: { hidden: true } }, // заполняется хуком (Task 7) для FTS
    {
      name: 'healthStatus', type: 'select', defaultValue: 'healthy', options: [
        { label: 'Здоров', value: 'healthy' },
        { label: 'Нужно лечение', value: 'needs_treatment' },
        { label: 'Хроническое состояние', value: 'chronic_condition' },
        { label: 'Восстанавливается', value: 'recovering' },
        { label: 'Неизвестно', value: 'unknown' },
      ],
    },
    { name: 'healthNotes', type: 'richText' },
    { name: 'isSterilized', type: 'checkbox', defaultValue: false },
    { name: 'isVaccinated', type: 'checkbox', defaultValue: false },
    { name: 'microchipId', type: 'text', admin: { description: '15 цифр (опционально)' } },
    { name: 'city', type: 'relationship', relationTo: 'cities', index: true },
    {
      name: 'ownerType', type: 'select', required: true, defaultValue: 'citizen', index: true, options: [
        { label: 'Гражданин', value: 'citizen' },
        { label: 'Организация', value: 'organization' },
      ],
    },
    { name: 'ownerUser', type: 'relationship', relationTo: 'users', index: true },
    { name: 'organization', type: 'relationship', relationTo: 'organizations', index: true },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'pending_review', index: true, options: [
        { label: 'На проверке', value: 'pending_review' },
        { label: 'Опубликовано', value: 'published' },
        { label: 'Пристроено', value: 'adopted' },
        { label: 'В архиве', value: 'archived' },
      ],
    },
    {
      name: 'source', type: 'select', defaultValue: 'web_form', admin: { position: 'sidebar' }, options: [
        { label: 'Веб-форма', value: 'web_form' },
        { label: 'Telegram-бот', value: 'telegram_bot' },
        { label: 'Партнёрский фид', value: 'partner_feed' },
        { label: 'Админ', value: 'admin' },
      ],
    },
    {
      name: 'lostOrFound', type: 'select', defaultValue: 'none', index: true, options: [
        { label: 'Не потеряшка', value: 'none' },
        { label: 'Потерян', value: 'lost' },
        { label: 'Найден', value: 'found' },
      ],
    },
    { name: 'media', type: 'upload', relationTo: 'media', hasMany: true, admin: { description: 'Фото (в MVP), видео — фаза 2' } },
    // --- критическая вертикаль §17 ---
    { name: 'intakeFacility', type: 'relationship', relationTo: 'intakeFacilities', index: true, admin: { position: 'sidebar' } },
    { name: 'intakeDate', type: 'date', admin: { position: 'sidebar', description: 'Дата попадания в службу отлова' } },
    { name: 'legalDeadlineDate', type: 'date', index: true, admin: { position: 'sidebar', description: 'Дедлайн; авто из службы, можно override' } },
    {
      name: 'urgencyLevel', type: 'select', defaultValue: 'normal', index: true, admin: { position: 'sidebar', readOnly: true }, options: [
        { label: 'Обычная', value: 'normal' },
        { label: 'Высокая', value: 'high' },
        { label: 'Критическая', value: 'critical' },
      ],
    },
    { name: 'urgencyRank', type: 'number', defaultValue: 0, index: true, admin: { hidden: true } },
    { name: 'publishedAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    { name: 'adoptedAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      async (args) => {
        const { req } = args;
        // боевой хук с реальными зависимостями (DI-ядро протестировано отдельно)
        const hook = (await import('@/lib/animal-hooks')).makeAnimalBeforeChangeHook({
          nextPetNumber: () => nextPetNumber(req.payload),
          getFacilityHoldDays: async (facilityId: string) => {
            const fac = await req.payload.findByID({ collection: 'intakeFacilities', id: facilityId, depth: 0 });
            return (fac as any)?.legalHoldDays ?? 5;
          },
          now: () => new Date(),
        });
        return hook(args);
      },
    ],
    beforeValidate: [
      ({ data, operation }) => {
        if (data && operation === 'update' && data.status === 'published' && !data.publishedAt) {
          data.publishedAt = new Date().toISOString();
        }
        if (data && data.status === 'adopted' && !data.adoptedAt) {
          data.adoptedAt = new Date().toISOString();
        }
        return data;
      },
    ],
  },
};
```

> `beforeChangeCore` выше — заглушка-импорт для типов не нужна; боевой хук строится внутри `beforeChange` per-request. Удалить строку `const beforeChangeCore = ...` если линтер ругается на unused.

- [ ] **Step 8: Убрать неиспользуемую заглушку**

Удалить из `Animals.ts` блок:

```ts
const beforeChangeCore = makeAnimalBeforeChangeHook({
  nextPetNumber: () => { throw new Error('replaced per-request'); },
  getFacilityHoldDays: async () => 5,
  now: () => new Date(),
});
```

и неиспользуемый импорт `makeAnimalBeforeChangeHook` из верхней строки (он импортируется динамически внутри хука).

- [ ] **Step 9: Зарегистрировать в `web/payload.config.ts`**

```ts
import { Animals } from './collections/Animals';
// ...
collections: [Users, Cities, Media, AuditLogs, NotificationPreferences, Organizations, IntakeFacilities, Animals],
```

- [ ] **Step 10: Сгенерировать types**

Run: `cd web && npx payload generate:types`
Expected: появляется тип `Animal` со всеми полями, включая `urgencyLevel`, `legalDeadlineDate`, `intakeFacility`.

- [ ] **Step 11: Применить схему + integration smoke**

Run: `cd web && npm run dev`
В админке создать животное с видом «Собака» и кличкой «Рекс» → проверить, что `petNumber` назначен, `slug` = `<N>-reks`, при заполнении `intakeFacility` + `intakeDate` появляется `legalDeadlineDate` и `urgencyLevel`.

- [ ] **Step 12: Commit**

```bash
git add web/collections/Animals.ts web/collections/Cities.ts web/lib/animal-hooks.ts web/tests/unit/animal-hooks.test.ts web/payload.config.ts web/payload-types.ts
git commit -m "Plan 2 Task 6: Animals-коллекция + beforeChange-хук (slug/petNumber/дедлайн/urgency)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Полнотекстовый поиск — `description_plain` + `tsvector` + GIN

Postgres FTS на `russian`-конфигурации. `descriptionPlain` заполняется из Lexical richText в хуке; `search_vector` — generated column (`name` вес A, `descriptionPlain` вес B); GIN-индекс. `searchAnimalIds` возвращает id по релевантности, далее страницы грузят документы через Payload.

**Files:**
- Create: `web/lib/lexical-plain.ts`
- Create: `web/lib/search.ts`
- Modify: `web/lib/animal-hooks.ts` (заполнять `descriptionPlain`)
- Modify: `web/tests/unit/animal-hooks.test.ts`
- Create: `web/migrations/<timestamp>_animal_fts.ts`
- Test: `web/tests/unit/lexical-plain.test.ts`, `web/tests/unit/search.test.ts`

- [ ] **Step 1: Failing тест извлечения текста из Lexical**

`web/tests/unit/lexical-plain.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { extractPlainText } from '@/lib/lexical-plain';

describe('extractPlainText', () => {
  it('returns empty string for null/undefined', () => {
    expect(extractPlainText(null)).toBe('');
    expect(extractPlainText(undefined)).toBe('');
  });
  it('joins text nodes with spaces', () => {
    const rt = { root: { children: [
      { type: 'paragraph', children: [{ type: 'text', text: 'Добрый' }, { type: 'text', text: 'пёс' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'любит детей' }] },
    ] } };
    expect(extractPlainText(rt)).toBe('Добрый пёс любит детей');
  });
  it('recurses nested children', () => {
    const rt = { root: { children: [
      { type: 'list', children: [{ type: 'listitem', children: [{ type: 'text', text: 'привит' }] }] },
    ] } };
    expect(extractPlainText(rt)).toBe('привит');
  });
});
```

- [ ] **Step 2: Запустить — failing**

Run: `cd web && npm test -- lexical-plain`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `web/lib/lexical-plain.ts`**

```ts
/** Рекурсивно собирает текст из Lexical/Payload richText в одну строку. */
export function extractPlainText(value: any): string {
  if (!value) return '';
  const root = value.root ?? value;
  const parts: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (typeof node.text === 'string') parts.push(node.text);
    const children = node.children;
    if (Array.isArray(children)) children.forEach(walk);
  };
  if (Array.isArray(root?.children)) root.children.forEach(walk);
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
```

- [ ] **Step 4: Запустить — pass**

Run: `cd web && npm test -- lexical-plain`
Expected: PASS — 3 passed.

- [ ] **Step 5: Заполнять `descriptionPlain` в хуке — обновить тест**

Добавить в `web/tests/unit/animal-hooks.test.ts`:

```ts
  it('fills descriptionPlain from richText description', async () => {
    const hook = makeAnimalBeforeChangeHook(deps());
    const data = await hook({
      operation: 'create',
      data: { species: 'dog', description: { root: { children: [
        { type: 'paragraph', children: [{ type: 'text', text: 'Добрый пёс' }] },
      ] } } },
    } as any);
    expect(data.descriptionPlain).toBe('Добрый пёс');
  });
```

Run: `cd web && npm test -- animal-hooks`
Expected: FAIL на новом тесте (`descriptionPlain` undefined).

- [ ] **Step 6: Дополнить `web/lib/animal-hooks.ts`**

Добавить импорт сверху:

```ts
import { extractPlainText } from '@/lib/lexical-plain';
```

Внутри возвращаемой функции, перед `return data;`, добавить:

```ts
    data.descriptionPlain = extractPlainText(data.description);
```

Run: `cd web && npm test -- animal-hooks`
Expected: PASS — 7 passed.

- [ ] **Step 7: Failing тест `searchAnimalIds`**

`web/tests/unit/search.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { normalizeQuery, searchAnimalIds } from '@/lib/search';

describe('normalizeQuery', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeQuery('  рыжий   кот ')).toBe('рыжий кот');
  });
  it('returns empty for blank', () => {
    expect(normalizeQuery('   ')).toBe('');
  });
  it('strips control chars', () => {
    expect(normalizeQuery('кот \n')).toBe('кот');
  });
});

describe('searchAnimalIds', () => {
  it('returns [] for empty query without hitting db', async () => {
    const payload = { db: { drizzle: { execute: vi.fn() } } } as any;
    expect(await searchAnimalIds(payload, '   ')).toEqual([]);
    expect(payload.db.drizzle.execute).not.toHaveBeenCalled();
  });
  it('maps db rows to id array in rank order', async () => {
    const payload = {
      db: { drizzle: { execute: vi.fn().mockResolvedValue({ rows: [{ id: 5 }, { id: 2 }] }) } },
    } as any;
    expect(await searchAnimalIds(payload, 'рыжий кот')).toEqual([5, 2]);
  });
});
```

- [ ] **Step 8: Запустить — failing**

Run: `cd web && npm test -- search`
Expected: FAIL — модуль не найден.

- [ ] **Step 9: Реализовать `web/lib/search.ts`**

```ts
import type { Payload } from 'payload';
import { sql } from 'drizzle-orm';

export function normalizeQuery(q: string): string {
  return (q ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Полнотекстовый поиск опубликованных животных. Возвращает id по убыванию релевантности.
 * Использует search_vector (generated) + ts_rank. limit ограничивает выдачу.
 */
export async function searchAnimalIds(payload: Payload, query: string, limit = 200): Promise<number[]> {
  const q = normalizeQuery(query);
  if (!q) return [];
  const result: any = await (payload.db as any).drizzle.execute(sql`
    SELECT id
    FROM animals
    WHERE status = 'published'
      AND search_vector @@ plainto_tsquery('russian', ${q})
    ORDER BY ts_rank(search_vector, plainto_tsquery('russian', ${q})) DESC
    LIMIT ${limit}
  `);
  return (result?.rows ?? []).map((r: any) => Number(r.id));
}
```

- [ ] **Step 10: Запустить — pass**

Run: `cd web && npm test -- search`
Expected: PASS — 5 passed.

- [ ] **Step 11: Создать FTS-миграцию**

Run: `cd web && npx payload migrate:create animal_fts`
Заменить содержимое `web/migrations/<timestamp>_animal_fts.ts` на:

```ts
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE animals
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('russian', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('russian', coalesce(description_plain, '')), 'B')
    ) STORED
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS animals_search_idx ON animals USING GIN (search_vector)
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS animals_search_idx`);
  await db.execute(sql`ALTER TABLE animals DROP COLUMN IF EXISTS search_vector`);
}
```

> Имена колонок (`description_plain`) — snake_case, как Payload Postgres-adapter создаёт из `descriptionPlain`. Если adapter настроен иначе, свериться с фактической схемой через `\d animals` в psql перед правкой миграции.

- [ ] **Step 12: Применить миграцию**

Run: `cd web && npx payload migrate`
Expected: миграция `animal_fts` применена. Проверить в psql: `\d animals` показывает `search_vector` и индекс `animals_search_idx`.

- [ ] **Step 13: Commit**

```bash
git add web/lib/lexical-plain.ts web/lib/search.ts web/lib/animal-hooks.ts web/tests/unit/lexical-plain.test.ts web/tests/unit/search.test.ts web/tests/unit/animal-hooks.test.ts web/migrations
git commit -m "Plan 2 Task 7: Postgres FTS (description_plain + tsvector + GIN) + searchAnimalIds

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Seed — slug городам, службы отлова, демо-каталог

**Files:**
- Create: `web/lib/seeds/intake-facilities-by.ts`
- Create: `web/lib/seeds/demo-catalog.ts`
- Modify: `web/scripts/seed.ts`
- Test: `web/tests/unit/seeds/intake-facilities-by.test.ts`

- [ ] **Step 1: Failing тест seed служб отлова**

`web/tests/unit/seeds/intake-facilities-by.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { intakeFacilitiesBY } from '@/lib/seeds/intake-facilities-by';

describe('intake-facilities-by seed', () => {
  it('contains 6-10 facilities', () => {
    expect(intakeFacilitiesBY.length).toBeGreaterThanOrEqual(6);
    expect(intakeFacilitiesBY.length).toBeLessThanOrEqual(10);
  });
  it('covers all 6 region centers by cityName', () => {
    const cities = new Set(intakeFacilitiesBY.map((f) => f.cityName));
    for (const c of ['Минск', 'Брест', 'Витебск', 'Гомель', 'Гродно', 'Могилёв']) {
      expect(cities.has(c)).toBe(true);
    }
  });
  it('every facility has name, cityName and positive legalHoldDays', () => {
    for (const f of intakeFacilitiesBY) {
      expect(f.name).toBeTruthy();
      expect(f.cityName).toBeTruthy();
      expect(f.legalHoldDays).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Запустить — failing**

Run: `cd web && npm test -- intake-facilities-by`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `web/lib/seeds/intake-facilities-by.ts`**

```ts
export interface IntakeFacilitySeed {
  name: string;
  cityName: string;       // совпадает с Cities.nameRu для линковки в seed
  address?: string;
  phone?: string;
  legalHoldDays: number;
  isMunicipal: boolean;
}

// Контакты — заглушки уровня MVP; точные данные и сроки уточняет юрист/outreach (фаза 0).
export const intakeFacilitiesBY: IntakeFacilitySeed[] = [
  { name: 'ГУ «Фауна города» (Минск, Гурского 47)', cityName: 'Минск', address: 'ул. Гурского, 47', legalHoldDays: 5, isMunicipal: true },
  { name: 'Городская служба отлова (Брест)', cityName: 'Брест', legalHoldDays: 5, isMunicipal: true },
  { name: 'Городская служба отлова (Витебск)', cityName: 'Витебск', legalHoldDays: 5, isMunicipal: true },
  { name: 'Городская служба отлова (Гомель)', cityName: 'Гомель', legalHoldDays: 5, isMunicipal: true },
  { name: 'Городская служба отлова (Гродно)', cityName: 'Гродно', legalHoldDays: 5, isMunicipal: true },
  { name: 'Городская служба отлова (Могилёв)', cityName: 'Могилёв', legalHoldDays: 5, isMunicipal: true },
  { name: 'Служба отлова (Бобруйск)', cityName: 'Бобруйск', legalHoldDays: 5, isMunicipal: true },
  { name: 'Служба отлова (Барановичи)', cityName: 'Барановичи', legalHoldDays: 5, isMunicipal: true },
];
```

- [ ] **Step 4: Запустить — pass**

Run: `cd web && npm test -- intake-facilities-by`
Expected: PASS — 3 passed.

- [ ] **Step 5: Реализовать `web/lib/seeds/demo-catalog.ts`**

```ts
export interface DemoOrgSeed { name: string; cityName: string; isVerified: boolean; isPublished: boolean }
export interface DemoAnimalSeed {
  name?: string;
  species: 'dog' | 'cat' | 'other';
  sex: 'male' | 'female' | 'unknown';
  ageYears?: number;
  size: 'small' | 'medium' | 'large';
  cityName: string;
  ownerType: 'citizen' | 'organization';
  orgName?: string;          // если ownerType=organization
  facilityName?: string;     // если из службы отлова
  intakeOffsetDays?: number; // intakeDate = today - offset (для расчёта дедлайна в демо)
  descriptionText: string;
  status: 'published';
}

export const demoOrgs: DemoOrgSeed[] = [
  { name: 'Приют «Верный друг»', cityName: 'Минск', isVerified: true, isPublished: true },
  { name: 'Кошкин дом', cityName: 'Брест', isVerified: true, isPublished: true },
];

export const demoAnimals: DemoAnimalSeed[] = [
  { name: 'Рекс', species: 'dog', sex: 'male', ageYears: 2, size: 'large', cityName: 'Минск', ownerType: 'organization', orgName: 'Приют «Верный друг»', descriptionText: 'Дружелюбный пёс, ладит с детьми.', status: 'published' },
  { name: 'Мурка', species: 'cat', sex: 'female', ageYears: 1, size: 'small', cityName: 'Брест', ownerType: 'organization', orgName: 'Кошкин дом', descriptionText: 'Ласковая кошка, приучена к лотку.', status: 'published' },
  { name: 'Безымянный', species: 'dog', sex: 'unknown', ageYears: 3, size: 'medium', cityName: 'Минск', ownerType: 'organization', orgName: 'Приют «Верный друг»', facilityName: 'ГУ «Фауна города» (Минск, Гурского 47)', intakeOffsetDays: 3, descriptionText: 'Попал в службу отлова, срочно ищет дом.', status: 'published' },
  { name: 'Барсик', species: 'cat', sex: 'male', ageYears: 4, size: 'medium', cityName: 'Гомель', ownerType: 'citizen', descriptionText: 'Спокойный кот для квартиры.', status: 'published' },
];
```

- [ ] **Step 6: Расширить `web/scripts/seed.ts`**

Добавить (после блока seeding городов) функции и вызовы. Города получают slug, затем строятся службы, организации, животные. Идемпотентность — по уникальным полям.

```ts
import { slugifyRu } from '../lib/slug';
import { intakeFacilitiesBY } from '../lib/seeds/intake-facilities-by';
import { demoOrgs, demoAnimals } from '../lib/seeds/demo-catalog';

async function backfillCitySlugs(payload: any) {
  const { docs } = await payload.find({ collection: 'cities', limit: 1000, depth: 0 });
  for (const city of docs) {
    if (!city.slug) {
      await payload.update({ collection: 'cities', id: city.id, data: { slug: slugifyRu(city.nameRu) } });
    }
  }
}

async function findCityId(payload: any, nameRu: string): Promise<string | null> {
  const { docs } = await payload.find({ collection: 'cities', where: { nameRu: { equals: nameRu } }, limit: 1, depth: 0 });
  return docs[0]?.id ?? null;
}

async function seedFacilities(payload: any) {
  for (const f of intakeFacilitiesBY) {
    const exists = await payload.find({ collection: 'intakeFacilities', where: { name: { equals: f.name } }, limit: 1, depth: 0 });
    if (exists.docs.length) continue;
    await payload.create({ collection: 'intakeFacilities', data: {
      name: f.name, city: await findCityId(payload, f.cityName), address: f.address,
      phone: f.phone, legalHoldDays: f.legalHoldDays, isMunicipal: f.isMunicipal, isPublished: true,
    }});
  }
}

async function seedOrgs(payload: any) {
  for (const o of demoOrgs) {
    const exists = await payload.find({ collection: 'organizations', where: { name: { equals: o.name } }, limit: 1, depth: 0 });
    if (exists.docs.length) continue;
    await payload.create({ collection: 'organizations', data: {
      name: o.name, city: await findCityId(payload, o.cityName), isVerified: o.isVerified, isPublished: o.isPublished,
    }});
  }
}

async function seedAnimals(payload: any) {
  for (const a of demoAnimals) {
    const exists = await payload.find({ collection: 'animals', where: { name: { equals: a.name }, city: { equals: await findCityId(payload, a.cityName) } }, limit: 1, depth: 0 });
    if (a.name && exists.docs.length) continue;
    let orgId: string | null = null;
    if (a.orgName) {
      const org = await payload.find({ collection: 'organizations', where: { name: { equals: a.orgName } }, limit: 1, depth: 0 });
      orgId = org.docs[0]?.id ?? null;
    }
    let facilityId: string | null = null;
    let intakeDate: string | undefined;
    if (a.facilityName) {
      const fac = await payload.find({ collection: 'intakeFacilities', where: { name: { equals: a.facilityName } }, limit: 1, depth: 0 });
      facilityId = fac.docs[0]?.id ?? null;
      if (a.intakeOffsetDays != null) {
        intakeDate = new Date(Date.now() - a.intakeOffsetDays * 86400000).toISOString();
      }
    }
    await payload.create({ collection: 'animals', data: {
      name: a.name, species: a.species, sex: a.sex, ageYears: a.ageYears, size: a.size,
      city: await findCityId(payload, a.cityName), ownerType: a.ownerType, organization: orgId,
      intakeFacility: facilityId, intakeDate, status: a.status,
      description: { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: a.descriptionText }] }] } },
    }});
  }
}
```

Затем в главной функции `seed()` после городов добавить вызовы по порядку:

```ts
  await backfillCitySlugs(payload);
  await seedFacilities(payload);
  await seedOrgs(payload);
  await seedAnimals(payload);
```

- [ ] **Step 7: Запустить seed**

Run: `cd web && npm run seed`
Expected: города получают slug; создаются 8 служб, 2 организации, 4 животных (одно — критическое, из службы отлова с дедлайном через 2 дня).

- [ ] **Step 8: Проверить в админке**

Run: `cd web && npm run dev`
Открыть `/admin/collections/animals` → 4 животных, у «Безымянный» — `urgencyLevel: critical`, есть `legalDeadlineDate`. У всех есть `slug` и `petNumber`.

- [ ] **Step 9: Commit**

```bash
git add web/lib/seeds/intake-facilities-by.ts web/lib/seeds/demo-catalog.ts web/scripts/seed.ts web/tests/unit/seeds/intake-facilities-by.test.ts
git commit -m "Plan 2 Task 8: seed — slug городам, 8 служб отлова, демо-каталог (org + animals)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Каталожные pure-функции — фильтры, URL карточки, форматирование

**Files:**
- Create: `web/lib/filters.ts`, `web/lib/animal-url.ts`, `web/lib/format.ts`
- Test: `web/tests/unit/filters.test.ts`, `web/tests/unit/animal-url.test.ts`, `web/tests/unit/format.test.ts`

- [ ] **Step 1: Failing тест `animal-url.ts`**

`web/tests/unit/animal-url.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { animalUrl } from '@/lib/animal-url';

describe('animalUrl', () => {
  it('builds /animals/[city]/[species]/[slug] from populated city', () => {
    expect(animalUrl({ slug: '123-reks', species: 'dog', city: { slug: 'minsk' } })).toBe('/animals/minsk/dog/123-reks');
  });
  it('falls back to "by" when city slug missing', () => {
    expect(animalUrl({ slug: '7-cat', species: 'cat', city: undefined })).toBe('/animals/by/cat/7-cat');
  });
  it('handles city given as id string (no slug) with fallback', () => {
    expect(animalUrl({ slug: '7-cat', species: 'cat', city: 'someid' })).toBe('/animals/by/cat/7-cat');
  });
});
```

- [ ] **Step 2: Реализовать `web/lib/animal-url.ts`**

```ts
export interface AnimalUrlInput {
  slug: string;
  species: string;
  city?: { slug?: string | null } | string | null;
}

export function animalUrl(a: AnimalUrlInput): string {
  const citySlug = a.city && typeof a.city === 'object' && a.city.slug ? a.city.slug : 'by';
  return `/animals/${citySlug}/${a.species}/${a.slug}`;
}
```

Run: `cd web && npm test -- animal-url`
Expected: PASS — 3 passed.

- [ ] **Step 3: Failing тест `format.ts`**

`web/tests/unit/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatAge, formatAnimalTitle } from '@/lib/format';

describe('formatAge', () => {
  it('formats years with correct plural', () => {
    expect(formatAge(1, 0)).toBe('1 год');
    expect(formatAge(2, 0)).toBe('2 года');
    expect(formatAge(5, 0)).toBe('5 лет');
    expect(formatAge(21, 0)).toBe('21 год');
  });
  it('formats months when no years', () => {
    expect(formatAge(0, 3)).toBe('3 месяца');
    expect(formatAge(0, 5)).toBe('5 месяцев');
    expect(formatAge(0, 1)).toBe('1 месяц');
  });
  it('combines years and months', () => {
    expect(formatAge(1, 2)).toBe('1 год 2 месяца');
  });
  it('returns empty when unknown', () => {
    expect(formatAge(undefined, undefined)).toBe('');
    expect(formatAge(0, 0)).toBe('меньше месяца');
  });
});

describe('formatAnimalTitle', () => {
  it('uses name and number', () => {
    expect(formatAnimalTitle({ name: 'Рекс', petNumber: 123 })).toBe('Рекс №123');
  });
  it('falls back to number only', () => {
    expect(formatAnimalTitle({ name: null, petNumber: 7 })).toBe('№7');
  });
});
```

- [ ] **Step 4: Реализовать `web/lib/format.ts`**

```ts
function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

export function formatAge(years?: number | null, months?: number | null): string {
  const y = years ?? 0;
  const m = months ?? 0;
  if (years == null && months == null) return '';
  if (y === 0 && m === 0) return 'меньше месяца';
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} ${plural(y, ['год', 'года', 'лет'])}`);
  if (m > 0) parts.push(`${m} ${plural(m, ['месяц', 'месяца', 'месяцев'])}`);
  return parts.join(' ');
}

export function formatAnimalTitle(a: { name?: string | null; petNumber?: number | null }): string {
  const num = a.petNumber != null ? `№${a.petNumber}` : '';
  return a.name ? `${a.name} ${num}`.trim() : num;
}
```

Run: `cd web && npm test -- format`
Expected: PASS — 6 passed.

- [ ] **Step 5: Failing тест `filters.ts`**

`web/tests/unit/filters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseAnimalFilters, buildAnimalWhere, sortForFilters, filtersToSearchParams, PAGE_SIZE } from '@/lib/filters';

describe('parseAnimalFilters', () => {
  it('parses defaults', () => {
    const f = parseAnimalFilters(new URLSearchParams(''));
    expect(f).toMatchObject({ sizes: [], cities: [], urgent: false, page: 1, sort: 'urgent' });
  });
  it('parses all params', () => {
    const f = parseAnimalFilters(new URLSearchParams('species=dog&sex=male&size=small&size=large&city=minsk&city=brest&sterilized=1&ownerType=organization&urgent=1&q=рыжий&page=3&sort=new'));
    expect(f.species).toBe('dog');
    expect(f.sex).toBe('male');
    expect(f.sizes).toEqual(['small', 'large']);
    expect(f.cities).toEqual(['minsk', 'brest']);
    expect(f.sterilized).toBe(true);
    expect(f.ownerType).toBe('organization');
    expect(f.urgent).toBe(true);
    expect(f.q).toBe('рыжий');
    expect(f.page).toBe(3);
    expect(f.sort).toBe('new');
  });
  it('ignores invalid enum values', () => {
    const f = parseAnimalFilters(new URLSearchParams('species=dragon&size=huge&sort=bogus'));
    expect(f.species).toBeUndefined();
    expect(f.sizes).toEqual([]);
    expect(f.sort).toBe('urgent');
  });
  it('clamps page to >= 1', () => {
    expect(parseAnimalFilters(new URLSearchParams('page=0')).page).toBe(1);
    expect(parseAnimalFilters(new URLSearchParams('page=-5')).page).toBe(1);
  });
});

describe('buildAnimalWhere', () => {
  it('always filters published', () => {
    const w = buildAnimalWhere(parseAnimalFilters(new URLSearchParams('')));
    expect(w.and).toContainEqual({ status: { equals: 'published' } });
  });
  it('adds species/sex/sizes/cities/urgent constraints', () => {
    const w = buildAnimalWhere(parseAnimalFilters(new URLSearchParams('species=dog&sex=female&size=small&city=minsk&urgent=1&sterilized=1&ownerType=citizen')));
    expect(w.and).toContainEqual({ species: { equals: 'dog' } });
    expect(w.and).toContainEqual({ sex: { equals: 'female' } });
    expect(w.and).toContainEqual({ size: { in: ['small'] } });
    expect(w.and).toContainEqual({ 'city.slug': { in: ['minsk'] } });
    expect(w.and).toContainEqual({ urgencyLevel: { in: ['critical', 'high'] } });
    expect(w.and).toContainEqual({ isSterilized: { equals: true } });
    expect(w.and).toContainEqual({ ownerType: { equals: 'citizen' } });
  });
});

describe('sortForFilters', () => {
  it('urgent default sorts by rank then recency', () => {
    expect(sortForFilters(parseAnimalFilters(new URLSearchParams('')))).toEqual(['-urgencyRank', '-publishedAt']);
  });
  it('new sorts by recency', () => {
    expect(sortForFilters(parseAnimalFilters(new URLSearchParams('sort=new')))).toEqual(['-publishedAt']);
  });
  it('longest sorts by oldest publish', () => {
    expect(sortForFilters(parseAnimalFilters(new URLSearchParams('sort=longest')))).toEqual(['publishedAt']);
  });
});

describe('filtersToSearchParams round-trip', () => {
  it('round-trips through parse', () => {
    const original = 'species=dog&size=small&size=large&city=minsk&urgent=1&q=кот&page=2&sort=new';
    const reparsed = parseAnimalFilters(filtersToSearchParams(parseAnimalFilters(new URLSearchParams(original))));
    expect(reparsed).toEqual(parseAnimalFilters(new URLSearchParams(original)));
  });
  it('omits defaults to keep URLs clean', () => {
    const sp = filtersToSearchParams(parseAnimalFilters(new URLSearchParams('')));
    expect(sp.toString()).toBe('');
  });
});

describe('PAGE_SIZE', () => {
  it('is 24', () => expect(PAGE_SIZE).toBe(24));
});
```

- [ ] **Step 6: Реализовать `web/lib/filters.ts`**

```ts
import type { Where } from 'payload';

export const PAGE_SIZE = 24;

export type Species = 'dog' | 'cat' | 'other';
export type Sex = 'male' | 'female' | 'unknown';
export type Size = 'small' | 'medium' | 'large';
export type OwnerType = 'citizen' | 'organization';
export type SortKey = 'urgent' | 'new' | 'longest';

export interface AnimalFilters {
  species?: Species;
  sex?: Sex;
  sizes: Size[];
  cities: string[];
  sterilized?: boolean;
  ownerType?: OwnerType;
  lostOrFound?: 'lost' | 'found';
  urgent: boolean;
  q?: string;
  page: number;
  sort: SortKey;
}

const SPECIES: Species[] = ['dog', 'cat', 'other'];
const SEX: Sex[] = ['male', 'female', 'unknown'];
const SIZES: Size[] = ['small', 'medium', 'large'];
const OWNER: OwnerType[] = ['citizen', 'organization'];
const SORTS: SortKey[] = ['urgent', 'new', 'longest'];

function pickEnum<T extends string>(value: string | null, allowed: T[]): T | undefined {
  return value && (allowed as string[]).includes(value) ? (value as T) : undefined;
}

export function parseAnimalFilters(sp: URLSearchParams): AnimalFilters {
  const pageRaw = parseInt(sp.get('page') ?? '1', 10);
  const lf = sp.get('lostOrFound');
  return {
    species: pickEnum(sp.get('species'), SPECIES),
    sex: pickEnum(sp.get('sex'), SEX),
    sizes: sp.getAll('size').filter((s): s is Size => (SIZES as string[]).includes(s)),
    cities: sp.getAll('city').filter(Boolean),
    sterilized: sp.get('sterilized') === '1' ? true : undefined,
    ownerType: pickEnum(sp.get('ownerType'), OWNER),
    lostOrFound: lf === 'lost' || lf === 'found' ? lf : undefined,
    urgent: sp.get('urgent') === '1',
    q: sp.get('q')?.trim() || undefined,
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1,
    sort: pickEnum(sp.get('sort'), SORTS) ?? 'urgent',
  };
}

export function buildAnimalWhere(f: AnimalFilters): Where {
  const and: Where[] = [{ status: { equals: 'published' } }];
  if (f.species) and.push({ species: { equals: f.species } });
  if (f.sex) and.push({ sex: { equals: f.sex } });
  if (f.sizes.length) and.push({ size: { in: f.sizes } });
  if (f.cities.length) and.push({ 'city.slug': { in: f.cities } });
  if (f.sterilized) and.push({ isSterilized: { equals: true } });
  if (f.ownerType) and.push({ ownerType: { equals: f.ownerType } });
  if (f.lostOrFound) and.push({ lostOrFound: { equals: f.lostOrFound } });
  if (f.urgent) and.push({ urgencyLevel: { in: ['critical', 'high'] } });
  return { and };
}

export function sortForFilters(f: AnimalFilters): string[] {
  if (f.sort === 'new') return ['-publishedAt'];
  if (f.sort === 'longest') return ['publishedAt'];
  return ['-urgencyRank', '-publishedAt'];
}

export function filtersToSearchParams(f: AnimalFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.species) sp.set('species', f.species);
  if (f.sex) sp.set('sex', f.sex);
  f.sizes.forEach((s) => sp.append('size', s));
  f.cities.forEach((c) => sp.append('city', c));
  if (f.sterilized) sp.set('sterilized', '1');
  if (f.ownerType) sp.set('ownerType', f.ownerType);
  if (f.lostOrFound) sp.set('lostOrFound', f.lostOrFound);
  if (f.urgent) sp.set('urgent', '1');
  if (f.q) sp.set('q', f.q);
  if (f.page > 1) sp.set('page', String(f.page));
  if (f.sort !== 'urgent') sp.set('sort', f.sort);
  return sp;
}
```

- [ ] **Step 7: Запустить все каталожные unit-тесты**

Run: `cd web && npm test -- filters animal-url format`
Expected: PASS — все зелёные (filters: 12, animal-url: 3, format: 6).

- [ ] **Step 8: Commit**

```bash
git add web/lib/filters.ts web/lib/animal-url.ts web/lib/format.ts web/tests/unit/filters.test.ts web/tests/unit/animal-url.test.ts web/tests/unit/format.test.ts
git commit -m "Plan 2 Task 9: каталожные pure-функции — filters, animal-url, format

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Каталог `/animals` — SSR + AnimalCard + Pagination

**Files:**
- Create: `web/app/(public)/animals/page.tsx`
- Create: `web/components/catalog/AnimalCard.tsx`
- Create: `web/components/catalog/AnimalGrid.tsx`
- Create: `web/components/catalog/Pagination.tsx`
- Create: `web/components/catalog/UrgencyBadge.tsx`
- Test: `web/tests/e2e/catalog.spec.ts`

- [ ] **Step 1: Создать `web/components/catalog/UrgencyBadge.tsx`**

```tsx
'use client';
import { daysUntil } from '@/lib/urgency';

export function UrgencyBadge({ deadline }: { deadline?: string | null }) {
  if (!deadline) return null;
  const days = daysUntil(new Date(deadline), new Date());
  if (days > 7) return null;
  const critical = days <= 3;
  const label = days <= 0 ? 'Истекает срок' : `Осталось ${days} дн.`;
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white ${critical ? 'bg-red-600' : 'bg-orange-500'}`}
    >
      {critical ? 'СРОЧНО' : 'Срочно'} · {label}
    </span>
  );
}
```

- [ ] **Step 2: Создать `web/components/catalog/AnimalCard.tsx`**

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { animalUrl } from '@/lib/animal-url';
import { formatAge, formatAnimalTitle } from '@/lib/format';
import { UrgencyBadge } from './UrgencyBadge';
import type { Animal } from '@/payload-types';

export function AnimalCard({ animal }: { animal: Animal }) {
  const firstMedia = Array.isArray(animal.media) ? animal.media[0] : null;
  const img = firstMedia && typeof firstMedia === 'object' ? firstMedia : null;
  const cardSrc = (img as any)?.sizes?.card?.url ?? (img as any)?.url ?? null;
  const cityName = animal.city && typeof animal.city === 'object' ? (animal.city as any).nameRu : '';
  const isShelter = animal.ownerType === 'organization';

  return (
    <Link href={animalUrl(animal as any)} className="group block overflow-hidden rounded-2xl border border-gray-200 transition hover:shadow-lg">
      <div className="relative aspect-[4/3] bg-gray-100">
        {cardSrc ? (
          <Image src={cardSrc} alt={(img as any)?.alt ?? 'Фото животного'} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">нет фото</div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <UrgencyBadge deadline={animal.legalDeadlineDate as any} />
          {isShelter && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">Приют</span>}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-900">{formatAnimalTitle(animal)}</h3>
        <p className="text-sm text-gray-600">
          {[formatAge(animal.ageYears, animal.ageMonths), cityName].filter(Boolean).join(' · ')}
        </p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Создать `web/components/catalog/AnimalGrid.tsx`**

```tsx
import { AnimalCard } from './AnimalCard';
import type { Animal } from '@/payload-types';

export function AnimalGrid({ animals }: { animals: Animal[] }) {
  if (!animals.length) {
    return <p className="py-12 text-center text-gray-500">Ничего не найдено. Попробуйте изменить фильтры.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {animals.map((a) => <AnimalCard key={a.id} animal={a} />)}
    </div>
  );
}
```

- [ ] **Step 4: Создать `web/components/catalog/Pagination.tsx`**

```tsx
import Link from 'next/link';

export function Pagination({ page, totalPages, makeHref }: { page: number; totalPages: number; makeHref: (p: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Постраничная навигация">
      {page > 1 && <Link href={makeHref(page - 1)} className="rounded-lg border px-4 py-2 hover:bg-gray-50">Назад</Link>}
      <span className="px-4 py-2 text-sm text-gray-600">Страница {page} из {totalPages}</span>
      {page < totalPages && <Link href={makeHref(page + 1)} className="rounded-lg border px-4 py-2 hover:bg-gray-50">Вперёд</Link>}
    </nav>
  );
}
```

- [ ] **Step 5: Создать `web/app/(public)/animals/page.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import { parseAnimalFilters, buildAnimalWhere, sortForFilters, filtersToSearchParams, PAGE_SIZE } from '@/lib/filters';
import { searchAnimalIds } from '@/lib/search';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';
import { Pagination } from '@/components/catalog/Pagination';
import type { Where } from 'payload';

export const dynamic = 'force-dynamic';

function toSearchParams(input: Record<string, string | string[] | undefined>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(input)) {
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else if (v != null) sp.append(k, v);
  }
  return sp;
}

export default async function AnimalsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const sp = toSearchParams(searchParams);
  const filters = parseAnimalFilters(sp);
  const payload = await getPayload({ config });

  let where: Where = buildAnimalWhere(filters);
  if (filters.q) {
    const ids = await searchAnimalIds(payload, filters.q);
    where = { and: [where, { id: { in: ids.length ? ids : [-1] } }] };
  }

  const result = await payload.find({
    collection: 'animals',
    where,
    sort: sortForFilters(filters),
    limit: PAGE_SIZE,
    page: filters.page,
    depth: 1,
  });

  const makeHref = (p: number) => {
    const next = filtersToSearchParams({ ...filters, page: p });
    const qs = next.toString();
    return qs ? `/animals?${qs}` : '/animals';
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Животные ищут дом</h1>
      <p className="mb-4 text-sm text-gray-500">{result.totalDocs} объявлений</p>
      <AnimalGrid animals={result.docs as any} />
      <Pagination page={result.page ?? 1} totalPages={result.totalPages ?? 1} makeHref={makeHref} />
    </main>
  );
}
```

> Фильтр-панель (UI) подключается в Task 11. Здесь каталог уже читает фильтры из URL, поэтому ручная проверка `?species=dog` работает сразу.

- [ ] **Step 6: e2e тест каталога**

`web/tests/e2e/catalog.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('catalog lists seeded animals', async ({ page }) => {
  await page.goto('/animals');
  await expect(page.getByRole('heading', { name: 'Животные ищут дом' })).toBeVisible();
  await expect(page.getByText('Рекс №', { exact: false })).toBeVisible();
});

test('catalog filters by species via URL', async ({ page }) => {
  await page.goto('/animals?species=cat');
  await expect(page.getByText('Мурка №', { exact: false })).toBeVisible();
  await expect(page.getByText('Рекс №', { exact: false })).toHaveCount(0);
});

test('urgent animal shows countdown badge', async ({ page }) => {
  await page.goto('/animals?urgent=1');
  await expect(page.getByText(/Осталось \d+ дн\./).first()).toBeVisible();
});
```

- [ ] **Step 7: Запустить e2e**

Предусловие: dev-сервер с применёнными миграциями и seed (`npm run seed`).
Run: `cd web && npx playwright test catalog`
Expected: PASS — 3 passed.

- [ ] **Step 8: Commit**

```bash
git add web/app/\(public\)/animals/page.tsx web/components/catalog web/tests/e2e/catalog.spec.ts
git commit -m "Plan 2 Task 10: каталог /animals — SSR + AnimalCard + Pagination + UrgencyBadge

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: FilterPanel + SortSelect (client, URL-sync)

**Files:**
- Create: `web/components/catalog/FilterPanel.tsx`
- Create: `web/components/catalog/SortSelect.tsx`
- Modify: `web/app/(public)/animals/page.tsx` (подключить панель + загрузить города)
- Test: `web/tests/e2e/filters.spec.ts`

- [ ] **Step 1: Создать `web/components/catalog/SortSelect.tsx`**

```tsx
'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const OPTIONS = [
  { value: 'urgent', label: 'Сначала срочные' },
  { value: 'new', label: 'Сначала новые' },
  { value: 'longest', label: 'Дольше всех ждут' },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get('sort') ?? 'urgent';

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(sp.toString());
    if (e.target.value === 'urgent') next.delete('sort');
    else next.set('sort', e.target.value);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Сортировка:</span>
      <select value={current} onChange={onChange} className="rounded-lg border px-2 py-1">
        {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: Создать `web/components/catalog/FilterPanel.tsx`**

```tsx
'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface CityOption { slug: string; nameRu: string }

const SPECIES = [{ v: 'dog', l: 'Собаки' }, { v: 'cat', l: 'Кошки' }, { v: 'other', l: 'Другие' }];
const SIZES = [{ v: 'small', l: 'Маленький' }, { v: 'medium', l: 'Средний' }, { v: 'large', l: 'Большой' }];

export function FilterPanel({ cities }: { cities: CityOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function update(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(sp.toString());
    mutate(next);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }

  const setSingle = (key: string, value: string) =>
    update((n) => (n.get(key) === value ? n.delete(key) : n.set(key, value)));

  const toggleMulti = (key: string, value: string) =>
    update((n) => {
      const cur = n.getAll(key);
      n.delete(key);
      (cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]).forEach((x) => n.append(key, x));
    });

  const toggleFlag = (key: string) =>
    update((n) => (n.get(key) === '1' ? n.delete(key) : n.set(key, '1')));

  return (
    <aside className="space-y-6">
      <fieldset>
        <legend className="mb-2 font-semibold">Вид</legend>
        {SPECIES.map((s) => (
          <label key={s.v} className="mr-3 inline-flex items-center gap-1">
            <input type="radio" name="species" checked={sp.get('species') === s.v} onChange={() => setSingle('species', s.v)} />
            {s.l}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Размер</legend>
        {SIZES.map((s) => (
          <label key={s.v} className="mr-3 inline-flex items-center gap-1">
            <input type="checkbox" checked={sp.getAll('size').includes(s.v)} onChange={() => toggleMulti('size', s.v)} />
            {s.l}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Город</legend>
        <select
          value={sp.get('city') ?? ''}
          onChange={(e) => update((n) => { n.delete('city'); if (e.target.value) n.set('city', e.target.value); })}
          className="w-full rounded-lg border px-2 py-1"
        >
          <option value="">Все города</option>
          {cities.map((c) => <option key={c.slug} value={c.slug}>{c.nameRu}</option>)}
        </select>
      </fieldset>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={sp.get('sterilized') === '1'} onChange={() => toggleFlag('sterilized')} />
        Стерилизован
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={sp.get('urgent') === '1'} onChange={() => toggleFlag('urgent')} />
        Только срочные
      </label>
    </aside>
  );
}
```

- [ ] **Step 3: Подключить панель в `web/app/(public)/animals/page.tsx`**

Загрузить города и обернуть грид в layout с панелью. Добавить запрос городов и импорт, заменить `return (...)`:

```tsx
import { FilterPanel } from '@/components/catalog/FilterPanel';
import { SortSelect } from '@/components/catalog/SortSelect';
```

```tsx
  const citiesRes = await payload.find({ collection: 'cities', limit: 200, sort: 'nameRu', depth: 0 });
  const cityOptions = citiesRes.docs.map((c: any) => ({ slug: c.slug ?? '', nameRu: c.nameRu })).filter((c: any) => c.slug);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Животные ищут дом</h1>
        <SortSelect />
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        <FilterPanel cities={cityOptions} />
        <div>
          <p className="mb-4 text-sm text-gray-500">{result.totalDocs} объявлений</p>
          <AnimalGrid animals={result.docs as any} />
          <Pagination page={result.page ?? 1} totalPages={result.totalPages ?? 1} makeHref={makeHref} />
        </div>
      </div>
    </main>
  );
```

- [ ] **Step 4: e2e тест фильтров**

`web/tests/e2e/filters.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('selecting species radio updates URL and grid', async ({ page }) => {
  await page.goto('/animals');
  await page.getByLabel('Кошки').check();
  await expect(page).toHaveURL(/species=cat/);
  await expect(page.getByText('Мурка №', { exact: false })).toBeVisible();
});

test('urgent checkbox filters to urgent animals', async ({ page }) => {
  await page.goto('/animals');
  await page.getByLabel('Только срочные').check();
  await expect(page).toHaveURL(/urgent=1/);
  await expect(page.getByText(/Осталось \d+ дн\./).first()).toBeVisible();
});

test('sort select switches to newest', async ({ page }) => {
  await page.goto('/animals');
  await page.getByLabel('Сортировка:').selectOption('new');
  await expect(page).toHaveURL(/sort=new/);
});
```

- [ ] **Step 5: Запустить e2e**

Run: `cd web && npx playwright test filters`
Expected: PASS — 3 passed.

- [ ] **Step 6: Commit**

```bash
git add web/components/catalog/FilterPanel.tsx web/components/catalog/SortSelect.tsx web/app/\(public\)/animals/page.tsx web/tests/e2e/filters.spec.ts
git commit -m "Plan 2 Task 11: FilterPanel + SortSelect с синхронизацией в URL

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Карточка животного `/animals/[city]/[species]/[slug]`

**Files:**
- Create: `web/app/(public)/animals/[city]/[species]/[slug]/page.tsx`
- Create: `web/components/catalog/PhotoCarousel.tsx`
- Create: `web/components/catalog/IntakeFacilityBlock.tsx`
- Test: `web/tests/e2e/animal-detail.spec.ts`

- [ ] **Step 1: Создать `web/components/catalog/PhotoCarousel.tsx`**

```tsx
'use client';
import { useState } from 'react';
import Image from 'next/image';

interface Photo { url: string; alt?: string }

export function PhotoCarousel({ photos }: { photos: Photo[] }) {
  const [active, setActive] = useState(0);
  if (!photos.length) return <div className="aspect-[4/3] rounded-2xl bg-gray-100" />;
  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100">
        <Image src={photos[active].url} alt={photos[active].alt ?? 'Фото животного'} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
      </div>
      {photos.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {photos.map((p, i) => (
            <button key={i} onClick={() => setActive(i)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === active ? 'border-blue-600' : 'border-transparent'}`} aria-label={`Фото ${i + 1}`}>
              <Image src={p.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Создать `web/components/catalog/IntakeFacilityBlock.tsx`**

```tsx
import { UrgencyBadge } from './UrgencyBadge';

interface Facility { name: string; address?: string | null; phone?: string | null }

export function IntakeFacilityBlock({ facility, deadline }: { facility: Facility; deadline?: string | null }) {
  return (
    <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-bold text-red-700">В службе отлова</span>
        <UrgencyBadge deadline={deadline} />
      </div>
      <p className="font-medium">{facility.name}</p>
      {facility.address && <p className="text-sm text-gray-700">{facility.address}</p>}
      {facility.phone && (
        <a href={`tel:${facility.phone}`} className="mt-3 inline-block rounded-xl bg-red-600 px-5 py-2 font-semibold text-white">
          Позвонить: {facility.phone}
        </a>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Создать `web/app/(public)/animals/[city]/[species]/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { formatAge, formatAnimalTitle } from '@/lib/format';
import { PhotoCarousel } from '@/components/catalog/PhotoCarousel';
import { IntakeFacilityBlock } from '@/components/catalog/IntakeFacilityBlock';
import type { Animal } from '@/payload-types';

async function getAnimal(slug: string): Promise<Animal | null> {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'animals',
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] },
    limit: 1,
    depth: 2,
  });
  return (res.docs[0] as Animal) ?? null;
}

export default async function AnimalDetailPage({ params }: { params: { city: string; species: string; slug: string } }) {
  const animal = await getAnimal(params.slug);
  if (!animal) notFound();

  const photos = (Array.isArray(animal.media) ? animal.media : [])
    .filter((m): m is any => m && typeof m === 'object' && (m as any).url)
    .map((m: any) => ({ url: m.sizes?.detail?.url ?? m.url, alt: m.alt }));
  const facility = animal.intakeFacility && typeof animal.intakeFacility === 'object' ? (animal.intakeFacility as any) : null;
  const cityName = animal.city && typeof animal.city === 'object' ? (animal.city as any).nameRu : '';

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-2">
      <PhotoCarousel photos={photos} />
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{formatAnimalTitle(animal)}</h1>
        <p className="text-gray-600">{[formatAge(animal.ageYears, animal.ageMonths), cityName].filter(Boolean).join(' · ')}</p>

        {facility ? (
          <IntakeFacilityBlock facility={facility} deadline={animal.legalDeadlineDate as any} />
        ) : (
          <button className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Хочу взять домой</button>
        )}

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500">Стерилизация</dt><dd>{animal.isSterilized ? 'Да' : 'Нет'}</dd>
          <dt className="text-gray-500">Прививки</dt><dd>{animal.isVaccinated ? 'Да' : 'Нет'}</dd>
        </dl>
      </div>
    </main>
  );
}
```

> `generateMetadata` и JSON-LD добавляются в Task 15.

- [ ] **Step 4: e2e тест карточки**

`web/tests/e2e/animal-detail.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('animal card links through to detail page', async ({ page }) => {
  await page.goto('/animals?species=dog');
  await page.getByText('Рекс №', { exact: false }).first().click();
  await expect(page).toHaveURL(/\/animals\/minsk\/dog\/\d+-reks/);
  await expect(page.getByRole('heading', { name: /Рекс №\d+/ })).toBeVisible();
});

test('intake-facility animal shows call block', async ({ page }) => {
  await page.goto('/animals?urgent=1');
  await page.getByText(/Осталось \d+ дн\./).first().click();
  await expect(page.getByText('В службе отлова')).toBeVisible();
});

test('unknown slug returns 404', async ({ page }) => {
  const res = await page.goto('/animals/minsk/dog/999999-nope');
  expect(res?.status()).toBe(404);
});
```

- [ ] **Step 5: Запустить e2e**

Run: `cd web && npx playwright test animal-detail`
Expected: PASS — 3 passed.

- [ ] **Step 6: Commit**

```bash
git add web/app/\(public\)/animals/\[city\] web/components/catalog/PhotoCarousel.tsx web/components/catalog/IntakeFacilityBlock.tsx web/tests/e2e/animal-detail.spec.ts
git commit -m "Plan 2 Task 12: карточка животного + carousel + блок службы отлова

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Каталог и профиль организаций

**Files:**
- Create: `web/app/(public)/organizations/page.tsx`
- Create: `web/app/(public)/organizations/[slug]/page.tsx`
- Create: `web/components/org/OrganizationCard.tsx`
- Test: `web/tests/e2e/organizations.spec.ts`

- [ ] **Step 1: Создать `web/components/org/OrganizationCard.tsx`**

```tsx
import Link from 'next/link';
import type { Organization } from '@/payload-types';

export function OrganizationCard({ org }: { org: Organization }) {
  const cityName = org.city && typeof org.city === 'object' ? (org.city as any).nameRu : '';
  return (
    <Link href={`/organizations/${org.slug}`} className="block rounded-2xl border border-gray-200 p-4 transition hover:shadow-md">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{org.name}</h3>
        {org.isVerified && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Проверено</span>}
      </div>
      {cityName && <p className="text-sm text-gray-600">{cityName}</p>}
    </Link>
  );
}
```

- [ ] **Step 2: Создать `web/app/(public)/organizations/page.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import { OrganizationCard } from '@/components/org/OrganizationCard';

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'organizations',
    where: { isPublished: { equals: true } },
    sort: 'name',
    limit: 100,
    depth: 1,
  });
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Приюты и организации</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {res.docs.map((o: any) => <OrganizationCard key={o.id} org={o} />)}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Создать `web/app/(public)/organizations/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';
import type { Organization } from '@/payload-types';

async function getOrg(slug: string): Promise<Organization | null> {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'organizations',
    where: { and: [{ slug: { equals: slug } }, { isPublished: { equals: true } }] },
    limit: 1, depth: 1,
  });
  return (res.docs[0] as Organization) ?? null;
}

export default async function OrganizationPage({ params }: { params: { slug: string } }) {
  const org = await getOrg(params.slug);
  if (!org) notFound();
  const payload = await getPayload({ config });
  const animals = await payload.find({
    collection: 'animals',
    where: { and: [{ organization: { equals: org.id } }, { status: { equals: 'published' } }] },
    sort: ['-urgencyRank', '-publishedAt'], limit: 24, depth: 1,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold">{org.name}</h1>
      {org.city && typeof org.city === 'object' && <p className="text-gray-600">{(org.city as any).nameRu}{org.address ? `, ${org.address}` : ''}</p>}
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {org.phone && <a href={`tel:${org.phone}`} className="text-blue-600">{org.phone}</a>}
        {org.websiteUrl && <a href={org.websiteUrl} className="text-blue-600" target="_blank" rel="noopener">Сайт</a>}
      </div>
      <h2 className="mb-4 mt-8 text-xl font-semibold">Питомцы организации</h2>
      <AnimalGrid animals={animals.docs as any} />
    </main>
  );
}
```

- [ ] **Step 4: e2e тест организаций**

`web/tests/e2e/organizations.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('organizations list shows seeded shelters', async ({ page }) => {
  await page.goto('/organizations');
  await expect(page.getByText('Приют «Верный друг»')).toBeVisible();
});

test('organization profile shows its animals', async ({ page }) => {
  await page.goto('/organizations');
  await page.getByText('Приют «Верный друг»').click();
  await expect(page.getByRole('heading', { name: 'Приют «Верный друг»' })).toBeVisible();
  await expect(page.getByText('Питомцы организации')).toBeVisible();
  await expect(page.getByText('Рекс №', { exact: false })).toBeVisible();
});
```

- [ ] **Step 5: Запустить e2e**

Run: `cd web && npx playwright test organizations`
Expected: PASS — 2 passed.

- [ ] **Step 6: Commit**

```bash
git add web/app/\(public\)/organizations web/components/org web/tests/e2e/organizations.spec.ts
git commit -m "Plan 2 Task 13: каталог организаций + профиль с питомцами

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Службы отлова `/intake-facilities` + страница срочных `/animals/urgent`

**Files:**
- Create: `web/app/(public)/intake-facilities/page.tsx`
- Create: `web/app/(public)/intake-facilities/[slug]/page.tsx`
- Create: `web/app/(public)/animals/urgent/page.tsx`
- Test: `web/tests/e2e/intake-facilities.spec.ts`, `web/tests/e2e/urgent.spec.ts`

- [ ] **Step 1: Создать `web/app/(public)/intake-facilities/page.tsx`**

```tsx
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';

export const dynamic = 'force-dynamic';

export default async function IntakeFacilitiesPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'intakeFacilities',
    where: { isPublished: { equals: true } },
    sort: 'name', limit: 100, depth: 1,
  });
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Службы отлова</h1>
      <p className="mb-6 text-gray-600">Животные здесь содержатся ограниченный срок по законодательству (Закон 361-З). Чем быстрее найдётся дом — тем больше шансов.</p>
      <ul className="space-y-3">
        {res.docs.map((f: any) => (
          <li key={f.id}>
            <Link href={`/intake-facilities/${f.slug}`} className="block rounded-2xl border p-4 hover:shadow-md">
              <p className="font-semibold">{f.name}</p>
              {f.city && typeof f.city === 'object' && <p className="text-sm text-gray-600">{f.city.nameRu}</p>}
              <p className="text-sm text-gray-500">Срок содержания: {f.legalHoldDays} дн.</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Создать `web/app/(public)/intake-facilities/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';

export default async function IntakeFacilityPage({ params }: { params: { slug: string } }) {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'intakeFacilities',
    where: { and: [{ slug: { equals: params.slug } }, { isPublished: { equals: true } }] },
    limit: 1, depth: 1,
  });
  const facility = res.docs[0] as any;
  if (!facility) notFound();

  const animals = await payload.find({
    collection: 'animals',
    where: { and: [{ intakeFacility: { equals: facility.id } }, { status: { equals: 'published' } }] },
    sort: ['-urgencyRank', 'legalDeadlineDate'], limit: 48, depth: 1,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold">{facility.name}</h1>
      {facility.address && <p className="text-gray-600">{facility.address}</p>}
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {facility.phone && <a href={`tel:${facility.phone}`} className="text-blue-600">{facility.phone}</a>}
      </div>
      <div className="mt-4 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4 text-sm">
        Срок содержания по закону: <strong>{facility.legalHoldDays} дней</strong>. Подробнее о правах — в разделе{' '}
        <a href="/legal/municipal-intake-rights" className="text-blue-600 underline">«Если животное попало в службу отлова»</a>.
      </div>
      <h2 className="mb-4 mt-8 text-xl font-semibold">Животные в этой службе</h2>
      <AnimalGrid animals={animals.docs as any} />
    </main>
  );
}
```

- [ ] **Step 3: Создать `web/app/(public)/animals/urgent/page.tsx`**

```tsx
import { getPayload } from 'payload';
import config from '@/payload.config';
import { AnimalCard } from '@/components/catalog/AnimalCard';
import type { Animal } from '@/payload-types';

export const dynamic = 'force-dynamic';

export default async function UrgentAnimalsPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'animals',
    where: { and: [{ status: { equals: 'published' } }, { urgencyLevel: { in: ['critical', 'high'] } }] },
    sort: ['-urgencyRank', 'legalDeadlineDate'], limit: 100, depth: 1,
  });

  // группировка по городу
  const byCity = new Map<string, Animal[]>();
  for (const a of res.docs as Animal[]) {
    const city = a.city && typeof a.city === 'object' ? (a.city as any).nameRu : 'Другое';
    if (!byCity.has(city)) byCity.set(city, []);
    byCity.get(city)!.push(a);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-red-700">Срочно нужен дом</h1>
      <p className="mb-6 text-gray-600">Этим животным осталось мало времени по срокам содержания. Поделитесь страницей — это спасает жизни.</p>
      {res.totalDocs === 0 && <p className="text-gray-500">Сейчас нет срочных животных. Это хорошая новость.</p>}
      {[...byCity.entries()].map(([city, animals]) => (
        <section key={city} className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">{city}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {animals.map((a) => <AnimalCard key={a.id} animal={a} />)}
          </div>
        </section>
      ))}
    </main>
  );
}
```

- [ ] **Step 4: e2e тесты**

`web/tests/e2e/intake-facilities.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('intake facilities list shows Minsk facility', async ({ page }) => {
  await page.goto('/intake-facilities');
  await expect(page.getByText('ГУ «Фауна города»', { exact: false })).toBeVisible();
});

test('facility page shows hold-days and its animals', async ({ page }) => {
  await page.goto('/intake-facilities');
  await page.getByText('ГУ «Фауна города»', { exact: false }).click();
  await expect(page.getByText(/Срок содержания по закону/)).toBeVisible();
  await expect(page.getByText('Животные в этой службе')).toBeVisible();
});
```

`web/tests/e2e/urgent.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('urgent page groups urgent animals by city', async ({ page }) => {
  await page.goto('/animals/urgent');
  await expect(page.getByRole('heading', { name: 'Срочно нужен дом' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Минск' })).toBeVisible();
  await expect(page.getByText(/Осталось \d+ дн\./).first()).toBeVisible();
});
```

- [ ] **Step 5: Запустить e2e**

Run: `cd web && npx playwright test intake-facilities urgent`
Expected: PASS — 3 passed.

- [ ] **Step 6: Commit**

```bash
git add web/app/\(public\)/intake-facilities web/app/\(public\)/animals/urgent web/tests/e2e/intake-facilities.spec.ts web/tests/e2e/urgent.spec.ts
git commit -m "Plan 2 Task 14: страницы служб отлова + /animals/urgent (критическая вертикаль §17.5)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: SEO — JSON-LD + метатеги для карточек и профилей

**Files:**
- Create: `web/lib/jsonld.ts`, `web/lib/meta.ts`
- Create: `web/components/JsonLd.tsx`
- Modify: detail-страницы животного и организации (`generateMetadata` + `<JsonLd>`)
- Test: `web/tests/unit/jsonld.test.ts`, `web/tests/unit/meta.test.ts`

- [ ] **Step 1: Failing тест `jsonld.ts`**

`web/tests/unit/jsonld.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildAnimalJsonLd, buildOrganizationJsonLd } from '@/lib/jsonld';

const BASE = 'https://petby.example';

describe('buildAnimalJsonLd', () => {
  it('builds a schema.org object with name, url, image', () => {
    const ld = buildAnimalJsonLd({
      name: 'Рекс', petNumber: 123, species: 'dog', slug: '123-reks',
      descriptionPlain: 'Добрый пёс', city: { slug: 'minsk', nameRu: 'Минск' },
      media: [{ url: '/m/1.jpg' }],
    } as any, BASE);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld.name).toContain('Рекс');
    expect(ld.url).toBe(`${BASE}/animals/minsk/dog/123-reks`);
    expect(ld.image).toEqual([`${BASE}/m/1.jpg`]);
    expect(ld.description).toBe('Добрый пёс');
  });
  it('absolutizes already-absolute image urls unchanged', () => {
    const ld = buildAnimalJsonLd({ name: null, petNumber: 7, species: 'cat', slug: '7-cat', city: { slug: 'brest' }, media: [{ url: 'https://cdn.x/2.jpg' }] } as any, BASE);
    expect(ld.image).toEqual(['https://cdn.x/2.jpg']);
  });
});

describe('buildOrganizationJsonLd', () => {
  it('builds an Organization node', () => {
    const ld = buildOrganizationJsonLd({ name: 'Приют', slug: 'priut', phone: '+375', city: { nameRu: 'Минск' } } as any, BASE);
    expect(ld['@type']).toBe('Organization');
    expect(ld.name).toBe('Приют');
    expect(ld.url).toBe(`${BASE}/organizations/priut`);
    expect(ld.telephone).toBe('+375');
  });
});
```

- [ ] **Step 2: Реализовать `web/lib/jsonld.ts`**

```ts
function absolutize(base: string, url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

const SPECIES_RU: Record<string, string> = { dog: 'Собака', cat: 'Кошка', other: 'Животное' };

export function buildAnimalJsonLd(a: any, base: string): Record<string, any> {
  const citySlug = a.city?.slug ?? 'by';
  const images = (Array.isArray(a.media) ? a.media : [])
    .map((m: any) => absolutize(base, typeof m === 'object' ? m.url : null))
    .filter(Boolean) as string[];
  const title = a.name ? `${a.name} №${a.petNumber}` : `№${a.petNumber}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${title} — ${SPECIES_RU[a.species] ?? 'Животное'} ищет дом`,
    url: `${base}/animals/${citySlug}/${a.species}/${a.slug}`,
    image: images,
    description: a.descriptionPlain ?? '',
    category: SPECIES_RU[a.species] ?? 'Животное',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BYN', availability: 'https://schema.org/InStock' },
  };
}

export function buildOrganizationJsonLd(o: any, base: string): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: o.name,
    url: `${base}/organizations/${o.slug}`,
    ...(o.phone ? { telephone: o.phone } : {}),
    ...(o.city?.nameRu ? { address: { '@type': 'PostalAddress', addressLocality: o.city.nameRu, addressCountry: 'BY' } } : {}),
  };
}
```

- [ ] **Step 3: Failing тест `meta.ts`**

`web/tests/unit/meta.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildAnimalMeta, buildOrgMeta } from '@/lib/meta';

const BASE = 'https://petby.example';

describe('buildAnimalMeta', () => {
  it('sets title, description, canonical and OG image', () => {
    const m = buildAnimalMeta({ name: 'Рекс', petNumber: 123, species: 'dog', slug: '123-reks', descriptionPlain: 'Добрый пёс', city: { slug: 'minsk', nameRu: 'Минск' }, media: [{ url: '/m/1.jpg' }] } as any, BASE);
    expect(m.title).toContain('Рекс');
    expect(m.alternates?.canonical).toBe(`${BASE}/animals/minsk/dog/123-reks`);
    expect((m.openGraph?.images as any)?.[0]?.url).toBe(`${BASE}/m/1.jpg`);
    expect(m.twitter?.card).toBe('summary_large_image');
  });
});

describe('buildOrgMeta', () => {
  it('sets canonical to org url', () => {
    const m = buildOrgMeta({ name: 'Приют', slug: 'priut' } as any, BASE);
    expect(m.alternates?.canonical).toBe(`${BASE}/organizations/priut`);
  });
});
```

- [ ] **Step 4: Реализовать `web/lib/meta.ts`**

```ts
import type { Metadata } from 'next';

function abs(base: string, url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith('http') ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

const SPECIES_RU: Record<string, string> = { dog: 'Собака', cat: 'Кошка', other: 'Животное' };

export function buildAnimalMeta(a: any, base: string): Metadata {
  const citySlug = a.city?.slug ?? 'by';
  const cityName = a.city?.nameRu ?? '';
  const title = a.name ? `${a.name} №${a.petNumber}` : `№${a.petNumber}`;
  const fullTitle = `${title} — ${SPECIES_RU[a.species] ?? 'Животное'} ищет дом${cityName ? ` · ${cityName}` : ''}`;
  const desc = (a.descriptionPlain ?? '').slice(0, 160) || 'Помогите найти дом этому животному.';
  const url = `${base}/animals/${citySlug}/${a.species}/${a.slug}`;
  const firstImg = Array.isArray(a.media) && a.media[0] && typeof a.media[0] === 'object' ? abs(base, a.media[0].url) : undefined;
  return {
    title: fullTitle,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: fullTitle, description: desc, url, type: 'website', images: firstImg ? [{ url: firstImg }] : [] },
    twitter: { card: 'summary_large_image', title: fullTitle, description: desc, images: firstImg ? [firstImg] : [] },
  };
}

export function buildOrgMeta(o: any, base: string): Metadata {
  const url = `${base}/organizations/${o.slug}`;
  const desc = `Приют ${o.name}: животные ищут дом, как помочь.`;
  return {
    title: `${o.name} — приют`,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: o.name, description: desc, url, type: 'website' },
  };
}
```

- [ ] **Step 5: Запустить unit-тесты SEO**

Run: `cd web && npm test -- jsonld meta`
Expected: PASS — jsonld: 3, meta: 2.

- [ ] **Step 6: Создать `web/components/JsonLd.tsx`**

```tsx
export function JsonLd({ data }: { data: Record<string, any> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
```

- [ ] **Step 7: Подключить в карточку животного**

В `web/app/(public)/animals/[city]/[species]/[slug]/page.tsx` добавить импорты и `generateMetadata`, отрендерить `<JsonLd>`:

```tsx
import type { Metadata } from 'next';
import { buildAnimalMeta } from '@/lib/meta';
import { buildAnimalJsonLd } from '@/lib/jsonld';
import { JsonLd } from '@/components/JsonLd';

const BASE = process.env.APP_URL ?? 'http://localhost:3000';

export async function generateMetadata({ params }: { params: { city: string; species: string; slug: string } }): Promise<Metadata> {
  const animal = await getAnimal(params.slug);
  if (!animal) return { title: 'Не найдено' };
  return buildAnimalMeta(animal, BASE);
}
```

Внутри `return (...)` страницы первым элементом `<main>` добавить:

```tsx
      <JsonLd data={buildAnimalJsonLd(animal, BASE)} />
```

- [ ] **Step 8: Подключить в профиль организации**

В `web/app/(public)/organizations/[slug]/page.tsx` аналогично:

```tsx
import type { Metadata } from 'next';
import { buildOrgMeta } from '@/lib/meta';
import { buildOrganizationJsonLd } from '@/lib/jsonld';
import { JsonLd } from '@/components/JsonLd';

const BASE = process.env.APP_URL ?? 'http://localhost:3000';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const org = await getOrg(params.slug);
  if (!org) return { title: 'Не найдено' };
  return buildOrgMeta(org, BASE);
}
```

И первым элементом `<main>`: `<JsonLd data={buildOrganizationJsonLd(org, BASE)} />`.

- [ ] **Step 9: Smoke-проверка метатегов**

Run: `cd web && npm run dev`
Открыть карточку животного, в DevTools → Elements проверить `<title>`, `<meta property="og:image">`, `<link rel="canonical">`, `<script type="application/ld+json">`.

- [ ] **Step 10: Commit**

```bash
git add web/lib/jsonld.ts web/lib/meta.ts web/components/JsonLd.tsx web/app/\(public\)/animals/\[city\] web/app/\(public\)/organizations/\[slug\] web/tests/unit/jsonld.test.ts web/tests/unit/meta.test.ts
git commit -m "Plan 2 Task 15: SEO — JSON-LD (Product/Organization) + OG/Twitter + canonical

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Sitemap (split) + robots.txt

**Files:**
- Create: `web/lib/sitemap-data.ts`
- Create: `web/app/sitemap.ts`
- Create: `web/app/robots.ts`
- Test: `web/tests/unit/sitemap-data.test.ts`

- [ ] **Step 1: Failing тест `sitemap-data.ts`**

`web/tests/unit/sitemap-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SITEMAP_CHUNK, sitemapShards, animalSitemapEntry } from '@/lib/sitemap-data';

describe('sitemapShards', () => {
  it('returns one shard per collection chunk plus static', () => {
    const shards = sitemapShards({ animals: 100, organizations: 5, intakeFacilities: 8 });
    expect(shards).toContainEqual({ id: 'static' });
    expect(shards.filter((s) => s.id.startsWith('animals')).length).toBe(Math.ceil(100 / SITEMAP_CHUNK));
  });
  it('splits large animal counts into multiple shards', () => {
    const shards = sitemapShards({ animals: SITEMAP_CHUNK * 2 + 1, organizations: 0, intakeFacilities: 0 });
    expect(shards.filter((s) => s.id.startsWith('animals')).length).toBe(3);
  });
});

describe('animalSitemapEntry', () => {
  it('builds url + lastModified + image', () => {
    const e = animalSitemapEntry({ slug: '1-reks', species: 'dog', updatedAt: '2026-05-01T00:00:00Z', city: { slug: 'minsk' }, media: [{ url: 'https://cdn/1.jpg' }] } as any, 'https://b');
    expect(e.url).toBe('https://b/animals/minsk/dog/1-reks');
    expect(e.lastModified).toBe('2026-05-01T00:00:00Z');
    expect((e as any).images).toEqual(['https://cdn/1.jpg']);
  });
});
```

- [ ] **Step 2: Реализовать `web/lib/sitemap-data.ts`**

```ts
import type { MetadataRoute } from 'next';
import { animalUrl } from '@/lib/animal-url';

export const SITEMAP_CHUNK = 5000;

export interface ShardId { id: string }

export function sitemapShards(counts: { animals: number; organizations: number; intakeFacilities: number }): ShardId[] {
  const shards: ShardId[] = [{ id: 'static' }];
  const add = (prefix: string, total: number) => {
    for (let i = 0; i < Math.ceil(total / SITEMAP_CHUNK); i++) shards.push({ id: `${prefix}-${i}` });
  };
  add('animals', counts.animals);
  if (counts.organizations) shards.push({ id: 'organizations-0' });
  if (counts.intakeFacilities) shards.push({ id: 'intake-0' });
  return shards;
}

export function animalSitemapEntry(a: any, base: string): MetadataRoute.Sitemap[number] {
  const images = (Array.isArray(a.media) ? a.media : [])
    .map((m: any) => (typeof m === 'object' ? m.url : null))
    .filter(Boolean) as string[];
  return {
    url: `${base}${animalUrl(a)}`,
    lastModified: a.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
    ...(images.length ? { images } : {}),
  };
}
```

- [ ] **Step 3: Запустить — pass**

Run: `cd web && npm test -- sitemap-data`
Expected: PASS — 3 passed.

- [ ] **Step 4: Реализовать `web/app/sitemap.ts` (split через generateSitemaps)**

```ts
import type { MetadataRoute } from 'next';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { SITEMAP_CHUNK, animalSitemapEntry } from '@/lib/sitemap-data';

const BASE = process.env.APP_URL ?? 'http://localhost:3000';

export async function generateSitemaps() {
  const payload = await getPayload({ config });
  const { totalDocs } = await payload.count({ collection: 'animals', where: { status: { equals: 'published' } } });
  const ids: { id: string }[] = [{ id: 'static' }, { id: 'organizations-0' }, { id: 'intake-0' }];
  for (let i = 0; i < Math.max(1, Math.ceil(totalDocs / SITEMAP_CHUNK)); i++) ids.push({ id: `animals-${i}` });
  return ids;
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config });

  if (id === 'static') {
    return ['', '/animals', '/animals/urgent', '/organizations', '/intake-facilities', '/report-cruelty', '/about', '/contacts']
      .map((p) => ({ url: `${BASE}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.6 }));
  }

  if (id === 'organizations-0') {
    const res = await payload.find({ collection: 'organizations', where: { isPublished: { equals: true } }, limit: SITEMAP_CHUNK, depth: 0 });
    return res.docs.map((o: any) => ({ url: `${BASE}/organizations/${o.slug}`, lastModified: o.updatedAt, changeFrequency: 'weekly', priority: 0.6 }));
  }

  if (id === 'intake-0') {
    const res = await payload.find({ collection: 'intakeFacilities', where: { isPublished: { equals: true } }, limit: SITEMAP_CHUNK, depth: 0 });
    return res.docs.map((f: any) => ({ url: `${BASE}/intake-facilities/${f.slug}`, lastModified: f.updatedAt, changeFrequency: 'weekly', priority: 0.5 }));
  }

  // animals-N
  const page = parseInt(id.split('-')[1] ?? '0', 10) + 1;
  const res = await payload.find({
    collection: 'animals',
    where: { status: { equals: 'published' } },
    limit: SITEMAP_CHUNK, page, depth: 1, sort: '-updatedAt',
  });
  return res.docs.map((a: any) => animalSitemapEntry(a, BASE));
}
```

- [ ] **Step 5: Реализовать `web/app/robots.ts`**

```ts
import type { MetadataRoute } from 'next';

const BASE = process.env.APP_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/me', '/org'] }],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
```

- [ ] **Step 6: Smoke-проверка**

Run: `cd web && npm run dev`
Открыть `/sitemap.xml` (индекс), `/sitemap/animals-0.xml`, `/robots.txt` — убедиться, что URL корректны и абсолютны, `disallow` содержит `/admin`.

- [ ] **Step 7: Commit**

```bash
git add web/lib/sitemap-data.ts web/app/sitemap.ts web/app/robots.ts web/tests/unit/sitemap-data.test.ts
git commit -m "Plan 2 Task 16: split-sitemap (animals/orgs/intake + image) + robots.txt

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

### Spec coverage check

| Требование spec | Задача |
|---|---|
| §6 Organization | Task 4 |
| §6 Animal (полный набор полей) | Task 6 |
| §6 City.slug (для URL) | Task 6 (modify) |
| §5/§17.10 `/animals`, `/animals/[city]/[species]/[slug]` | Task 10, 12 |
| §5 `/organizations`, `/organizations/[slug]` | Task 13 |
| §5/§17.10 `/intake-facilities`, `/intake-facilities/[slug]`, `/animals/urgent` | Task 14 |
| §7.6 фильтры (вид/пол/возраст/размер/город/стерилизация/тип владельца) + URL + сортировка + pagination 24 | Task 9, 10, 11 |
| §16.7 структурированные URL + canonical + image sitemap | Task 12, 15, 16 |
| §16.7 `lostOrFound` (Найдено/Потеряно) | Task 6 (поле) + Task 9 (фильтр) |
| §17.3 IntakeFacility + `legalHoldDays` в БД | Task 5 |
| §17.4 `intakeFacility`/`legalDeadlineDate`/`urgencyLevel`/`is_at_risk` | Task 6 (поля + хук) |
| §17.5 бейджи срочности + countdown + блок «В службе отлова» + CTA «Позвонить» | Task 10 (UrgencyBadge), 12 (IntakeFacilityBlock) |
| §17.5 дефолтная сортировка critical→high→new | Task 9 (sortForFilters + urgencyRank) |
| Поиск (Postgres FTS) | Task 7 + Task 10 (интеграция `q`) |
| Перенос `pet_counter.txt` → БД | Task 2 |
| SEO JSON-LD (Organization + animal custom) + OG/Twitter | Task 15 |
| sitemap split + robots | Task 16 |
| §16.8 IntakeFacility в фазе 1 | Task 5 |

**Намеренно НЕ в этом плане (→ Plan 3 «Submission & Org cabinet»):** citizen wizard `/me/animals/new`, кабинет `/org/[slug]/*`, CRUD животных силами org_admin, `AdoptionInquiry` + flow «Хочу взять домой» (в Task 12 это пока статичная кнопка-заглушка), Donation/ЕРИП, CrueltyReport-форма, BlogPost/LegalArticle (включая статью `municipal-intake-rights`, на которую ссылается Task 14 — до её создания ссылка ведёт на 404, это ожидаемо). Cron `urgency_recalc_daily` и авто-алерты — Plan 4.

### Type consistency

- `UrgencyLevel`, `URGENCY_RANK` определены в `lib/urgency.ts`, используются в `animal-hooks.ts` и косвенно в `filters.ts` (значения `'critical'|'high'`).
- `AnimalFilters` определён в `filters.ts`, потребляется страницей каталога и `FilterPanel`/`SortSelect` через URL (не импортируют тип, работают со строками — намеренно).
- `animalUrl` (`lib/animal-url.ts`) используется в `AnimalCard`, `jsonld.ts`, `sitemap-data.ts` — единый формат `/animals/[city]/[species]/[slug]`.
- `searchAnimalIds`/`nextPetNumber` обращаются к `payload.db.drizzle.execute` — один и тот же низкоуровневый доступ; имена snake_case колонок (`description_plain`, `search_vector`) согласованы между миграцией (Task 7) и SQL (Task 7).
- Сортировки по `['-urgencyRank', ...]` в Task 11 (page), Task 13, Task 14 идентичны и опираются на поле `urgencyRank` из Task 6.

### Placeholder scan

Все Step-блоки содержат конкретный код или shell-команды. Единственная намеренная «заглушка» — кнопка «Хочу взять домой» в Task 12 (полный flow в Plan 3) и ссылка на юр.статью в Task 14 (статья создаётся в Plan блога/legal). Контакты служб отлова в seed (Task 8) — заглушки уровня MVP, уточняются в outreach фазы 0 (зафиксировано в spec §17.7).

### Известные допущения для исполнителя

- `searchParams`/`params` типизированы как синхронные объекты (Next.js 14, как в Plan 1). При переходе на Next.js 15 обернуть в `await` и сменить типы на `Promise<...>`.
- Имена колонок в FTS-миграции (Task 7) предполагают дефолтный snake_case Payload Postgres-adapter. Сверить `\d animals` в psql перед применением; при расхождении поправить SQL миграции.
- `payload.count(...)` (Task 16) доступен в Payload 3; если версия не поддерживает — заменить на `find({ limit: 0 }).totalDocs`.

---

## Execution Handoff

План сохранён в `docs/superpowers/plans/2026-05-28-plan-2-catalog.md`. Два варианта исполнения:

1. **Subagent-Driven (рекомендую)** — свежий subagent на каждую из 16 задач, две стадии review между ними. Задачи 1-9 (lib + коллекции + FTS + seed) почти независимы и идут быстро; задачи 10-16 (страницы) зависят от коллекций и seed. **REQUIRED SUB-SKILL:** `superpowers:subagent-driven-development`.

2. **Inline Execution** — выполнение в этой же сессии через `superpowers:executing-plans`, batch с checkpoint'ами. **REQUIRED SUB-SKILL:** `superpowers:executing-plans`.

Какой подход?
