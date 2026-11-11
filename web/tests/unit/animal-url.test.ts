import { describe, it, expect, vi } from 'vitest';
import { animalUrl, resolveAnimalCity } from '@/lib/animal-url';

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

// И-9: в afterChange город приходит id — без догрузки письмо вело на /animals/by/...
describe('resolveAnimalCity', () => {
  it('loads city by numeric id', async () => {
    const find = vi.fn().mockResolvedValue({ slug: 'grodno' });
    expect(await resolveAnimalCity(7, find)).toEqual({ slug: 'grodno' });
    expect(find).toHaveBeenCalledWith(7);
  });
  it('returns populated city as is without lookup', async () => {
    const find = vi.fn();
    expect(await resolveAnimalCity({ slug: 'minsk' }, find)).toEqual({ slug: 'minsk' });
    expect(find).not.toHaveBeenCalled();
  });
  it('returns null when city missing or lookup fails', async () => {
    expect(await resolveAnimalCity(null, vi.fn())).toBeNull();
    expect(await resolveAnimalCity(3, vi.fn().mockRejectedValue(new Error('nf')))).toBeNull();
  });
});
