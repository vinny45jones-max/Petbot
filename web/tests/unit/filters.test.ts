import { describe, it, expect } from 'vitest';
import { parseAnimalFilters, buildAnimalWhere, sortForFilters, filtersToSearchParams, PAGE_SIZE } from '@/lib/filters';

describe('parseAnimalFilters', () => {
  it('parses defaults', () => {
    const f = parseAnimalFilters(new URLSearchParams(''));
    expect(f).toMatchObject({ sizes: [], cities: [], urgent: false, page: 1, sort: 'urgent' });
  });
  it('parses all params', () => {
    const f = parseAnimalFilters(new URLSearchParams('species=dog&sex=male&size=small&size=large&city=minsk&city=brest&sterilized=1&ownerType=organization&urgent=1&q=рыжий&page=3&sort=new'));
    expect(f.species).toBe('dog');
    expect(f.sex).toBe('male');
    expect(f.sizes).toEqual(['small', 'large']);
    expect(f.cities).toEqual(['minsk', 'brest']);
    expect(f.sterilized).toBe(true);
    expect(f.ownerType).toBe('organization');
    expect(f.urgent).toBe(true);
    expect(f.q).toBe('рыжий');
    expect(f.page).toBe(3);
    expect(f.sort).toBe('new');
  });
  it('ignores invalid enum values', () => {
    const f = parseAnimalFilters(new URLSearchParams('species=dragon&size=huge&sort=bogus'));
    expect(f.species).toBeUndefined();
    expect(f.sizes).toEqual([]);
    expect(f.sort).toBe('urgent');
  });
  it('clamps page to >= 1', () => {
    expect(parseAnimalFilters(new URLSearchParams('page=0')).page).toBe(1);
    expect(parseAnimalFilters(new URLSearchParams('page=-5')).page).toBe(1);
  });
});

describe('buildAnimalWhere', () => {
  it('always filters published', () => {
    const w = buildAnimalWhere(parseAnimalFilters(new URLSearchParams('')));
    expect(w.and).toContainEqual({ status: { equals: 'published' } });
  });
  it('adds species/sex/sizes/cities/urgent constraints', () => {
    const w = buildAnimalWhere(parseAnimalFilters(new URLSearchParams('species=dog&sex=female&size=small&city=minsk&urgent=1&sterilized=1&ownerType=citizen')));
    expect(w.and).toContainEqual({ species: { equals: 'dog' } });
    expect(w.and).toContainEqual({ sex: { equals: 'female' } });
    expect(w.and).toContainEqual({ size: { in: ['small'] } });
    expect(w.and).toContainEqual({ 'city.slug': { in: ['minsk'] } });
    expect(w.and).toContainEqual({ urgencyLevel: { in: ['critical', 'high'] } });
    expect(w.and).toContainEqual({ isSterilized: { equals: true } });
    expect(w.and).toContainEqual({ ownerType: { equals: 'citizen' } });
  });
});

describe('sortForFilters', () => {
  it('urgent default sorts by rank then recency', () => {
    expect(sortForFilters(parseAnimalFilters(new URLSearchParams('')))).toEqual(['-urgencyRank', '-publishedAt']);
  });
  it('new sorts by recency', () => {
    expect(sortForFilters(parseAnimalFilters(new URLSearchParams('sort=new')))).toEqual(['-publishedAt']);
  });
  it('longest sorts by oldest publish', () => {
    expect(sortForFilters(parseAnimalFilters(new URLSearchParams('sort=longest')))).toEqual(['publishedAt']);
  });
});

describe('filtersToSearchParams round-trip', () => {
  it('round-trips through parse', () => {
    const original = 'species=dog&size=small&size=large&city=minsk&urgent=1&q=кот&page=2&sort=new';
    const reparsed = parseAnimalFilters(filtersToSearchParams(parseAnimalFilters(new URLSearchParams(original))));
    expect(reparsed).toEqual(parseAnimalFilters(new URLSearchParams(original)));
  });
  it('omits defaults to keep URLs clean', () => {
    const sp = filtersToSearchParams(parseAnimalFilters(new URLSearchParams('')));
    expect(sp.toString()).toBe('');
  });
});

describe('PAGE_SIZE', () => {
  it('is 24', () => expect(PAGE_SIZE).toBe(24));
});
