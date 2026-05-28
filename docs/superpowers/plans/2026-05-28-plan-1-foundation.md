# Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Поднять Next.js 14 + Payload CMS 3 на Railway с Postgres, R2 storage, двумя способами авторизации (Telegram OAuth + email/password), базовыми моделями (User, City, Media, AuditLog, NotificationPreference), CI/CD и observability — готовый каркас для разработки каталога в Plan 2.

**Architecture:** Next.js 14 App Router монолитно держит публичные страницы и Payload-админку. Payload владеет схемой БД, auth, media pipeline. Postgres на Railway (managed). Медиа в Cloudflare R2 через `@payloadcms/storage-s3`. Auth: Payload built-in JWT cookies + кастомный Telegram-endpoint для валидации widget hash. CI/CD: GitHub Actions → Railway deploy on push to `main`.

**Tech Stack:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Payload CMS 3 + Postgres 16 + Cloudflare R2 + Resend + Sentry + Plausible + Vitest + Playwright + GitHub Actions + Railway.

**Roadmap (весь MVP, 6 планов):**

1. **Foundation** (этот план)
2. **Catalog + Orgs** — Animal-каталог, фильтры, FTS, страница карточки, профили организаций, IntakeFacility, кабинет org_admin
3. **Posting + Adoption + Donations** — Wizard размещения, модерация, AdoptionInquiry, Donations через ExpressPay
4. **Critical Urgency** — `urgency_recalc_daily` cron, `/animals/urgent`, hero-блок, email-алерты, auto-post в TG
5. **Content + Safety** — Blog, LegalArticle, HelpArticle, Glossary, FAQ, About, report-cruelty, sitemap, OG, JSON-LD, Turnstile, rate limit, 2FA, ReportFlag
6. **Quality + Launch** — i18n, axe-core CI, Lighthouse CI, «Шрифт крупнее», status page, Tawk.to, beta, production payments

**Repo:** монорепо в текущем `Pet project/`. Старый `bot.py` (Pet BOT) остаётся в корне, новое веб-приложение поднимается в `web/`.

---

## File Structure (Plan 1)

```
web/                                   # Новое веб-приложение
  ├── app/                             # Next.js App Router
  │   ├── (public)/
  │   │   ├── layout.tsx               # Публичный layout (header/footer)
  │   │   ├── page.tsx                 # Главная (заглушка)
  │   │   ├── login/page.tsx
  │   │   ├── register/page.tsx
  │   │   ├── verify-email/page.tsx
  │   │   ├── forgot-password/page.tsx
  │   │   ├── reset-password/page.tsx
  │   │   ├── privacy/page.tsx
  │   │   ├── terms/page.tsx
  │   │   ├── cookie-policy/page.tsx
  │   │   └── not-found.tsx            # 404
  │   ├── (auth)/
  │   │   └── auth/telegram/callback/route.ts
  │   ├── api/
  │   │   ├── auth/telegram/verify/route.ts
  │   │   ├── auth/magic-link/request/route.ts
  │   │   ├── auth/magic-link/consume/route.ts
  │   │   ├── account/delete/route.ts
  │   │   ├── account/export/route.ts
  │   │   └── health/route.ts
  │   └── (payload)/                   # Payload CMS routes
  │       └── admin/
  ├── collections/
  │   ├── Users.ts
  │   ├── Cities.ts
  │   ├── Media.ts
  │   ├── AuditLogs.ts
  │   └── NotificationPreferences.ts
  ├── lib/
  │   ├── auth/
  │   │   ├── telegram-validator.ts    # Валидация TG hash
  │   │   ├── magic-link.ts
  │   │   ├── account-linking.ts
  │   │   └── rbac.ts                  # Role-based access
  │   ├── audit/
  │   │   └── log.ts
  │   ├── email/
  │   │   ├── resend-client.ts
  │   │   └── templates/
  │   │       ├── welcome.tsx
  │   │       ├── email-verification.tsx
  │   │       ├── password-reset.tsx
  │   │       └── magic-link.tsx
  │   ├── storage/
  │   │   └── r2-adapter.ts
  │   └── seeds/
  │       └── cities-by.ts             # ~120 городов РБ
  ├── components/
  │   ├── ui/                          # shadcn/ui components
  │   ├── layout/
  │   │   ├── Header.tsx
  │   │   └── Footer.tsx
  │   ├── auth/
  │   │   ├── LoginForm.tsx
  │   │   ├── RegisterForm.tsx
  │   │   ├── TelegramLoginButton.tsx
  │   │   └── MagicLinkForm.tsx
  │   └── compliance/
  │       └── CookieBanner.tsx
  ├── tests/
  │   ├── unit/
  │   │   ├── auth/
  │   │   │   ├── telegram-validator.test.ts
  │   │   │   ├── magic-link.test.ts
  │   │   │   ├── account-linking.test.ts
  │   │   │   └── rbac.test.ts
  │   │   ├── audit/log.test.ts
  │   │   └── storage/r2-adapter.test.ts
  │   └── e2e/
  │       ├── login.spec.ts
  │       ├── register.spec.ts
  │       ├── account-delete.spec.ts
  │       └── account-export.spec.ts
  ├── payload.config.ts
  ├── next.config.mjs
  ├── tailwind.config.ts
  ├── tsconfig.json
  ├── vitest.config.ts
  ├── playwright.config.ts
  ├── .env.example
  └── package.json

.github/workflows/
  ├── ci.yml                            # Lint + typecheck + unit + e2e + axe
  └── deploy.yml                        # Railway deploy on main

railway.json                            # Railway config
```

---

## Tasks

### Task 1: Initialize Next.js 14 + TypeScript + Tailwind

**Files:**
- Create: `web/` (новая директория)
- Create: `web/package.json`, `web/next.config.mjs`, `web/tsconfig.json`, `web/tailwind.config.ts`, `web/app/layout.tsx`, `web/app/(public)/page.tsx`

- [ ] **Step 1: Создать Next.js app**

```bash
npx create-next-app@latest web --typescript --tailwind --app --use-npm --import-alias "@/*" --no-eslint --no-src-dir
```

Ожидаемо: создаётся `web/` с базовым шаблоном.

- [ ] **Step 2: Обновить package.json**

В `web/package.json` обновить:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 3: Установить shadcn/ui CLI и базовые компоненты**

```bash
cd web && npx shadcn@latest init -d
npx shadcn@latest add button input label form card sonner dialog dropdown-menu sheet
```

- [ ] **Step 4: Smoke-test dev сервера**

```bash
cd web && npm run dev
```

Ожидаемо: `http://localhost:3000` показывает страницу Next.js, нет TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add web/ .gitignore
git commit -m "Plan 1 Task 1: инициализация Next.js 14 + Tailwind + shadcn/ui

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Настроить Vitest и Playwright

**Files:**
- Create: `web/vitest.config.ts`, `web/playwright.config.ts`
- Create: `web/tests/unit/sample.test.ts` (smoke)
- Create: `web/tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Установить тестовые зависимости**

```bash
cd web && npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Создать `web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 3: Создать `web/tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Создать smoke unit-тест `web/tests/unit/sample.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('passes', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Запустить unit-тест**

```bash
cd web && npm test
```

Ожидаемо: 1 passed.

- [ ] **Step 6: Создать `web/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 7: Создать smoke e2e-тест `web/tests/e2e/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Pet/i);
});
```

- [ ] **Step 8: Запустить e2e**

```bash
cd web && npm run test:e2e
```

Ожидаемо: 1 passed (title пока default Next.js — нужно изменить в Task 3).

- [ ] **Step 9: Commit**

```bash
git add web/vitest.config.ts web/playwright.config.ts web/tests/ web/package.json web/package-lock.json
git commit -m "Plan 1 Task 2: Vitest + Playwright + smoke-тесты

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Базовый layout и метатеги

**Files:**
- Modify: `web/app/layout.tsx`
- Modify: `web/app/(public)/page.tsx`
- Create: `web/components/layout/Header.tsx`, `web/components/layout/Footer.tsx`
- Create: `web/app/(public)/layout.tsx`, `web/app/not-found.tsx`, `web/app/error.tsx`

- [ ] **Step 1: Написать failing e2e тест для базового UI**

В `web/tests/e2e/smoke.spec.ts` добавить:

```ts
test('home page has header and footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('404 page renders for unknown route', async ({ page }) => {
  await page.goto('/nonexistent-page');
  await expect(page.getByText(/404|не найдено/i)).toBeVisible();
});
```

- [ ] **Step 2: Запустить — должно failing**

```bash
cd web && npm run test:e2e
```

Ожидаемо: 2 failed.

- [ ] **Step 3: Создать `web/components/layout/Header.tsx`**

```tsx
import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between" aria-label="Главная навигация">
        <Link href="/" className="text-xl font-bold">
          Pet Aggregator BY
        </Link>
        <div className="flex gap-4">
          <Link href="/animals">Животные</Link>
          <Link href="/organizations">Приюты</Link>
          <Link href="/help">Помочь</Link>
          <Link href="/legal">Юр.помощь</Link>
          <Link href="/login">Войти</Link>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 4: Создать `web/components/layout/Footer.tsx`**

```tsx
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t mt-16 py-8 text-sm text-muted-foreground">
      <div className="max-w-6xl mx-auto px-4 grid gap-4 md:grid-cols-4">
        <div>
          <h3 className="font-semibold mb-2">О проекте</h3>
          <ul className="space-y-1">
            <li><Link href="/about">О нас</Link></li>
            <li><Link href="/contacts">Контакты</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Юридическое</h3>
          <ul className="space-y-1">
            <li><Link href="/privacy">Политика конфиденциальности</Link></li>
            <li><Link href="/terms">Условия использования</Link></li>
            <li><Link href="/cookie-policy">Cookie</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Помощь</h3>
          <ul className="space-y-1">
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/report-cruelty">Сообщить о жестокости</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Связь</h3>
          <p>info@pet-aggregator.by</p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Создать `web/app/(public)/layout.tsx`**

```tsx
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 6: Обновить `web/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: { default: 'Pet Aggregator BY — найди питомца', template: '%s | Pet Aggregator BY' },
  description: 'Общенациональный белорусский агрегатор животных для пристройства, помощи приютам и юридической помощи.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru-BY">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Обновить `web/app/(public)/page.tsx`**

```tsx
export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Найди своего питомца</h1>
      <p className="text-lg text-muted-foreground">
        Помоги животным Беларуси: возьми домой, задонатируй, расскажи о жестокости.
      </p>
    </div>
  );
}
```

- [ ] **Step 8: Создать `web/app/not-found.tsx`**

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-24 text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl mb-8">Страница не найдена</p>
        <Button asChild>
          <Link href="/">На главную</Link>
        </Button>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 9: Создать `web/app/error.tsx`**

```tsx
'use client';
import { Button } from '@/components/ui/button';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="max-w-6xl mx-auto px-4 py-24 text-center">
      <h1 className="text-6xl font-bold mb-4">500</h1>
      <p className="text-xl mb-8">Что-то пошло не так</p>
      <Button onClick={reset}>Попробовать снова</Button>
    </main>
  );
}
```

- [ ] **Step 10: Запустить e2e — должны pass**

```bash
cd web && npm run test:e2e
```

Ожидаемо: 4 passed (smoke + header/footer + 404).

- [ ] **Step 11: Commit**

```bash
git add web/app web/components/layout web/tests
git commit -m "Plan 1 Task 3: layout (header, footer, 404, 500), метатеги ru-BY

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Установить и сконфигурировать Payload CMS 3

