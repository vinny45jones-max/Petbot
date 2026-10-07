import { describe, it, expect } from 'vitest';
import { HelpArticles } from '@/collections/HelpArticles';
import { GlossaryTerms } from '@/collections/GlossaryTerms';

const ctx = (user: unknown) => ({ req: { user } }) as any;

describe.each([
  ['HelpArticles', HelpArticles],
  ['GlossaryTerms', GlossaryTerms],
])('%s — доступ', (_name, col) => {
  it('читать может любой', () => {
    expect(col.access!.read!(ctx(null))).toBe(true);
  });
  it('писать могут только модераторы', () => {
    expect(col.access!.create!(ctx({ role: 'citizen' }))).toBe(false);
    expect(col.access!.delete!(ctx({ role: 'org_admin' }))).toBe(false);
    expect(col.access!.update!(ctx({ role: 'moderator' }))).toBe(true);
  });
});
