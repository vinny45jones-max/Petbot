# Plan 6: Quality + Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закрыть оставшиеся фаза-1 фичи качества и подготовки к запуску: i18n-готовность (next-intl, одна локаль `ru`, форматтеры `ru-BY`), accessibility-тоггл «Шрифт крупнее», onboarding-walkthrough, чат поддержки Tawk.to, 2FA TOTP для модераторов/админов, maintenance-mode, image-sitemap, триггер welcome-email, страница оплаты по номеру ЕРИП, недельный бэкап БД в R2, status-page/healthcheck и финальный go-live чек-лист (перевод платежей в прод).

**Architecture:** Бизнес-логика выносится в чистые модули `web/lib/*` (форматтеры, plural-правила, TOTP, шифрование секрета, подпись 2FA-cookie, retention бэкапов, предикаты maintenance) — это даёт быстрые unit-тесты без сети и БД. UI-слой (тоггл шрифта, onboarding, Tawk, страница 2FA) — тонкие client-компоненты поверх этих модулей. 2FA-гейт для Payload-админки `/admin` реализуется на Edge через `middleware.ts` (Web Crypto, без node-зависимостей), туда же ложится maintenance-mode. i18n — режим next-intl «без routing» (без сегмента `[locale]`): все строки выносятся в `messages/ru.json`, добавление `be`/`en` в фазе 2-3 = заполнение словарей.

**Tech Stack:** Next.js 15 (App Router, RSC, Edge middleware) + Payload CMS 3 + Postgres + Cloudflare R2 + next-intl 3 + otplib + qrcode + `node:crypto` / Web Crypto + Resend + Railway Cron + Vitest + Playwright (база из Plan 1).

**Roadmap-позиция:** Plan 1–5 ✅ (foundation; catalog+orgs; posting/cabinets; content&trust+§17.6; donations ExpressPay/ЕРИП). **Plan 6 = Quality + Launch (финал MVP, фаза 1).** Дальше — фаза 2 (чат, SMS, UGC, recurring, saved searches — §10/§16.3).

---

## Что уже существует (из Plan 1–5) — переиспользуем, НЕ дублируем

- **Каркас:** Next.js 15 App Router в `web/`, Payload CMS 3, Postgres, R2, деплой Railway, Sentry, Plausible, CI `.github/workflows/ci.yml` (Lighthouse + axe-core из Plan 1 Task 20).
- **Layout:** `web/app/layout.tsx` (`RootLayout`, `<html lang="ru">`, шрифт `Inter` с subset `cyrillic`, `import './globals.css'`), `web/components/layout/Header.tsx`, `web/components/layout/Footer.tsx`, `web/components/compliance/CookieBanner.tsx` (хранит `localStorage['cookie-consent'] === 'accepted'`).
- **Auth/сессии:** `web/lib/auth/session.ts` — `issueSessionToken(user: {id,email})` (подпись `payload-token` JWT через `PAYLOAD_SECRET`, `jsonwebtoken`) + `setSessionCookie(token)` (httpOnly cookie `payload-token`). Логины: TG OAuth (Plan 1 Task 11/13), email/пароль (Payload native), magic-link (Task 14). RBAC `web/lib/auth/rbac.ts` (`isAdmin`, `canManageOrganization`). Роли в `web/collections/Users.ts` (5 ролей: citizen, org_admin, moderator, superadmin, …).
- **Модерация:** идёт в Payload-админке `/admin/collections/animals/...` — туда заходят `moderator`/`superadmin` (цель 2FA-гейта).
- **Email:** `web/lib/email/resend-client.ts` — `sendEmail({to,subject,react})`; шаблоны `web/lib/email/templates/*` (включая `welcome.tsx` из Plan 1 Task 10 — но триггер после регистрации не подключён, помечен TODO).
- **SEO/sitemap:** `web/lib/sitemap-data.ts` (`SITEMAP_CHUNK`, `sitemapShards(counts)`, `animalSitemapEntry(doc)`) + `web/app/sitemap.ts` (split через `generateSitemaps`). IndexNow `web/lib/seo/indexnow.ts` (Plan 4 Task 21).
- **Health:** `web/app/api/health/route.ts` → `{status:"ok"}` (Plan 1). Railway healthcheckPath `/api/health`.
- **Донаты:** `web/lib/payments/expresspay.ts` (`createInvoice` → `{ invoiceId, eripNumber, paymentUrl, ... }`), коллекция `donations`, конфиг `EXPRESSPAY_*` (`EXPRESSPAY_USE_CARD`, `EXPRESSPAY_SERVICE_ID`). При `EXPRESSPAY_USE_CARD=false` инвойс возвращает `eripNumber` (номер для оплаты в банке) — нужна страница инструкции (отложено в Plan 5 как мини-таск).
- **Audit:** `web/lib/audit/log.ts` — `recordAuditLog(payload, {actorId, action, targetType, targetId, meta?})`, коллекция `audit-logs`.
- **Тесты:** Vitest `web/tests/unit/*`, Playwright `web/tests/e2e/*`.

---

## Новые / изменяемые файлы

```text
web/
├── i18n/
│   └── request.ts                       # NEW: next-intl getRequestConfig (locale=ru)
├── messages/
│   └── ru.json                          # NEW: словарь строк (стартовый набор)
├── middleware.ts                        # NEW: maintenance-mode + 2FA-гейт /admin (Edge)
├── lib/
│   ├── format.ts                        # NEW: ru-BY форматтеры + pluralRu
│   ├── a11y/font-scale.ts               # NEW: чистая логика цикла масштаба шрифта
│   ├── onboarding.ts                    # NEW: shouldShowOnboarding
│   ├── support/tawk.ts                  # NEW: shouldLoadTawk(consent, env)
│   ├── auth/
│   │   ├── totp.ts                      # NEW: обёртки otplib + recovery codes
│   │   ├── totp-crypto.ts               # NEW: AES-256-GCM шифрование секрета
│   │   ├── twofa-cookie.ts              # NEW: Web Crypto HMAC подпись twofa-ok
│   │   ├── jwt-claims.ts                # NEW: decodeJwtPayload (edge-safe, без verify)
│   │   └── session.ts                   # MODIFY: добавить role в payload-token
│   ├── maintenance.ts                   # NEW: isMaintenanceBlocked предикат
│   ├── backup/retention.ts              # NEW: backupKey + prunableKeys
│   └── sitemap-data.ts                  # MODIFY: animalSitemapEntry → images[]
├── components/
│   ├── a11y/FontSizeToggle.tsx          # NEW
│   ├── onboarding/OnboardingTour.tsx    # NEW
│   ├── support/TawkWidget.tsx           # NEW
│   ├── auth/TwoFactorSetup.tsx          # NEW: enroll-форма (QR + код)
│   ├── auth/TwoFactorGate.tsx           # NEW: ввод кода на /2fa
│   └── layout/Footer.tsx                # MODIFY: смонтировать FontSizeToggle
├── collections/Users.ts                 # MODIFY: поля totp* + afterChange welcome-email
├── app/
│   ├── layout.tsx                       # MODIFY: NextIntlClientProvider + SSR font-scale + Tawk + Onboarding
│   ├── api/auth/2fa/
│   │   ├── enroll/route.ts              # NEW: выдать secret + QR
│   │   ├── activate/route.ts            # NEW: подтвердить код → totpEnabled
│   │   ├── disable/route.ts             # NEW: выключить 2FA
│   │   └── gate/route.ts                # NEW: проверить код → cookie twofa-ok
│   ├── api/health/route.ts              # MODIFY: + проверка БД и R2
│   ├── (account)/me/security/page.tsx   # NEW: страница настройки 2FA
│   ├── (public)/2fa/page.tsx            # NEW: страница ввода 2FA-кода (redirect-гейт)
│   ├── maintenance/page.tsx             # NEW: страница техработ
│   ├── (public)/help/erip/[number]/page.tsx  # NEW: инструкция оплаты по номеру ЕРИП
│   └── sitemap.ts                       # MODIFY: прокинуть images в entry
├── scripts/backup-db.ts                 # NEW: pg_dump → R2 + prune
└── tests/
    ├── unit/format.test.ts
    ├── unit/a11y/font-scale.test.ts
    ├── unit/onboarding.test.ts
    ├── unit/support/tawk.test.ts
    ├── unit/auth/totp.test.ts
    ├── unit/auth/totp-crypto.test.ts
    ├── unit/auth/twofa-cookie.test.ts
    ├── unit/auth/jwt-claims.test.ts
    ├── unit/maintenance.test.ts
    ├── unit/backup/retention.test.ts
    ├── unit/sitemap-images.test.ts
    └── e2e/quality.spec.ts
```

**Новые env (`.env` / Railway):**

```env
# Tawk.to (чат поддержки) — пусто = виджет выключен
NEXT_PUBLIC_TAWK_PROPERTY_ID=
NEXT_PUBLIC_TAWK_WIDGET_ID=
# 2FA
TWOFA_ISSUER=PetAggregator        # имя сервиса в authenticator-приложении (секрет шифруется ключом из PAYLOAD_SECRET)
# Maintenance
MAINTENANCE_MODE=false
# Бэкап БД → R2 (R2_* и DATABASE_URL уже из Plan 1)
BACKUP_RETENTION_WEEKS=8
```

---

## Task 1: i18n-фундамент (next-intl, локаль `ru`) + форматтеры `ru-BY`

**Files:**
- Create: `web/i18n/request.ts`
- Create: `web/messages/ru.json`
- Create: `web/lib/format.ts`
- Create: `web/tests/unit/format.test.ts`
- Modify: `web/next.config.mjs`
- Modify: `web/app/layout.tsx`
- Modify: `web/components/layout/Footer.tsx`

- [ ] **Step 1: Установить next-intl**

```bash
cd web && npm install next-intl
```

