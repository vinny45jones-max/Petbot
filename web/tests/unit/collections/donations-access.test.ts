import { describe, it, expect, vi } from 'vitest';
import { Donations } from '@/collections/Donations';

const access = Donations.access as any;
const admin = { id: 1, role: 'superadmin' };
const citizen = { id: 7, role: 'citizen' };
const moderator = { id: 3, role: 'moderator' };
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
  // спека §5: общий фонд и контакты доноров — только superadmin
  it('модератор не читает чужие донаты и не меняет статус', () => {
    expect(access.read(req(moderator))).toEqual({ donorUser: { equals: 3 } });
    expect(access.update(req(moderator))).toBe(false);
    expect(access.create(req(moderator))).toBe(false);
    expect(access.delete(req(moderator))).toBe(false);
  });
  it('смена статуса пишется в аудит с автором (ручная и из webhook/сверки)', async () => {
    const hook = (Donations.hooks!.afterChange as any[])[0];
    const create = vi.fn(async () => ({}));
    await hook({ doc: { id: 5, status: 'refunded', amountByn: 25 }, previousDoc: { status: 'paid' }, operation: 'update', req: { user: admin, payload: { create } } });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ collection: 'audit-logs', data: expect.objectContaining({ actor: 1, action: 'donation_status:paid→refunded', targetId: '5' }) }));
    create.mockClear();
    await hook({ doc: { id: 5, status: 'paid' }, previousDoc: { status: 'paid' }, operation: 'update', req: { user: null, payload: { create } } });
    await hook({ doc: { id: 6, status: 'pending' }, previousDoc: undefined, operation: 'create', req: { user: null, payload: { create } } });
    expect(create).not.toHaveBeenCalled();
  });
  it('providerInvoiceId уникален — основа идемпотентности webhook', () => {
    const f = (Donations.fields as any[]).find((x) => x.name === 'providerInvoiceId');
    expect(f.unique).toBe(true);
  });
});
