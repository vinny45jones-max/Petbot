# Pet Aggregator BY — Design Spec

**Дата:** 2026-05-28
**Автор:** brainstorming-сессия (solo dev + Claude Code)
**Статус:** Draft → ожидает ревью пользователя
**Связанные документы:** [`docs/research/2026-05-28-pet-aggregator-research.md`](../../research/2026-05-28-pet-aggregator-research.md)

---

## 1. Цель проекта

Создать общенациональный белорусский веб-агрегатор животных:

- объединить в одном месте всех пристраиваемых животных РБ (от граждан и от приютов/НКО)
- дать каждому посетителю простой способ помочь: взять домой, задонатить, помочь юридически
- стать единой точкой входа по теме защиты животных в Беларуси для пользователей с разным уровнем цифровой грамотности

**Принципы:**

1. **Простота** — пользователь без высшего образования и без цифрового опыта проходит любой ключевой сценарий за 1-3 минуты. WCAG 2.2 AA, plain language, большие кнопки, минимум полей.
2. **Полнота** — любой животный вопрос гражданин РБ решает на сайте: пристройство, помощь, донаты, юридическая помощь, чип-проверка, консультация.
3. **Доверие** — верифицированные организации, прозрачные донаты, ясные дисклеймеры.
4. **Партнёрство, не парсинг** — приюты и НКО подключаются по договорённости, контент создаётся ими и пользователями.

---

## 2. Scope MVP (фаза 1)

**Включается в MVP:**

- Каталог животных с фильтрами и поиском
- Карточки животных с фото-каруселью и контактом
- Профили организаций с галереей животных и реквизитами
- Размещение от граждан через wizard (pre-moderation)
- Размещение от приютов через кабинет `org_admin` (без модерации, доверенный)
- Adoption inquiry (заявка взять домой) с email/TG-уведомлением владельцу
- Два способа авторизации: Telegram OAuth и email + пароль
- Донаты трёх типов: организации / конкретного животного / общего фонда — через ExpressPay (ЕРИП) и банковские реквизиты
- Админский блог
- Юр.раздел: статьи + ссылки на действующие НПА РБ, форма «Сообщить о жестокости»
- Tawk.to виджет поддержки
- Прямые кнопки «Написать в Telegram / Viber» владельцу/приюту
- Cрезка городов РБ (фиксированный справочник в выпадашке)
- Сквозная нумерация животных `№N` (наследие Pet BOT)
- Только русский язык

**Все прочие фичи остаются в дорожной карте и должны быть архитектурно предусмотрены** (см. §10).

---

## 3. Стек

### Frontend

- **Next.js 14+** App Router, TypeScript
- **Tailwind CSS** + **shadcn/ui** (готовые accessible-компоненты)
- SSR/SSG для публичных страниц — критично для SEO агрегатора
- Mobile-first, адаптив до 320px
- Server Actions для форм, Server Components по умолчанию

### Backend и админка

- **Payload CMS 3** — встроен в Next.js, даёт админку, REST/GraphQL API, auth, media-pipeline, RBAC
- Payload-collections напрямую отражают сущности из §6
- Server Actions Next.js для пользовательских форм (минуя CMS-админку)

### База данных

- **Postgres 16** на Railway (managed)
- Payload-нативная схема (без Prisma) — упрощает миграции и админку

### Хранилище медиа

- **Cloudflare R2** (S3-совместимое, без egress)
- `@payloadcms/storage-s3` плагин
- Resize до 1600px на стороне сервера, WebP для оригинала, thumb-варианты 200/400/800

### Auth

- Payload built-in auth (email + bcrypt + JWT в HTTP-only cookie)
- Telegram Login Widget + серверная валидация hash через `BOT_TOKEN`
- Связывание аккаунтов по совпадению email

### Платежи

- **ExpressPay API** — формирование ЕРИП-счетов + webhook-подтверждение
- Банковские реквизиты как fallback и для тех, кто платит вручную
- Архитектурный intent: provider-абстракция, чтобы в фазе 2 добавить bePaid / SMS-донаты / crypto без переделок

### Email

- **Resend** для transactional: подтверждение email, password reset, новые заявки, чек донора
- Бесплатный тариф до 3000 писем/месяц

### Аналитика

- **Plausible** (privacy-first, без cookie-баннера)
- Кастомные события: donation_started, donation_paid, animal_published, adoption_inquiry_sent

### Хостинг и инфра

- **Railway** — app + Postgres (managed)
- **Cloudflare** — DNS, CDN, DDoS-защита, R2
- **`.by`-домен** через hoster.by или RU-CENTER
- **CI/CD** — GitHub Actions → Railway deploy on push to `main`
- **Мониторинг** — Sentry (бесплатный tier) + Railway built-in logs
- **Backups** — Railway daily Postgres snapshots + еженедельный экспорт media-index в R2

### Бот

- Существующий **Pet BOT** живёт независимо в фазе 1
- В фазе 2 — общий backend API; бот пишет в ту же БД через service-token

### Поиск

- Postgres FTS (`tsvector`) на старте — достаточно для каталога до ~50k записей
- Архитектурный crochet: вынос в Meilisearch / Typesense в фазе 3 при росте

### Стоимость хостинга MVP

~$15-25/месяц на старте.

---

## 4. Роли и доступы

