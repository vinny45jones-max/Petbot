import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { fileURLToPath } from 'url';
import { Users } from './collections/Users.ts';
import { Cities } from './collections/Cities.ts';
import { Media } from './collections/Media.ts';
import { AuditLogs } from './collections/AuditLogs.ts';
import { NotificationPreferences } from './collections/NotificationPreferences.ts';
import { s3Storage } from '@payloadcms/storage-s3';
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
  collections: [Users, Cities, Media, AuditLogs, NotificationPreferences],
  plugins: r2Plugins,
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
  }),
});
