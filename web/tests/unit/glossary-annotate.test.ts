import { describe, it, expect } from 'vitest';
import { annotateGlossaryTerms } from '@/lib/glossary-annotate';

const terms = [
  { term: 'стерилизация', slug: 'sterilization' },
  { term: 'чип', slug: 'chipping' },
];

describe('annotateGlossaryTerms', () => {
  it('marks a matched term with its slug', () => {
    const segs = annotateGlossaryTerms('Стерилизация важна', terms);
    expect(segs.find((s) => s.slug === 'sterilization')).toBeTruthy();
    expect(segs.map((s) => s.text).join('')).toBe('Стерилизация важна');
  });
  it('marks each term at most once', () => {
    const segs = annotateGlossaryTerms('чип и ещё раз чип', terms);
    expect(segs.filter((s) => s.slug === 'chipping')).toHaveLength(1);
  });
  it('respects word boundaries (no partial match inside a word)', () => {
    const segs = annotateGlossaryTerms('чиппендейл', terms);
    expect(segs.some((s) => s.slug)).toBe(false);
  });
});