**Files:**
- Create: `web/payload.config.ts`
- Create: `web/app/(payload)/admin/[[...segments]]/page.tsx` (Payload route)
- Create: `web/app/(payload)/api/[...slug]/route.ts` (Payload REST API route)
- Modify: `web/next.config.mjs`
- Modify: `web/package.json`
- Modify: `web/tsconfig.json` (добавить алиас `@payload-config`)
- Create: `web/.env.example`

- [ ] **Step 1: Установить Payload**

```bash
cd web && npm install payload @payloadcms/db-postgres @payloadcms/next @payloadcms/richtext-lexical @payloadcms/storage-s3
```

- [ ] **Step 1b: Добавить алиас `@payload-config` в `web/tsconfig.json`**

В `compilerOptions.paths` (рядом с уже существующим `"@/*": ["./*"]` от create-next-app) добавить:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@payload-config": ["./payload.config.ts"]
    }
  }
}
```

Без этого алиаса не разрешатся импорты `import config from '@payload-config'` в `page.tsx` и `route.ts`.

- [ ] **Step 2: Создать `web/.env.example`**

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pet_aggregator

# Payload
PAYLOAD_SECRET=replace-with-32-char-random

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Telegram (для OAuth widget; токен из BotFather, не от Pet BOT)
TELEGRAM_BOT_USERNAME=
TELEGRAM_BOT_TOKEN=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@pet-aggregator.by

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=pet-aggregator-media
R2_PUBLIC_URL=https://media.pet-aggregator.by

# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Plausible
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=pet-aggregator.by
```

Скопировать в `web/.env.local` и заполнить локальными значениями (без коммита).

- [ ] **Step 3: Создать `web/payload.config.ts` (минимальный)**

```ts
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    user: 'users',
    meta: { titleSuffix: ' — Pet Aggregator BY Admin' },
  },
  collections: [
    {
      slug: 'users',
      auth: { tokenExpiration: 60 * 60 * 24 * 30, verify: true },
      fields: [
        { name: 'firstName', type: 'text' },
        { name: 'lastName', type: 'text' },
      ],
    },
  ],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
  }),
});
```

- [ ] **Step 4: Обновить `web/next.config.mjs` под Payload**

```js
import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { reactCompiler: false },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'media.pet-aggregator.by' },
    ],
  },
};

export default withPayload(nextConfig);
```

- [ ] **Step 5: Добавить Payload routes**

```bash
cd web && mkdir -p "app/(payload)/admin/[[...segments]]" "app/(payload)/api/[...slug]"
```

Создать `web/app/(payload)/admin/[[...segments]]/page.tsx`:

```tsx
import { generatePageMetadata, RootPage } from '@payloadcms/next/views';
import config from '@payload-config';

import { importMap } from '../importMap.js';

type Args = { params: Promise<{ segments: string[] }>; searchParams: Promise<{ [key: string]: string | string[] }> };

export const generateMetadata = ({ params, searchParams }: Args) =>
  generatePageMetadata({ config, params, searchParams });

const Page = ({ params, searchParams }: Args) =>
  RootPage({ config, params, searchParams, importMap });

export default Page;
```

Создать `web/app/(payload)/api/[...slug]/route.ts`:

```ts
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST } from '@payloadcms/next/routes';
import config from '@payload-config';

export const GET = REST_GET(config);
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const OPTIONS = REST_OPTIONS(config);
```

- [ ] **Step 6: Запустить Postgres локально через docker**

Создать `docker-compose.yml` в корне репо:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: pet
      POSTGRES_PASSWORD: pet
      POSTGRES_DB: pet_aggregator
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

```bash
docker compose up -d postgres
```

Установить `web/.env.local`:
```env
DATABASE_URL=postgresql://pet:pet@localhost:5432/pet_aggregator
PAYLOAD_SECRET=local-dev-secret-replace-in-prod-32chars
```

- [ ] **Step 7: Сгенерировать importMap и запустить dev**

```bash
cd web && npx payload generate:importmap && npm run dev
```

- [ ] **Step 8: Открыть `http://localhost:3000/admin`**

Ожидаемо: страница регистрации первого admin'а. Зарегистрировать локального admin'а (email/пароль). После регистрации — попадаешь в Payload-админку.

- [ ] **Step 9: Commit**

```bash
git add web/payload.config.ts web/next.config.mjs web/.env.example web/app/\(payload\) docker-compose.yml web/package.json web/package-lock.json
git commit -m "Plan 1 Task 4: Payload CMS 3 + Postgres + базовая Users-коллекция

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Расширить Users-коллекцию под наш домен

**Files:**
- Create: `web/collections/Users.ts`
- Modify: `web/payload.config.ts`
- Create: `web/tests/unit/auth/rbac.test.ts`
- Create: `web/lib/auth/rbac.ts`

- [ ] **Step 1: Написать failing тест RBAC**

`web/tests/unit/auth/rbac.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canManageOrganization, canModerateContent, isAdmin } from '@/lib/auth/rbac';

