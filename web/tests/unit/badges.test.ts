import { describe, it, expect } from 'vitest';
import { computeAnimalBadges } from '@/lib/badges';

describe('computeAnimalBadges', () => {
  it('critical urgency yields a red СРОЧНО badge first', () => {
    const b = computeAnimalBadges({ urgencyLevel: 'critical' });
    expect(b[0]).toMatchObject({ tone: 'critical' });
    expect(b[0].label.toLowerCase()).toContain('срочно');
  });
  it('shelter owner adds a Приют badge', () => {
    const b = computeAnimalBadges({ ownerType: 'organization' });
    expect(b.some((x) => x.label === 'Приют')).toBe(true);
  });
  it('adopted overrides others with single Пристроен badge', () => {
    const b = computeAnimalBadges({ status: 'adopted', urgencyLevel: 'critical' });
    expect(b).toHaveLength(1);
    expect(b[0].label).toBe('Пристроен');
  });
  it('maps lostOrFound and specialStatus and healthStatus', () => {
    const labels = computeAnimalBadges({
      lostOrFound: 'lost', specialStatus: ['reserved', 'quarantine'], healthStatus: 'needs_treatment',
    }).map((x) => x.label);
    expect(labels).toEqual(expect.arrayContaining(['Потерян', 'Забронирован', 'На карантине', 'Нужно лечение']));
  });
});