| Роль | Получение | Возможности |
|---|---|---|
| **guest** | без авторизации | смотреть каталог, профили, статьи; делать донат; анонимно сообщить о жестокости |
| **citizen** | TG OAuth ИЛИ email-регистрация | + разместить своё животное (pre-moderation), оставить adoption-заявку, комментировать (post-moderation), пожаловаться на контент |
| **org_admin** | назначается `superadmin` при верификации организации | + редактировать профиль своей организации, публиковать животных от её имени без модерации, видеть adoption-заявки и донаты на организацию |
| **moderator** | назначается `superadmin` | + апрув/реджект `pending` животных, скрытие комментариев, обработка ReportFlag; БЕЗ доступа к финансам и настройкам |
| **superadmin** | один аккаунт владельца | полный доступ |

**Правила:**

1. `citizen` → `Animal.status = pending_review`. Модератор апрувит, статус → `published`.
2. `org_admin` → `Animal.status = published` сразу. Доверенный после верификации.
3. Комментарии — post-moderation. ReportFlag запускает ревью.
4. Adoption inquiry приватен. Видит owner животного и `org_admin` его организации.
5. Donation. `org_admin` видит донаты на свою организацию. Общий фонд — только `superadmin`.

---

## 5. Карта страниц

### Публичные (SSR/SSG)

```
/                              — Главная: герой, 6 свежих животных, 4 приюта, CTA донат
/animals                       — Каталог + фильтры
/animals/[slug]                — Карточка животного
/organizations                 — Каталог организаций (карта + список)
/organizations/[slug]          — Профиль организации
/blog                          — Список постов
/blog/[slug]                   — Пост блога
/legal                         — Хаб юр.раздела (4 категории)
/legal/[slug]                  — Юр.статья + ссылки на НПА
/help                          — Хаб «Помочь» (3 типа донатов)
/help/organization/[slug]      — Донат на организацию
/help/animal/[slug]            — Донат на животное
/help/general                  — Донат в общий фонд
/report-cruelty                — Сообщить о жестокости (инструкции + анонимная форма)
/about                         — О проекте
/contacts                      — Контакты и форма «Подключить приют»
/search?q=...                  — Полнотекстовый поиск
```

### Auth

```
/login                         — TG-кнопка + форма email
/register                      — Регистрация по email
/verify-email?token=...
/forgot-password
/reset-password?token=...
/auth/telegram/callback        — TG OAuth callback
```

### Личный кабинет

```
/me                            — Дашборд
/me/profile                    — Профиль
/me/animals                    — Мои размещения
/me/animals/new                — Wizard размещения
/me/animals/[id]/edit
/me/donations                  — Мои донаты
/me/inquiries                  — Мои заявки adoption
```

### Кабинет org_admin

```
/org/[slug]                    — Дашборд
/org/[slug]/animals
/org/[slug]/inquiries
/org/[slug]/donations
/org/[slug]/settings
```

### Админка Payload

```
/admin/*                       — Payload-админка для moderator и superadmin
```

### API

```
/api/auth/telegram/verify
/api/animals
/api/donations/expresspay
/api/donations/expresspay/webhook
/api/reports
/api/inquiries
/api/cruelty-reports
```

### SEO

- `sitemap.xml` динамический
- `robots.txt`
- Open Graph + Twitter Card на каждой странице животного/организации/статьи
- JSON-LD для организаций (Schema.org Organization) и животных (custom)
- Только русский в фазе 1; архитектурно подготовить i18n (`next-intl` или Payload locales) под белорусский и английский в фазе 2/3

---

## 6. Модель данных

### User

- `id`, `telegram_id` (unique nullable), `telegram_username`
- `email` (unique nullable), `password_hash` (nullable), `email_verified_at`
- `first_name`, `last_name`, `photo_url`, `phone` (nullable)
- `role` enum: `guest | citizen | org_admin | moderator | superadmin`
- `is_blocked`, `created_at`, `last_seen_at`

### Organization

- `id`, `slug`, `name`, `unp`, `description` (rich text), `logo`, `cover_photo`
- `city_id` → City, `address`, `phone`, `email`
- `tg_url`, `viber_url`, `vk_url`, `instagram_url`, `website_url`
- `donation_bank_details` (rich text), `erip_service_code` (nullable)
- `is_verified`, `is_published`
- `admin_users[]` ↔ User (many-to-many через `OrganizationAdmin`)

### Animal

- `id`, `slug`, `pet_number` (сквозная нумерация), `name` (nullable)
- `species` enum: `dog | cat | other`
- `sex` enum: `male | female | unknown`
- `age_years`, `age_months`, `size` enum: `small | medium | large`
- `description` (rich text), `health_status` enum + `health_notes` (rich text)
- `is_sterilized`, `is_vaccinated`, `microchip_id` (15 цифр nullable)
- `city_id` → City
- `owner_type` enum: `citizen | organization`
- `owner_user_id` → User (nullable), `organization_id` → Organization (nullable)
- `status` enum: `pending_review | published | adopted | archived`
- `source` enum: `web_form | telegram_bot | partner_feed | admin` (default `web_form`; используется в фазах 2-3 для трекинга канала)
- `media[]` → Media (1..N) — в MVP только `media_kind = image`, видео добавляется в фазе 2
- `created_at`, `published_at`, `adopted_at`

### City

- `id`, `name_ru`, `name_be`, `region` (область)
- Seed: ~120 городов РБ

### BlogPost

- `id`, `slug`, `title`, `excerpt`, `body` (rich text), `cover_photo`
- `author_id` → User, `category_id`, `tags[]`, `published_at`, `status`

### LegalArticle

- `id`, `slug`, `title`, `body` (rich text)
- `npa_links[]` — структура `{ title, url }`
- `category` enum: `general | cruelty | lost_pet | adoption_rights`

### Donation

