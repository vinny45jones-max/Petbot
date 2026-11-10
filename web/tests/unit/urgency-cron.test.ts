import { describe, it, expect } from 'vitest';
import { runUrgencyRecalc, type CronAnimal, type CronPref, type UrgencyCronDeps } from '@/lib/urgency-cron';

const NOW = new Date('2026-06-01T06:00:00Z');
const MINSK = { id: 10, slug: 'minsk', nameRu: 'Минск' };
const GOMEL = { id: 20, slug: 'gomel', nameRu: 'Гомель' };

const animal = (over: Partial<CronAnimal>): CronAnimal => ({
  id: '1', name: 'Рекс', petNumber: 12, species: 'dog', slug: '12-reks',
  urgencyLevel: 'normal', legalDeadlineDate: '2026-07-01T00:00:00Z', urgentAnnouncedAt: null,
  city: MINSK, facilityName: 'ГУ «Фауна города»', photoUrl: null, ...over,
});

function fakeDeps(animals: CronAnimal[], prefs: CronPref[] = [], opts: { failEmailTo?: string } = {}) {
  const log = {
    updates: [] as { id: string; data: Record<string, unknown> }[],
    posts: [] as { text: string; photo?: string }[],
    emails: [] as { to: string; city: string; items: { title: string; url: string; daysLeft: number | null }[] }[],
    prefsMarked: [] as string[],
    prefsFetched: 0,
  };
  const deps: UrgencyCronDeps = {
    now: NOW,
    baseUrl: 'https://pet.by',
    findAnimals: async () => animals,
    updateAnimal: async (id, data) => { log.updates.push({ id, data }); },
    findPrefs: async () => { log.prefsFetched++; return prefs; },
    markPrefSent: async (id) => { log.prefsMarked.push(id); },
    postToChannel: async (text, photo) => { log.posts.push({ text, photo }); },
    sendAlert: async (to, city, items) => {
      if (to === opts.failEmailTo) throw new Error('smtp down');
      log.emails.push({ to, city, items });
    },
  };
  return { deps, log };
}

describe('runUrgencyRecalc', () => {
  it('сохраняет изменившийся уровень и ранг, неизменные не трогает', async () => {
    const { deps, log } = fakeDeps([
      animal({ id: '1', urgencyLevel: 'normal', legalDeadlineDate: '2026-06-06T00:00:00Z' }), // 5 дн → high
      animal({ id: '2', urgencyLevel: 'normal', legalDeadlineDate: '2026-07-01T00:00:00Z' }), // без изменений
    ]);
    const r = await runUrgencyRecalc(deps);
    expect(log.updates).toEqual([{ id: '1', data: { urgencyLevel: 'high', urgencyRank: 1 } }]);
    expect(r.changed).toBe(1);
  });

  it('анонсирует critical без отметки: пост в канал с абсолютными ссылками и отметка urgentAnnouncedAt', async () => {
    const { deps, log } = fakeDeps([
      animal({ id: '3', urgencyLevel: 'critical', legalDeadlineDate: '2026-06-03T00:00:00Z', photoUrl: '/api/media/file/rex.jpg' }),
    ]);
    const r = await runUrgencyRecalc(deps);
    expect(log.posts).toHaveLength(1);
    expect(log.posts[0].text).toContain('Рекс №12, Минск');
    expect(log.posts[0].text).toContain('https://pet.by/animals/minsk/dog/12-reks');
    expect(log.posts[0].photo).toBe('https://pet.by/api/media/file/rex.jpg');
    expect(log.updates).toEqual([{ id: '3', data: { urgentAnnouncedAt: NOW.toISOString() } }]);
    expect(r.announced).toBe(1);
  });

  it('уже анонсированный critical повторно не постит', async () => {
    const { deps, log } = fakeDeps([
      animal({ urgencyLevel: 'critical', legalDeadlineDate: '2026-06-03T00:00:00Z', urgentAnnouncedAt: '2026-05-31T06:00:00Z' }),
    ]);
    await runUrgencyRecalc(deps);
    expect(log.posts).toHaveLength(0);
    expect(log.prefsFetched).toBe(0);
  });

  it('вышедшему из critical снимает отметку анонса', async () => {
    const { deps, log } = fakeDeps([
      animal({ id: '4', urgencyLevel: 'critical', legalDeadlineDate: '2026-07-01T00:00:00Z', urgentAnnouncedAt: '2026-05-31T06:00:00Z' }),
    ]);
    await runUrgencyRecalc(deps);
    expect(log.updates).toEqual([{ id: '4', data: { urgencyLevel: 'normal', urgencyRank: 0, urgentAnnouncedAt: null } }]);
  });

  it('письма подписчикам города новых срочных; троттлинг сутки; чужой город — нет', async () => {
    const { deps, log } = fakeDeps(
      [animal({ id: '5', urgencyLevel: 'high', legalDeadlineDate: '2026-06-02T00:00:00Z' })],
      [
        { id: 'p1', email: 'a@x.by', cityIds: ['10'], urgentLastSentAt: null },
        { id: 'p2', email: 'b@x.by', cityIds: ['20'], urgentLastSentAt: null },
        { id: 'p3', email: 'c@x.by', cityIds: ['10'], urgentLastSentAt: '2026-05-31T20:00:00Z' },
      ],
    );
    const r = await runUrgencyRecalc(deps);
    expect(log.emails.map((e) => e.to)).toEqual(['a@x.by']);
    expect(log.emails[0]).toMatchObject({ city: 'Минск', items: [{ title: 'Рекс №12', url: 'https://pet.by/animals/minsk/dog/12-reks', daysLeft: 1 }] });
    expect(log.prefsMarked).toEqual(['p1']);
    expect(r.emailed).toBe(1);
  });

  it('сбой письма одному подписчику не мешает остальным и не ставит отметку', async () => {
    const { deps, log } = fakeDeps(
      [animal({ id: '6', urgencyLevel: 'critical', legalDeadlineDate: '2026-06-02T00:00:00Z', city: GOMEL })],
      [
        { id: 'p1', email: 'bad@x.by', cityIds: ['20'] },
        { id: 'p2', email: 'ok@x.by', cityIds: ['20'] },
      ],
      { failEmailTo: 'bad@x.by' },
    );
    await runUrgencyRecalc(deps);
    expect(log.emails.map((e) => e.to)).toEqual(['ok@x.by']);
    expect(log.prefsMarked).toEqual(['p2']);
  });
});
