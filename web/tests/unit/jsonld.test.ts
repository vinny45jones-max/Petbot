import { describe, it, expect } from 'vitest';
import { buildAnimalJsonLd, buildOrganizationJsonLd } from '@/lib/jsonld';

const BASE = 'https://petby.example';

describe('buildAnimalJsonLd', () => {
  it('builds a schema.org object with name, url, image', () => {
    const ld = buildAnimalJsonLd({
      name: 'Рекс', petNumber: 123, species: 'dog', slug: '123-reks',
      descriptionPlain: 'Добрый пёс', city: { slug: 'minsk', nameRu: 'Минск' },
      media: [{ url: '/m/1.jpg' }],
    } as any, BASE);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld.name).toContain('Рекс');
    expect(ld.url).toBe(`${BASE}/animals/minsk/dog/123-reks`);
    expect(ld.image).toEqual([`${BASE}/m/1.jpg`]);
    expect(ld.description).toBe('Добрый пёс');
  });
  it('absolutizes already-absolute image urls unchanged', () => {
    const ld = buildAnimalJsonLd({ name: null, petNumber: 7, species: 'cat', slug: '7-cat', city: { slug: 'brest' }, media: [{ url: 'https://cdn.x/2.jpg' }] } as any, BASE);
    expect(ld.image).toEqual(['https://cdn.x/2.jpg']);
  });
});

describe('buildOrganizationJsonLd', () => {
  it('builds an Organization node', () => {
    const ld = buildOrganizationJsonLd({ name: 'Приют', slug: 'priut', phone: '+375', city: { nameRu: 'Минск' } } as any, BASE);
    expect(ld['@type']).toBe('Organization');
    expect(ld.name).toBe('Приют');
    expect(ld.url).toBe(`${BASE}/organizations/priut`);
    expect(ld.telephone).toBe('+375');
  });
});