- [ ] **Step 2: Failing тест форматтеров `web/tests/unit/format.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { pluralRu, formatByn, formatNumber, formatDate } from '@/lib/format';

describe('pluralRu', () => {
  const f = { one: 'кот', few: 'кота', many: 'котов' };
  it.each([
    [1, 'кот'], [21, 'кот'], [101, 'кот'],
    [2, 'кота'], [3, 'кота'], [4, 'кота'], [22, 'кота'],
    [0, 'котов'], [5, 'котов'], [11, 'котов'], [12, 'котов'], [14, 'котов'],
    [25, 'котов'], [111, 'котов'], [112, 'котов'],
  ])('%i → %s', (n, expected) => {
    expect(pluralRu(n, f)).toBe(expected);
  });
});

describe('Intl-обёртки (ru-BY)', () => {
  it('formatByn содержит сумму', () => {
    const s = formatByn(1234.5);
    expect(s).toContain('1');
    expect(s).toContain('234');
    expect(/[,.]50/.test(s)).toBe(true); // дробная часть с разделителем
  });
  it('formatNumber группирует тысячи', () => {
    expect(formatNumber(1000000).replace(/\s| | /g, '')).toBe('1000000');
  });
  it('formatDate возвращает непустую строку с годом', () => {
    expect(formatDate('2026-05-29T00:00:00Z')).toContain('2026');
  });
});
```

> Не проверяем точную строку Intl-вывода (разделитель тысяч = narrow no-break space, currency-маркер зависит от ICU-данных Node) — только устойчивые признаки.

- [ ] **Step 3: Запустить тест — должен упасть**

Run: `cd web && npm test -- format`
Expected: FAIL (`Cannot find module '@/lib/format'`).

- [ ] **Step 4: Реализовать `web/lib/format.ts`**

```ts
// Форматтеры и plural-правила для локали ru-BY. Чистые функции, без зависимостей. §16.2 (i18n-ready)

/** CLDR-правило множественного числа для русского. */
export function pluralRu(count: number, forms: { one: string; few: string; many: string }): string {
  const n = Math.abs(count);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms.one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms.few;
  return forms.many;
}

// formatByn — канон в `lib/payments/amounts.ts` (создан в Plan 5, исполняется раньше P6). Не дублируем (ревью P5-4).
export { formatByn } from '@/lib/payments/amounts';

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-BY').format(value);
}

export function formatDate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('ru-BY', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}
```

- [ ] **Step 5: Запустить тест — должен пройти**

Run: `cd web && npm test -- format`
Expected: PASS.

- [ ] **Step 6: Создать `web/i18n/request.ts` (режим next-intl без routing)**

```ts
import { getRequestConfig } from 'next-intl/server';

// Одна локаль на MVP. be/en добавляются заполнением словарей в фазе 2-3 (§10.12).
export default getRequestConfig(async () => {
  const locale = 'ru';
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 7: Создать стартовый словарь `web/messages/ru.json`**

```json
{
  "nav": {
    "catalog": "Каталог",
    "organizations": "Организации",
    "lostFound": "Найдено / Потеряно",
    "blog": "Блог",
    "legal": "Юридическая помощь",
    "help": "Справка",
    "login": "Войти",
    "logout": "Выйти"
  },
  "common": {
    "help": "Помочь",
    "adopt": "Взять домой",
    "submit": "Отправить",
    "report": "Сообщить",
    "loading": "Загрузка…",
    "back": "Назад"
  },
  "footer": {
    "about": "О проекте",
    "contacts": "Контакты",
    "privacy": "Политика конфиденциальности",
    "terms": "Условия использования",
    "cookie": "Cookie",
    "rules": "Правила размещения",
    "fontLarger": "Шрифт крупнее"
  }
}
```

> Конвенция: новые user-facing строки кладём сюда и читаем через `useTranslations('section')` (client) / `getTranslations('section')` (server). Полная миграция всех существующих строк — постепенно, не блокирует Plan 6.

- [ ] **Step 8: Подключить плагин в `web/next.config.mjs`**

Обернуть существующий конфиг. Если он уже обёрнут `withSentryConfig` (Plan 1) — скомпоновать:

```js
import createNextIntlPlugin from 'next-intl/plugin';
// ...существующие импорты (withSentryConfig и т.д.)

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// было: export default withSentryConfig(nextConfig, sentryOptions);
// стало:
export default withSentryConfig(withNextIntl(nextConfig), sentryOptions);
```

> Если Sentry-обёртки нет — `export default withNextIntl(nextConfig);`.

- [ ] **Step 9: Обернуть `RootLayout` провайдером (`web/app/layout.tsx`)**

`RootLayout` делаем async. Добавить импорты и провайдер:

```tsx
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          {/* существующее содержимое: Header / children / Footer / CookieBanner / Sentry */}
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

> Сохранить всё, что уже в layout (Header, Footer, CookieBanner). Меняется только: `async`, `lang={locale}`, обёртка `NextIntlClientProvider`.

- [ ] **Step 10: Перевести `Footer.tsx` на словарь (worked example)**

В `web/components/layout/Footer.tsx` заменить хардкод-подписи на `useTranslations`:

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');
  // пример: <Link href="/about">{t('about')}</Link>, <Link href="/privacy">{t('privacy')}</Link> и т.д.
  // ...остальная разметка без изменений
}
```

> Footer уже `'use client'`? Если нет — добавить директиву. Остальные компоненты мигрируют по мере касания.

- [ ] **Step 11: Прогон тестов + сборка**

Run: `cd web && npm test -- format && npm run build`
Expected: тесты PASS; build без ошибок (провайдер и плагин валидны).

- [ ] **Step 12: Commit**

```bash
git add web/i18n web/messages web/lib/format.ts web/tests/unit/format.test.ts web/next.config.mjs web/app/layout.tsx web/components/layout/Footer.tsx web/package.json web/package-lock.json
git commit -m "Plan 6 Task 1: i18n-фундамент next-intl (ru) + форматтеры ru-BY

next-intl без routing: messages/ru.json + getRequestConfig + NextIntlClientProvider.
lib/format.ts: pluralRu (CLDR) + formatByn/formatNumber/formatDate (ru-BY). §10.12 §16.2"
```

---

## Task 2: Accessibility-тоггл «Шрифт крупнее»

**Files:**
- Create: `web/lib/a11y/font-scale.ts`
- Create: `web/tests/unit/a11y/font-scale.test.ts`
- Create: `web/components/a11y/FontSizeToggle.tsx`
- Modify: `web/app/globals.css`
- Modify: `web/app/layout.tsx` (SSR-чтение cookie → атрибут на `<html>`, без мигания)
- Modify: `web/components/layout/Footer.tsx` (смонтировать тоггл)

- [ ] **Step 1: Failing тест `web/tests/unit/a11y/font-scale.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { FONT_SCALES, nextFontScale, isFontScale } from '@/lib/a11y/font-scale';

