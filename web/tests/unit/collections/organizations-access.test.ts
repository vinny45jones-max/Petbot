import { describe, it, expect } from 'vitest';
import { Organizations } from '@/collections/Organizations';

const ctx = (user: unknown) => ({ req: { user } }) as any;
const onlyPublished = { isPublished: { equals: true } };

describe('Organizations — доступ на чтение', () => {
  it('аноним видит только опубликованные', () => {
    expect(Organizations.access!.read!(ctx(null))).toEqual(onlyPublished);
  });

  it('вошедший не-сотрудник видит только опубликованные', () => {
    expect(Organizations.access!.read!(ctx({ id: 1, role: 'citizen' }))).toEqual(onlyPublished);
    expect(Organizations.access!.read!(ctx({ id: 2, role: 'org_admin' }))).toEqual(onlyPublished);
  });

  it('модератор и суперадмин видят неопубликованные, чтобы публиковать их после согласия организации', () => {
    expect(Organizations.access!.read!(ctx({ id: 3, role: 'moderator' }))).toBe(true);
    expect(Organizations.access!.read!(ctx({ id: 4, role: 'superadmin' }))).toBe(true);
  });
});
