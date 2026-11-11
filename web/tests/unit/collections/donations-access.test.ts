import { describe, it, expect } from 'vitest';
import { Donations } from '@/collections/Donations';

const access = Donations.access as any;
const admin = { id: 1, role: 'superadmin' };
const citizen = { id: 7, role: 'citizen' };
const req = (user: any) => ({ req: { user } });

// Донаты пишутся только сервером (overrideAccess); публичный REST не должен ни создавать, ни читать чужие.
describe('Donations access', () => {
  it('гость не читает и не создаёт', () => {
    expect(access.read(req(null))).toBe(false);
    expect(access.create(req(null))).toBe(false);
  });
  it('гражданин видит только свои и не создаёт/не правит', () => {
    expect(access.read(req(citizen))).toEqual({ donorUser: { equals: 7 } });
    expect(access.create(req(citizen))).toBe(false);
    expect(access.update(req(citizen))).toBe(false);
  });
  it('админ видит всё', () => {
    expect(access.read(req(admin))).toBe(true);
  });
  it('providerInvoiceId уникален — основа идемпотентности webhook', () => {
    const f = (Donations.fields as any[]).find((x) => x.name === 'providerInvoiceId');
    expect(f.unique).toBe(true);
  });
});