describe('font-scale', () => {
  it('циклически переключает масштаб', () => {
    expect(nextFontScale('normal')).toBe('large');
    expect(nextFontScale('large')).toBe('xlarge');
    expect(nextFontScale('xlarge')).toBe('normal');
  });
  it('невалидный вход трактуется как normal', () => {
    expect(nextFontScale('bogus')).toBe('large');
  });
  it('isFontScale валидирует значение cookie', () => {
    expect(isFontScale('large')).toBe(true);
    expect(isFontScale('huge')).toBe(false);
  });
  it('FONT_SCALES = три значения', () => {
    expect(FONT_SCALES).toEqual(['normal', 'large', 'xlarge']);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `cd web && npm test -- font-scale`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать `web/lib/a11y/font-scale.ts`**

```ts
// Масштаб базового шрифта для пожилых/low-vision. §16.2 accessibility («Шрифт крупнее»).
export const FONT_SCALES = ['normal', 'large', 'xlarge'] as const;
export type FontScale = (typeof FONT_SCALES)[number];
export const FONT_SCALE_COOKIE = 'font-scale';

export function isFontScale(v: unknown): v is FontScale {
  return typeof v === 'string' && (FONT_SCALES as readonly string[]).includes(v);
}

export function nextFontScale(current: unknown): FontScale {
  const cur: FontScale = isFontScale(current) ? current : 'normal';
  const idx = FONT_SCALES.indexOf(cur);
  return FONT_SCALES[(idx + 1) % FONT_SCALES.length];
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `cd web && npm test -- font-scale`
Expected: PASS.

- [ ] **Step 5: CSS-правила масштаба в `web/app/globals.css`**

Добавить в конец файла (масштабируем корневой `rem` — вся типографика на Tailwind подтянется):

```css
/* «Шрифт крупнее» — §16.2 accessibility. Атрибут ставится SSR на <html>, без мигания. */
html[data-font-scale="large"] { font-size: 18px; }
html[data-font-scale="xlarge"] { font-size: 20px; }
/* normal = дефолтные 16px браузера */
```

- [ ] **Step 6: Client-компонент `web/components/a11y/FontSizeToggle.tsx`**

```tsx
'use client';
import { useState, useEffect } from 'react';
import { FontScale, nextFontScale, isFontScale, FONT_SCALE_COOKIE } from '@/lib/a11y/font-scale';

function readCookie(name: string): string | undefined {
  return document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.split('=')[1];
}

export function FontSizeToggle() {
  const [scale, setScale] = useState<FontScale>('normal');

  useEffect(() => {
    const c = readCookie(FONT_SCALE_COOKIE);
    if (isFontScale(c)) setScale(c);
  }, []);

  function cycle() {
    const next = nextFontScale(scale);
    setScale(next);
    document.documentElement.setAttribute('data-font-scale', next);
    // cookie на год, доступна SSR-layout для отрисовки без мигания
    document.cookie = `${FONT_SCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label="Изменить размер шрифта"
      className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
    >
      <span aria-hidden>A+</span> Шрифт крупнее
    </button>
  );
}
```

- [ ] **Step 7: SSR-чтение cookie в `web/app/layout.tsx` (без мигания)**

В `RootLayout` (уже async из Task 1) прочитать cookie и проставить атрибут на `<html>`:

```tsx
import { cookies } from 'next/headers';
import { isFontScale, FONT_SCALE_COOKIE } from '@/lib/a11y/font-scale';

// внутри RootLayout, до return:
const fontScaleCookie = cookies().get(FONT_SCALE_COOKIE)?.value;
const fontScale = isFontScale(fontScaleCookie) ? fontScaleCookie : 'normal';

// в JSX:
<html lang={locale} data-font-scale={fontScale}>
```

- [ ] **Step 8: Смонтировать тоггл в `web/components/layout/Footer.tsx`**

Добавить в footer (например, в строку с accessibility-ссылками):

```tsx
import { FontSizeToggle } from '@/components/a11y/FontSizeToggle';
// ...
<FontSizeToggle />
```

- [ ] **Step 9: Прогон**

Run: `cd web && npm test -- font-scale`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add web/lib/a11y web/tests/unit/a11y web/components/a11y web/app/globals.css web/app/layout.tsx web/components/layout/Footer.tsx
git commit -m "Plan 6 Task 2: тоггл «Шрифт крупнее» (SSR cookie, без мигания)

lib/a11y/font-scale.ts (чистый цикл) + FontSizeToggle + CSS-масштаб rem. §16.2 accessibility"
```

---

## Task 3: Onboarding-walkthrough при первом визите

**Files:**
- Create: `web/lib/onboarding.ts`
- Create: `web/tests/unit/onboarding.test.ts`
- Create: `web/components/onboarding/OnboardingTour.tsx`
- Modify: `web/app/layout.tsx` (смонтировать тур)

- [ ] **Step 1: Failing тест `web/tests/unit/onboarding.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { ONBOARDING_COOKIE, ONBOARDING_STEPS, shouldShowOnboarding } from '@/lib/onboarding';

describe('onboarding', () => {
  it('показываем, если cookie не выставлен', () => {
    expect(shouldShowOnboarding(undefined)).toBe(true);
    expect(shouldShowOnboarding('')).toBe(true);
  });
  it('не показываем после "seen"', () => {
    expect(shouldShowOnboarding('seen')).toBe(false);
  });
  it('2-3 шага', () => {
    expect(ONBOARDING_STEPS.length).toBeGreaterThanOrEqual(2);
    expect(ONBOARDING_STEPS.length).toBeLessThanOrEqual(3);
    expect(ONBOARDING_COOKIE).toBe('onboarding-seen');
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `cd web && npm test -- onboarding`
Expected: FAIL.

- [ ] **Step 3: Реализовать `web/lib/onboarding.ts`**

```ts
// Onboarding-walkthrough при первом визите. §16.2 (2-3 шага tooltip).
export const ONBOARDING_COOKIE = 'onboarding-seen';

export const ONBOARDING_STEPS = [
  { title: 'Найдите питомца', body: 'Каталог с фильтрами по городу, виду и срочности.' },
  { title: 'Помогите делом', body: 'Кнопка «Помочь» — донат через ЕРИП на конкретное животное.' },
  { title: 'Разместите объявление', body: 'Нашли животное? Заполните короткую анкету за пару минут.' },
] as const;

export function shouldShowOnboarding(cookieValue: string | undefined): boolean {
  return cookieValue !== 'seen';
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `cd web && npm test -- onboarding`
Expected: PASS.

- [ ] **Step 5: Client-компонент `web/components/onboarding/OnboardingTour.tsx`**

```tsx
'use client';
import { useState, useEffect } from 'react';
import { ONBOARDING_COOKIE, ONBOARDING_STEPS, shouldShowOnboarding } from '@/lib/onboarding';

function readCookie(name: string): string | undefined {
  return document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.split('=')[1];
}

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (shouldShowOnboarding(readCookie(ONBOARDING_COOKIE))) setOpen(true);
  }, []);

  function dismiss() {
    setOpen(false);
    document.cookie = `${ONBOARDING_COOKIE}=seen; path=/; max-age=31536000; samesite=lax`;
  }

  if (!open) return null;
  const s = ONBOARDING_STEPS[step];
  const last = step === ONBOARDING_STEPS.length - 1;

  return (
    <div role="dialog" aria-label="Знакомство с сайтом" className="fixed inset-x-0 bottom-0 z-50 mx-auto mb-4 w-[min(92vw,420px)] rounded-xl border bg-white p-5 shadow-lg">
      <p className="text-xs text-muted-foreground">Шаг {step + 1} из {ONBOARDING_STEPS.length}</p>
      <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
      <p className="mt-1 text-sm">{s.body}</p>
      <div className="mt-4 flex justify-between">
        <button type="button" onClick={dismiss} className="text-sm text-muted-foreground underline">Пропустить</button>
        <button
          type="button"
          onClick={() => (last ? dismiss() : setStep(step + 1))}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {last ? 'Понятно' : 'Далее'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Смонтировать в `web/app/layout.tsx`**

Внутри `NextIntlClientProvider`, рядом с `CookieBanner`:

```tsx
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
// ...
<OnboardingTour />
```

- [ ] **Step 7: Прогон**

Run: `cd web && npm test -- onboarding`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add web/lib/onboarding.ts web/tests/unit/onboarding.test.ts web/components/onboarding web/app/layout.tsx
git commit -m "Plan 6 Task 3: onboarding-walkthrough при первом визите

lib/onboarding.ts (shouldShowOnboarding + 3 шага) + OnboardingTour (cookie onboarding-seen). §16.2"
```

---

## Task 4: Чат поддержки Tawk.to (consent-gated)

**Files:**
- Create: `web/lib/support/tawk.ts`
- Create: `web/tests/unit/support/tawk.test.ts`
- Create: `web/components/support/TawkWidget.tsx`
- Modify: `web/app/layout.tsx`

- [ ] **Step 1: Failing тест `web/tests/unit/support/tawk.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { shouldLoadTawk, tawkSrc } from '@/lib/support/tawk';

describe('tawk', () => {
  it('грузим только при согласии + заданных env', () => {
    expect(shouldLoadTawk(true, { propertyId: 'p1', widgetId: 'w1' })).toBe(true);
  });
  it('без согласия — не грузим (cookie-banner ещё не принят)', () => {
    expect(shouldLoadTawk(false, { propertyId: 'p1', widgetId: 'w1' })).toBe(false);
  });
  it('без env — не грузим', () => {
    expect(shouldLoadTawk(true, { propertyId: '', widgetId: '' })).toBe(false);
    expect(shouldLoadTawk(true, { propertyId: 'p1', widgetId: '' })).toBe(false);
  });
  it('tawkSrc строит корректный URL', () => {
    expect(tawkSrc('PROP', 'WID')).toBe('https://embed.tawk.to/PROP/WID');
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `cd web && npm test -- support/tawk`
Expected: FAIL.

- [ ] **Step 3: Реализовать `web/lib/support/tawk.ts`**

```ts
// Tawk.to чат поддержки. Грузим только после согласия на cookie (Cookie Policy РБ — не-Plausible сервис). §9 §16.1
export interface TawkEnv { propertyId: string; widgetId: string; }

export function shouldLoadTawk(consentGiven: boolean, env: TawkEnv): boolean {
  return consentGiven && Boolean(env.propertyId) && Boolean(env.widgetId);
}

export function tawkSrc(propertyId: string, widgetId: string): string {
  return `https://embed.tawk.to/${propertyId}/${widgetId}`;
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `cd web && npm test -- support/tawk`
Expected: PASS.

- [ ] **Step 5: Client-компонент `web/components/support/TawkWidget.tsx`**

```tsx
'use client';
import { useEffect } from 'react';
import { shouldLoadTawk, tawkSrc } from '@/lib/support/tawk';

const env = {
  propertyId: process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID ?? '',
  widgetId: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID ?? '',
};

export function TawkWidget() {
  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent') === 'accepted'; // сигнал из CookieBanner (Plan 1)
    if (!shouldLoadTawk(consent, env)) return;
    if (document.getElementById('tawk-script')) return;
    const s = document.createElement('script');
    s.id = 'tawk-script';
    s.async = true;
    s.src = tawkSrc(env.propertyId, env.widgetId);
    s.charset = 'UTF-8';
    s.setAttribute('crossorigin', '*');
    document.body.appendChild(s);
  }, []);
  return null;
}
```

- [ ] **Step 6: Смонтировать в `web/app/layout.tsx`**

Рядом с `CookieBanner`:

```tsx
import { TawkWidget } from '@/components/support/TawkWidget';
// ...
<TawkWidget />
```

- [ ] **Step 7: Прогон**

Run: `cd web && npm test -- support/tawk`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add web/lib/support web/tests/unit/support web/components/support web/app/layout.tsx
git commit -m "Plan 6 Task 4: чат поддержки Tawk.to (consent-gated)

lib/support/tawk.ts (shouldLoadTawk + tawkSrc) + TawkWidget. Грузится только после cookie-consent. §9"
```

---

## Task 5: TOTP-ядро (otplib + recovery-коды)

**Files:**
- Create: `web/lib/auth/totp.ts`
- Create: `web/tests/unit/auth/totp.test.ts`

- [ ] **Step 1: Установить otplib + qrcode**

```bash
cd web && npm install otplib qrcode && npm install -D @types/qrcode
```

- [ ] **Step 2: Failing тест `web/tests/unit/auth/totp.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { authenticator } from 'otplib';
import { generateTotpSecret, buildOtpauthUrl, verifyTotp, generateRecoveryCodes, hashRecoveryCode } from '@/lib/auth/totp';

describe('totp', () => {
  it('генерирует base32-секрет', () => {
    const s = generateTotpSecret();
    expect(s).toMatch(/^[A-Z2-7]+$/);
    expect(s.length).toBeGreaterThanOrEqual(16);
  });
  it('verifyTotp принимает валидный код и отклоняет мусор', () => {
    const secret = generateTotpSecret();
    const token = authenticator.generate(secret);
    expect(verifyTotp(secret, token)).toBe(true);
    expect(verifyTotp(secret, '000000')).toBe(false);
    expect(verifyTotp(secret, 'abc')).toBe(false);
  });
  it('buildOtpauthUrl содержит issuer и аккаунт', () => {
    const url = buildOtpauthUrl('mod@pet.by', 'SECRET123', 'PetAggregator');
    expect(url.startsWith('otpauth://totp/')).toBe(true);
    expect(url).toContain('PetAggregator');
    expect(url).toContain('mod@pet.by');
  });
  it('recovery-коды: 10 уникальных, хеш детерминирован', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(hashRecoveryCode('ABCD-EFGH')).toBe(hashRecoveryCode('ABCD-EFGH'));
    expect(hashRecoveryCode('ABCD-EFGH')).not.toBe(hashRecoveryCode('XXXX-YYYY'));
  });
});
```

- [ ] **Step 3: Запустить — FAIL**

Run: `cd web && npm test -- auth/totp`
Expected: FAIL.

- [ ] **Step 4: Реализовать `web/lib/auth/totp.ts`**

```ts
// 2FA TOTP для moderator/superadmin. §16.2. Обёртка над otplib + recovery-коды.
import crypto from 'node:crypto';
import { authenticator } from 'otplib';

// Допускаем ±1 окно (30с) на рассинхрон часов.
authenticator.options = { window: 1 };

export function generateTotpSecret(): string {
  return authenticator.generateSecret(); // base32
}

export function buildOtpauthUrl(account: string, secret: string, issuer = process.env.TWOFA_ISSUER ?? 'PetAggregator'): string {
  return authenticator.keyuri(account, issuer, secret);
}

export function verifyTotp(secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token.trim())) return false;
  try {
    return authenticator.verify({ token: token.trim(), secret });
  } catch {
    return false;
  }
}

/** 10 кодов формата XXXX-XXXX (Crockford-подобный алфавит без неоднозначных символов). */
export function generateRecoveryCodes(count = 10): string[] {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const make = () => {
    const pick = (n: number) => Array.from({ length: n }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
    return `${pick(4)}-${pick(4)}`;
  };
  const set = new Set<string>();
  while (set.size < count) set.add(make());
  return [...set];
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}
```

- [ ] **Step 5: Запустить — PASS**

Run: `cd web && npm test -- auth/totp`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/lib/auth/totp.ts web/tests/unit/auth/totp.test.ts web/package.json web/package-lock.json
git commit -m "Plan 6 Task 5: TOTP-ядро (otplib) + recovery-коды

generateTotpSecret/buildOtpauthUrl/verifyTotp + 10 recovery-кодов (sha256-хеш). §16.2 2FA"
```

---

## Task 6: Шифрование секрета + поля User + enroll/disable 2FA

**Files:**
- Create: `web/lib/auth/totp-crypto.ts`
- Create: `web/tests/unit/auth/totp-crypto.test.ts`
- Modify: `web/collections/Users.ts`
- Create: `web/app/api/auth/2fa/enroll/route.ts`
- Create: `web/app/api/auth/2fa/activate/route.ts`
- Create: `web/app/api/auth/2fa/disable/route.ts`
- Create: `web/components/auth/TwoFactorSetup.tsx`
- Create: `web/app/(account)/me/security/page.tsx`

- [ ] **Step 1: Failing тест `web/tests/unit/auth/totp-crypto.test.ts`**

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { encryptSecret, decryptSecret } from '@/lib/auth/totp-crypto';

beforeAll(() => { process.env.PAYLOAD_SECRET = 'unit-test-secret-key'; });

describe('totp-crypto (AES-256-GCM)', () => {
  it('roundtrip шифрования', () => {
    const plain = 'JBSWY3DPEHPK3PXP';
    const blob = encryptSecret(plain);
    expect(blob).not.toContain(plain);
    expect(blob.split('.')).toHaveLength(3); // iv.tag.cipher
    expect(decryptSecret(blob)).toBe(plain);
  });
  it('подделанный blob → throw', () => {
    const blob = encryptSecret('SECRET');
    const parts = blob.split('.');
    parts[2] = Buffer.from('tampered').toString('base64');
    expect(() => decryptSecret(parts.join('.'))).toThrow();
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `cd web && npm test -- totp-crypto`
Expected: FAIL.

- [ ] **Step 3: Реализовать `web/lib/auth/totp-crypto.ts`**

```ts
// Шифрование TOTP-секрета at rest (БД). Ключ выводится из PAYLOAD_SECRET. §16.2
import crypto from 'node:crypto';

function key(): Buffer {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error('PAYLOAD_SECRET is required for 2FA secret encryption');
  return crypto.createHash('sha256').update(secret).digest(); // 32 байта
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decryptSecret(blob: string): string {
  const [ivB64, tagB64, dataB64] = blob.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed 2FA secret blob');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `cd web && npm test -- totp-crypto`
Expected: PASS.

- [ ] **Step 5: Добавить поля 2FA в `web/collections/Users.ts`**

В массив `fields` коллекции `Users` добавить (скрыты от обычного редактирования, доступ — только сам пользователь/суперадмин):

```ts
{
  name: 'totpEnabled',
  type: 'checkbox',
  defaultValue: false,
  access: { update: () => false }, // меняется только через API-роуты 2FA
  admin: { description: '2FA включена (TOTP)' },
},
{
  name: 'totpSecretEnc',
  type: 'text',
  hidden: true, // зашифрованный секрет, не показываем в админке
  access: { read: () => false, update: () => false },
},
{
  name: 'totpRecoveryHashes',
  type: 'json',
  hidden: true,
  access: { read: () => false, update: () => false },
},
```

- [ ] **Step 6: Роут enroll `web/app/api/auth/2fa/enroll/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getCurrentUser } from '@/lib/auth/current-user'; // из Plan 1/3 (читает payload-token)
import { generateTotpSecret, buildOtpauthUrl } from '@/lib/auth/totp';
import { encryptSecret } from '@/lib/auth/totp-crypto';

export async function POST(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const secret = generateTotpSecret();
  const otpauth = buildOtpauthUrl(user.email, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  // Секрет сохраняем зашифрованным, но totpEnabled пока false (активируется после verify).
  const payload = await getPayload({ config });
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { totpSecretEnc: encryptSecret(secret) } as any,
    overrideAccess: true,
  });

  return NextResponse.json({ otpauth, qrDataUrl });
}
```

> `getCurrentUser()` — хелпер чтения текущего пользователя по cookie `payload-token` (используется в кабинетах Plan 3). Если в проекте он называется иначе (`getAuthUser`/`me`) — адаптировать импорт.

- [ ] **Step 7: Роут activate `web/app/api/auth/2fa/activate/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getCurrentUser } from '@/lib/auth/current-user';
import { verifyTotp, generateRecoveryCodes, hashRecoveryCode } from '@/lib/auth/totp';
import { decryptSecret } from '@/lib/auth/totp-crypto';
import { recordAuditLog } from '@/lib/audit/log';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { token } = await req.json();

  const payload = await getPayload({ config });
  const fresh = await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true });
  const enc = (fresh as any).totpSecretEnc;
  if (!enc) return NextResponse.json({ error: 'not_enrolled' }, { status: 400 });

  if (!verifyTotp(decryptSecret(enc), String(token ?? ''))) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
  }

  const recovery = generateRecoveryCodes();
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { totpEnabled: true, totpRecoveryHashes: recovery.map(hashRecoveryCode) } as any,
    overrideAccess: true,
  });
  await recordAuditLog(payload, { actorId: String(user.id), action: '2fa.enabled', targetType: 'user', targetId: String(user.id) });

  // recovery-коды показываем ОДИН раз
  return NextResponse.json({ ok: true, recoveryCodes: recovery });
}
```

- [ ] **Step 8: Роут disable `web/app/api/auth/2fa/disable/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getCurrentUser } from '@/lib/auth/current-user';
import { verifyTotp } from '@/lib/auth/totp';
import { decryptSecret } from '@/lib/auth/totp-crypto';
import { recordAuditLog } from '@/lib/audit/log';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { token } = await req.json();

  const payload = await getPayload({ config });
  const fresh = await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true });
  const enc = (fresh as any).totpSecretEnc;
  // Выключение требует валидного кода (защита от перехвата активной сессии).
  if (!enc || !verifyTotp(decryptSecret(enc), String(token ?? ''))) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
  }
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { totpEnabled: false, totpSecretEnc: null, totpRecoveryHashes: null } as any,
    overrideAccess: true,
  });
  await recordAuditLog(payload, { actorId: String(user.id), action: '2fa.disabled', targetType: 'user', targetId: String(user.id) });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 9: Компонент enroll `web/components/auth/TwoFactorSetup.tsx`**

```tsx
'use client';
import { useState } from 'react';

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [error, setError] = useState('');

  async function start() {
    setError('');
    const r = await fetch('/api/auth/2fa/enroll', { method: 'POST' });
    const d = await r.json();
    if (r.ok) setQr(d.qrDataUrl); else setError('Не удалось начать настройку');
  }

  async function activate() {
    setError('');
    const r = await fetch('/api/auth/2fa/activate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: code }),
    });
    const d = await r.json();
    if (r.ok) setRecovery(d.recoveryCodes); else setError('Неверный код, попробуйте ещё раз');
  }

  if (enabled) return <p className="text-sm text-green-700">Двухфакторная аутентификация включена.</p>;
  if (recovery) {
    return (
      <div>
        <p className="font-medium">Сохраните резервные коды (показываются один раз):</p>
        <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">{recovery.map((c) => <li key={c}>{c}</li>)}</ul>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {!qr ? (
        <button type="button" onClick={start} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Настроить 2FA</button>
      ) : (
        <>
          <p className="text-sm">Отсканируйте QR в приложении (Google Authenticator, Aegis) и введите код:</p>
          <img src={qr} alt="QR для 2FA" className="h-44 w-44" />
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="000000" className="rounded-md border px-3 py-2" />
          <button type="button" onClick={activate} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Подтвердить</button>
        </>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 10: Страница `web/app/(account)/me/security/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/current-user';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';

export const metadata = { title: 'Безопасность' };

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/me/security');
  const staff = user.role === 'moderator' || user.role === 'superadmin';
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Безопасность</h1>
      {staff && !user.totpEnabled && (
        <p className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Для доступа к админке модератора требуется включить двухфакторную аутентификацию.
        </p>
      )}
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Двухфакторная аутентификация (TOTP)</h2>
        <TwoFactorSetup enabled={Boolean(user.totpEnabled)} />
      </section>
    </main>
  );
}
```

> Путь `(account)` — следовать фактической группе кабинетов из Plan 3 (там `/me/*`). Если группа называется иначе (`(me)` / без группы) — положить страницу рядом с прочими `/me/*`.

- [ ] **Step 11: Прогон**

Run: `cd web && npm test -- totp-crypto && cd web && npm run build`
Expected: тесты PASS; build OK.

- [ ] **Step 12: Commit**

```bash
git add web/lib/auth/totp-crypto.ts web/tests/unit/auth/totp-crypto.test.ts web/collections/Users.ts web/app/api/auth/2fa web/components/auth/TwoFactorSetup.tsx "web/app/(account)/me/security/page.tsx"
git commit -m "Plan 6 Task 6: enroll/activate/disable 2FA + поля User + шифрование секрета

AES-256-GCM секрет at rest, recovery-коды (показ 1 раз), /me/security. Аудит 2fa.enabled/disabled. §16.2"
```

---

## Task 7: 2FA-гейт `/admin` + maintenance-mode (Edge middleware)

**Files:**
- Modify: `web/lib/auth/session.ts` (добавить `role` в токен)
- Modify: `web/collections/Users.ts` (**`saveToJWT: true` на поле `role`** — критично)
- Create: `web/lib/auth/jwt-claims.ts`
- Create: `web/tests/unit/auth/jwt-claims.test.ts`
- Create: `web/lib/auth/twofa-cookie.ts`
- Create: `web/tests/unit/auth/twofa-cookie.test.ts`
- Create: `web/lib/maintenance.ts`
- Create: `web/tests/unit/maintenance.test.ts`
- Create: `web/middleware.ts`
- Create: `web/app/api/auth/2fa/gate/route.ts`
- Create: `web/components/auth/TwoFactorGate.tsx`
- Create: `web/app/(public)/2fa/page.tsx`
- Create: `web/app/maintenance/page.tsx`

- [ ] **Step 1: Расширить токен ролью — `web/lib/auth/session.ts`**

`issueSessionToken` должен класть `role` в JWT (нужно middleware для определения staff). Изменить сигнатуру и тело:

```ts
export function issueSessionToken(user: { id: string | number; email: string; role?: string }): string {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error('PAYLOAD_SECRET is required');
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, collection: 'users' },
    secret,
    { expiresIn: '7d' },
  );
}
```

> Call-sites, передающие полный `user` (TG-логин Task 11/13), уже несут `role`. Magic-link consume (Task 14) передаёт `{ id, email }` — добавить туда `role: user.role`. Старые сессии без `role` просто не считаются staff в гейте до следующего логина (безопасный дефолт).

**КРИТИЧНО — `saveToJWT: true` на поле `role` в `web/collections/Users.ts`.** Модераторы заходят в `/admin` **нативным Payload-логином** (email/пароль), а его токен `payload-token` выпускает Payload, НЕ `issueSessionToken`. Payload кладёт в JWT кастомные поля только при `saveToJWT: true`. Без этого middleware не увидит `role` → `isStaff=false` → 2FA-гейт `/admin` молча не сработает для своей целевой аудитории. Поле `role` создано в Plan 1 (Task 5) — дополнить его:

```ts
{
  name: 'role',
  type: 'select',
  // ...существующие options/defaultValue/required из Plan 1...
  saveToJWT: true, // ← role попадает в payload-token (нужно Edge-middleware для определения staff)
},
```

> Проверка: после логина модератора декодировать payload-токен (jwt.io / `decodeJwtClaims`) и убедиться, что `role` присутствует. Если нет — гейт нерабочий.

- [ ] **Step 2: Failing тест `web/tests/unit/auth/jwt-claims.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { decodeJwtClaims } from '@/lib/auth/jwt-claims';

describe('decodeJwtClaims', () => {
  it('читает payload без проверки подписи', () => {
    const token = jwt.sign({ id: 'u1', role: 'moderator', email: 'm@x.by' }, 'whatever');
    const c = decodeJwtClaims(token);
    expect(c?.id).toBe('u1');
    expect(c?.role).toBe('moderator');
  });
  it('мусор → null', () => {
    expect(decodeJwtClaims(undefined)).toBeNull();
    expect(decodeJwtClaims('not-a-jwt')).toBeNull();
    expect(decodeJwtClaims('a.b')).toBeNull();
  });
});
```

- [ ] **Step 3: Реализовать `web/lib/auth/jwt-claims.ts` (edge-safe, без verify)**

```ts
// Декод payload JWT БЕЗ проверки подписи — только для роутинга в middleware (Edge, нет node:crypto/jsonwebtoken).
// Безопасно: реальную валидацию сессии делает Payload ниже по стеку. Гейт лишь добавляет второй фактор.
export interface JwtClaims { id?: string; role?: string; email?: string; }

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  // atob есть и в Edge, и в Node 18+
  return decodeURIComponent(
    atob(b64).split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
  );
}

export function decodeJwtClaims(token: string | undefined): JwtClaims | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1])) as JwtClaims;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Failing тест `web/tests/unit/auth/twofa-cookie.test.ts`**

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { signTwofaCookie, verifyTwofaCookie } from '@/lib/auth/twofa-cookie';

beforeAll(() => { process.env.PAYLOAD_SECRET = 'unit-test-secret-key'; });

describe('twofa-cookie (Web Crypto HMAC)', () => {
  it('подпись и проверка возвращают uid', async () => {
    const now = 1_700_000_000_000;
    const cookie = await signTwofaCookie('u42', 3600, now);
    expect(await verifyTwofaCookie(cookie, now)).toBe('u42');
  });
  it('истёкшая cookie → null', async () => {
    const now = 1_700_000_000_000;
    const cookie = await signTwofaCookie('u42', 10, now);
    expect(await verifyTwofaCookie(cookie, now + 20_000)).toBeNull();
  });
  it('подделанная подпись → null', async () => {
    const cookie = await signTwofaCookie('u42', 3600, 1_700_000_000_000);
    const tampered = cookie.replace(/u42/, 'u99');
    expect(await verifyTwofaCookie(tampered)).toBeNull();
  });
});
```

- [ ] **Step 5: Реализовать `web/lib/auth/twofa-cookie.ts` (Web Crypto — работает на Edge и в Node 20+)**

```ts
// Подпись короткоживущей cookie twofa-ok. Web Crypto (subtle) — единый код для Edge-middleware и роутов.
const COOKIE = 'twofa-ok';
const enc = new TextEncoder();

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error('PAYLOAD_SECRET is required');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function toB64Url(bytes: ArrayBuffer): string {
  const b = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const TWOFA_COOKIE_NAME = COOKIE;

export async function signTwofaCookie(uid: string, ttlSec = 12 * 3600, now = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + ttlSec;
  const body = `${uid}.${exp}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(body));
  return `${body}.${toB64Url(sig)}`;
}

export async function verifyTwofaCookie(value: string | undefined, now = Date.now()): Promise<string | null> {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [uid, expStr, sig] = parts;
  const body = `${uid}.${expStr}`;
  const check = await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(body));
  if (toB64Url(check) !== sig) return null;      // подпись не сошлась
  if (Number(expStr) * 1000 < now) return null;  // истекла
  return uid;
}
```

- [ ] **Step 6: Failing тест `web/tests/unit/maintenance.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { isMaintenanceBlocked } from '@/lib/maintenance';

describe('isMaintenanceBlocked', () => {
  const base = { maintenance: true, pathname: '/animals', isStaff: false };
  it('блокирует публичный путь в режиме техработ', () => {
    expect(isMaintenanceBlocked(base)).toBe(true);
  });
  it('пропускает healthcheck и статику', () => {
    expect(isMaintenanceBlocked({ ...base, pathname: '/api/health' })).toBe(false);
    expect(isMaintenanceBlocked({ ...base, pathname: '/maintenance' })).toBe(false);
    expect(isMaintenanceBlocked({ ...base, pathname: '/_next/static/x.js' })).toBe(false);
  });
  it('пропускает staff (для отладки/админки)', () => {
    expect(isMaintenanceBlocked({ ...base, isStaff: true })).toBe(false);
  });
  it('выключенный режим — не блокирует', () => {
    expect(isMaintenanceBlocked({ ...base, maintenance: false })).toBe(false);
  });
});
```

- [ ] **Step 7: Реализовать `web/lib/maintenance.ts`**

```ts
// Предикат maintenance-mode. §16.2 (maintenance toggle). Чистая логика для middleware.
const ALLOW_PREFIXES = ['/api/health', '/maintenance', '/_next', '/favicon', '/admin'];

export function isMaintenanceBlocked(input: { maintenance: boolean; pathname: string; isStaff: boolean }): boolean {
  if (!input.maintenance) return false;
  if (input.isStaff) return false;
  if (ALLOW_PREFIXES.some((p) => input.pathname.startsWith(p))) return false;
  return true;
}
```

- [ ] **Step 8: Запустить unit-тесты Task 7**

Run: `cd web && npm test -- jwt-claims twofa-cookie maintenance`
Expected: PASS.

- [ ] **Step 9: `web/middleware.ts` (Edge)**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { decodeJwtClaims } from '@/lib/auth/jwt-claims';
import { verifyTwofaCookie, TWOFA_COOKIE_NAME } from '@/lib/auth/twofa-cookie';
import { isMaintenanceBlocked } from '@/lib/maintenance';

const STAFF = new Set(['moderator', 'superadmin']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const claims = decodeJwtClaims(req.cookies.get('payload-token')?.value);
  const isStaff = Boolean(claims?.role && STAFF.has(claims.role));

  // 1) Maintenance-mode
  if (isMaintenanceBlocked({ maintenance: process.env.MAINTENANCE_MODE === 'true', pathname, isStaff })) {
    return NextResponse.rewrite(new URL('/maintenance', req.url));
  }

  // 2) 2FA-гейт админки: staff с активной сессией обязан иметь свежую cookie twofa-ok
  if (pathname.startsWith('/admin') && isStaff) {
    const uid = await verifyTwofaCookie(req.cookies.get(TWOFA_COOKIE_NAME)?.value);
    if (uid !== String(claims?.id)) {
      const url = new URL('/2fa', req.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 10: Роут gate `web/app/api/auth/2fa/gate/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getCurrentUser } from '@/lib/auth/current-user';
import { verifyTotp, hashRecoveryCode } from '@/lib/auth/totp';
import { decryptSecret } from '@/lib/auth/totp-crypto';
import { signTwofaCookie, TWOFA_COOKIE_NAME } from '@/lib/auth/twofa-cookie';
import { recordAuditLog } from '@/lib/audit/log';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(); // уже прошёл 1-й фактор (пароль/TG/magic-link)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { token } = await req.json();

  const payload = await getPayload({ config });
  const fresh = await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true });
  const enc = (fresh as any).totpSecretEnc;
  if (!(fresh as any).totpEnabled || !enc) {
    return NextResponse.json({ error: 'not_enrolled' }, { status: 400 });
  }

  const code = String(token ?? '').trim();
  let ok = verifyTotp(decryptSecret(enc), code);

  // fallback на одноразовый recovery-код
  if (!ok) {
    const hashes: string[] = (fresh as any).totpRecoveryHashes ?? [];
    const h = hashRecoveryCode(code);
    if (hashes.includes(h)) {
      ok = true;
      await payload.update({
        collection: 'users', id: user.id, overrideAccess: true,
        data: { totpRecoveryHashes: hashes.filter((x) => x !== h) } as any,
      });
    }
  }
  if (!ok) return NextResponse.json({ error: 'invalid_code' }, { status: 400 });

  cookies().set(TWOFA_COOKIE_NAME, await signTwofaCookie(String(user.id)), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 3600,
  });
  await recordAuditLog(payload, { actorId: String(user.id), action: '2fa.passed', targetType: 'user', targetId: String(user.id) });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 11: Компонент `web/components/auth/TwoFactorGate.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function TwoFactorGate() {
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/admin';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const r = await fetch('/api/auth/2fa/gate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: code }),
    });
    if (r.ok) router.replace(next);
    else {
      const d = await r.json();
      setError(d.error === 'not_enrolled' ? 'Сначала настройте 2FA в /me/security' : 'Неверный код');
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-3">
      <h1 className="text-xl font-semibold">Подтверждение входа</h1>
      <p className="text-sm text-muted-foreground">Введите код из приложения-аутентификатора или резервный код.</p>
      <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoFocus placeholder="000000" className="w-full rounded-md border px-3 py-2" />
      <button type="submit" className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground">Подтвердить</button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 12: Страница `web/app/(public)/2fa/page.tsx` и `web/app/maintenance/page.tsx`**

`web/app/(public)/2fa/page.tsx`:

```tsx
import { Suspense } from 'react';
import { TwoFactorGate } from '@/components/auth/TwoFactorGate';

export const metadata = { title: 'Подтверждение входа', robots: { index: false } };

export default function TwoFactorPage() {
  return <Suspense><TwoFactorGate /></Suspense>;
}
```

`web/app/maintenance/page.tsx`:

```tsx
export const metadata = { title: 'Технические работы', robots: { index: false } };

export default function MaintenancePage() {
  return (
    <main className="mx-auto mt-24 max-w-md p-6 text-center">
      <h1 className="text-2xl font-bold">Идут технические работы</h1>
      <p className="mt-2 text-muted-foreground">Сайт скоро вернётся. Спасибо за терпение.</p>
    </main>
  );
}
```

- [ ] **Step 13: Прогон + сборка**

Run: `cd web && npm test -- jwt-claims twofa-cookie maintenance && npm run build`
Expected: тесты PASS; build OK (middleware компилируется под Edge — без node-импортов в нём).

- [ ] **Step 14: Commit**

```bash
git add web/lib/auth/session.ts web/lib/auth/jwt-claims.ts web/lib/auth/twofa-cookie.ts web/lib/maintenance.ts web/middleware.ts web/app/api/auth/2fa/gate web/components/auth/TwoFactorGate.tsx "web/app/(public)/2fa/page.tsx" web/app/maintenance/page.tsx web/tests/unit/auth/jwt-claims.test.ts web/tests/unit/auth/twofa-cookie.test.ts web/tests/unit/maintenance.test.ts
git commit -m "Plan 6 Task 7: Edge-middleware — 2FA-гейт /admin + maintenance-mode

role в payload-token, decodeJwtClaims (routing-only), twofa-ok cookie (Web Crypto HMAC),
gate-роут (TOTP + recovery), страницы /2fa и /maintenance. §16.2"
```

---

## Task 8: Image-sitemap (фото животных в sitemap)

**Files:**
- Modify: `web/lib/sitemap-data.ts` (`animalSitemapEntry` → `images[]`)
- Create: `web/tests/unit/sitemap-images.test.ts`
- Modify: `web/app/sitemap.ts`

- [ ] **Step 1: Failing тест `web/tests/unit/sitemap-images.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { animalSitemapEntry } from '@/lib/sitemap-data';

describe('animalSitemapEntry + images', () => {
  const doc = {
    slug: 'rex', city: { slug: 'minsk' }, species: 'dog', updatedAt: '2026-05-20T00:00:00Z',
    media: [
      { url: 'https://cdn/r1.webp' },
      { url: 'https://cdn/r2.webp' },
    ],
  };
  it('включает url фото в поле images', () => {
    const e = animalSitemapEntry(doc as any);
    expect(e.images).toEqual(['https://cdn/r1.webp', 'https://cdn/r2.webp']);
  });
  it('без медиа — images отсутствует или пуст', () => {
    const e = animalSitemapEntry({ ...doc, media: [] } as any);
    expect(e.images ?? []).toHaveLength(0);
  });
  it('ограничивает до 5 фото на запись (лимит Google image-sitemap практичный)', () => {
    const many = { ...doc, media: Array.from({ length: 8 }, (_, i) => ({ url: `https://cdn/${i}.webp` })) };
    expect(animalSitemapEntry(many as any).images).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `cd web && npm test -- sitemap-images`
Expected: FAIL (поле `images` ещё не возвращается).

- [ ] **Step 3: Доработать `animalSitemapEntry` в `web/lib/sitemap-data.ts`**

В существующую функцию добавить сбор image-URL (не ломая текущий контракт `url`/`lastModified`):

```ts
const IMG_PER_ENTRY = 5;

export function animalSitemapEntry(doc: AnimalDoc): MetadataRoute.Sitemap[number] {
  // ...существующее построение url / lastModified...
  const images = (doc.media ?? [])
    .map((m) => m?.url)
    .filter((u): u is string => typeof u === 'string' && u.length > 0)
    .slice(0, IMG_PER_ENTRY);

  return {
    url: /* существующий построенный URL карточки */,
    lastModified: /* существующее значение */,
    ...(images.length ? { images } : {}),
  };
}
```

> `MetadataRoute.Sitemap` поддерживает поле `images: string[]` на записи начиная с **Next.js 14.1** — Next сам генерирует `<image:image>` в XML. Проверить версию: `cd web && npm ls next` (≥14.1; Plan 1 ставит Next 15 — при необходимости `npm i next@latest`). Тип `AnimalDoc` расширить полем `media?: { url?: string }[]` (если ещё не описано).

- [ ] **Step 4: Запустить — PASS**

Run: `cd web && npm test -- sitemap-images`
Expected: PASS.

- [ ] **Step 5: Проверить `web/app/sitemap.ts`**

Убедиться, что для шарда `animals` запросы Payload тянут `media` (через `depth: 1` или `select`), чтобы `doc.media[].url` был доступен. При необходимости добавить `depth: 1` в `payload.find` для животных.

- [ ] **Step 6: Smoke-проверка XML**

Run: `cd web && npm run build && npm start` (в отдельном терминале), затем `curl http://localhost:3000/sitemap/0.xml | head -40`
Expected: в записях животных присутствуют теги `<image:image><image:loc>…`.

