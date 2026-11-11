import { describe, it, expect } from 'vitest';
import { pgDumpInvocation } from '@/lib/backup/pg-dump-args';

describe('pgDumpInvocation', () => {
  it('убирает пароль из аргументов и передаёт его через PGPASSWORD', () => {
    const { args, env } = pgDumpInvocation('postgresql://pet:p%40ss%3Aw@db.internal:5432/pet?sslmode=require');
    expect(args.join(' ')).not.toContain('p%40ss');
    expect(args.at(-1)).toBe('postgresql://pet@db.internal:5432/pet?sslmode=require');
    expect(env).toEqual({ PGPASSWORD: 'p@ss:w' });
  });
  it('без пароля — без PGPASSWORD', () => {
    expect(pgDumpInvocation('postgresql://pet@localhost/pet').env).toEqual({});
  });
});
