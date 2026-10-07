import { describe, it, expect } from 'vitest';
import { scoreCommentSpam } from '@/lib/comments/spam';

describe('scoreCommentSpam', () => {
  it('clean text scores low and is allowed', () => {
    const r = scoreCommentSpam({ body: 'Очень хочу помочь этому котику!', recentByAuthor: [] });
    expect(r.score).toBeLessThan(50);
    expect(r.shadowBan).toBe(false);
  });
  it('many links raise the score', () => {
    const r = scoreCommentSpam({ body: 'http://a.com http://b.com http://c.com купить дёшево', recentByAuthor: [] });
    expect(r.score).toBeGreaterThanOrEqual(50);
    expect(r.shadowBan).toBe(true);
  });
  it('duplicate of recent comment is flagged', () => {
    const r = scoreCommentSpam({ body: 'одно и то же', recentByAuthor: ['одно и то же'] });
    expect(r.shadowBan).toBe(true);
  });
  it('burst posting (too many recent) is flagged', () => {
    const r = scoreCommentSpam({ body: 'норм текст', recentByAuthor: ['a', 'b', 'c', 'd', 'e'] });
    expect(r.shadowBan).toBe(true);
  });
});
