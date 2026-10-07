import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { sql } from 'drizzle-orm';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { Users } from './collections/Users.ts';
import { Cities } from './collections/Cities.ts';
import { Media } from './collections/Media.ts';
import { AuditLogs } from './collections/AuditLogs.ts';
import { NotificationPreferences } from './collections/NotificationPreferences.ts';
import { MagicLinkTokens } from './collections/MagicLinkTokens.ts';
import { Organizations } from './collections/Organizations.ts';
import { IntakeFacilities } from './collections/IntakeFacilities.ts';
import { Animals } from './collections/Animals.ts';
import { AdoptionInquiries } from './collections/AdoptionInquiries.ts';
import { s3Storage } from '@payloadcms/storage-s3';
import { resendAdapter } from '@payloadcms/email-resend';
import { buildR2StorageConfig, type R2Env } from './lib/storage/r2-adapter.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// R2 только при наличии ключей; иначе Payload пишет в локальный media/ (dev/CI без Cloudflare).
const hasR2 = !!process.env.R2_ACCOUNT_ID && !!process.env.R2_ACCESS_KEY_ID && !!process.env.R2_SECRET_ACCESS_KEY && !!process.env.R2_BUCKET;
const r2Plugins = hasR2
  ? [s3Storage({ collections: { media: { prefix: 'media' } }, ...buildR2StorageConfig(process.env as R2Env) })]
  : [];

export default buildConfig({
  admin: {
    user: 'users',
    meta: { titleSuffix: ' — Pet Aggregator BY Admin' },
  },
  collections: [Users, Cities, Media, AuditLogs, NotificationPreferences, MagicLinkTokens, Organizations, IntakeFacilities, Animals, AdoptionInquiries],
  plugins: r2Plugins,
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: process.env.RESEND_API_KEY,
        defaultFromAddress: process.env.RESEND_FROM_EMAIL || 'noreply@pet-aggregator.by',
        defaultFromName: 'Pet Aggregator BY',
      })
    : undefined,
  editor: lexicalEditor({}),
  // Без sharp Payload не режет Media.imageSizes (thumb/card/detail) и игнорирует focalPoint.
  sharp,
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
  }),
  // raw-SQL объекты (sequence, FTS) push-схемой не создаются. Идемпотентный bootstrap
  // на каждом boot — работает в dev(push)/prod(next start)/CI. Миграция-fallback:
  // migrations/*_pet_number_sequence (если позже подключить payload migrate на деплое).
  onInit: async (payload) => {
    const db = (payload.db as any).drizzle;
    await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS pet_number_seq START WITH 1 INCREMENT BY 1`);
    // Самокоррекция sequence: подтянуть до max(pet_number), чтобы nextval никогда не дал дубль.
    // push при пересоздании схемы может сбросить sequence к 1 → без этого create падает на unique.
    // Только вперёд (если seq уже опережает данные — не трогаем, номера не переиспользуются).
    await db.execute(sql`
      DO $$
      DECLARE m bigint; cur bigint;
      BEGIN
        SELECT COALESCE(MAX(pet_number), 0) INTO m FROM animals;
        SELECT last_value INTO cur FROM pet_number_seq;
        IF m >= cur THEN
          PERFORM setval('pet_number_seq', m, true);
        END IF;
      END $$;
    `);
    // FTS (Task 7): expression GIN-индекс (name=A, description_plain=B). БЕЗ stored-колонки —
    // иначе push (dev) видит чужую колонку search_vector и виснет на data-loss промпте,
    // когда в таблице есть строки. Запрос (lib/search.ts) считает тот же tsvector inline;
    // индекс лишь ускоряет @@-матч и не теряет данные при возможном пересоздании push'ем.
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS animals_search_idx ON animals USING GIN ((
        setweight(to_tsvector('russian', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('russian', coalesce(description_plain, '')), 'B')
      ))
    `);
  },
});