- `id`
- `donor_user_id` → User (nullable), `donor_email`, `donor_phone`
- `amount_byn`, `currency`
- `target_type` enum: `organization | animal | general_fund`
- `organization_id` (nullable), `animal_id` (nullable)
- `payment_provider` enum: `expresspay_erip | bank_transfer_manual`
- `provider_invoice_id`, `status` enum: `pending | paid | failed | refunded`
- `created_at`, `paid_at`

### AdoptionInquiry

- `id`, `animal_id` → Animal, `applicant_user_id` → User
- `message`, `contact_phone`, `contact_telegram`
- `status` enum: `new | contacted | closed`

### Comment

- `id`, `author_id` → User
- `target_type` enum: `animal | blog_post`, `target_id`
- `body` (plain text, до 2000 символов), `parent_id` (для тредов)
- `status` enum: `published | hidden | reported`

### ReportFlag

- `id`, `reporter_id` → User, `target_type`, `target_id`, `reason`, `status`

### Media

- `id`, `url`, `alt_text`, `width`, `height`, `mime_type`, `uploaded_by` → User
- `media_kind` enum: `image | video` (в MVP только `image`)

### CrueltyReport

- `id`, `description`, `photos[]`, `contact` (optional)
- `reporter_user_id` (nullable, для анонимных)
- `location_city_id`, `status` enum: `new | in_progress | closed`
- `created_at`

---

## 7. Ключевые user flows

### 7.1 Гражданин размещает животное

1. Главная → «Разместить животное»
2. Если не залогинен → `/login`
3. `/me/animals/new` — wizard 4 шага:
   1. Фото (1-6 шт, drag&drop, авто-resize до 1600px, upload в R2)
   2. Вид/пол/возраст/размер, имя
   3. Город (выпадашка) + описание + здоровье
   4. Контакт: телефон, TG-ник, Viber (минимум один)
4. Submit → `pending_review` → toast «Объявление отправлено на проверку, до 24ч»
5. Email-уведомление пользователю и админ-канал TG модератору
6. Модератор апрувит в Payload → `published`
7. Email пользователю со ссылкой

### 7.2 Заявка adoption

1. Карточка → «Хочу взять домой»
2. Если не залогинен → `/login`
3. Modal: сообщение, телефон, TG (предзаполнено)
4. Submit → `AdoptionInquiry.status = new`
5. Email + TG-уведомление владельцу / org_admin
6. Заявитель видит «Заявка отправлена»
7. Дальнейшее общение снаружи (телефон/TG/Viber) — внутренний чат в фазе 2

### 7.3 Донат на животное через ЕРИП

1. Карточка → «Помочь рублём» → `/help/animal/[slug]`
2. Форма: сумма (10/25/50/100/любая), цель (корм/лечение/общее), email/телефон, имя
3. Submit → POST `/api/donations/expresspay`
4. Сервер создаёт ExpressPay-счёт, получает `invoice_id` и `payment_url`
5. Donation → `pending`
6. Redirect на ExpressPay payment page (или QR ЕРИП inline)
7. Пользователь оплачивает (банк, USSD, точка ЕРИП)
8. ExpressPay → webhook `/api/donations/expresspay/webhook`
9. Сервер валидирует подпись → Donation → `paid`
10. Email-чек донатору
11. Карточка показывает суммарную помощь и счётчик донаторов (без раскрытия суммы по каждому)

### 7.4 Регистрация организации

1. `/contacts` → форма «Подключить приют»: название, УНП, контакт, ссылки
2. Submit → email superadmin
3. Ручной процесс: superadmin проверяет, создаёт Organization, ставит `is_verified=true`
4. Создаёт User org_admin, связывает с Organization
5. Email org_admin с TG-ссылкой / временным паролем
6. org_admin логинится → `/org/[slug]`

### 7.5 Сообщение о жестокости

1. Header/Footer → «Сообщить о жестоком обращении» → `/report-cruelty`
2. Страница: блок-схема «куда обращаться» (по модели helpsafe.by) + контакты МВД/ветстанции/АЗО + ссылки на ст. 339-1 УК, 16.29 КоАП, Закон 361-З
3. Внизу — форма «Сообщить нам» (опциональная, anonymous): описание, фото, контакт
4. Submit → `CrueltyReport`, email superadmin
5. MVP не делает юр.документ автоматически — генератор шаблонов в фазе 2

### 7.6 Поиск / каталог

1. `/animals` — серверный рендер
2. Боковая панель фильтров (sticky desktop, bottom-sheet mobile):
   - Вид (radio), Пол (radio), Возраст (slider), Размер (checkboxes)
   - Город (multi-select), Стерилизация (checkbox), Тип владельца (гражданин/приют)
3. URL отражает фильтры (`?species=dog&city=minsk`)
4. Сортировка: новые / срочные / давно в приюте
5. Pagination 24 на страницу, infinite scroll на mobile
6. Карточка: фото (lazy), имя/№, возраст, город, бейдж «Срочно»/«Приют»

---

## 8. Принципы UX для low-literacy

- **Большие кнопки** ≥44×44px, ≥56×56px для primary CTA
- **Понятные глаголы**: «Помочь», «Взять домой», «Сообщить», «Отправить»
- **Один экран — один вопрос** в формах размещения и доната
- **Прогресс-бар** на wizard'ах размещения
- **Plain language**, короткие предложения, активный залог
- **Иконки + текст**, никогда только иконки
- **Контрастность** WCAG AA 4.5:1
- **Голосовой ввод**: HTML `inputmode` + native dictation на мобильных
- **Helper-текст под полями** в plain language
- **Подтверждение действий** простыми тостами и страницами `success` (а не модалками)
- **Error recovery** в формах: показывать поле с ошибкой, не теряя введённое