- [ ] **Step 7: Commit**

```bash
git add web/lib/sitemap-data.ts web/tests/unit/sitemap-images.test.ts web/app/sitemap.ts
git commit -m "Plan 6 Task 8: image-sitemap (до 5 фото на животное)

animalSitemapEntry возвращает images[] → Next генерирует <image:image>. §16.2 image sitemap"
```

---

## Task 9: Триггер welcome-email после регистрации

**Files:**
- Modify: `web/collections/Users.ts` (`afterChange` hook на create)
- Create: `web/tests/unit/users-welcome.test.ts`

> Plan 1 создал шаблон `welcome.tsx`, но не подключил триггер (помечено TODO). Подключаем через Payload-хук `afterChange` при `operation === 'create'`.

- [ ] **Step 1: Failing тест `web/tests/unit/users-welcome.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { sendWelcomeOnCreate } from '@/lib/email/welcome-hook';

describe('sendWelcomeOnCreate', () => {
  it('шлёт welcome только при create', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await sendWelcomeOnCreate({ doc: { email: 'a@b.by', firstName: 'Имя' }, operation: 'create' } as any, send);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].to).toBe('a@b.by');
  });
  it('не шлёт при update', async () => {
    const send = vi.fn();
    await sendWelcomeOnCreate({ doc: { email: 'a@b.by' }, operation: 'update' } as any, send);
    expect(send).not.toHaveBeenCalled();
  });
  it('не валит хук, если email упал', async () => {
    const send = vi.fn().mockRejectedValue(new Error('smtp down'));
    await expect(sendWelcomeOnCreate({ doc: { email: 'a@b.by' }, operation: 'create' } as any, send)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `cd web && npm test -- users-welcome`
Expected: FAIL.

- [ ] **Step 3: Реализовать `web/lib/email/welcome-hook.ts`**

```ts
// Триггер welcome-email после регистрации (Plan 1 оставил TODO). §16.2
import Welcome from '@/lib/email/templates/welcome';

