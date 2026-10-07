import { describe, it, expect } from 'vitest';
import { LegalArticles } from '@/collections/LegalArticles';

const ctx = (user: unknown) => ({ req: { user } }) as any;

describe('LegalArticles — доступ', () => {
  it('юр.раздел публичен', () => {
    expect(LegalArticles.access!.read!(ctx(null))).toBe(true);
  });
  it('писать могут только модераторы', () => {
    expect(LegalArticles.access!.create!(ctx({ role: 'citizen' }))).toBe(false);
    expect(LegalArticles.access!.update!(ctx({ role: 'org_admin' }))).toBe(false);
    expect(LegalArticles.access!.create!(ctx({ role: 'moderator' }))).toBe(true);
  });
});
