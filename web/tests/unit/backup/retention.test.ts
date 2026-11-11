import { describe, it, expect } from 'vitest';
import { backupKey, prunableKeys, readBackupConfig } from '@/lib/backup/retention';

describe('backup retention', () => {
  it('ключ детерминирован по дате (UTC)', () => {
    expect(backupKey(new Date('2026-05-29T03:00:00Z'))).toBe('db-backups/2026-05-29.sql.gz');
  });
  it('оставляет N свежих, остальные — на удаление', () => {
    const keys = ['2026-05-22', '2026-05-01', '2026-05-29', '2026-05-08', '2026-05-15'].map((d) => `db-backups/${d}.sql.gz`);
    expect(prunableKeys(keys, 3)).toEqual(['db-backups/2026-05-01.sql.gz', 'db-backups/2026-05-08.sql.gz']);
  });
  it('меньше лимита — ничего; чужие файлы в префиксе не трогаем', () => {
    expect(prunableKeys(['db-backups/2026-05-29.sql.gz'], 8)).toEqual([]);
    expect(prunableKeys(['db-backups/README.txt', 'db-backups/2026-05-01.sql.gz', 'db-backups/2026-05-08.sql.gz'], 1))
      .toEqual(['db-backups/2026-05-01.sql.gz']);
  });
  it('keep < 1 трактуется как 1 — последний бэкап не удаляется никогда', () => {
    expect(prunableKeys(['db-backups/2026-05-01.sql.gz'], 0)).toEqual([]);
  });
});

describe('readBackupConfig', () => {
  const env = {
    DATABASE_URL: 'postgres://x', R2_ACCOUNT_ID: 'acc', R2_ACCESS_KEY_ID: 'k', R2_SECRET_ACCESS_KEY: 's',
    R2_BUCKET: 'media', R2_BACKUP_BUCKET: 'backups',
  };
  it('собирает конфиг с endpoint R2 и retention по умолчанию 8', () => {
    const c = readBackupConfig(env);
    expect(c).toMatchObject({ bucket: 'backups', keep: 8, endpoint: 'https://acc.r2.cloudflarestorage.com' });
  });
  it('без обязательных переменных — ошибка с именем', () => {
    expect(() => readBackupConfig({ ...env, R2_BACKUP_BUCKET: '' })).toThrow(/R2_BACKUP_BUCKET/);
    expect(() => readBackupConfig({ ...env, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });
  it('отказ класть дамп в бакет медиа (он публичный)', () => {
    expect(() => readBackupConfig({ ...env, R2_BACKUP_BUCKET: 'media' })).toThrow(/публичн/);
  });
  it('BACKUP_RETENTION_WEEKS читается', () => {
    expect(readBackupConfig({ ...env, BACKUP_RETENTION_WEEKS: '4' }).keep).toBe(4);
  });
});