type SendFn = (args: { to: string; subject: string; react: React.ReactElement }) => Promise<unknown>;

export async function sendWelcomeOnCreate(
  args: { doc: { email: string; firstName?: string }; operation: string },
  send: SendFn,
): Promise<void> {
  if (args.operation !== 'create') return;
  if (!args.doc?.email) return;
  try {
    await send({
      to: args.doc.email,
      subject: 'Добро пожаловать!',
      react: Welcome({ firstName: args.doc.firstName }),
    });
  } catch {
    // welcome не критичен — не роняем создание пользователя
  }
}
```

> Если `welcome.tsx` экспортирует компонент с другим интерфейсом пропсов — адаптировать вызов под фактические пропсы шаблона из Plan 1.

- [ ] **Step 4: Запустить — PASS**

Run: `cd web && npm test -- users-welcome`
Expected: PASS.

- [ ] **Step 5: Подключить хук в `web/collections/Users.ts`**

```ts
import { sendEmail } from '@/lib/email/resend-client';
import { sendWelcomeOnCreate } from '@/lib/email/welcome-hook';

// в конфиге коллекции Users:
hooks: {
  afterChange: [
    async ({ doc, operation }) => {
      await sendWelcomeOnCreate({ doc, operation }, sendEmail);
    },
    // ...существующие afterChange-хуки, если есть — сохранить
  ],
},
```

- [ ] **Step 6: Прогон**

Run: `cd web && npm test -- users-welcome`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web/lib/email/welcome-hook.ts web/tests/unit/users-welcome.test.ts web/collections/Users.ts
git commit -m "Plan 6 Task 9: welcome-email триггер после регистрации (afterChange create)

Закрывает TODO из Plan 1 Task 10. Сбой email не роняет создание пользователя. §16.2"
```