---

## 9. Внешние сервисы и партнёры

| Сервис | Назначение | Тариф |
|---|---|---|
| Railway | App + Postgres | $5-15/мес |
| Cloudflare R2 | Медиа | ~$2/мес |
| Cloudflare DNS/CDN | Домен, защита | бесплатно |
| Resend | Email | бесплатно до 3k/мес |
| Plausible | Аналитика | $9/мес cloud или self-host |
| Tawk.to | Чат поддержки | бесплатно |
| Sentry | Error monitoring | бесплатно |
| ExpressPay | ЕРИП | от 0,3% (требуется юр.лицо) |
| Telegram BotFather | OAuth widget | бесплатно |
| GitHub Actions | CI/CD | бесплатно (private repo) |

**Партнёры (фаза 0 outreach):**

- ByPet (потенциал партнёрства / дифференциации)
- Эгида, ЗООшанс, Барбос, ОКош&Ко, Кошкин дом, Сирин, Преданное сердце
- HelpSafe.by — кросс-промо по юр.разделу
- АЗО — консультанты по форме шаблонов заявлений

---

## 10. Расширения, заложенные архитектурно (фазы 2-3)

Каждый пункт ниже **не реализуется в MVP**, но архитектура должна оставлять явное место под него — без переделок core-моделей.

### 10.1 Внутренний чат пользователь↔приют