describe('rbac', () => {
  describe('isAdmin', () => {
    it('returns true for superadmin', () => {
      expect(isAdmin({ role: 'superadmin' } as any)).toBe(true);
    });
    it('returns true for moderator', () => {
      expect(isAdmin({ role: 'moderator' } as any)).toBe(true);
    });
    it('returns false for citizen', () => {
      expect(isAdmin({ role: 'citizen' } as any)).toBe(false);
    });
    it('returns false for null user', () => {
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe('canModerateContent', () => {
    it('allows moderator and superadmin', () => {
      expect(canModerateContent({ role: 'moderator' } as any)).toBe(true);
      expect(canModerateContent({ role: 'superadmin' } as any)).toBe(true);
    });
    it('denies citizen and org_admin', () => {
      expect(canModerateContent({ role: 'citizen' } as any)).toBe(false);
      expect(canModerateContent({ role: 'org_admin' } as any)).toBe(false);
    });
  });

  describe('canManageOrganization', () => {
    it('superadmin can manage any org', () => {
      const user = { role: 'superadmin', id: 'u1', organizations: [] } as any;
      expect(canManageOrganization(user, 'org-x')).toBe(true);
    });
    it('org_admin can manage own org', () => {
      const user = { role: 'org_admin', id: 'u1', organizations: ['org-x'] } as any;
      expect(canManageOrganization(user, 'org-x')).toBe(true);
    });
    it('org_admin cannot manage other orgs', () => {
      const user = { role: 'org_admin', id: 'u1', organizations: ['org-x'] } as any;
      expect(canManageOrganization(user, 'org-y')).toBe(false);
    });
    it('citizen cannot manage orgs', () => {
      const user = { role: 'citizen', id: 'u1', organizations: [] } as any;
      expect(canManageOrganization(user, 'org-x')).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Запустить — failing**

```bash
cd web && npm test -- rbac
```

Ожидаемо: FAIL (модуль не существует).

- [ ] **Step 3: Создать `web/lib/auth/rbac.ts`**

```ts
import type { User } from '@/payload-types';

export type UserLike = Pick<User, 'role' | 'id'> & {
  organizations?: Array<string | { id: string }>;
};

export function isAdmin(user: UserLike | null): boolean {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'moderator';
}

export function canModerateContent(user: UserLike | null): boolean {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'moderator';
}

export function canManageOrganization(user: UserLike | null, orgId: string): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if (user.role !== 'org_admin') return false;
  const orgIds = (user.organizations || []).map((o) => typeof o === 'string' ? o : o.id);
  return orgIds.includes(orgId);
}
```

- [ ] **Step 4: Создать `web/collections/Users.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30,
    verify: true,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'firstName', 'role', 'createdAt'] },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (isAdmin(user as any)) return true;
      return { id: { equals: user.id } };
    },
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (isAdmin(user as any)) return true;
      return { id: { equals: user.id } };
    },
    delete: ({ req: { user } }) => isAdmin(user as any),
    create: () => true,
  },
  fields: [
    { name: 'firstName', type: 'text', required: false },
    { name: 'lastName', type: 'text', required: false },
    { name: 'photoUrl', type: 'text', required: false },
    { name: 'phone', type: 'text', required: false },
    { name: 'telegramId', type: 'text', unique: true, index: true, admin: { readOnly: true } },
    { name: 'telegramUsername', type: 'text' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'citizen',
      options: [
        { label: 'Гость', value: 'guest' },
        { label: 'Гражданин', value: 'citizen' },
        { label: 'Админ организации', value: 'org_admin' },
        { label: 'Модератор', value: 'moderator' },
        { label: 'Суперадмин', value: 'superadmin' },
      ],
      access: {
        update: ({ req: { user } }) => user?.role === 'superadmin',
      },
    },
    { name: 'isBlocked', type: 'checkbox', defaultValue: false, access: { update: ({ req: { user } }) => isAdmin(user as any) } },
    { name: 'lastSeenAt', type: 'date', admin: { readOnly: true } },
    { name: 'ageConfirmed', type: 'checkbox', required: true, defaultValue: false, admin: { description: 'Подтверждено что 14+' } },
    { name: 'consentPersonalData', type: 'checkbox', required: true, defaultValue: false, admin: { description: 'Согласие 99-З' } },
  ],
};
```

- [ ] **Step 5: Подключить коллекцию в `web/payload.config.ts`**

```ts
import { Users } from './collections/Users';
// ...
collections: [Users],
```

Удалить inline-определение `users` если оно осталось.

- [ ] **Step 6: Сгенерировать types**

```bash
cd web && npx payload generate:types
```

Ожидаемо: появляется `web/payload-types.ts` с типом `User`.

- [ ] **Step 7: Запустить тесты RBAC**

```bash
cd web && npm test -- rbac
```

Ожидаемо: 8 passed.

- [ ] **Step 8: Запустить миграцию схемы**

```bash
cd web && npm run dev
```

Payload автоматически применит изменения схемы (development mode). Открыть `/admin` — проверить что Users-коллекция показывает новые поля.

- [ ] **Step 9: Commit**

```bash
git add web/collections/Users.ts web/lib/auth/rbac.ts web/payload-types.ts web/payload.config.ts web/tests/unit/auth
git commit -m "Plan 1 Task 5: расширенная Users-коллекция с RBAC + 5 ролей

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Cities-коллекция + seed РБ

**Files:**
- Create: `web/collections/Cities.ts`
- Create: `web/lib/seeds/cities-by.ts`
- Create: `web/scripts/seed.ts`
- Create: `web/tests/unit/seeds/cities-by.test.ts`
- Modify: `web/payload.config.ts`, `web/package.json`

- [ ] **Step 1: Failing тест на seed-данные**

`web/tests/unit/seeds/cities-by.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { citiesBY } from '@/lib/seeds/cities-by';

describe('cities-by seed', () => {
  it('contains all 6 region centers', () => {
    const regionCenters = ['Минск', 'Брест', 'Витебск', 'Гомель', 'Гродно', 'Могилёв'];
    for (const name of regionCenters) {
      expect(citiesBY.find((c) => c.nameRu === name)).toBeDefined();
    }
  });

  it('contains at least 100 cities', () => {
    expect(citiesBY.length).toBeGreaterThanOrEqual(100);
  });

  it('every city has nameRu, nameBe and region', () => {
    for (const city of citiesBY) {
      expect(city.nameRu).toBeTruthy();
      expect(city.nameBe).toBeTruthy();
      expect(city.region).toMatch(/^(Минская|Брестская|Витебская|Гомельская|Гродненская|Могилёвская)$/);
    }
  });
});
```

- [ ] **Step 2: Создать `web/lib/seeds/cities-by.ts`**

```ts
export interface CitySeed { nameRu: string; nameBe: string; region: 'Минская' | 'Брестская' | 'Витебская' | 'Гомельская' | 'Гродненская' | 'Могилёвская' }

export const citiesBY: CitySeed[] = [
  { nameRu: 'Минск', nameBe: 'Мінск', region: 'Минская' },
  { nameRu: 'Брест', nameBe: 'Брэст', region: 'Брестская' },
  { nameRu: 'Витебск', nameBe: 'Віцебск', region: 'Витебская' },
  { nameRu: 'Гомель', nameBe: 'Гомель', region: 'Гомельская' },
  { nameRu: 'Гродно', nameBe: 'Гродна', region: 'Гродненская' },
  { nameRu: 'Могилёв', nameBe: 'Магілёў', region: 'Могилёвская' },
  // Минская область
  { nameRu: 'Борисов', nameBe: 'Барысаў', region: 'Минская' },
  { nameRu: 'Солигорск', nameBe: 'Салігорск', region: 'Минская' },
  { nameRu: 'Молодечно', nameBe: 'Маладзечна', region: 'Минская' },
  { nameRu: 'Жодино', nameBe: 'Жодзіна', region: 'Минская' },
  { nameRu: 'Слуцк', nameBe: 'Слуцк', region: 'Минская' },
  { nameRu: 'Вилейка', nameBe: 'Вілейка', region: 'Минская' },
  { nameRu: 'Дзержинск', nameBe: 'Дзяржынск', region: 'Минская' },
  { nameRu: 'Заславль', nameBe: 'Заслаўе', region: 'Минская' },
  { nameRu: 'Логойск', nameBe: 'Лагойск', region: 'Минская' },
  { nameRu: 'Несвиж', nameBe: 'Нясвіж', region: 'Минская' },
  { nameRu: 'Старые Дороги', nameBe: 'Старыя Дарогі', region: 'Минская' },
  { nameRu: 'Столбцы', nameBe: 'Стоўбцы', region: 'Минская' },
  { nameRu: 'Червень', nameBe: 'Чэрвень', region: 'Минская' },
  { nameRu: 'Любань', nameBe: 'Любань', region: 'Минская' },
  { nameRu: 'Марьина Горка', nameBe: 'Мар\'іна Горка', region: 'Минская' },
  { nameRu: 'Смолевичи', nameBe: 'Смалявічы', region: 'Минская' },
  { nameRu: 'Узда', nameBe: 'Узда', region: 'Минская' },
  { nameRu: 'Фаниполь', nameBe: 'Фаніпаль', region: 'Минская' },
  { nameRu: 'Клецк', nameBe: 'Клецк', region: 'Минская' },
  { nameRu: 'Копыль', nameBe: 'Капыль', region: 'Минская' },
  { nameRu: 'Крупки', nameBe: 'Крупкі', region: 'Минская' },
  // Брестская область
  { nameRu: 'Барановичи', nameBe: 'Баранавічы', region: 'Брестская' },
  { nameRu: 'Пинск', nameBe: 'Пінск', region: 'Брестская' },
  { nameRu: 'Кобрин', nameBe: 'Кобрын', region: 'Брестская' },
  { nameRu: 'Лунинец', nameBe: 'Лунінец', region: 'Брестская' },
  { nameRu: 'Жабинка', nameBe: 'Жабінка', region: 'Брестская' },
  { nameRu: 'Иваново', nameBe: 'Іванава', region: 'Брестская' },
  { nameRu: 'Ивацевичи', nameBe: 'Івацэвічы', region: 'Брестская' },
  { nameRu: 'Берёза', nameBe: 'Бяроза', region: 'Брестская' },
  { nameRu: 'Дрогичин', nameBe: 'Драгічын', region: 'Брестская' },
  { nameRu: 'Каменец', nameBe: 'Камянец', region: 'Брестская' },
  { nameRu: 'Ляховичи', nameBe: 'Ляхавічы', region: 'Брестская' },
  { nameRu: 'Малорита', nameBe: 'Маларыта', region: 'Брестская' },
  { nameRu: 'Микашевичи', nameBe: 'Мікашэвічы', region: 'Брестская' },
  { nameRu: 'Пружаны', nameBe: 'Пружаны', region: 'Брестская' },
  { nameRu: 'Столин', nameBe: 'Столін', region: 'Брестская' },
  { nameRu: 'Ганцевичи', nameBe: 'Ганцавічы', region: 'Брестская' },
  // Витебская область
  { nameRu: 'Орша', nameBe: 'Орша', region: 'Витебская' },
  { nameRu: 'Новополоцк', nameBe: 'Наваполацк', region: 'Витебская' },
  { nameRu: 'Полоцк', nameBe: 'Полацк', region: 'Витебская' },
  { nameRu: 'Глубокое', nameBe: 'Глыбокае', region: 'Витебская' },
  { nameRu: 'Поставы', nameBe: 'Паставы', region: 'Витебская' },
  { nameRu: 'Лепель', nameBe: 'Лепель', region: 'Витебская' },
  { nameRu: 'Браслав', nameBe: 'Браслаў', region: 'Витебская' },
  { nameRu: 'Бешенковичи', nameBe: 'Бешанковічы', region: 'Витебская' },
  { nameRu: 'Верхнедвинск', nameBe: 'Верхнядзвінск', region: 'Витебская' },
  { nameRu: 'Городок', nameBe: 'Гарадок', region: 'Витебская' },
  { nameRu: 'Докшицы', nameBe: 'Докшыцы', region: 'Витебская' },
  { nameRu: 'Дубровно', nameBe: 'Дуброўна', region: 'Витебская' },
  { nameRu: 'Миоры', nameBe: 'Міёры', region: 'Витебская' },
  { nameRu: 'Россоны', nameBe: 'Расоны', region: 'Витебская' },
  { nameRu: 'Сенно', nameBe: 'Сянно', region: 'Витебская' },
  { nameRu: 'Толочин', nameBe: 'Талачын', region: 'Витебская' },
  { nameRu: 'Чашники', nameBe: 'Чашнікі', region: 'Витебская' },
  { nameRu: 'Шарковщина', nameBe: 'Шаркаўшчына', region: 'Витебская' },
  { nameRu: 'Шумилино', nameBe: 'Шумілна', region: 'Витебская' },
  // Гомельская область
  { nameRu: 'Мозырь', nameBe: 'Мазыр', region: 'Гомельская' },
  { nameRu: 'Жлобин', nameBe: 'Жлобін', region: 'Гомельская' },
  { nameRu: 'Светлогорск', nameBe: 'Светлагорск', region: 'Гомельская' },
  { nameRu: 'Речица', nameBe: 'Рэчыца', region: 'Гомельская' },
  { nameRu: 'Калинковичи', nameBe: 'Калінкавічы', region: 'Гомельская' },
  { nameRu: 'Рогачёв', nameBe: 'Рагачоў', region: 'Гомельская' },
  { nameRu: 'Хойники', nameBe: 'Хойнікі', region: 'Гомельская' },
  { nameRu: 'Добруш', nameBe: 'Добруш', region: 'Гомельская' },
  { nameRu: 'Буда-Кошелёво', nameBe: 'Буда-Кашалёва', region: 'Гомельская' },
  { nameRu: 'Ветка', nameBe: 'Ветка', region: 'Гомельская' },
  { nameRu: 'Ельск', nameBe: 'Ельск', region: 'Гомельская' },
  { nameRu: 'Житковичи', nameBe: 'Жыткавічы', region: 'Гомельская' },
  { nameRu: 'Корма', nameBe: 'Корма', region: 'Гомельская' },
  { nameRu: 'Лельчицы', nameBe: 'Лельчыцы', region: 'Гомельская' },
  { nameRu: 'Лоев', nameBe: 'Лоеў', region: 'Гомельская' },
  { nameRu: 'Наровля', nameBe: 'Нароўля', region: 'Гомельская' },
  { nameRu: 'Октябрьский', nameBe: 'Кастрычніцкі', region: 'Гомельская' },
  { nameRu: 'Петриков', nameBe: 'Петрыкаў', region: 'Гомельская' },
  { nameRu: 'Чечерск', nameBe: 'Чачэрск', region: 'Гомельская' },
  // Гродненская область
  { nameRu: 'Лида', nameBe: 'Ліда', region: 'Гродненская' },
  { nameRu: 'Слоним', nameBe: 'Слонім', region: 'Гродненская' },
  { nameRu: 'Волковыск', nameBe: 'Ваўкавыск', region: 'Гродненская' },
  { nameRu: 'Сморгонь', nameBe: 'Смаргонь', region: 'Гродненская' },
  { nameRu: 'Новогрудок', nameBe: 'Навагрудак', region: 'Гродненская' },
  { nameRu: 'Островец', nameBe: 'Астравец', region: 'Гродненская' },
  { nameRu: 'Берёзовка', nameBe: 'Бярозаўка', region: 'Гродненская' },
  { nameRu: 'Скидель', nameBe: 'Скідзель', region: 'Гродненская' },
  { nameRu: 'Свислочь', nameBe: 'Свіслач', region: 'Гродненская' },
  { nameRu: 'Дятлово', nameBe: 'Дзятлава', region: 'Гродненская' },
  { nameRu: 'Зельва', nameBe: 'Зэльва', region: 'Гродненская' },
  { nameRu: 'Ивье', nameBe: 'Іўе', region: 'Гродненская' },
  { nameRu: 'Кореличи', nameBe: 'Карэлічы', region: 'Гродненская' },
  { nameRu: 'Мосты', nameBe: 'Масты', region: 'Гродненская' },
  { nameRu: 'Ошмяны', nameBe: 'Ашмяны', region: 'Гродненская' },
  { nameRu: 'Щучин', nameBe: 'Шчучын', region: 'Гродненская' },
  // Могилёвская область
  { nameRu: 'Бобруйск', nameBe: 'Бабруйск', region: 'Могилёвская' },
  { nameRu: 'Горки', nameBe: 'Горкі', region: 'Могилёвская' },
  { nameRu: 'Кричев', nameBe: 'Крычаў', region: 'Могилёвская' },
  { nameRu: 'Осиповичи', nameBe: 'Асіповічы', region: 'Могилёвская' },
  { nameRu: 'Костюковичи', nameBe: 'Касцюковічы', region: 'Могилёвская' },
  { nameRu: 'Шклов', nameBe: 'Шклоў', region: 'Могилёвская' },
  { nameRu: 'Климовичи', nameBe: 'Клімавічы', region: 'Могилёвская' },
  { nameRu: 'Белыничи', nameBe: 'Бялынічы', region: 'Могилёвская' },
  { nameRu: 'Быхов', nameBe: 'Быхаў', region: 'Могилёвская' },
  { nameRu: 'Глуск', nameBe: 'Глуск', region: 'Могилёвская' },
  { nameRu: 'Дрибин', nameBe: 'Дрыбін', region: 'Могилёвская' },
  { nameRu: 'Кировск', nameBe: 'Кіраўск', region: 'Могилёвская' },
  { nameRu: 'Краснополье', nameBe: 'Краснаполле', region: 'Могилёвская' },
  { nameRu: 'Круглое', nameBe: 'Круглае', region: 'Могилёвская' },
  { nameRu: 'Мстиславль', nameBe: 'Мсціслаў', region: 'Могилёвская' },
  { nameRu: 'Славгород', nameBe: 'Слаўгарад', region: 'Могилёвская' },
  { nameRu: 'Хотимск', nameBe: 'Хоцімск', region: 'Могилёвская' },
  { nameRu: 'Чаусы', nameBe: 'Чавусы', region: 'Могилёвская' },
  { nameRu: 'Чериков', nameBe: 'Чэрыкаў', region: 'Могилёвская' },
  { nameRu: 'Кличев', nameBe: 'Клічаў', region: 'Могилёвская' },
];
```

- [ ] **Step 3: Запустить тест seed-данных**

```bash
cd web && npm test -- cities-by
```

Ожидаемо: 3 passed.

- [ ] **Step 4: Создать `web/collections/Cities.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';

export const Cities: CollectionConfig = {
  slug: 'cities',
  admin: { useAsTitle: 'nameRu', defaultColumns: ['nameRu', 'region', 'updatedAt'] },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isAdmin(user as any),
    update: ({ req: { user } }) => isAdmin(user as any),
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'nameRu', type: 'text', required: true, index: true },
    { name: 'nameBe', type: 'text', required: true },
    {
      name: 'region',
      type: 'select',
      required: true,
      options: [
        { label: 'Минская', value: 'Минская' },
        { label: 'Брестская', value: 'Брестская' },
        { label: 'Витебская', value: 'Витебская' },
        { label: 'Гомельская', value: 'Гомельская' },
        { label: 'Гродненская', value: 'Гродненская' },
        { label: 'Могилёвская', value: 'Могилёвская' },
      ],
    },
    { name: 'slug', type: 'text', unique: true, required: true, index: true },
  ],
};
```

- [ ] **Step 5: Создать `web/scripts/seed.ts`**

```ts
import 'dotenv/config';
import { getPayload } from 'payload';
import config from '../payload.config';
import { citiesBY } from '../lib/seeds/cities-by';

const RU_LAT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'i',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};
function slugify(s: string): string {
  return s.toLowerCase().split('').map((ch) => RU_LAT[ch] ?? ch).join('')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function main() {
  const payload = await getPayload({ config });
  let created = 0;
  let skipped = 0;
  for (const city of citiesBY) {
    const slug = slugify(city.nameRu);
    const existing = await payload.find({ collection: 'cities', where: { slug: { equals: slug } }, limit: 1 });
    if (existing.docs.length) { skipped++; continue; }
    await payload.create({ collection: 'cities', data: { ...city, slug } });
    created++;
  }
  console.log(`Seeded ${created} cities, skipped ${skipped} existing.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

Тот же транслит-маппинг (`RU_LAT` + `slugify`) используется в `lib/slug.ts` (Plan 2 `slugifyRu`) — держать идентичным, чтобы slug города в seed и в рантайм-генерации URL совпадали.

Добавить в `web/package.json` script: `"seed": "tsx scripts/seed.ts"` и установить `tsx`:

```bash
cd web && npm install -D tsx dotenv
```

- [ ] **Step 6: Подключить Cities в payload config**

```ts
import { Cities } from './collections/Cities';
collections: [Users, Cities],
```

- [ ] **Step 7: Запустить миграцию и сидинг**

```bash
cd web && npm run dev   # в одном терминале
# в другом терминале:
cd web && npm run seed
```

Ожидаемо: `Seeded N cities`. В админке `/admin/collections/cities` — ~120 записей.

- [ ] **Step 8: Commit**

```bash
git add web/collections/Cities.ts web/lib/seeds web/scripts/seed.ts web/tests/unit/seeds web/payload.config.ts web/package.json web/package-lock.json
git commit -m "Plan 1 Task 6: Cities-коллекция + seed ~120 городов РБ

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Media-коллекция + Cloudflare R2 storage

**Files:**
- Create: `web/collections/Media.ts`
- Modify: `web/payload.config.ts`
- Create: `web/tests/unit/storage/r2-adapter.test.ts`
- Create: `web/lib/storage/r2-adapter.ts`

- [ ] **Step 1: Failing тест адаптера**

`web/tests/unit/storage/r2-adapter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildR2StorageConfig } from '@/lib/storage/r2-adapter';

describe('r2-adapter', () => {
  it('throws if R2 env vars missing', () => {
    expect(() => buildR2StorageConfig({})).toThrow(/R2_ACCESS_KEY_ID/);
  });

  it('builds config when env present', () => {
    const config = buildR2StorageConfig({
      R2_ACCOUNT_ID: 'acc',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_BUCKET: 'bucket',
      R2_PUBLIC_URL: 'https://media.example',
    });
    expect(config.bucket).toBe('bucket');
    expect(config.config.endpoint).toContain('acc');
    expect(config.config.region).toBe('auto');
  });
});
```

- [ ] **Step 2: Создать `web/lib/storage/r2-adapter.ts`**

```ts
export interface R2Env {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
  R2_PUBLIC_URL?: string;
}

export function buildR2StorageConfig(env: R2Env) {
  const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'] as const;
  for (const key of required) {
    if (!env[key]) throw new Error(`Missing ${key} in env`);
  }
  return {
    bucket: env.R2_BUCKET!,
    config: {
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true as const,
    },
  };
}
```

- [ ] **Step 3: Тест passes**

```bash
cd web && npm test -- r2-adapter
```

Ожидаемо: 2 passed.

- [ ] **Step 4: Создать `web/collections/Media.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { useAsTitle: 'filename' },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => isAdmin(user as any) || !!user,
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageSizes: [
      { name: 'thumb', width: 200, height: 200, fit: 'cover' },
      { name: 'card', width: 400 },
      { name: 'detail', width: 1600 },
    ],
    focalPoint: true,
    crop: false,
    adminThumbnail: 'thumb',
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
    { name: 'mediaKind', type: 'select', required: true, defaultValue: 'image', options: [
      { label: 'Изображение', value: 'image' },
      { label: 'Видео', value: 'video' },
    ]},
    { name: 'uploadedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (operation === 'create' && req.user) {
          data.uploadedBy = req.user.id;
        }
        return data;
      },
    ],
  },
};
```

- [ ] **Step 5: Подключить storage-s3 в `web/payload.config.ts`**

```ts
import { s3Storage } from '@payloadcms/storage-s3';
import { Media } from './collections/Media';
import { buildR2StorageConfig } from './lib/storage/r2-adapter';

const r2 = buildR2StorageConfig(process.env);

export default buildConfig({
  // ...
  collections: [Users, Cities, Media],
  plugins: [
    s3Storage({
      collections: { media: { prefix: 'media' } },
      bucket: r2.bucket,
      config: r2.config,
    }),
  ],
  // ...
});
```

- [ ] **Step 6: Локальный режим без R2 — fallback на local fs**

Адаптировать `payload.config.ts`:

```ts
const hasR2 = !!process.env.R2_ACCOUNT_ID && !!process.env.R2_ACCESS_KEY_ID;
const plugins = hasR2 ? [s3Storage({ collections: { media: { prefix: 'media' } }, bucket: buildR2StorageConfig(process.env).bucket, config: buildR2StorageConfig(process.env).config })] : [];
```

Без R2 Payload использует локальное хранилище в `media/` директории.

- [ ] **Step 7: Smoke-тест в админке**

Запустить dev, открыть `/admin/collections/media`, загрузить тестовое фото, убедиться что появляется thumbnail.

- [ ] **Step 8: Commit**

```bash
git add web/collections/Media.ts web/lib/storage web/tests/unit/storage web/payload.config.ts
git commit -m "Plan 1 Task 7: Media-коллекция + R2 storage adapter (fallback на local)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: AuditLog-коллекция + helper

**Files:**
- Create: `web/collections/AuditLogs.ts`
- Create: `web/lib/audit/log.ts`
- Create: `web/tests/unit/audit/log.test.ts`
- Modify: `web/payload.config.ts`

- [ ] **Step 1: Failing тест**

`web/tests/unit/audit/log.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { recordAuditLog } from '@/lib/audit/log';

describe('recordAuditLog', () => {
  it('creates audit-log entry via payload', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'log-1' });
    const payload = { create } as any;
    await recordAuditLog(payload, {
      actorId: 'u1',
      action: 'user.role.changed',
      targetType: 'user',
      targetId: 'u2',
      meta: { from: 'citizen', to: 'moderator' },
    });
    expect(create).toHaveBeenCalledWith({
      collection: 'audit-logs',
      data: expect.objectContaining({
        actor: 'u1',
        action: 'user.role.changed',
        targetType: 'user',
        targetId: 'u2',
        meta: { from: 'citizen', to: 'moderator' },
      }),
    });
  });
});
```

- [ ] **Step 2: Создать `web/lib/audit/log.ts`**

```ts
import type { Payload } from 'payload';

export interface AuditEntry {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
}

export async function recordAuditLog(payload: Payload, entry: AuditEntry): Promise<void> {
  await payload.create({
    collection: 'audit-logs',
    data: {
      actor: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      meta: entry.meta || {},
    },
  });
}
```

- [ ] **Step 3: Создать `web/collections/AuditLogs.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { canModerateContent, isAdmin } from '@/lib/auth/rbac';

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  admin: { useAsTitle: 'action', defaultColumns: ['action', 'targetType', 'targetId', 'createdAt'] },
  access: {
    read: ({ req: { user } }) => canModerateContent(user as any),
    create: () => true,
    update: () => false,
    delete: ({ req: { user } }) => user?.role === 'superadmin',
  },
  fields: [
    { name: 'actor', type: 'relationship', relationTo: 'users', required: true },
    { name: 'action', type: 'text', required: true, index: true },
    { name: 'targetType', type: 'text', required: true, index: true },
    { name: 'targetId', type: 'text', required: true, index: true },
    { name: 'meta', type: 'json' },
  ],
  timestamps: true,
};
```

- [ ] **Step 4: Подключить и протестировать**

```ts
import { AuditLogs } from './collections/AuditLogs';
collections: [Users, Cities, Media, AuditLogs],
```

```bash
cd web && npm test -- audit
```

Ожидаемо: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add web/collections/AuditLogs.ts web/lib/audit web/tests/unit/audit web/payload.config.ts
git commit -m "Plan 1 Task 8: AuditLog-коллекция + recordAuditLog helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: NotificationPreference-коллекция

**Files:**
- Create: `web/collections/NotificationPreferences.ts`
- Modify: `web/payload.config.ts`

- [ ] **Step 1: Создать `web/collections/NotificationPreferences.ts`**

```ts
import type { CollectionConfig } from 'payload';
import { isAdmin } from '@/lib/auth/rbac';

export const NotificationPreferences: CollectionConfig = {
  slug: 'notification-preferences',
  admin: { useAsTitle: 'id' },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (isAdmin(user as any)) return true;
      return { user: { equals: user.id } };
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (isAdmin(user as any)) return true;
      return { user: { equals: user.id } };
    },
    delete: ({ req: { user } }) => isAdmin(user as any),
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, unique: true },
    { name: 'emailAdoptionInquiry', type: 'checkbox', defaultValue: true },
    { name: 'emailModerationResult', type: 'checkbox', defaultValue: true },
    { name: 'emailDonationReceipt', type: 'checkbox', defaultValue: true },
    { name: 'emailUrgentInCities', type: 'relationship', relationTo: 'cities', hasMany: true, admin: { description: 'Города, по которым приходят алерты о срочных животных' } },
    { name: 'emailWeeklyDigest', type: 'checkbox', defaultValue: false },
  ],
  timestamps: true,
};
```

- [ ] **Step 2: Подключить и сохранить**

```ts
import { NotificationPreferences } from './collections/NotificationPreferences';
collections: [Users, Cities, Media, AuditLogs, NotificationPreferences],
```

- [ ] **Step 3: Commit**

```bash
git add web/collections/NotificationPreferences.ts web/payload.config.ts
git commit -m "Plan 1 Task 9: NotificationPreferences-коллекция

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Email через Resend (welcome, verification, reset)

**Files:**
- Create: `web/lib/email/resend-client.ts`
- Create: `web/lib/email/templates/welcome.tsx`, `email-verification.tsx`, `password-reset.tsx`, `magic-link.tsx`
- Modify: `web/payload.config.ts` (email adapter)
- Create: `web/tests/unit/email/resend-client.test.ts`

- [ ] **Step 1: Установить Resend и react-email**

```bash
cd web && npm install resend @react-email/components react-email
```

- [ ] **Step 2: Failing тест клиента**

`web/tests/unit/email/resend-client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail } from '@/lib/email/resend-client';

describe('sendEmail', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws if RESEND_API_KEY missing', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendEmail({ to: 'a@b.c', subject: 's', react: null as any })).rejects.toThrow(/RESEND_API_KEY/);
  });
});
```

- [ ] **Step 3: Создать `web/lib/email/resend-client.ts`**

```ts
import { Resend } from 'resend';
import type { ReactElement } from 'react';

let cached: Resend | null = null;

function getClient(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY missing');
  cached = new Resend(key);
  return cached;
}

export interface SendEmailArgs {
  to: string;
  subject: string;
  react: ReactElement;
}

export async function sendEmail(args: SendEmailArgs) {
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@pet-aggregator.by';
  const client = getClient();
  return await client.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    react: args.react,
  });
}
```

- [ ] **Step 4: Создать шаблоны (4 файла)**

`web/lib/email/templates/welcome.tsx`:

```tsx
import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

export default function WelcomeEmail({ firstName, appUrl }: { firstName?: string; appUrl: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Добро пожаловать в Pet Aggregator BY{firstName ? `, ${firstName}` : ''}!</Heading>
          <Text>Спасибо что присоединились. На нашем сайте вы можете:</Text>
          <ul>
            <li>Найти питомца для усыновления</li>
            <li>Разместить объявление о пристройстве</li>
            <li>Помочь приюту донатом</li>
            <li>Сообщить о жестоком обращении</li>
          </ul>
          <Link href={appUrl}>Перейти на сайт</Link>
        </Container>
      </Body>
    </Html>
  );
}
```

`web/lib/email/templates/email-verification.tsx`:

```tsx
import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

export default function EmailVerification({ verifyUrl }: { verifyUrl: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Подтвердите email</Heading>
          <Text>Нажмите кнопку чтобы подтвердить email. Ссылка действует 24 часа.</Text>
          <Link href={verifyUrl}>Подтвердить</Link>
          <Text style={{ fontSize: '12px', color: '#666' }}>Если вы не регистрировались, проигнорируйте письмо.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

`web/lib/email/templates/password-reset.tsx`:

```tsx
import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

export default function PasswordReset({ resetUrl }: { resetUrl: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Сброс пароля</Heading>
          <Text>Нажмите чтобы установить новый пароль. Ссылка действует 1 час.</Text>
          <Link href={resetUrl}>Сбросить пароль</Link>
          <Text style={{ fontSize: '12px', color: '#666' }}>Если вы не запрашивали, проигнорируйте письмо.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

`web/lib/email/templates/magic-link.tsx`:

```tsx
import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

export default function MagicLink({ loginUrl }: { loginUrl: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Войти на Pet Aggregator BY</Heading>
          <Text>Нажмите ссылку для входа без пароля. Ссылка действует 15 минут.</Text>
          <Link href={loginUrl}>Войти</Link>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 5: Подключить email-адаптер в Payload**

```bash
cd web && npm install @payloadcms/email-resend
```

В `web/payload.config.ts`:

```ts
import { resendAdapter } from '@payloadcms/email-resend';

export default buildConfig({
  // ...
  email: process.env.RESEND_API_KEY ? resendAdapter({
    apiKey: process.env.RESEND_API_KEY,
    defaultFromAddress: process.env.RESEND_FROM_EMAIL || 'noreply@pet-aggregator.by',
    defaultFromName: 'Pet Aggregator BY',
  }) : undefined,
  // ...
});
```

- [ ] **Step 6: Тесты passes**

```bash
cd web && npm test -- email
```

Ожидаемо: 1 passed.

- [ ] **Step 7: Commit**

```bash
git add web/lib/email web/tests/unit/email web/payload.config.ts web/package.json web/package-lock.json
git commit -m "Plan 1 Task 10: Resend-интеграция + 4 email-шаблона (welcome, verify, reset, magic)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Telegram Login Widget — валидация hash

**Files:**
- Create: `web/lib/auth/session.ts`
- Create: `web/tests/unit/auth/session.test.ts`
- Create: `web/lib/auth/telegram-validator.ts`
- Create: `web/tests/unit/auth/telegram-validator.test.ts`
- Create: `web/app/api/auth/telegram/verify/route.ts`
- Create: `web/components/auth/TelegramLoginButton.tsx`

- [ ] **Step 0: Хелпер сессии `web/lib/auth/session.ts` (общий механизм выдачи cookie)**

Этот хелпер — единый механизм аутентификации для TG-логина (Task 11) и magic-link (Task 14). Payload не аутентифицирует пользователя без пароля и не имеет `encryptCookie`, поэтому подписываем `payload-token` (JWT) тем же `PAYLOAD_SECRET` сами и ставим httpOnly-cookie.

Установить зависимости:

```bash
cd web && npm install jsonwebtoken && npm install -D @types/jsonwebtoken
```

Сначала написать failing-тест `web/tests/unit/auth/session.test.ts`:

```ts
import jwt from 'jsonwebtoken';
import { issueSessionToken } from '@/lib/auth/session';

describe('issueSessionToken', () => {
  it('подписывает payload-token, верифицируемый секретом', () => {
    process.env.PAYLOAD_SECRET = 'test-secret';
    const token = issueSessionToken({ id: 'u1', email: 'a@b.by' });
    const decoded = jwt.verify(token, 'test-secret') as any;
    expect(decoded.id).toBe('u1');
    expect(decoded.collection).toBe('users');
    expect(decoded.email).toBe('a@b.by');
  });
});
```

Запустить — должен упасть (модуля ещё нет):

```bash
cd web && npm test -- session
```

Ожидаемо: FAIL (cannot find module `@/lib/auth/session`).

Затем создать `web/lib/auth/session.ts`:

```ts
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const COOKIE = 'payload-token';

export function issueSessionToken(user: { id: string | number; email: string }): string {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error('PAYLOAD_SECRET is not set');
  return jwt.sign({ id: user.id, collection: 'users', email: user.email }, secret, { expiresIn: '7d' });
}

export function setSessionCookie(token: string): void {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}
```

Перезапустить тест — должен пройти:

```bash
cd web && npm test -- session
```

Ожидаемо: PASS.

- [ ] **Step 1: Failing тест валидации**

`web/tests/unit/auth/telegram-validator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyTelegramAuth, TelegramAuthPayload } from '@/lib/auth/telegram-validator';

function buildSignedPayload(botToken: string, payload: Omit<TelegramAuthPayload, 'hash'>): TelegramAuthPayload {
  const dataCheckString = Object.keys(payload)
    .filter((k) => payload[k as keyof typeof payload] !== undefined)
    .sort()
    .map((k) => `${k}=${payload[k as keyof typeof payload]}`)
    .join('\n');
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return { ...payload, hash };
}

describe('verifyTelegramAuth', () => {
  const botToken = 'test-bot-token-12345';
  const now = Math.floor(Date.now() / 1000);

  it('accepts valid payload', () => {
    const payload = buildSignedPayload(botToken, {
      id: 100, first_name: 'Иван', username: 'ivan', auth_date: now,
    });
    expect(verifyTelegramAuth(payload, botToken)).toBe(true);
  });

  it('rejects tampered payload', () => {
    const payload = buildSignedPayload(botToken, {
      id: 100, first_name: 'Иван', auth_date: now,
    });
    const tampered = { ...payload, first_name: 'Петя' };
    expect(verifyTelegramAuth(tampered, botToken)).toBe(false);
  });

  it('rejects payload older than 5 minutes', () => {
    const old = now - 600;
    const payload = buildSignedPayload(botToken, {
      id: 100, first_name: 'Иван', auth_date: old,
    });
    expect(verifyTelegramAuth(payload, botToken)).toBe(false);
  });
});
```

- [ ] **Step 2: Создать `web/lib/auth/telegram-validator.ts`**

```ts
import crypto from 'node:crypto';

export interface TelegramAuthPayload {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const MAX_AGE_SECONDS = 300;

export function verifyTelegramAuth(payload: TelegramAuthPayload, botToken: string): boolean {
  if (!payload?.hash) return false;
  if (!botToken) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - payload.auth_date > MAX_AGE_SECONDS) return false;

  const { hash, ...rest } = payload;
  const dataCheckString = Object.keys(rest)
    .filter((k) => rest[k as keyof typeof rest] !== undefined)
    .sort()
    .map((k) => `${k}=${rest[k as keyof typeof rest]}`)
    .join('\n');

  const secret = crypto.createHash('sha256').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Тесты passes**

```bash
cd web && npm test -- telegram-validator
```

Ожидаемо: 3 passed.

- [ ] **Step 4: Создать API route `web/app/api/auth/telegram/verify/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { verifyTelegramAuth, TelegramAuthPayload } from '@/lib/auth/telegram-validator';
import { findOrCreateUserByTelegram } from '@/lib/auth/account-linking';
import { issueSessionToken, setSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as TelegramAuthPayload;
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!verifyTelegramAuth(body, botToken)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }
  const payload = await getPayload({ config });
  const user = await findOrCreateUserByTelegram(payload, body);
  const token = issueSessionToken(user);
  setSessionCookie(token);
  return NextResponse.json({ ok: true, user: { id: user.id, firstName: user.firstName, role: user.role } });
}
```

(TG-пользователь аутентифицируется через общий хелпер `@/lib/auth/session`: подписываем `payload-token` секретом `PAYLOAD_SECRET` и ставим httpOnly-cookie. `findOrCreateUserByTelegram` из Task 12 возвращает `user` с `id` и `email`.)

- [ ] **Step 5: Создать `web/components/auth/TelegramLoginButton.tsx`**

```tsx
'use client';
import { useEffect, useRef } from 'react';

interface Props {
  botUsername: string;
  redirectUrl?: string;
}

export function TelegramLoginButton({ botUsername, redirectUrl }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    ref.current.appendChild(script);
    (window as any).onTelegramAuth = async (user: any) => {
      const r = await fetch('/api/auth/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (r.ok) {
        window.location.href = redirectUrl || '/me';
      }
    };
  }, [botUsername, redirectUrl]);

  return <div ref={ref} />;
}
```

- [ ] **Step 6: Commit (account-linking + e2e в следующих задачах)**

```bash
git add web/lib/auth/telegram-validator.ts web/tests/unit/auth/telegram-validator.test.ts web/app/api/auth/telegram web/components/auth/TelegramLoginButton.tsx
git commit -m "Plan 1 Task 11: Telegram-валидация hash + widget-компонент

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Account linking (email ↔ Telegram)

**Files:**
- Create: `web/lib/auth/account-linking.ts`
- Create: `web/tests/unit/auth/account-linking.test.ts`

- [ ] **Step 1: Failing тесты**

`web/tests/unit/auth/account-linking.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { findOrCreateUserByTelegram } from '@/lib/auth/account-linking';

function mockPayload({ existing }: { existing?: any }) {
  return {
    find: vi.fn().mockResolvedValue({ docs: existing ? [existing] : [] }),
    create: vi.fn().mockResolvedValue({ id: 'new-1', email: 'tg-100@telegram.local', telegramId: '100', role: 'citizen' }),
    update: vi.fn().mockImplementation(async ({ data, id }) => ({ id, ...data })),
  } as any;
}

describe('findOrCreateUserByTelegram', () => {
  it('creates new citizen if no user found', async () => {
    const p = mockPayload({});
    const user = await findOrCreateUserByTelegram(p, { id: 100, first_name: 'Ivan', auth_date: 0, hash: '' });
    expect(p.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'users',
      data: expect.objectContaining({ telegramId: '100', role: 'citizen' }),
    }));
    expect(user.telegramId).toBe('100');
  });

  it('returns existing user when telegramId matches', async () => {
    const existing = { id: 'u-1', email: 'old@x.com', telegramId: '100', role: 'citizen' };
    const p = mockPayload({ existing });
    const user = await findOrCreateUserByTelegram(p, { id: 100, first_name: 'X', auth_date: 0, hash: '' });
    expect(p.create).not.toHaveBeenCalled();
    expect(user.id).toBe('u-1');
  });
});
```

- [ ] **Step 2: Создать `web/lib/auth/account-linking.ts`**

```ts
import type { Payload } from 'payload';
import type { TelegramAuthPayload } from './telegram-validator';
import crypto from 'node:crypto';

export async function findOrCreateUserByTelegram(payload: Payload, tg: TelegramAuthPayload) {
  const tgId = String(tg.id);
  const existing = await payload.find({ collection: 'users', where: { telegramId: { equals: tgId } }, limit: 1 });
  if (existing.docs.length) return existing.docs[0] as any;
  const password = crypto.randomBytes(32).toString('hex');
  const created = await payload.create({
    collection: 'users',
    data: {
      email: `tg-${tgId}@telegram.local`,
      password,
      firstName: tg.first_name,
      lastName: tg.last_name,
      telegramId: tgId,
      telegramUsername: tg.username,
      photoUrl: tg.photo_url,
      role: 'citizen',
      ageConfirmed: true,
      consentPersonalData: true,
    } as any,
  });
  return created as any;
}
```

- [ ] **Step 3: Тесты passes**

```bash
cd web && npm test -- account-linking
```

Ожидаемо: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add web/lib/auth/account-linking.ts web/tests/unit/auth/account-linking.test.ts
git commit -m "Plan 1 Task 12: account linking при TG OAuth

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Login / Register / Verify / Reset страницы

**Files:**
- Create: `web/components/auth/LoginForm.tsx`, `RegisterForm.tsx`
- Create: `web/app/(public)/login/page.tsx`, `register/page.tsx`, `verify-email/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`
- Create: `web/tests/e2e/auth.spec.ts`

- [ ] **Step 1: Failing e2e тест**

`web/tests/e2e/auth.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('register page renders form', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/пароль/i).first()).toBeVisible();
  await expect(page.getByText(/мне 14 лет/i)).toBeVisible();
  await expect(page.getByText(/согласие/i)).toBeVisible();
});

test('login page shows both email and telegram options', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByText(/войти через telegram/i)).toBeVisible();
});
```

- [ ] **Step 2: Создать `web/components/auth/LoginForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const r = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (r.ok) window.location.href = '/me';
    else setError('Неверный email или пароль');
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-sm">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="password">Пароль</Label>
        <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">{loading ? 'Вход...' : 'Войти'}</Button>
    </form>
  );
}
```

- [ ] **Step 3: Создать `web/components/auth/RegisterForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [ageConfirmed, setAge] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ageConfirmed) { setError('Нужно подтвердить возраст 14+'); return; }
    if (!consent) { setError('Нужно согласие на обработку перс.данных (закон 99-З)'); return; }
    setLoading(true);
    const r = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, ageConfirmed, consentPersonalData: consent, role: 'citizen' }),
    });
    setLoading(false);
    if (r.ok) window.location.href = '/verify-email?sent=1';
    else setError('Ошибка регистрации. Возможно email уже используется.');
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-sm">
      <div>
        <Label htmlFor="firstName">Имя</Label>
        <Input id="firstName" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="password">Пароль</Label>
        <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">Минимум 8 символов</p>
      </div>
      <div className="flex items-start gap-2">
        <input id="age" type="checkbox" checked={ageConfirmed} onChange={(e) => setAge(e.target.checked)} required className="mt-1" />
        <Label htmlFor="age" className="text-sm">Мне 14 лет или больше</Label>
      </div>
      <div className="flex items-start gap-2">
        <input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="mt-1" />
        <Label htmlFor="consent" className="text-sm">Даю согласие на обработку персональных данных по закону РБ 99-З</Label>
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">{loading ? 'Регистрация...' : 'Зарегистрироваться'}</Button>
    </form>
  );
}
```

- [ ] **Step 4: Создать страницы**

`web/app/(public)/login/page.tsx`:

```tsx
import { LoginForm } from '@/components/auth/LoginForm';
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton';
import Link from 'next/link';

export const metadata = { title: 'Войти' };

export default function LoginPage() {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || '';
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">Войти</h1>
      {botUsername && (
        <>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Войти через Telegram</p>
            <TelegramLoginButton botUsername={botUsername} />
          </div>
          <div className="my-6 flex items-center gap-2">
            <span className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">или</span>
            <span className="flex-1 h-px bg-border" />
          </div>
        </>
      )}
      <LoginForm />
      <div className="mt-6 text-sm flex justify-between">
        <Link href="/forgot-password" className="text-primary underline">Забыли пароль?</Link>
        <Link href="/register" className="text-primary underline">Регистрация</Link>
      </div>
    </div>
  );
}
```

`web/app/(public)/register/page.tsx`:

```tsx
import { RegisterForm } from '@/components/auth/RegisterForm';
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton';
import Link from 'next/link';

export const metadata = { title: 'Регистрация' };

export default function RegisterPage() {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || '';
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">Регистрация</h1>
      <RegisterForm />
      {botUsername && (
        <>
          <div className="my-6 flex items-center gap-2">
            <span className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">или</span>
            <span className="flex-1 h-px bg-border" />
          </div>
          <TelegramLoginButton botUsername={botUsername} />
        </>
      )}
      <div className="mt-6 text-sm">
        Уже есть аккаунт? <Link href="/login" className="text-primary underline">Войти</Link>
      </div>
    </div>
  );
}
```

`web/app/(public)/verify-email/page.tsx`:

```tsx
export const metadata = { title: 'Подтверждение email' };

export default function VerifyEmailPage({ searchParams }: { searchParams: { sent?: string; token?: string } }) {
  if (searchParams.sent) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-4">Письмо отправлено</h1>
        <p>Проверьте почту и нажмите ссылку для подтверждения. Ссылка действует 24 часа.</p>
      </div>
    );
  }
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-4">Подтверждение email</h1>
      <form action="/api/users/verify" method="POST">
        <input type="hidden" name="token" value={searchParams.token || ''} />
        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded">Подтвердить</button>
      </form>
    </div>
  );
}
```

`web/app/(public)/forgot-password/page.tsx` (запрос ссылки сброса через Payload built-in `/api/users/forgot-password`):

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/users/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">Восстановление пароля</h1>
      {sent ? (
        <p>Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля. Проверьте почту.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4 max-w-sm">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? 'Отправка...' : 'Отправить ссылку'}</Button>
        </form>
      )}
    </div>
  );
}
```

`web/app/(public)/reset-password/page.tsx` (установка нового пароля по токену из письма через Payload built-in `/api/users/reset-password`):

```tsx
'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setError('Ссылка недействительна: отсутствует токен'); return; }
    setLoading(true);
    setError(null);
    const r = await fetch('/api/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (r.ok) window.location.href = '/login';
    else setError('Не удалось сбросить пароль. Ссылка могла устареть — запросите новую.');
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">Новый пароль</h1>
      <form onSubmit={submit} className="space-y-4 max-w-sm">
        <div>
          <Label htmlFor="password">Новый пароль</Label>
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">Минимум 8 символов</p>
        </div>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'Сохранение...' : 'Сохранить пароль'}</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Запустить e2e**