---

## Task 10: Страница оплаты по номеру ЕРИП `/help/erip/[number]`

**Files:**
- Create: `web/app/(public)/help/erip/[number]/page.tsx`
- Create: `web/tests/e2e/erip-help.spec.ts`

> Нужна только при `EXPRESSPAY_USE_CARD=false` (инвойс возвращает `eripNumber` для оплаты в банке вместо payment URL). Plan 5 пометил как мини-таск Plan 6.

- [ ] **Step 1: Страница `web/app/(public)/help/erip/[number]/page.tsx`**

```tsx
export const metadata = { title: 'Оплата через ЕРИП', robots: { index: false } };

export default function EripHelpPage({ params }: { params: { number: string } }) {
  const serviceId = process.env.EXPRESSPAY_SERVICE_ID ?? '—';
  const number = decodeURIComponent(params.number);
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">Оплата через ЕРИП</h1>
      <p className="mt-2">Ваш счёт создан. Оплатите его в любом банке, интернет-банкинге или инфокиоске через систему ЕРИП:</p>
      <ol className="mt-4 list-decimal space-y-2 pl-6">
        <li>Откройте «Система “Расчёт” (ЕРИП)».</li>
        <li>Найдите услугу по номеру <strong className="font-mono">{serviceId}</strong> (или по названию организации).</li>
        <li>Введите номер счёта: <strong className="font-mono text-lg">{number}</strong></li>
        <li>Проверьте сумму и подтвердите оплату.</li>
      </ol>
      <p className="mt-4 rounded-md bg-muted p-3 text-sm">
        Статус доната обновится автоматически после поступления оплаты. Чек придёт на вашу почту.
      </p>
      <a href="/" className="mt-6 inline-block underline">На главную</a>
    </main>
  );
}
```

