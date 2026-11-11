import { describe, it, expect, vi } from 'vitest';
import { handleNotification, type NotificationDeps } from '@/lib/payments/handle-notification';
import { computeSignature } from '@/lib/payments/expresspay-signature';

const data = (o: Record<string, unknown>) => JSON.stringify({ CmdType: 1, AccountNo: 'don-1', InvoiceNo: 555, Amount: '25,00', ...o });

function deps(donation: any, over: Partial<NotificationDeps> = {}) {
  return {
    secret: '',
    findByAccountNo: vi.fn(async (acc: string) => (donation && acc === 'don-1' ? donation : null)),
    confirmStatus: vi.fn(async () => 'paid' as const),
    finalizePaid: vi.fn(async () => {}),
    setStatus: vi.fn(async () => {}),
    ...over,
  };
}

describe('handleNotification (webhook ExpressPay)', () => {
  it('неверная подпись при заданном секрете → 403, ничего не делаем', async () => {
    const d = deps({ id: 1, status: 'pending', providerInvoiceId: '555' }, { secret: 'S' });
    expect((await handleNotification({ data: data({}), signature: 'BAD' }, d)).status).toBe(403);
    expect(d.findByAccountNo).not.toHaveBeenCalled();
  });
  it('верная подпись по сырому Data → обрабатываем', async () => {
    const raw = data({});
    const d = deps({ id: 1, status: 'pending', providerInvoiceId: '555' }, { secret: 'S' });
    expect((await handleNotification({ data: raw, signature: computeSignature([raw], 'S') }, d)).status).toBe(200);
    expect(d.finalizePaid).toHaveBeenCalledWith(1);
  });
  it('битый Data → 400', async () => {
    expect((await handleNotification({ data: 'not json', signature: '' }, deps(null))).status).toBe(400);
  });
  it('неизвестный донат → 200 без действий (не ретраить)', async () => {
    const d = deps(null);
    expect((await handleNotification({ data: data({ AccountNo: 'other' }), signature: '' }, d)).status).toBe(200);
    expect(d.confirmStatus).not.toHaveBeenCalled();
  });
  it('статус сверяется у провайдера по НАШЕМУ номеру счёта, не по телу', async () => {
    const d = deps({ id: 1, status: 'pending', providerInvoiceId: '555' });
    await handleNotification({ data: data({ InvoiceNo: 999 }), signature: '' }, d);
    expect(d.confirmStatus).toHaveBeenCalledWith('555', 'erip');
  });
  it('уже оплачен → идемпотентно: провайдер не опрашивается, второй чек не уходит', async () => {
    const d = deps({ id: 1, status: 'paid', providerInvoiceId: '555' });
    expect((await handleNotification({ data: data({}), signature: '' }, d)).status).toBe(200);
    expect(d.confirmStatus).not.toHaveBeenCalled();
    expect(d.finalizePaid).not.toHaveBeenCalled();
  });
  it('возврат уже оплаченного (Status 7) → сверяем и ставим refunded', async () => {
    const d = deps({ id: 1, status: 'paid', providerInvoiceId: '555' }, { confirmStatus: vi.fn(async () => 'refunded' as const) });
    await handleNotification({ data: data({ CmdType: 3, Status: 7 }), signature: '' }, d);
    expect(d.setStatus).toHaveBeenCalledWith(1, 'refunded');
  });
  it('онлайн-возврат (CmdType 11) оплаченного → сверяем и ставим refunded', async () => {
    const d = deps({ id: 1, status: 'paid', providerInvoiceId: '555' }, { confirmStatus: vi.fn(async () => 'refunded' as const) });
    await handleNotification({ data: data({ CmdType: 11 }), signature: '' }, d);
    expect(d.setStatus).toHaveBeenCalledWith(1, 'refunded');
  });
  it('тип счёта берётся из доната, не из текущих настроек', async () => {
    const d = deps({ id: 1, status: 'pending', providerInvoiceId: '555', paymentProvider: 'expresspay_card' });
    await handleNotification({ data: data({}), signature: '' }, d);
    expect(d.confirmStatus).toHaveBeenCalledWith('555', 'card');
  });
  it('провайдер недоступен → 503, не финализируем (защита от подделки)', async () => {
    const d = deps({ id: 1, status: 'pending', providerInvoiceId: '555' }, { confirmStatus: vi.fn(async () => { throw new Error('down'); }) });
    expect((await handleNotification({ data: data({}), signature: '' }, d)).status).toBe(503);
    expect(d.finalizePaid).not.toHaveBeenCalled();
  });
  it('провайдер говорит failed → статус failed; pending → без изменений', async () => {
    const f = deps({ id: 1, status: 'pending', providerInvoiceId: '555' }, { confirmStatus: vi.fn(async () => 'failed' as const) });
    await handleNotification({ data: data({}), signature: '' }, f);
    expect(f.setStatus).toHaveBeenCalledWith(1, 'failed');
    const p = deps({ id: 1, status: 'pending', providerInvoiceId: '555' }, { confirmStatus: vi.fn(async () => 'pending' as const) });
    await handleNotification({ data: data({}), signature: '' }, p);
    expect(p.setStatus).not.toHaveBeenCalled();
    expect(p.finalizePaid).not.toHaveBeenCalled();
  });
});