```bash
cd web && npm run test:e2e -- auth
```

Ожидаемо: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add web/app/\(public\)/login web/app/\(public\)/register web/app/\(public\)/verify-email web/app/\(public\)/forgot-password web/app/\(public\)/reset-password web/components/auth web/tests/e2e/auth.spec.ts
git commit -m "Plan 1 Task 13: страницы и формы login/register/verify/forgot/reset

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Magic-link авторизация по email

**Files:**
- Create: `web/lib/auth/magic-link.ts`
- Create: `web/tests/unit/auth/magic-link.test.ts`
- Create: `web/app/api/auth/magic-link/request/route.ts`
- Create: `web/app/api/auth/magic-link/consume/route.ts`
- Create: `web/components/auth/MagicLinkForm.tsx`
- Create: `web/collections/MagicLinkTokens.ts`

- [ ] **Step 1: Failing тест**

`web/tests/unit/auth/magic-link.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { generateMagicToken, isTokenExpired } from '@/lib/auth/magic-link';

describe('magic-link', () => {
  it('generateMagicToken returns 64-char hex', () => {
    const token = generateMagicToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('isTokenExpired returns true after 15 minutes', () => {
    const now = Date.now();
    expect(isTokenExpired(new Date(now - 16 * 60 * 1000), now)).toBe(true);
    expect(isTokenExpired(new Date(now - 14 * 60 * 1000), now)).toBe(false);
  });
});
```

