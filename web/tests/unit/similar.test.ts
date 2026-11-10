import { describe, it, expect } from 'vitest';
import { buildSimilarWhere } from '@/lib/similar';

describe('buildSimilarWhere', () => {
  it('matches same species, excludes self, requires published', () => {
    const w = buildSimilarWhere({ id: 5, species: 'dog' });
    expect(w.and).toEqual(expect.arrayContaining([
      { status: { equals: 'published' } },
      { id: { not_equals: 5 } },
      { species: { equals: 'dog' } },
    ]));
  });
  it('adds city clause, normalizing object to id', () => {
    const w = buildSimilarWhere({ id: 5, species: 'cat', city: { id: 7 } as any });
    expect(w.and).toEqual(expect.arrayContaining([{ city: { equals: 7 } }]));
  });
  it('omits city clause when absent', () => {
    const w = buildSimilarWhere({ id: 5, species: 'cat', city: null });
    expect(w.and.some((c: any) => 'city' in c)).toBe(false);
  });
});