- Добавляется `Conversation` (между двумя User'ами или User+Organization) и `Message`
- Realtime через WebSocket (Railway WS endpoint или Pusher)
- Привязка к `AdoptionInquiry`: каждая заявка автоматически создаёт `Conversation`
- В MVP `AdoptionInquiry` уже сохраняет всё, что нужно для триггера conversation позже

### 10.2 Видео в карточках животных

- `Media.media_kind` уже создан в MVP, в фазе 2 начинают сохраняться записи с `media_kind = video`
- Cloudflare Stream для transcoding или Mux
- Wizard размещения получает шаг «Видео» (опциональный, до 1 минуты)
- Никакой миграции схемы — поле `Animal.media[]` и `Media.media_kind` уже на месте с фазы 1

### 10.3 UGC-статьи с rich-editor и модерацией

- Новая сущность `UserArticle` отдельно от `BlogPost` (разные правила публикации)
- pre-moderation для citizen, post-moderation для org_admin
- Lexical editor (Payload-нативный) — уже доступен
- В MVP уже есть `ReportFlag` полиморфный — будет работать и для статей
- Категории и теги переиспользуются из BlogPost

### 10.4 SMS auth

- Провайдер РБ (BSMS / Rocket / Macrokiosk Belarus)
- В User уже есть поле `phone` — будет использоваться
- Добавляется `PhoneVerification` (codes, expiration)
- Flow аналогичен email-verification

### 10.5 Генератор юр.документов

- Новая сущность `LegalDocumentTemplate`: `slug`, `title`, `description`, `fields[]` (JSON Schema), `template_body` (mustache/handlebars)
- Endpoint `/legal/[slug]/generate` — форма по `fields[]` → render → PDF (Puppeteer) + DOCX (docxtemplater)
- Партнёр-юрист пишет шаблоны в Payload-админке
- В MVP `LegalArticle` уже отделён от Article-системы, добавление `LegalDocumentTemplate` рядом не ломает связи

### 10.6 Чип-lookup

- Страница `/chip-lookup` — форма «15 цифр»
- Если код 112 (РБ) → редирект на animal-id.by с предзаполненным значением
- Иначе → PetMaxx fallback
- Долгосрочно — partner API с animal-id.by (запрос на этапе фазы 2)
- В MVP `Animal.microchip_id` уже есть — позднее можно матчить найденных по чипу с базой потерянных

### 10.7 Интеграция Pet BOT

- Расширение API сайта service-token-доступом для бота
- Бот пишет в ту же `Animal` коллекцию с `source = telegram_bot`
- Канал публикации в Telegram, который бот ведёт сейчас, становится дополнительной витриной
- `Animal.source` уже создан в MVP — никакой миграции схемы при включении интеграции

### 10.8 Recurring donations

- В Donation добавится `subscription_id`, новая сущность `DonationSubscription`
- Провайдеры РБ recurring ограничены — изучается отдельно (bePaid поддерживает)
- В MVP флоу одноразового платежа изолирован в provider-абстракции — добавление recurring не ломает существующий код

### 10.9 Видеоконсультации с ветврачами

- Whereby Embedded API, новая сущность `Consultation`, привязка к ветврачу-партнёру
- В MVP `Organization` уже умеет содержать любые контакты — клиники-партнёры подключаются как обычные организации с пометкой `kind = veterinary_clinic` (добавляется enum-поле)

### 10.10 Saved searches + email alerts

- Новая сущность `SavedSearch`: фильтры в JSON, `user_id`, `notify_frequency`
- Cron-job в Railway раз в сутки проверяет новые `Animal.published_at > last_run`
- В MVP фильтры на `/animals` уже URL-driven, парсинг этих query-params для savedsearch будет тривиальным

### 10.11 Crypto-донаты

- Provider-абстракция Donation допускает `payment_provider = crypto_usdt_trc20`
- Внешний адрес кошелька + webhook от TronGrid или BlockCypher
- Не приоритет, но не блокировано

### 10.12 i18n (бел + англ)

- В MVP Next.js конфигурируется с `i18n` middleware (`next-intl` или Payload locales)
- Все user-facing строки уже выносятся в `messages/ru.json`
- Белорусский и английский добавляются заполнением словарей в фазе 2-3

### 10.13 Парсинг партнёрских feed'ов

- В фазе 1 не парсим
- В фазе 2-3 для крупных приютов — приём webhook'ов или подписка на VK Group API (с явного согласия)
- Архитектурно: `Animal.source` уже будет, добавится `source = partner_feed` и `import_batch_id`

### 10.14 Native mobile (PWA)

- Next.js + `next-pwa` плагин в фазе 3
- Service Worker для оффлайн-каталога и push-уведомлений
- В MVP уже mobile-first, переход на PWA = плагин + manifest

---

## 11. Фазирование

### Фаза 0 — outreach (параллельно с разработкой, 1-2 недели)

- Зарегистрировать `.by`-домен
- Связаться с ByPet — партнёрство / дифференциация
- Связаться с 5-7 крупнейшими организациями
- Решить юр.лицо: своя НКО vs техплатформа партнёра
- Настроить аккаунты: Cloudflare, Railway, R2, Resend, Plausible, Tawk.to, ExpressPay sandbox
- Создать BotFather application для TG OAuth (отдельный бот от Pet BOT)

### Фаза 1 — MVP (10 недель)

| Неделя | Веха |
|---|---|
| 1 | Каркас Next.js + Payload, БД, auth (TG + email), деплой Railway |
| 2 | Модели: User, Organization, Animal, City, Media. Seed cities РБ |
| 3 | Каталог животных + фильтры + поиск, страница карточки |
| 4 | Профили организаций + listing, страница профиля |
| 5 | Wizard размещения (citizen), очередь модерации в Payload |
| 6 | Кабинет org_admin: управление животными |
| 7 | Adoption inquiries + email-уведомления |
| 8 | Донаты: ExpressPay sandbox + webhook + 3 типа целей |
| 9 | Блог + юр.раздел + report-cruelty форма |
| 10 | SEO (sitemap, OG, JSON-LD), Tawk.to, мониторинг, прод-платежи |

### Фаза 2 — рост (3-4 месяца после MVP)

- SMS auth
- Внутренний чат
- Видео в карточках
- UGC-статьи с rich-editor
- Генератор юр.документов
- Чип-lookup (форма + redirect)
- Интеграция Pet BOT
- Recurring donations
- Saved searches + email alerts

### Фаза 3 — масштаб (6+ месяцев)

- Видеоконсультации (Whereby)
- Внутренняя аналитика для приютов
- PWA + push-уведомления
- Партнёрский импорт от крупных приютов
- Английская локализация
- Белорусская локализация
- Meilisearch для поиска при росте >50k записей
- Crypto-донаты

---

## 12. Риски и митигации

| Риск | Митигация |
|---|---|
| ByPet уже занял нишу | Фаза 0 — переговоры. Дифференциация: ByPet = донат-площадка, мы = агрегатор + юр.помощь + UGC |
| Приюты не подключатся | Объехать лично 5-7 крупнейших до запуска. Бесплатно для них всегда |
| ExpressPay требует юр.лица и времени на интеграцию | Старт с банковских реквизитов (как Эгида). ЕРИП на неделе 8-10 после регистрации НКО |
| Низкая конверсия у low-literacy | WCAG 2.2 AA, плавный wizard, голосовой ввод, крупные кнопки |
| Спам/мошенничество в UGC | Pre-moderation объявлений граждан, ReportFlag + rate-limit по IP, hCaptcha на регистрации |
| Юр.риски за неверную консультацию по жестокости | Дисклеймеры «информационно, не юр.помощь», партнёр-юрист как ревьюер контента |
| Объём фото — стоимость | R2 без egress. Resize 1600px. WebP. Lazy load. |
| TG OAuth требует домен-верификации у BotFather | Сделать в фазе 0 (нужен живой домен) |
| Низкое качество фото у объявлений граждан | Минимальные требования размеру/формату, рекомендации в wizard, опциональный аплифт через Pet BOT (фаза 2) |
| Перевод фокуса с пристройства на «политическое» (Беларусь и животные) | Чёткий manifesto в `/about`, mission-driven позиционирование, никакого comment-форума без модерации |

---

## 13. Что НЕ делаем (по решениям пользователя)

- Внутренний чат — фаза 2
- Видео — фаза 2
- UGC-статьи — фаза 2
- SMS auth — фаза 2
- Генератор юр.документов — фаза 2
- Чип-lookup — фаза 2
- Crypto донаты — фаза 3
- Recurring donations — фаза 2
- Native mobile app — фаза 3 (через PWA)
- Парсинг чужих сайтов — никогда (партнёрская модель)
- Форум / Q&A — никогда (комментарии достаточны)
- Платная юр.помощь без лицензии — никогда

---

## 14. Открытые вопросы (решаются в фазе 0)

1. Партнёрство с ByPet — да/нет?
2. Юр.лицо: своя НКО vs техплатформа партнёра?
3. Какие 5-7 приютов подтвердят участие до запуска?
4. Какой контакт-юрист готов ревьюить юр.раздел?
5. Какой ветврач/клиника готова консультировать в фазе 3?

Эти вопросы НЕ блокируют старт фазы 1 — разработка может идти параллельно с outreach.

---

## 15. Связь с существующим Pet BOT

Pet BOT (текущий Telegram-бот) остаётся независимым в фазе 1. В фазе 2 интегрируется:

- Бот пишет в Animal-коллекцию сайта через REST API (с service-token)
- Канал бота в Telegram становится одной из витрин
- Архитектурно: добавляется `Animal.source` enum уже в фазе 1, бот заполняет `source = telegram_bot`
- Сквозная нумерация `pet_number` мигрирует из `pet_counter.txt` в `Animal.pet_number` БД на старте фазы 1

---

## 16. Gap-analysis — возможные доработки по фазам

Этот раздел отвечает на вопрос «что мы могли упустить». Каждый пункт оценён и распределён по фазам.

### 16.1 Фаза 0 — outreach и юр.фундамент

**Брендинг и контент:**

- Название проекта и доменное имя (короткое, .by)
- Лого + favicon + OG-image (можно через AI или фрилансера)
- Tone of voice document для текстов
- Hero-фото от профессионального фотографа (или партнёрские из приютов)
- Email-домены: `info@`, `support@`, `donate@`, `legal@`

**Юр.документы (блокеры запуска):**

- Privacy Policy (закон РБ № 99-З «О защите перс.данных», Указ № 422)
- Terms of Service / Договор-оферта пользователя
- Cookie Policy + cookie banner (для Tawk.to и других не-Plausible сервисов)
- Договор-оферта на размещение животных (передача неисключительных прав на контент)
- Договор с организациями-партнёрами (шаблон)
- Возрастной gate: регистрация с 14 лет (по КоАП РБ ст.16.29) — чекбокс «мне 14+»
- Согласие на обработку перс.данных при регистрации (явный чекбокс, не pre-checked)
- DPIA если будут чувствительные категории данных
- Регистрация уведомления оператора перс.данных в НЦЗПД (если требуется по объёму)

**Юр.лицо (если своя НКО):**

- Регистрация учреждения / общественного объединения в Мингорисполкоме
- Открытие благотворительного счёта в Беларусбанке/Приорбанке
- Налоговый учёт (МНС)
- Договор с ExpressPay / WebPay / hutkigrosh
- Бухгалтер на аутсорсе для отчётности по донатам
- Правила использования благотворительных средств (внутренний документ)

**Инфра-аккаунты (готовим до недели 1 разработки):**

- GitHub repo (private) + Actions
- Railway account + биллинг
- Cloudflare account + R2 + DNS
- Resend account + домен-верификация (SPF/DKIM/DMARC)
- Plausible (cloud или self-host)
- Tawk.to
- Sentry
- BotFather: отдельный бот для Telegram OAuth (НЕ тот же что Pet BOT)
- Google Search Console + Yandex Webmaster
- Аккаунты в соцсетях для продвижения (TG-канал проекта, VK-группа, Instagram)

**Партнёрские договорённости:**

- ByPet — узнать статус, обсудить партнёрство
- 5-7 крупнейших приютов — подписать MoU «бесплатно для них всегда»
- Юрист-партнёр для ревью юр.раздела (АЗО / HelpSafe / частный)
- Дизайнер на иллюстрации для пустых состояний и hero (опционально)

### 16.2 Фаза 1 — что добавить в MVP (важно, было упущено)

**Trust & Safety (обязательно):**

- hCaptcha / Cloudflare Turnstile на: регистрации, размещении животного, форме «Сообщить о жестокости», форме отправки заявки adoption
- Rate limiting на API: 60 req/min per IP, 10 регистраций/час per IP
- Антиспам в комментариях: эвристика (ссылки, повторы, скорость), shadow-ban
- Account-deletion endpoint в `/me/profile` (право на забвение по закону 99-З)
- Data-export endpoint (выгрузка JSON всех моих данных)
- 2FA TOTP для moderator и superadmin (стандартный QR + TOTP)
- Аудит-лог критических действий (бан, удаление, изменение роли, рефанд донатов)
- IP-blocking list в админке для злостных нарушителей

**Caталог — критичные мелочи:**

- Бейджи на карточке: «Срочно» (нужна срочная медпомощь), «Передержка», «На карантине»
- Статус «Я уже занят» — частичный hide карточки + пометка «забронирован, ждёт встречи»
- Статус «Пристроен» — карточка остаётся для истории успеха с бейджем
- Кнопка «Я нашёл хозяина» / «Закрыть объявление» для citizen-владельца
- История изменений объявления (audit trail) для модерации
- Маркировка «Найдено / Потеряно» — отдельная вертикаль для бездомных и потеряшек (важная семантически)
- «Похожие животные» под карточкой (по виду+городу+размеру)

**Auth и онбординг:**

- Welcome-email после регистрации с гайдом «что вы можете сделать на сайте»
- Magic link login по email (без пароля) — упрощает для low-tech
- «Запомнить меня» галочка с долгим cookie
- Восстановление email через TG (если связаны)
- Onboarding-walkthrough при первом визите (2-3 шага tooltip)

**Контент и навигация:**

- FAQ страница (топ-20 вопросов)
- «Как это работает» / «Безопасность» / «Истории успеха» в footer
- Глоссарий: стерилизация, чипирование, передержка, опека (для low-literacy)
- 404 / 500 страницы с поиском и навигацией
- Хлебные крошки на глубоких страницах
- Footer с обязательными ссылками: О проекте / Контакты / Privacy / Terms / Cookie / Правила размещения

**SEO дополнительно:**

- Yandex.Метрика (опционально, в РБ Yandex активен)
- Page meta description и title уникальны на каждой странице
- Структурированные URL: `/animals/[city]/[species]/[slug]` вместо плоских
- Canonical URLs для фильтров каталога
- Sitemap.xml split по типам (animals, organizations, articles)
- Image sitemap для фото животных
- IndexNow для свежих animals (для Bing/Yandex)

**Уведомления:**

- Email-настройки в `/me/profile`: что слать, как часто
- Базовые типы: «Заявка на моё объявление», «Объявление одобрено», «Объявление отклонено», «Донат на моё животное», «Чек донора»
- Digest «Свежее за неделю» (опционально, выкл по умолчанию)

**Performance и качество:**

- Core Web Vitals budget: LCP <2.5s, CLS <0.1, INP <200ms
- Image optimization через Next.js Image + R2
- Bundle analyzer в CI
- Lighthouse CI на pull requests (>90 score gate)
- Sentry с performance monitoring
- Status page (`status.<domain>.by` через UptimeRobot или Better Uptime)
- Maintenance mode toggle в env-vars
- Database backups: Railway daily + еженедельный экспорт в R2 + квартальный тест восстановления

**Бизнес/Операции:**

- Webhook receiver для платежей идемпотентен (защита от двойной обработки)
- Reconciliation cron: раз в сутки сверять статусы pending Donations с ExpressPay
- Email-алерт superadmin при failed webhook или несостыковке
- Простой help-center: набор статей в Payload коллекции `HelpArticle`
- Beta-tester группа (10-15 пользователей) — для feedback за 2 недели до запуска

**Локализация-ready (даже если только русский):**

- `next-intl` или Payload localization включён с фазы 1
- Все строки в `messages/ru.json`
- Plural-rules через ICU (`{count, plural, one {1 кот} few {# кота} many {# котов}}`)
- Date/number форматирование через `Intl.NumberFormat('ru-BY')` и `Intl.DateTimeFormat('ru-BY')`
- Денежный формат BYN
- Hreflang-теги под будущие локали

**Accessibility (обязательно):**

- Прохождение axe-core в CI
- Skip-to-content link
- Focus-visible стили
- ARIA-labels на иконочных кнопках
- Контраст-тестирование в Storybook
- Keyboard-navigation полное (TAB через всё)
- «Шрифт крупнее» toggle в footer (для пожилых)
- Screen reader smoke-test перед запуском

**Юр.раздел расширения:**

- «Найти юриста» — каталог зоо-юристов РБ (партнёры + ссылки)
- Глоссарий юр.терминов (понятным языком)
- FAQ по ст. 339-1 УК и 16.29 КоАП
- Образец заявления в РОВД (как статичный PDF, до генератора в фазе 2)

**Animal model — добавляем поля:**

- `urgency` enum: `normal | urgent_medical | needs_temp_home`
- `intake_date` (когда взяли с улицы / попало в приют)
- `lost_or_found` enum: `for_adoption | lost | found` (вертикаль потеряшек)
- `last_seen_location` (для lost/found, опционально)
- `reservation_status` enum: `available | reserved | adopted`
- `media_count` cached (для индекса каталога без join'а)

### 16.3 Фаза 2 — что добавить (расширения сверх ранее заявленного)

**Внутренний чат:**

- Anti-abuse: автомодерация ссылок, телефонов вне формата, бранных слов
- Voice messages (опционально)
- Файлы (только фото, до 5 шт)
- Read receipts (опционально)
- Системные сообщения от приюта: «Запланирована встреча на ...»
- Push-notifications браузерные через Web Push API

**Видео:**

- Cloudflare Stream или Mux — оба support transcoding и HLS
- Лимит длительности: 60 секунд
- Thumbnail-генерация автоматическая
- Compression preset под mobile
- Cost-alerting (storage > X)
- Disable upload при превышении квоты

**UGC-статьи:**

- Editorial review workflow в Payload
- Featured articles на главной
- Профили авторов с историей публикаций
- Подписка на автора + email-digest
- Newsletter раз в 2 недели с топ-статьями
- Anti-plagiarism checker (Copyleaks API опционально)

**SMS auth:**

- Бюджет: ~0.05-0.1 BYN за SMS = $1-3/мес на 1000 пользователей
- Failover: BSMS → А1 → МТС
- Throttle: 3 SMS на номер в сутки
- Anti-bot: всегда после captcha

**Генератор юр.документов:**

- Версионность шаблонов (snapshot при изменении НПА)
- История генераций пользователя в `/me/legal-documents`
- PDF (Puppeteer headless Chrome) + DOCX (docxtemplater)
- Эл.подпись через НЦЭУ (опционально)
- Юрист-партнёр валидирует каждый новый шаблон

**Pet BOT интеграция:**

- Service-token для бота с rate-limit
- Дубль-детекция: если из бота приходит та же фотография, что уже на сайте — pre-merge
- Telegram-канал бота как RSS-источник для сайта (опционально)

**Recurring donations:**

- bePaid поддерживает card-binding и rebill
- Управление подпиской в `/me/donations`
- Email напоминание перед списанием
- Easy cancel («Отменить подписку» одной кнопкой)
- «Стена донаторов» (опционально, с согласия)

**Saved searches:**

- Cron 1×/день
- Лимит: 5 saved searches на пользователя
- Unsubscribe-link в каждом email
- Digest формат

**Чип-lookup:**

- Парт­нёр-API запрос к animal-id.by (если откажут — фронт-форма редиректа)
- PetMaxx fallback для иностранных чипов
- Связка: если введённый чип = чей-то Animal.microchip_id на сайте — показать «Этот чип зарегистрирован у нас как ...»

### 16.4 Фаза 3 — что добавить

**Маркетплейс корма и нужд:**

- «Помоги делом» — список конкретных нужд приюта (15 кг корма Royal Canin Adult, 3 шт одеял, лекарство X)
- Партнёрство с зоомагазинами РБ (4 лапы, ZooBy, ZooMag) — прямой заказ с доставкой в приют
- Comission-share модель

**Календарь событий:**

- Выставки животных
- Дни усыновления
- Благотворительные акции
- Подписка на события по городу

**Волонтёрство:**

- Анкета «Я хочу помогать руками» (выгул, уборка, медицина, фото)
- Matching с приютами по локации и навыкам
- Опыт-портфолио волонтёра

**Образование:**

- Курсы / вебинары: «Как ухаживать за первой собакой», «Социализация кошки», «Что делать с агрессией»
- Партнёрство с кинологами / зоопсихологами РБ
- Сертификат «Я готов взять собаку» (опциональный gate для adoption-заявки)

**Расширение в СНГ:**

- Локализация на белорусский (обязательно для имиджа)
- Локализация на английский (для усыновителей из ЕС)
- Архитектурно: домен-расширение `.kz`, `.ua` opt-in за рамками этого спека

**Native mobile (PWA → app):**

- TWA (Trusted Web Activity) → Google Play
- iOS — отдельная сборка через Capacitor или React Native
- Push-уведомления через FCM/APNS
- Offline-режим для каталога (PWA service worker)

**Ветконсультации:**

- Whereby Embedded
- Booking через Cal.com self-hosted или Calendly
- Партнёрство с 5-10 клиниками РБ
- Платный план (оплата клиники, comission платформе)

**Аналитика для приютов:**

- Дашборд: просмотры, заявки, успешные adoption по месяцам
- A/B тестирование описаний (опционально)
- Топ-фотографии (по CTR)

### 16.5 Сквозные опции, которые НЕ делаем (новый список)

- Форум / Q&A (комментарии достаточно)
- Платная юр.помощь без лицензии
- Маркетплейс между гражданами (это про продажу, не благотворительность)
- Криптокошельки / NFT (преждевременно)
- Web3 / decentralized hosting (overkill)
- AI-генерация описаний животных автоматически (Pet BOT уже делает по запросу пользователя — этого достаточно)
- Соцсеть с лентой (не нужно, не agg-функция)
- Голосовой ассистент

### 16.6 Что добавляется в модель данных за пределами фазы 1

| Сущность | Фаза | Назначение |
|---|---|---|
| `Conversation`, `Message` | 2 | Внутренний чат |
| `UserArticle`, `ArticleRevision` | 2 | UGC-статьи |
| `PhoneVerification` | 2 | SMS auth |
| `LegalDocumentTemplate`, `LegalDocumentGeneration` | 2 | Генератор док-в |
| `DonationSubscription` | 2 | Recurring donations |
| `SavedSearch` | 2 | Сохранённый поиск + alerts |
| `NotificationPreference` | 1 (можно сразу) | Настройки уведомлений |
| `HelpArticle` | 1 | FAQ / help-center |
| `Glossary` | 1 | Глоссарий |
| `LostFoundReport` | 1 (или интегрировано в Animal через `lost_or_found`) | Потеряшки |
| `VolunteerProfile`, `VolunteerOpportunity` | 3 | Волонтёрство |
| `Event` | 3 | Календарь событий |
| `Course`, `Enrollment` | 3 | Образование |
| `ConsultationSlot`, `Consultation` | 3 | Ветконсультации |
| `MarketplaceItem`, `Order` | 3 | Маркетплейс корма |
| `AuditLog` | 1 | Аудит критических действий |

### 16.7 Финальный апдейт scope MVP

Учитывая gap-analysis, в MVP (фаза 1) **добавляется к ранее заявленному**:

- Captcha (Cloudflare Turnstile) на формы
- Rate limiting и базовый антиспам
- Account deletion + data export (закон 99-З)
- 2FA для модераторов/админов
- Audit log критических действий
- Бейджи «Срочно» / «Передержка» / «Карантин» / «Забронирован» / «Пристроен»
- Кнопка «Закрыть объявление» для citizen-владельца
- Вертикаль «Найдено / Потеряно» (через `Animal.lost_or_found`)
- Похожие животные
- Magic-link login по email
- Welcome-email и onboarding-walkthrough
- FAQ, «Как это работает», «Безопасность», «Истории успеха»
- Глоссарий и help-center
- 404 / 500 страницы
- Хлебные крошки
- NotificationPreference + базовые типы уведомлений
- Email-настройки в профиле
- Структурированные URL `/animals/[city]/[species]/[slug]`
- Image sitemap + canonical URLs
- IndexNow интеграция
- Lighthouse CI в pull requests
- Status page и maintenance mode
- Idempotent payment webhook + reconciliation cron
- Лю­ди-партнёры юристы и каталог зоо-юристов РБ
- Полная i18n-готовность (даже при одном языке)
- WCAG 2.2 AA + axe-core CI + «Шрифт крупнее»

Эти добавки **не меняют стек** и архитектурно укладываются в уже описанные модели. Срок MVP увеличивается с 10 до **12-14 недель**.

### 16.8 Обновлённое распределение моделей по фазам

**Фаза 1:** User, Organization, Animal, City, Media, BlogPost, LegalArticle, Donation, AdoptionInquiry, Comment, ReportFlag, CrueltyReport, NotificationPreference, HelpArticle, Glossary, AuditLog.

**Фаза 2:** Conversation, Message, UserArticle, ArticleRevision, PhoneVerification, LegalDocumentTemplate, LegalDocumentGeneration, DonationSubscription, SavedSearch.

**Фаза 3:** VolunteerProfile, VolunteerOpportunity, Event, Course, Enrollment, ConsultationSlot, Consultation, MarketplaceItem, Order.