- [ ] **Step 2: Создать `web/lib/auth/magic-link.ts`**

```ts
import crypto from 'node:crypto';

const TTL_MS = 15 * 60 * 1000;

export function generateMagicToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function isTokenExpired(createdAt: Date, now = Date.now()): boolean {
  return now - createdAt.getTime() > TTL_MS;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

- [ ] **Step 3: Создать `web/collections/MagicLinkTokens.ts`**

```ts
import type { CollectionConfig } from 'payload';

export const MagicLinkTokens: CollectionConfig = {
  slug: 'magic-link-tokens',
  admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'tokenHash', type: 'text', required: true, unique: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'consumedAt', type: 'date' },
  ],
  timestamps: true,
};
```

Подключить в `payload.config.ts`.

- [ ] **Step 4: API route `request`**

`web/app/api/auth/magic-link/request/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { generateMagicToken, hashToken } from '@/lib/auth/magic-link';
import { sendEmail } from '@/lib/email/resend-client';
import MagicLink from '@/lib/email/templates/magic-link';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== 'string') return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const payload = await getPayload({ config });
  const found = await payload.find({ collection: 'users', where: { email: { equals: email.toLowerCase() } }, limit: 1 });
  // Ответ всегда одинаков — не раскрываем регистрацию
  if (found.docs.length) {
    const user = found.docs[0];
    const token = generateMagicToken();
    await payload.create({ collection: 'magic-link-tokens', data: { tokenHash: hashToken(token), user: user.id } });
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/magic-link/consume?token=${token}`;
    await sendEmail({ to: email, subject: 'Вход на Pet Aggregator BY', react: MagicLink({ loginUrl: url }) });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: API route `consume`**

`web/app/api/auth/magic-link/consume/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { hashToken, isTokenExpired } from '@/lib/auth/magic-link';
import { issueSessionToken, setSessionCookie } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/login?error=missing-token', req.url));
  const payload = await getPayload({ config });
  const found = await payload.find({ collection: 'magic-link-tokens', where: { tokenHash: { equals: hashToken(token) }, consumedAt: { exists: false } }, limit: 1 });
  if (!found.docs.length) return NextResponse.redirect(new URL('/login?error=invalid-token', req.url));
  const entry = found.docs[0] as any;
  if (isTokenExpired(new Date(entry.createdAt))) return NextResponse.redirect(new URL('/login?error=expired', req.url));
  await payload.update({ collection: 'magic-link-tokens', id: entry.id, data: { consumedAt: new Date().toISOString() } });
  // Выдаём сессию через общий хелпер (тот же механизм, что и TG-логин)
  const userId = typeof entry.user === 'string' ? entry.user : entry.user.id;
  const user = await payload.findByID({ collection: 'users', id: userId });
  const sessionToken = issueSessionToken({ id: user.id, email: user.email });
  setSessionCookie(sessionToken);
  return NextResponse.redirect(new URL('/me', req.url));
}
```

(Сессия выдаётся тем же хелпером `@/lib/auth/session`, что и TG-логин: подписываем `payload-token` секретом `PAYLOAD_SECRET` и ставим httpOnly-cookie через `cookies()`. У `magic-link-tokens` связь хранит только id, поэтому email берём через `payload.findByID`.)

- [ ] **Step 6: Magic-link form компонент**

`web/components/auth/MagicLinkForm.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function MagicLinkForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/auth/magic-link/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setSent(true);
  }
  if (sent) return <p>Ссылка отправлена на email если аккаунт существует. Проверьте почту.</p>;
  return (
    <form onSubmit={submit} className="space-y-3 max-w-sm">
      <Label htmlFor="ml-email">Войти по ссылке без пароля</Label>
      <Input id="ml-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit">Отправить ссылку</Button>
    </form>
  );
}
```

Добавить компонент на `/login` под формой email/пароль.

- [ ] **Step 7: Тесты passes**

```bash
cd web && npm test -- magic-link
```

Ожидаемо: 2 passed.

- [ ] **Step 8: Commit**

```bash
git add web/lib/auth/magic-link.ts web/collections/MagicLinkTokens.ts web/app/api/auth/magic-link web/components/auth/MagicLinkForm.tsx web/tests/unit/auth/magic-link.test.ts web/payload.config.ts web/app/\(public\)/login/page.tsx
git commit -m "Plan 1 Task 14: magic-link авторизация по email (15-мин TTL)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Account deletion endpoint

