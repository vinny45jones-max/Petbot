import { describe, it, expect } from 'vitest';
import { intakeFacilitiesBY } from '@/lib/seeds/intake-facilities-by';

describe('intake-facilities-by seed', () => {
  it('contains 6-10 facilities', () => {
    expect(intakeFacilitiesBY.length).toBeGreaterThanOrEqual(6);
    expect(intakeFacilitiesBY.length).toBeLessThanOrEqual(10);
  });
  it('covers all 6 region centers by cityName', () => {
    const cities = new Set(intakeFacilitiesBY.map((f) => f.cityName));
    for (const c of ['Минск', 'Брест', 'Витебск', 'Гомель', 'Гродно', 'Могилёв']) {
      expect(cities.has(c)).toBe(true);
    }
  });
  it('every facility has name, cityName and positive legalHoldDays', () => {
    for (const f of intakeFacilitiesBY) {
      expect(f.name).toBeTruthy();
      expect(f.cityName).toBeTruthy();
      expect(f.legalHoldDays).toBeGreaterThan(0);
    }
  });
});
