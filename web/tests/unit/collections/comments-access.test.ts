import { describe, it, expect } from 'vitest';
import { Comments } from '@/collections/Comments';
import { ReportFlags } from '@/collections/ReportFlags';

const ctx = (user: unknown) => ({ req: { user } }) as any;
const anon = ctx(null);
const citizen = ctx({ role: 'citizen' });
const moderator = ctx({ role: 'moderator' });

describe('Comments — доступ', () => {
  it('публично видны только published', () => {
    expect(Comments.access!.read!(anon)).toEqual({ status: { equals: 'published' } });
    expect(Comments.access!.read!(citizen)).toEqual({ status: { equals: 'published' } });
  });
  it('модератор видит все статусы (hidden/reported) для модерации', () => {
    expect(Comments.access!.read!(moderator)).toBe(true);
  });
  it('прямой create только админам (публичный — через API-роут)', () => {
    expect(Comments.access!.create!(citizen)).toBe(false);
    expect(Comments.access!.create!(moderator)).toBe(true);
  });
});

describe('ReportFlags — доступ', () => {
  it('жалобы видят только админы', () => {
    expect(ReportFlags.access!.read!(anon)).toBe(false);
    expect(ReportFlags.access!.read!(citizen)).toBe(false);
    expect(ReportFlags.access!.read!(moderator)).toBe(true);
  });
});