**Files:**
- Create: `web/app/api/account/delete/route.ts`
- Create: `web/tests/e2e/account-delete.spec.ts`

- [ ] **Step 1: API route**

`web/app/api/account/delete/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { recordAuditLog } from '@/lib/audit/log';

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config });
  const session = await payload.auth({ headers: req.headers });
  if (!session.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = session.user.id;
  // Soft-anonymize: затереть PII, оставить запись для целостности связанных donations/audit
  await payload.update({
    collection: 'users',
    id: userId,
    data: {
      email: `deleted-${userId}@example.invalid`,
      firstName: null,
      lastName: null,
      phone: null,
      telegramId: null,
      telegramUsername: null,
      photoUrl: null,
      isBlocked: true,
    } as any,
  });
  await recordAuditLog(payload, { actorId: String(userId), action: 'account.deleted', targetType: 'user', targetId: String(userId) });
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('payload-token');
  return res;
}
```

- [ ] **Step 2: e2e тест**

`web/tests/e2e/account-delete.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('account deletion requires auth', async ({ request }) => {
  const r = await request.post('/api/account/delete');
  expect(r.status()).toBe(401);
});
```

- [ ] **Step 3: Запустить**

```bash
cd web && npm run test:e2e -- account-delete
```

Ожидаемо: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add web/app/api/account/delete web/tests/e2e/account-delete.spec.ts
git commit -m "Plan 1 Task 15: account deletion endpoint (soft-anonymize по 99-З)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Data export endpoint (JSON)

