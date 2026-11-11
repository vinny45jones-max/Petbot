// Еженедельный бэкап БД в R2 (§16.2): имена, retention, конфиг. Чистые функции — скрипт scripts/backup-db.ts.
const PREFIX = 'db-backups/';
const KEY_RE = /^db-backups\/\d{4}-\d{2}-\d{2}\.sql\.gz$/;

export function backupKey(date: Date): string {
  return `${PREFIX}${date.toISOString().slice(0, 10)}.sql.gz`;
}

/** Ключи на удаление: всё, кроме `keep` самых свежих бэкапов. Последний не удаляется никогда. */
export function prunableKeys(keys: string[], keep: number): string[] {
  const sorted = keys.filter((k) => KEY_RE.test(k)).sort();
  return sorted.slice(0, Math.max(0, sorted.length - Math.max(1, keep)));
}

export interface BackupConfig {
  databaseUrl: string; bucket: string; keep: number; endpoint: string; accessKeyId: string; secretAccessKey: string;
}

export function readBackupConfig(env: Record<string, string | undefined>): BackupConfig {
  for (const k of ['DATABASE_URL', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BACKUP_BUCKET']) {
    if (!env[k]) throw new Error(`[backup] не задан ${k}`);
  }
  if (env.R2_BACKUP_BUCKET === env.R2_BUCKET) {
    throw new Error('[backup] R2_BACKUP_BUCKET совпадает с бакетом медиа — он публичный, дамп с персональными данными туда класть нельзя');
  }
  return {
    databaseUrl: env.DATABASE_URL!,
    bucket: env.R2_BACKUP_BUCKET!,
    keep: Number(env.BACKUP_RETENTION_WEEKS || 8),
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
  };
}
