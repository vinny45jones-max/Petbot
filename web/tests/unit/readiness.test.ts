import { describe, it, expect } from 'vitest';
import { pendingMigrations } from '@/lib/readiness';

describe('pendingMigrations', () => {
  it('пусто, когда все миграции из кода применены', () => {
    expect(pendingMigrations(['a', 'b'], ['a', 'b'])).toEqual([]);
  });
  it('возвращает неприменённые', () => {
    expect(pendingMigrations(['a', 'b', 'c'], ['a'])).toEqual(['b', 'c']);
  });
  it('dev-маркер push (dev) не засчитывается как применённая миграция', () => {
    expect(pendingMigrations(['a'], ['dev'])).toEqual(['a']);
  });
});
