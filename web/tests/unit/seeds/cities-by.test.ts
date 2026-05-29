import { describe, it, expect } from 'vitest';
import { citiesBY } from '@/lib/seeds/cities-by';

describe('cities-by seed', () => {
  it('contains all 6 region centers', () => {
    const regionCenters = ['Минск', 'Брест', 'Витебск', 'Гомель', 'Гродно', 'Могилёв'];
    for (const name of regionCenters) {
      expect(citiesBY.find((c) => c.nameRu === name)).toBeDefined();
    }
  });

  it('contains at least 100 cities', () => {
    expect(citiesBY.length).toBeGreaterThanOrEqual(100);
  });

  it('every city has nameRu, nameBe and region', () => {
    for (const city of citiesBY) {
      expect(city.nameRu).toBeTruthy();
      expect(city.nameBe).toBeTruthy();
      expect(city.region).toMatch(/^(Минская|Брестская|Витебская|Гомельская|Гродненская|Могилёвская)$/);
    }
  });
});
