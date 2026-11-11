// Еженедельный дамп Postgres → gzip → приватный бакет R2, затем удаление старых (BACKUP_RETENTION_WEEKS).
// Запуск: `npm run backup:db` (Railway cron раз в неделю). Нужен pg_dump той же major-версии, что сервер.
import { config as loadEnv } from 'dotenv';
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { backupKey, prunableKeys, readBackupConfig } from '../lib/backup/retention.ts';
import { pgDumpInvocation } from '../lib/backup/pg-dump-args.ts';

loadEnv({ path: '.env.local' });
loadEnv();

const cfg = readBackupConfig(process.env);
const now = new Date();
const key = backupKey(now);
const file = join(tmpdir(), `pet-${now.toISOString().slice(0, 10)}.sql.gz`);

const s3 = new S3Client({
  region: 'auto', endpoint: cfg.endpoint, forcePathStyle: true,
  credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
});
let size = 0;
try {
  const pg = pgDumpInvocation(cfg.databaseUrl);
  const dump = spawn(process.env.PG_DUMP_BIN || 'pg_dump', pg.args, { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, ...pg.env } });
  const exited = new Promise<number>((resolve, reject) => { dump.on('error', reject); dump.on('close', (code) => resolve(code ?? 1)); });
  await pipeline(dump.stdout, createGzip(), createWriteStream(file));
  const code = await exited;
  if (code !== 0) throw new Error(`[backup] pg_dump завершился с кодом ${code}`);
  size = (await stat(file)).size;
  await s3.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: createReadStream(file), ContentLength: size, ContentType: 'application/gzip' }));
} finally {
  // дамп всей БД не должен оставаться во временной папке и при сбое
  await rm(file, { force: true });
}
console.log(`[backup] ${key} загружен (${(size / 1024 / 1024).toFixed(1)} МБ)`);

const list = await s3.send(new ListObjectsV2Command({ Bucket: cfg.bucket, Prefix: 'db-backups/' }));
const toDelete = prunableKeys((list.Contents ?? []).map((o) => o.Key ?? ''), cfg.keep);
if (toDelete.length) {
  await s3.send(new DeleteObjectsCommand({ Bucket: cfg.bucket, Delete: { Objects: toDelete.map((Key) => ({ Key })) } }));
  console.log(`[backup] удалено старых: ${toDelete.length}`);
}