**Files:**
- Create: `web/app/api/account/export/route.ts`
- Create: `web/tests/e2e/account-export.spec.ts`

- [ ] **Step 1: API route**

`web/app/api/account/export/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config });
  const session = await payload.auth({ headers: req.headers });
  if (!session.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = session.user.id;
  const user = await payload.findByID({ collection: 'users', id: userId });
  const notifPrefs = await payload.find({ collection: 'notification-preferences', where: { user: { equals: userId } } });
  const auditLogs = await payload.find({ collection: 'audit-logs', where: { actor: { equals: userId } }, limit: 1000 });
  const dump = {
    exported_at: new Date().toISOString(),
    user,
    notification_preferences: notifPrefs.docs,
    audit_logs: auditLogs.docs,
  };
  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="pet-aggregator-export-${userId}.json"`,
    },
  });
}
```

- [ ] **Step 2: e2e**

`web/tests/e2e/account-export.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('export requires auth', async ({ request }) => {
  const r = await request.get('/api/account/export');
  expect(r.status()).toBe(401);
});
```

- [ ] **Step 3: Запустить**

```bash
cd web && npm run test:e2e -- account-export
```

Ожидаемо: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add web/app/api/account/export web/tests/e2e/account-export.spec.ts
git commit -m "Plan 1 Task 16: data export endpoint (JSON dump для 99-З)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: Health check + Sentry + Plausible

**Files:**
- Create: `web/app/api/health/route.ts`
- Modify: `web/app/layout.tsx`
- Create: `web/sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Create: `web/instrumentation.ts`

- [ ] **Step 1: Health endpoint**

`web/app/api/health/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function GET() {
  try {
    const payload = await getPayload({ config });
    await payload.find({ collection: 'cities', limit: 1 });
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', error: e.message }, { status: 503 });
  }
}
```

- [ ] **Step 2: Sentry**

```bash
cd web && npx @sentry/wizard@latest -i nextjs --saas --org placeholder --project placeholder --signup
```

(Альтернативно — установить вручную `@sentry/nextjs` и создать `sentry.*.config.ts` по шаблону документации.)

- [ ] **Step 3: Plausible**

Установить:

```bash
cd web && npm install next-plausible
```

В `web/app/layout.tsx` добавить:

```tsx
import PlausibleProvider from 'next-plausible';

// в RootLayout
<html lang="ru-BY">
  <head>
    <PlausibleProvider domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || 'pet-aggregator.by'} trackOutboundLinks />
  </head>
  <body>...</body>
</html>
```

- [ ] **Step 4: Smoke-тест health**

```bash
cd web && npm run dev
# В другом терминале:
curl http://localhost:3000/api/health
```

Ожидаемо: `{"status":"ok","timestamp":"..."}`.

- [ ] **Step 5: Commit**

```bash
git add web/app/api/health web/sentry*.config.ts web/instrumentation.ts web/app/layout.tsx web/next.config.mjs web/package.json web/package-lock.json
git commit -m "Plan 1 Task 17: health endpoint + Sentry + Plausible

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: Stub-страницы Privacy / Terms / Cookie

**Files:**
- Create: `web/app/(public)/privacy/page.tsx`, `terms/page.tsx`, `cookie-policy/page.tsx`
- Create: `web/components/compliance/CookieBanner.tsx`
- Modify: `web/app/layout.tsx`

- [ ] **Step 1: Stub-страницы**

`web/app/(public)/privacy/page.tsx`:

```tsx
export const metadata = { title: 'Политика конфиденциальности' };

