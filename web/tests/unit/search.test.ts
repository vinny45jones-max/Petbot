import { describe, it, expect, vi } from 'vitest';
import { normalizeQuery, searchAnimalIds } from '@/lib/search';

describe('normalizeQuery', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeQuery('  рыжий   кот ')).toBe('рыжий кот');
  });
  it('returns empty for blank', () => {
    expect(normalizeQuery('   ')).toBe('');
  });
  it('strips control chars', () => {
    expect(normalizeQuery('кот \n')).toBe('кот');
  });
});

describe('searchAnimalIds', () => {
  it('returns [] for empty query without hitting db', async () => {
    const payload = { db: { drizzle: { execute: vi.fn() } } } as any;
    expect(await searchAnimalIds(payload, '   ')).toEqual([]);
    expect(payload.db.drizzle.execute).not.toHaveBeenCalled();
  });
  it('maps db rows to id array in rank order', async () => {
    const payload = {
      db: { drizzle: { execute: vi.fn().mockResolvedValue({ rows: [{ id: 5 }, { id: 2 }] }) } },
    } as any;
    expect(await searchAnimalIds(payload, 'рыжий кот')).toEqual([5, 2]);
  });
});
