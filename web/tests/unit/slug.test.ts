import { describe, it, expect } from 'vitest';
import { slugify, slugifyRu, uniqueSlug } from '@/lib/slug';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('strips punctuation', () => {
    expect(slugify('Rex!! (the) dog?')).toBe('rex-the-dog');
  });
  it('collapses multiple separators', () => {
    expect(slugify('a   --  b')).toBe('a-b');
  });
  it('trims leading/trailing dashes', () => {
    expect(slugify('  -hi-  ')).toBe('hi');
  });
  it('truncates to maxLength on a word boundary', () => {
    expect(slugify('one two three four five', { maxLength: 7 })).toBe('one-two');
  });
});

describe('slugifyRu', () => {
  it('transliterates Cyrillic to latin', () => {
    expect(slugifyRu('Минск')).toBe('minsk');
    expect(slugifyRu('Рекс пёс')).toBe('reks-pyos');
    expect(slugifyRu('Щучин')).toBe('shchuchin');
  });
  it('keeps latin and digits intact', () => {
    expect(slugifyRu('Кот Barsik 7')).toBe('kot-barsik-7');
  });
  it('falls back to empty string for only-symbols', () => {
    expect(slugifyRu('!!!')).toBe('');
  });
});

describe('uniqueSlug', () => {
  it('returns base when free', async () => {
    const taken = new Set<string>();
    expect(await uniqueSlug('rex', async (s) => taken.has(s))).toBe('rex');
  });
  it('appends -2, -3 on collisions', async () => {
    const taken = new Set(['rex', 'rex-2']);
    expect(await uniqueSlug('rex', async (s) => taken.has(s))).toBe('rex-3');
  });
});
