import { describe, it, expect } from 'vitest';
import { buildAnimalMeta, buildOrgMeta } from '@/lib/meta';

const BASE = 'https://petby.example';

describe('buildAnimalMeta', () => {
  it('sets title, description, canonical and OG image', () => {
    const m = buildAnimalMeta({ name: 'Рекс', petNumber: 123, species: 'dog', slug: '123-reks', descriptionPlain: 'Добрый пёс', city: { slug: 'minsk', nameRu: 'Минск' }, media: [{ url: '/m/1.jpg' }] } as any, BASE);
    expect(m.title).toContain('Рекс');
    expect(m.alternates?.canonical).toBe(`${BASE}/animals/minsk/dog/123-reks`);
    expect((m.openGraph?.images as any)?.[0]?.url).toBe(`${BASE}/m/1.jpg`);
    expect((m.twitter as any)?.card).toBe('summary_large_image');
  });
});

describe('buildOrgMeta', () => {
  it('sets canonical to org url', () => {
    const m = buildOrgMeta({ name: 'Приют', slug: 'priut' } as any, BASE);
    expect(m.alternates?.canonical).toBe(`${BASE}/organizations/priut`);
  });
});
