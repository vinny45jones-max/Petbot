import { describe, it, expect } from 'vitest';
import { citiesBY } from '@/lib/seeds/cities-by';
import { citySlug, planCitySync } from '@/lib/seeds/city-sync';

describe('citySlug', () => {
  it('uses slugifyRu transliteration', () => {
    expect(citySlug('Полоцк')).toBe('polotsk');
    expect(citySlug('Щучин')).toBe('shchuchin');
    expect(citySlug('Могилёв')).toBe('mogilyov');
  });
  it('gives every seeded city a unique non-empty slug', () => {
    const slugs = citiesBY.map((c) => citySlug(c.nameRu));
    expect(slugs.every(Boolean)).toBe(true);
    expect(new Set(slugs).size).toBe(citiesBY.length);
  });
});

describe('planCitySync', () => {
  const seed = [
    { nameRu: 'Минск', nameBe: 'Мінск', region: 'Минская' as const },
    { nameRu: 'Полоцк', nameBe: 'Полацк', region: 'Витебская' as const },
    { nameRu: 'Щучин', nameBe: 'Шчучын', region: 'Гродненская' as const },
  ];

  it('creates every city on an empty DB', () => {
    const plan = planCitySync(seed, []);
    expect(plan.create.map((c) => c.slug)).toEqual(['minsk', 'polotsk', 'shchuchin']);
    expect(plan.update).toEqual([]);
  });

  it('migrates legacy slugs of existing cities, matched by nameRu', () => {
    const existing = [
      { id: 1, nameRu: 'Минск', slug: 'minsk' },
      { id: 2, nameRu: 'Полоцк', slug: 'polock' },
    ];
    const plan = planCitySync(seed, existing);
    expect(plan.update).toEqual([{ id: 2, nameRu: 'Полоцк', from: 'polock', to: 'polotsk' }]);
    expect(plan.create.map((c) => c.nameRu)).toEqual(['Щучин']);
  });

  it('is a no-op when everything is already in sync', () => {
    const existing = seed.map((c, i) => ({ id: i + 1, nameRu: c.nameRu, slug: citySlug(c.nameRu) }));
    expect(planCitySync(seed, existing)).toEqual({ create: [], update: [] });
  });

  it('leaves cities absent from the seed untouched', () => {
    const existing = [{ id: 9, nameRu: 'Добавлен вручную', slug: 'dobavlen-vruchnuyu-legacy' }];
    expect(planCitySync([], existing)).toEqual({ create: [], update: [] });
  });
});
