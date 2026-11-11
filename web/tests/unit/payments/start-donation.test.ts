import { describe, it, expect, vi } from 'vitest';
import { startDonation, type StartDonationDeps } from '@/lib/payments/start-donation';

function deps(over: Partial<StartDonationDeps> = {}): StartDonationDeps & { db: any[] } {
  const db: any[] = [];
  return {
    db,
    enabled: true,
    invoiceKind: 'card',
    baseUrl: 'https://site.by',
    findAnimal: vi.fn(async (slug: string) => (slug === 'rex' ? { id: 12, name: 'Рекс', petNumber: 12, status: 'published' } : slug === 'draft' ? { id: 13, petNumber: 13, status: 'pending_review' } : null)),
    findOrganization: vi.fn(async (slug: string) => (slug === 'shelter' ? { id: 3, name: 'Приют', isPublished: true } : null)),
    createDonation: vi.fn(async (data: any) => { const doc = { id: db.length + 1, ...data }; db.push(doc); return doc; }),
    updateDonation: vi.fn(async (id: any, data: any) => { Object.assign(db.find((d) => d.id === id), data); }),
    createInvoice: vi.fn(async () => ({ invoiceId: '555', paymentUrl: 'https://pay/555', eripNumber: null })),
    ...over,
  } as any;
}
const base = { amount: '25', targetType: 'animal', targetSlug: 'rex', donorUserId: 7 };

describe('startDonation', () => {
  it('без токена ExpressPay приём выключен: 503 и ничего не создаётся', async () => {
    const d = deps({ enabled: false });
    expect(await startDonation(base, d)).toMatchObject({ status: 503 });
    expect(d.db).toHaveLength(0);
  });
  it('валидирует сумму и цель', async () => {
    expect(await startDonation({ ...base, amount: '0' }, deps())).toMatchObject({ status: 422 });
    expect(await startDonation({ ...base, targetType: 'x' }, deps())).toMatchObject({ status: 422 });
    expect(await startDonation({ ...base, targetSlug: '' }, deps())).toMatchObject({ status: 422 });
  });
  it('не принимает донат на неопубликованное животное или несуществующий приют', async () => {
    expect(await startDonation({ ...base, targetSlug: 'draft' }, deps())).toMatchObject({ status: 404 });
    expect(await startDonation({ ...base, targetType: 'organization', targetSlug: 'nope' }, deps())).toMatchObject({ status: 404 });
  });
  it('создаёт pending-донат, счёт с accountNo по id и сохраняет номер счёта', async () => {
    const d = deps();
    const r = await startDonation(base, d);
    expect(r).toEqual({ status: 200, body: { ok: true, paymentUrl: 'https://pay/555', eripNumber: null, donationId: 1 } });
    expect(d.createDonation).toHaveBeenCalledWith(expect.objectContaining({ amountByn: 25, targetType: 'animal', animal: 12, donorUser: 7, status: 'pending', paymentProvider: 'expresspay_card' }));
    expect((d.createDonation as any).mock.calls[0][0]).not.toHaveProperty('accountNo');
    expect(d.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ amount: 25, accountNo: 'don-1', info: 'Помощь: Рекс №12', returnUrl: 'https://site.by/help/thanks', failUrl: 'https://site.by/help/failed' }));
    expect(d.db[0]).toMatchObject({ accountNo: 'don-1', providerInvoiceId: '555', status: 'pending' });
    const e = deps({ invoiceKind: 'erip' } as any);
    await startDonation(base, e);
    expect(e.db[0].paymentProvider).toBe('expresspay_erip');
  });
  it('общий фонд не требует slug', async () => {
    const d = deps();
    expect(await startDonation({ amount: '10', targetType: 'general_fund' }, d)).toMatchObject({ status: 200 });
    expect(d.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ info: 'Помощь: Общий фонд' }));
  });
  it('сбой ExpressPay: донат failed, 502', async () => {
    const d = deps({ createInvoice: vi.fn(async () => { throw new Error('down'); }) });
    expect(await startDonation(base, d)).toMatchObject({ status: 502 });
    expect(d.db[0]).toMatchObject({ status: 'failed', accountNo: 'don-1' });
  });
});
