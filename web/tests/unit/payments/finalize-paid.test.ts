import { describe, it, expect, vi } from 'vitest';
import { finalizeDonationPaid } from '@/lib/payments/finalize-paid';

function fakePayload(doc: any) {
  return {
    findByID: vi.fn(async () => doc),
    update: vi.fn(async ({ data }: any) => Object.assign(doc, data)),
    create: vi.fn(async () => ({})),
  } as any;
}

describe('finalizeDonationPaid', () => {
  it('ставит paid + paidAt, шлёт чек донору с суммой и целью, аудит — хук коллекции', async () => {
    const doc = { id: 1, status: 'pending', amountByn: 25, targetType: 'animal', animal: { name: 'Рекс', petNumber: 12 }, donorEmail: 'a@x', donorName: 'Аня' };
    const p = fakePayload(doc);
    const send = vi.fn(async () => {});
    await finalizeDonationPaid(p, 1, send);
    expect(doc.status).toBe('paid');
    expect((doc as any).paidAt).toBeTruthy();
    expect(send).toHaveBeenCalledOnce();
    expect((send.mock.calls[0] as any)[0]).toMatchObject({ to: 'a@x', subject: 'Чек о пожертвовании' });
  });
  it('уже paid → ничего не делает (повторная доставка)', async () => {
    const p = fakePayload({ id: 1, status: 'paid', amountByn: 25, targetType: 'general_fund', donorEmail: 'a@x' });
    const send = vi.fn();
    await finalizeDonationPaid(p, 1, send);
    expect(p.update).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it('сбой почты не отменяет оплату', async () => {
    const doc = { id: 1, status: 'pending', amountByn: 5, targetType: 'general_fund', donorEmail: 'a@x' };
    await expect(finalizeDonationPaid(fakePayload(doc), 1, vi.fn(async () => { throw new Error('no resend'); }))).resolves.toBeUndefined();
    expect(doc.status).toBe('paid');
  });
});