> Связка с донат-флоу (Plan 5): при `EXPRESSPAY_USE_CARD=false` после `createInvoice` редиректить на `/help/erip/${eripNumber}` вместо `paymentUrl`. Если в Plan 5 этот редирект уже разветвлён — просто указать сюда; иначе добавить ветку в обработчике создания доната (`web/app/api/donations/*` или server action) — одной строкой `redirect(\`/help/erip/${eripNumber}\`)`.

- [ ] **Step 2: E2E `web/tests/e2e/erip-help.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('страница ЕРИП показывает номер счёта и инструкцию', async ({ page }) => {
  await page.goto('/help/erip/100500');
  await expect(page.getByText('Оплата через ЕРИП')).toBeVisible();
  await expect(page.getByText('100500')).toBeVisible();
  await expect(page.getByText(/Система .Расчёт/)).toBeVisible();
});
```

- [ ] **Step 3: Запустить e2e**

Run: `cd web && npx playwright test erip-help`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "web/app/(public)/help/erip/[number]/page.tsx" web/tests/e2e/erip-help.spec.ts
git commit -m "Plan 6 Task 10: страница /help/erip/[number] — инструкция оплаты по ЕРИП

Нужна при EXPRESSPAY_USE_CARD=false (банковский режим). Plan 5 мини-таск."
```

---

## Task 11: Недельный бэкап БД в R2 + retention

**Files:**
- Create: `web/lib/backup/retention.ts`
- Create: `web/tests/unit/backup/retention.test.ts`
- Create: `web/scripts/backup-db.ts`
- Modify: Railway Cron config (док-шаг)

- [ ] **Step 1: Failing тест `web/tests/unit/backup/retention.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { backupKey, prunableKeys } from '@/lib/backup/retention';

