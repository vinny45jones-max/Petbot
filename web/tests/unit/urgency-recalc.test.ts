import { describe, it, expect } from 'vitest';
import { computeUrgencyTransitions } from '@/lib/urgency-recalc';

const now = new Date('2026-06-01T00:00:00Z');

describe('computeUrgencyTransitions', () => {
  it('promotes to critical when <=3 days left and flags becameCritical', () => {
    const t = computeUrgencyTransitions([
      { id: '1', urgencyLevel: 'high', legalDeadlineDate: '2026-06-03T00:00:00Z' },
    ], now);
    expect(t[0]).toMatchObject({ id: '1', newLevel: 'critical', becameCritical: true });
    expect(t[0].newRank).toBe(2);
  });
  it('no transition when level unchanged', () => {
    const t = computeUrgencyTransitions([
      { id: '2', urgencyLevel: 'normal', legalDeadlineDate: '2026-07-15T00:00:00Z' },
    ], now);
    expect(t[0].changed).toBe(false);
    expect(t[0].becameCritical).toBe(false);
  });
  it('past deadline stays critical', () => {
    const t = computeUrgencyTransitions([
      { id: '3', urgencyLevel: 'critical', legalDeadlineDate: '2026-05-20T00:00:00Z' },
    ], now);
    expect(t[0].newLevel).toBe('critical');
  });

  // §17.6: животное, созданное сразу critical (≤3 дней при публикации), перехода не даёт —
  // но анонсировать его всё равно нужно. Анонс — по отметке urgentAnnouncedAt, не по переходу.
  it('critical without announcement needs announce even if level unchanged', () => {
    const t = computeUrgencyTransitions([
      { id: '4', urgencyLevel: 'critical', legalDeadlineDate: '2026-06-02T00:00:00Z', urgentAnnouncedAt: null },
    ], now);
    expect(t[0].changed).toBe(false);
    expect(t[0].needsAnnounce).toBe(true);
  });
  it('already announced critical is not announced again', () => {
    const t = computeUrgencyTransitions([
      { id: '5', urgencyLevel: 'critical', legalDeadlineDate: '2026-06-02T00:00:00Z', urgentAnnouncedAt: '2026-05-31T06:00:00Z' },
    ], now);
    expect(t[0].needsAnnounce).toBe(false);
  });
  it('leaving critical clears the announcement (deadline extended)', () => {
    const t = computeUrgencyTransitions([
      { id: '6', urgencyLevel: 'critical', legalDeadlineDate: '2026-07-01T00:00:00Z', urgentAnnouncedAt: '2026-05-31T06:00:00Z' },
    ], now);
    expect(t[0].newLevel).toBe('normal');
    expect(t[0].clearAnnounce).toBe(true);
  });
  it('no deadline → normal', () => {
    const t = computeUrgencyTransitions([{ id: '7', urgencyLevel: 'high', legalDeadlineDate: null }], now);
    expect(t[0]).toMatchObject({ newLevel: 'normal', changed: true });
  });
});
