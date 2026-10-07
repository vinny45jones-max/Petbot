import { describe, it, expect } from 'vitest';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';

describe('buildBreadcrumbs', () => {
  it('always starts with home', () => {
    const c = buildBreadcrumbs([{ label: 'Блог', href: '/blog' }]);
    expect(c[0]).toEqual({ label: 'Главная', href: '/' });
    expect(c[1]).toEqual({ label: 'Блог', href: '/blog' });
  });
  it('last item has no href (current page)', () => {
    const c = buildBreadcrumbs([{ label: 'Блог', href: '/blog' }, { label: 'Пост', href: '/blog/x' }]);
    expect(c[c.length - 1].href).toBeUndefined();
  });
});