export default function PrivacyPage() {
  return (
    <article className="prose max-w-3xl mx-auto px-4 py-12">
      <h1>Политика конфиденциальности</h1>
      <p><strong>Дата вступления в силу:</strong> {new Date().toLocaleDateString('ru-BY')}</p>
      <p>Pet Aggregator BY обрабатывает персональные данные в соответствии с Законом Республики Беларусь от 7 мая 2021 г. № 99-З «О защите персональных данных» и Указом Президента Республики Беларусь от 28 октября 2021 г. № 422.</p>
      <h2>1. Какие данные мы собираем</h2>
      <p>[ЗАГЛУШКА — заполняется юристом-партнёром в фазе 0]</p>
      <h2>2. Цели обработки</h2>
      <p>[ЗАГЛУШКА]</p>
      <h2>3. Сроки хранения</h2>
      <p>[ЗАГЛУШКА]</p>
      <h2>4. Ваши права</h2>
      <ul>
        <li>Получить копию данных — <a href="/api/account/export">скачать JSON</a></li>
        <li>Удалить аккаунт — в личном кабинете</li>
        <li>Обратиться к нам — info@pet-aggregator.by</li>
      </ul>
    </article>
  );
}
```

`web/app/(public)/terms/page.tsx` и `cookie-policy/page.tsx` — аналогичные заглушки с пометкой что финальный текст готовит юрист.

- [ ] **Step 2: Cookie banner**

`web/components/compliance/CookieBanner.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('cookie-consent')) setShow(true);
  }, []);
  function accept() {
    localStorage.setItem('cookie-consent', 'accepted');
    setShow(false);
  }
  if (!show) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 bg-card border-t p-4 z-50" role="dialog" aria-label="Cookie banner">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-3 items-start md:items-center">
        <p className="text-sm flex-1">
          Мы используем cookie для работы сайта. <Link href="/cookie-policy" className="underline">Подробнее</Link>
        </p>
        <button onClick={accept} className="px-4 py-2 bg-primary text-primary-foreground rounded">
          Принять
        </button>
      </div>
    </div>
  );
}
```

В `web/app/layout.tsx` добавить компонент:

```tsx
import { CookieBanner } from '@/components/compliance/CookieBanner';
// ...
<body>
  {children}
  <CookieBanner />
</body>
```

- [ ] **Step 3: Commit**

```bash
git add web/app/\(public\)/privacy web/app/\(public\)/terms web/app/\(public\)/cookie-policy web/components/compliance web/app/layout.tsx
git commit -m "Plan 1 Task 18: stub-страницы Privacy/Terms/Cookie + CookieBanner

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 19: Railway deployment + GitHub Actions CI

**Files:**
- Create: `railway.json` (в корне репо)
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Создать Railway проект и БД**

(Ручной шаг через UI Railway или через MCP-tool `railway:use-railway`)

- Создать проект `pet-aggregator`
- Добавить service: Postgres
- Добавить service: Next.js (`web/`)
- Скопировать `DATABASE_URL` в env
- Установить остальные env-vars из `.env.example` со значениями prod

- [ ] **Step 2: Создать `railway.json`**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd web && npm install && npm run build"
  },
  "deploy": {
    "startCommand": "cd web && npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3,
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30
  }
}
```

- [ ] **Step 3: CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: pet
          POSTGRES_PASSWORD: pet
          POSTGRES_DB: pet_aggregator_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: 'web/package-lock.json' }
      - run: cd web && npm ci
      - run: cd web && npm run typecheck
      - run: cd web && npm run lint
      - run: cd web && npm test
        env:
          DATABASE_URL: postgresql://pet:pet@localhost:5432/pet_aggregator_test
          PAYLOAD_SECRET: ci-test-secret-32-characters-aaaa
      - run: cd web && npx playwright install --with-deps chromium
      - run: cd web && npm run test:e2e
        env:
          DATABASE_URL: postgresql://pet:pet@localhost:5432/pet_aggregator_test
          PAYLOAD_SECRET: ci-test-secret-32-characters-aaaa
```

- [ ] **Step 4: Deploy workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: []
    steps:
      - uses: actions/checkout@v4
      - name: Trigger Railway deploy
        run: curl -X POST "https://backboard.railway.app/graphql/v2" -H "Authorization: Bearer ${{ secrets.RAILWAY_TOKEN }}" -H "Content-Type: application/json" -d '{"query":"mutation { serviceInstanceDeploy(serviceId: \"${{ secrets.RAILWAY_SERVICE_ID }}\") }"}'
```

(Альтернативно — Railway автодетектит push на main если установлено GitHub-integration в Railway UI; тогда workflow не нужен.)

- [ ] **Step 5: Push и проверить**

```bash
git push origin main
```

Проверить в Actions tab — CI и Deploy запустились. На Railway — деплой прошёл. Открыть домен Railway и `/api/health` — `{status: "ok"}`.

- [ ] **Step 6: Commit**

```bash
git add railway.json .github
git commit -m "Plan 1 Task 19: Railway deploy + GitHub Actions CI/deploy

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 20: Lighthouse CI + axe-core CI

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `web/lighthouserc.js`

- [ ] **Step 1: Установить пакеты**

```bash
cd web && npm install -D @lhci/cli @axe-core/playwright
```

- [ ] **Step 2: Lighthouse config `web/lighthouserc.js`**

```js
module.exports = {
  ci: {
    collect: { startServerCommand: 'npm run start', url: ['http://localhost:3000/'], numberOfRuns: 1 },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
  },
};
```

- [ ] **Step 3: Axe e2e тест**

`web/tests/e2e/a11y.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page has no a11y violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('login page has no a11y violations', async ({ page }) => {
  await page.goto('/login');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

- [ ] **Step 4: Добавить в CI**

В `ci.yml` после e2e добавить:

```yaml
      - name: Lighthouse CI
        run: cd web && npx lhci autorun
        env:
          DATABASE_URL: postgresql://pet:pet@localhost:5432/pet_aggregator_test
          PAYLOAD_SECRET: ci-test-secret-32-characters-aaaa
```

- [ ] **Step 5: Запустить локально**

```bash
cd web && npm run test:e2e -- a11y
cd web && npm run build && npx lhci autorun
```

Ожидаемо: a11y passed, Lighthouse score ≥0.9 на accessibility.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml web/lighthouserc.js web/tests/e2e/a11y.spec.ts web/package.json web/package-lock.json
git commit -m "Plan 1 Task 20: Lighthouse CI + axe-core e2e

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 21: README и onboarding-документация

**Files:**
- Create: `web/README.md`
- Modify: `README.md` (корень)

- [ ] **Step 1: Создать `web/README.md`**

```markdown
# Pet Aggregator BY — Web

Next.js 14 + Payload CMS 3 веб-приложение белорусского агрегатора животных.

## Локальная разработка

### Требования

- Node.js 20+
- Docker + Docker Compose (для Postgres)

### Старт

```bash
docker compose up -d postgres
cd web
cp .env.example .env.local
# Заполнить .env.local своими значениями
npm install
npx payload generate:importmap
npm run dev
```

Открыть `http://localhost:3000`. Админка: `/admin` (первый юзер регистрируется через UI).

### Seed данных

```bash
npm run seed
```

### Тесты

```bash
npm test          # unit (Vitest)
npm run test:e2e  # e2e (Playwright)
npm run typecheck # TypeScript
npm run lint      # ESLint
```

## Деплой

Railway. Push в `main` → автодеплой.
Env-vars прописываются в Railway dashboard.

## Структура

- `app/` — Next.js App Router
- `collections/` — Payload коллекции
- `lib/` — бизнес-логика, чистые функции
- `components/` — React-компоненты
- `tests/` — Vitest unit + Playwright e2e

## Документация

- Spec: `../docs/superpowers/specs/2026-05-28-pet-aggregator-design.md`
- План MVP: `../docs/superpowers/plans/`
- Ресёрч: `../docs/research/2026-05-28-pet-aggregator-research.md`
```

- [ ] **Step 2: Обновить корневой README**

В корневом `README.md` добавить блок:

```markdown
## Веб-агрегатор

См. [`web/README.md`](web/README.md).
```

- [ ] **Step 3: Commit**

```bash
git add web/README.md README.md
git commit -m "Plan 1 Task 21: README и onboarding-документация

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

### Spec coverage check

Спека §2 (Scope MVP) и §16.7 (финальный апдейт MVP). Foundation покрывает:

- ✅ Next.js + Payload + Postgres + R2 + auth (TG+email) → Tasks 1, 4, 5, 7, 11, 12, 13
- ✅ Базовые модели User, City, Media, AuditLog, NotificationPreference → Tasks 5, 6, 7, 8, 9
- ✅ Railway deploy → Task 19
- ✅ Sentry, Plausible → Task 17
- ✅ Magic-link login → Task 14
- ✅ Account deletion + data export (99-З) → Tasks 15, 16
- ✅ Welcome-email + verification + password reset → Task 10
- ✅ Privacy/Terms/Cookie stubs → Task 18
- ✅ axe-core CI + Lighthouse CI → Task 20
- ✅ README → Task 21
- ✅ 404/500 страницы → Task 3
- ✅ Cookie banner → Task 18

### Pending — НЕ в этом плане (распределены по будущим)

- 2FA TOTP — в Plan 5 (Trust & Safety)
- Captcha (Turnstile) на формы — в Plan 5
- Rate limiting — в Plan 5
- Onboarding-walkthrough — в Plan 6 (Polish)
- Welcome-email triggered после регистрации — добавить hook в Task 5/10 (TODO для будущей итерации)
- Tawk.to виджет — в Plan 6
- Status page — в Plan 6
- i18n setup (`next-intl`) — в Plan 6
- «Шрифт крупнее» — в Plan 6
- Bundle analyzer — опционально, не критично
- Email-настройки в /me/profile — в Plan 3 (после AdoptionInquiry/Donations моделей)
- 2FA для модераторов — Plan 5

### Type consistency

- `UserLike` в `rbac.ts` использует `role` строки, в `Users.ts` коллекции совпадает enum
- `findOrCreateUserByTelegram` возвращает `any` — типизируется через `User` из `payload-types.ts` после первой генерации (`npx payload generate:types`)
- Все hash-функции консистентно используют `node:crypto`

### Placeholder scan

Все Step-блоки содержат конкретный код или конкретные shell-команды. Заглушки только в стуб-страницах Privacy/Terms — это намеренно (контент пишет юрист в фазе 0).

---

## Execution Handoff

План сохранён в `docs/superpowers/plans/2026-05-28-plan-1-foundation.md`. Два варианта исполнения:

1. **Subagent-Driven (рекомендую)** — Свежий subagent на каждую задачу, две стадии review между ними, быстрая итерация. Подходит когда много независимых задач (тут 21).

2. **Inline Execution** — Выполнение задач в этой же сессии через `superpowers:executing-plans`, batch с checkpoint'ами. Подходит если хочешь быть в каждом шаге.

Какой подход?
