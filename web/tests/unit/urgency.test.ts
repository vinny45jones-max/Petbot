import { describe, it, expect } from 'vitest';
import { computeDeadline, daysUntil, computeUrgency } from '@/lib/urgency';

const NOW = new Date('2026-05-28T12:00:00Z');

describe('computeDeadline', () => {
  it('adds holdDays to intake date', () => {
    const d = computeDeadline(new Date('2026-05-28T00:00:00Z'), 5);
    expect(d.toISOString()).toBe('2026-06-02T00:00:00.000Z');
  });
});

describe('daysUntil', () => {
  it('counts whole days remaining, rounding up', () => {
    expect(daysUntil(new Date('2026-05-31T12:00:00Z'), NOW)).toBe(3);
  });
  it('returns 0 on the deadline day', () => {
    expect(daysUntil(new Date('2026-05-28T20:00:00Z'), NOW)).toBe(1);
    expect(daysUntil(new Date('2026-05-28T00:00:00Z'), NOW)).toBe(0);
  });
  it('returns negative when past', () => {
    expect(daysUntil(new Date('2026-05-26T12:00:00Z'), NOW)).toBe(-2);
  });
});

describe('computeUrgency', () => {
  it('returns normal when no deadline', () => {
    expect(computeUrgency(null, NOW)).toBe('normal');
  });
  it('returns critical when <= 3 days', () => {
    expect(computeUrgency(new Date('2026-05-31T12:00:00Z'), NOW)).toBe('critical');
  });
  it('returns high when <= 7 days', () => {
    expect(computeUrgency(new Date('2026-06-04T12:00:00Z'), NOW)).toBe('high');
  });
  it('returns normal when > 7 days', () => {
    expect(computeUrgency(new Date('2026-06-20T12:00:00Z'), NOW)).toBe('normal');
  });
  it('returns critical even when overdue (still at risk)', () => {
    expect(computeUrgency(new Date('2026-05-27T12:00:00Z'), NOW)).toBe('critical');
  });
});
