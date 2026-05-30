import { describe, it, expect } from 'vitest';
import { animalUrl } from '@/lib/animal-url';

describe('animalUrl', () => {
  it('builds /animals/[city]/[species]/[slug] from populated city', () => {
    expect(animalUrl({ slug: '123-reks', species: 'dog', city: { slug: 'minsk' } })).toBe('/animals/minsk/dog/123-reks');
  });
  it('falls back to "by" when city slug missing', () => {
    expect(animalUrl({ slug: '7-cat', species: 'cat', city: undefined })).toBe('/animals/by/cat/7-cat');
  });
  it('handles city given as id string (no slug) with fallback', () => {
    expect(animalUrl({ slug: '7-cat', species: 'cat', city: 'someid' })).toBe('/animals/by/cat/7-cat');
  });
});