describe('backup retention', () => {
  it('ключ детерминирован по дате (UTC)', () => {
    expect(backupKey(new Date('2026-05-29T03:00:00Z'))).toBe('db-backups/2026-05-29.sql.gz');
  });
  it('оставляет N свежих, остальные — на удаление', () => {
    const keys = [
      'db-backups/2026-05-01.sql.gz',
      'db-backups/2026-05-08.sql.gz',
      'db-backups/2026-05-15.sql.gz',
      'db-backups/2026-05-22.sql.gz',
      'db-backups/2026-05-29.sql.gz',
    ];
    expect(prunableKeys(keys, 3)).toEqual([
      'db-backups/2026-05-01.sql.gz',
      'db-backups/2026-05-08.sql.gz',
    ]);
  });
  it('меньше лимита — ничего не удаляем', () => {
    expect(prunableKeys(['db-backups/2026-05-29.sql.gz'], 8)).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `cd web && npm test -- backup/retention`
Expected: FAIL.

- [ ] **Step 3: Реализовать `web/lib/backup/retention.ts`**

```ts
// Именование и retention бэкапов БД в R2. §16.2 (еженедельный экспорт в R2).
const PREFIX = 'db-backups';

export function backupKey(date: Date): string {
  const iso = date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return `${PREFIX}/${iso}.sql.gz`;
}

/** Возвращает ключи на удаление: всё, кроме `keep` самых свежих (лексикографическая сортировка по дате в имени). */
export function prunableKeys(keys: string[], keep: number): string[] {
  const sorted = [...keys].sort(); // ISO-даты сортируются лексикографически
  return sorted.slice(0, Math.max(0, sorted.length - keep));
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `cd web && npm test -- backup/retention`
Expected: PASS.

- [ ] **Step 5: Скрипт `web/scripts/backup-db.ts`**

```ts
// Еженедельный дамп Postgres → gzip → R2, с очисткой старых. Запуск: Railway Cron (раз в неделю).
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { backupKey, prunableKeys } from '../lib/backup/retention'; // относительный путь: tsx не резолвит alias @/ в standalone-скрипте

const exec = promisify(execFile);

function r2(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT, // из Plan 1 storage-конфига
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  });
}

async function main() {
  const bucket = process.env.R2_BUCKET!;
  const keep = Number(process.env.BACKUP_RETENTION_WEEKS ?? '8');
  const now = new Date();
  const file = `/tmp/backup-${now.toISOString().slice(0, 10)}.sql.gz`;

  // pg_dump | gzip (требует postgresql-client в образе — см. Step 7)
  await exec('bash', ['-lc', `pg_dump "${process.env.DATABASE_URL}" | gzip > "${file}"`]);

  const s3 = r2();
  const key = backupKey(now);
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: createReadStream(file) }));
  await rm(file, { force: true });
  console.log(`Backup uploaded: ${key}`);

  // prune
  const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'db-backups/' }));
  const keys = (list.Contents ?? []).map((o) => o.Key!).filter(Boolean);
  const toDelete = prunableKeys(keys, keep);
  if (toDelete.length) {
    await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: toDelete.map((Key) => ({ Key })) } }));
    console.log(`Pruned ${toDelete.length} old backups`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

> R2-env (`R2_ENDPOINT`/`R2_BUCKET`/ключи) — переиспользовать фактические имена из storage-конфига Plan 1. Если там уже есть готовый S3-клиент (`web/lib/storage/*`) — импортировать его вместо локального `r2()`. `@aws-sdk/client-s3` обычно уже стоит (R2-адаптер Plan 1); если нет — `npm install @aws-sdk/client-s3`.

- [ ] **Step 6: package.json — npm-скрипт**

В `web/package.json` добавить:

```json
"scripts": {
  "backup:db": "tsx scripts/backup-db.ts"
}
```

> Если `tsx` не установлен — `npm install -D tsx`.

- [ ] **Step 7: Railway Cron (док-шаг, не код)**

- В Railway создать **Cron Service** (или Cron-триггер существующего сервиса) с расписанием `0 3 * * 1` (понедельник 03:00 UTC) и командой `npm run backup:db`.
- В образ добавить `postgresql-client` (для `pg_dump`): через Nixpacks — переменная `NIXPACKS_PKGS=postgresql` или `apt`-пакет в Dockerfile.
- **Квартальный тест восстановления** (ручной чек-лист, §16.2): раз в квартал скачать свежий бэкап из R2, развернуть в одноразовую БД, прогнать `npm run build` против неё, удалить. Зафиксировать в runbook.

- [ ] **Step 8: Commit**

```bash
git add web/lib/backup web/tests/unit/backup web/scripts/backup-db.ts web/package.json
git commit -m "Plan 6 Task 11: недельный бэкап БД → R2 + retention

lib/backup/retention.ts (backupKey/prunableKeys, TDD) + scripts/backup-db.ts (pg_dump|gzip→R2, prune).
Railway Cron 0 3 * * 1. §16.2"
```

---

## Task 12: Расширенный healthcheck + status-page (мониторинг)

**Files:**
- Modify: `web/app/api/health/route.ts`
- Create: `web/lib/health.ts`
- Create: `web/tests/unit/health.test.ts`
- Modify: README / runbook (док-шаг)

- [ ] **Step 1: Failing тест `web/tests/unit/health.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { aggregateHealth } from '@/lib/health';

describe('aggregateHealth', () => {
  it('ok, если все проверки прошли', () => {
    expect(aggregateHealth({ db: true, storage: true })).toEqual({ status: 'ok', checks: { db: true, storage: true } });
  });
  it('degraded, если что-то упало', () => {
    const r = aggregateHealth({ db: true, storage: false });
    expect(r.status).toBe('degraded');
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `cd web && npm test -- health`
Expected: FAIL.

- [ ] **Step 3: Реализовать `web/lib/health.ts`**

```ts
// Агрегатор статуса для /api/health (мониторинг UptimeRobot/Better Uptime). §16.2 status page.
export interface HealthChecks { db: boolean; storage: boolean; }

export function aggregateHealth(checks: HealthChecks): { status: 'ok' | 'degraded'; checks: HealthChecks } {
  const ok = Object.values(checks).every(Boolean);
  return { status: ok ? 'ok' : 'degraded', checks };
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `cd web && npm test -- health`
Expected: PASS.

- [ ] **Step 5: Доработать `web/app/api/health/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { aggregateHealth } from '@/lib/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  let db = false;
  let storage = false;
  try {
    const payload = await getPayload({ config });
    await payload.find({ collection: 'cities', limit: 1 }); // лёгкий запрос = БД жива
    db = true;
  } catch { /* db=false */ }
  // storage: считаем «ок», если заданы R2-креды (полная HEAD-проверка опциональна, чтобы не бить R2 на каждый ping)
  storage = Boolean(process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID);

  const result = aggregateHealth({ db, storage });
  return NextResponse.json(result, { status: result.status === 'ok' ? 200 : 503 });
}
```

> Сохранить совместимость: внешние мониторы ждут поле `status: "ok"`. Railway healthcheck может счесть 503 за падение — поэтому storage держим мягким (наличие env), а жёсткой проверкой делаем только БД.

- [ ] **Step 6: Status-page (док-шаг, не код)**

- Завести бесплатный монитор (UptimeRobot или Better Uptime): HTTP-keyword-чек `https://<domain>/api/health`, ожидаемая строка `"status":"ok"`, интервал 5 мин.
- Публичная статус-страница провайдера → CNAME `status.<domain>.by`.
- Алерты: email/Telegram при 2 подряд fail. Sentry уже шлёт ошибки (Plan 1); сюда добавляем uptime.

- [ ] **Step 7: Commit**

```bash
git add web/lib/health.ts web/tests/unit/health.test.ts web/app/api/health/route.ts
git commit -m "Plan 6 Task 12: расширенный healthcheck (БД+storage) для мониторинга

aggregateHealth → /api/health отдаёт 200 ok / 503 degraded. UptimeRobot + status.<domain>. §16.2"
```

---

## Task 13: Go-live — прод-платежи, beta, финальный чек-лист (операционный)

**Files:**
- Create: `docs/runbooks/launch-checklist.md`

> Не-TDD задача: операционная подготовка к запуску. Код фичей завершён в Tasks 1–12.

- [ ] **Step 1: Перевод платежей в прод (ExpressPay sandbox → prod)**

Предусловие — юр.лицо (§[[project_legal_entity_plan]]) и договор с ExpressPay.

- Получить боевые `EXPRESSPAY_TOKEN` / `EXPRESSPAY_SECRET` / `EXPRESSPAY_SERVICE_ID` от провайдера.
- Прописать в Railway prod-env (НЕ в репозиторий).
- Выбрать режим: `EXPRESSPAY_USE_CARD=true` (redirect на оплату картой) либо `false` (номер ЕРИП → страница из Task 10).
- Прогнать один реальный микро-донат (0,5 BYN) → проверить webhook → статус `paid` → чек на почту → запись в `donations` + audit `donation_paid`.
- Проверить reconciliation-cron (Plan 5) на боевых ключах.

- [ ] **Step 2: Beta-тестирование (за 2 недели до публичного запуска)**

- Собрать 10–15 бета-тестеров (волонтёры приютов + знакомые low-tech пользователи — целевая аудитория).
- Сценарии: размещение животного, заявка adoption, донат, поиск, мобильный просмотр, «Шрифт крупнее», вход модератора с 2FA.
- Канал фидбэка: форма/Tawk; багтрекер — GitHub issues.
- Фикс P0/P1 до запуска.

- [ ] **Step 3: Go-live gate — финальный чек-лист (`docs/runbooks/launch-checklist.md`)**

```markdown
# Launch checklist (go-live gate)

## Юр (блокеры — §16.1)
- [ ] Privacy Policy, Terms/Оферта, Cookie Policy опубликованы (живые страницы, не stub)
- [ ] Оферта на размещение животных, возрастной gate 14+, чекбокс согласия 99-З
- [ ] Юр.лицо зарегистрировано, благотворительный счёт открыт, договор с ExpressPay подписан

## Инфра / безопасность
- [ ] DNS .by + Cloudflare, SSL, домен верифицирован у BotFather (TG OAuth)
- [ ] Прод-env заданы в Railway (секреты не в git): PAYLOAD_SECRET, DATABASE_URL, R2_*, RESEND_*, EXPRESSPAY_* (боевые), TWOFA_ISSUER
- [ ] 2FA включена у всех moderator/superadmin (проверить /admin → /2fa-гейт)
- [ ] MAINTENANCE_MODE=false
- [ ] Бэкап БД → R2 отработал хотя бы раз (Task 11); тест восстановления пройден

## Качество
- [ ] CI зелёный: unit + e2e + Lighthouse ≥0.9 + axe-core (Plan 1 Task 20)
- [ ] Core Web Vitals в бюджете (LCP<2.5s, CLS<0.1, INP<200ms)
- [ ] Sitemap + image-sitemap + robots отдаются; Search Console / Yandex Webmaster подключены; IndexNow пингует
- [ ] Sentry ловит ошибки; UptimeRobot мониторит /api/health; status.<domain> живёт
- [ ] Plausible считает трафик; Tawk виджет грузится после cookie-consent

## Контент
- [ ] Seed городов РБ, ≥1 IntakeFacility, ≥5 партнёрских организаций с животными
- [ ] FAQ, «Как это работает», «Безопасность», глоссарий, юр.раздел заполнены
- [ ] Welcome-email приходит на тестовую регистрацию (Task 9)

## Платежи
- [ ] `EXPRESSPAY_SECRET` задан в prod (пустой → подпись webhook отключена: любой POST с валидным invoiceId пройдёт проверку — ревью P5-8)
- [ ] Боевой микро-донат прошёл end-to-end (Step 1)
- [ ] Reconciliation-cron на боевых ключах работает
```

- [ ] **Step 4: Commit**

```bash
git add docs/runbooks/launch-checklist.md
git commit -m "Plan 6 Task 13: go-live чек-лист (прод-платежи, beta, launch gate)

Операционная подготовка к запуску MVP. Прод ExpressPay требует юр.лица. §11 §16.1 §16.7"
```

---

## Self-Review

### Spec coverage (Plan 6 = остаток фаза-1 «Quality + Launch»)

| Требование (spec / roadmap) | Task |
|---|---|
| i18n-готовность (next-intl, messages/ru.json, ICU plural, Intl ru-BY, BYN) §10.12 §16.2 | Task 1 |
| hreflang под будущие локали §16.2 | Task 1 (single-locale self-ref; полноценно — фаза 2 при добавлении be/en) |
| «Шрифт крупнее» toggle §16.2 accessibility | Task 2 |
| Onboarding-walkthrough (2-3 шага) §16.2 | Task 3 |
| Tawk.to чат поддержки §9 §16.1 | Task 4 |
| 2FA TOTP для moderator/superadmin §16.2 §16.7 | Tasks 5, 6, 7 |
| Audit-log 2FA-событий §16.2 | Tasks 6, 7 (`2fa.enabled/disabled/passed`) |
| Maintenance mode toggle §16.2 | Task 7 |
| Image sitemap §16.2 §16.7 | Task 8 |
| Welcome-email триггер §16.2 (TODO Plan 1) | Task 9 |
| `/help/erip/[number]` (банковский ЕРИП-режим) | Task 10 (Plan 5 мини-таск) |
| Database backups: еженедельный экспорт в R2 + квартальный тест §16.2 | Task 11 |
| Status page + healthcheck §16.2 §16.7 | Task 12 |
| Прод-платежи (sandbox→prod) §11 неделя 10 | Task 13 |
| Beta-tester группа §16.2 | Task 13 |
| Launch gate (юр-блокеры, инфра, качество) §16.1 §16.7 | Task 13 |

**Сознательно НЕ в этом плане (фаза 2-3, §10 / §13 / §16.5):** SMS auth, внутренний чат, UGC-статьи, генератор юр.документов, чип-lookup, recurring donations, saved searches, видео, ветконсультации, маркетплейс, события, волонтёрство, PWA, Meilisearch, crypto-донаты, реальное заполнение be/en-словарей (структура готова в Task 1), полная миграция всех существующих строк в `messages/ru.json` (делается постепенно по мере касания компонентов).

### Placeholder scan
- Код полон, без TODO/«fill-in». (Артефакт в `verifyTwofaCookie` устранён ревью-пассом ниже.)
- `getCurrentUser` (`@/lib/auth/current-user`) — **подтверждён** против Plan 3 Task 2 (`export async function getCurrentUser(): Promise<User | null>`, используется в P3/P4/P5). Имя/путь верны.
- Прочие интеграционные точки (R2-env/клиент, пропсы `welcome.tsx`, группа маршрутов `(account)`, ветка редиректа доната при `EXPRESSPAY_USE_CARD=false`) помечены нотами «адаптировать под фактическое имя» — явные switch-точки на существующий код, не placeholder логики.

### Ревью-пасс (2026-05-29) — найдено и исправлено

| Severity | Находка | Фикс |
|---|---|---|
| 🔴 Блокер | `role` отсутствует в `payload-token` при нативном Payload-логине (модераторы в `/admin`) → middleware видит `isStaff=false` → 2FA-гейт не срабатывает | Task 7 Step 1: `saveToJWT: true` на поле `role` в `Users.ts` + проверка декодом токена |
| 🟡 Дефект | `verifyTwofaCookie` содержал мёртвый вызов `signTwofaCookie(uid,0,0)` + `void expected` | Task 7 Step 5: переписан начисто (HMAC от `body` → сравнение с `sig` → проверка `exp`) |
| 🟡 Дефект | `scripts/backup-db.ts` импортировал retention через alias `@/` — `tsx` его не резолвит → рантайм-фейл cron-бэкапа | Task 11 Step 5: относительный импорт `../lib/backup/retention` |
| 🟢 Минор | image-sitemap требует Next ≥14.1 | Task 8 Step 3: добавлена проверка версии |
| 🟢 Минор | `@aws-sdk/client-s3` может не быть установлен | Task 11 Step 5: нота про install |

**Открытые риски (не блокеры, проверить при исполнении):**
- `/api/health` теперь может отдать 503 (degraded) — убедиться, что Railway healthcheck это терпит и прод-env (`R2_*`) заданы, иначе деплой-гейт упадёт (storage намеренно «мягкий» — только наличие env).
- `Footer.tsx` переводится в `'use client'` (Task 1 Step 10) ради `useTranslations` — если текущий Footer использует server-only API, перенести их в серверного родителя.
- IP-blocking list (§16.2 trust&safety) в Plan 6 НЕ вошёл — но и в финальный scope §16.7 он не попал; при желании — мини-таск или фаза 2.

### Type consistency
- `FontScale`/`FONT_SCALES`/`FONT_SCALE_COOKIE` — единые имена в lib + компоненте + layout (Task 2).
- `TWOFA_COOKIE_NAME` экспортируется из `twofa-cookie.ts` и используется в middleware + gate-роуте (Task 7) — одно имя.
- `issueSessionToken` расширена полем `role` (Task 7 Step 1) — все call-sites перечислены.
- `verifyTotp`/`hashRecoveryCode`/`decryptSecret` из Tasks 5-6 переиспользуются в gate-роуте Task 7 без переименований.
- `aggregateHealth` сигнатура (Task 12) совпадает в тесте, lib и роуте.
- `backupKey`/`prunableKeys` (Task 11) — одни имена в тесте, lib и скрипте.

---

**Готово к исполнению.** Зависимости между задачами: Task 1 (layout async) → предшествует 2/3/4 (тоже трогают layout); Task 5 → 6 → 7 (2FA-цепочка); 8–13 независимы. Рекомендуемый порядок = по номерам.
