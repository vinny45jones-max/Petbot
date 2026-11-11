import { describe, it, expect, vi } from 'vitest';
import { createInvoice, getInvoiceStatus, type ExpressPayConfig } from '@/lib/payments/expresspay';
import { computeSignature } from '@/lib/payments/expresspay-signature';

const cfg: ExpressPayConfig = { base: 'https://api.x/v1', token: 'T', secret: '', useCard: true };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const NOW = new Date('2026-11-11T10:00:00Z');

describe('expresspay client', () => {
  it('card: creates invoice then fetches payment form url', async () => {
    const fakeFetch = vi.fn()
      .mockResolvedValueOnce(json({ CardInvoiceNo: 555 }))
      .mockResolvedValueOnce(json({ FormUrl: 'https://pay/555' }));
    const r = await createInvoice({ amount: 25, accountNo: 'don-1', info: 'Донат', returnUrl: 'https://s/ok', failUrl: 'https://s/fail', now: NOW }, cfg, fakeFetch);
    expect(r).toEqual({ invoiceId: '555', paymentUrl: 'https://pay/555', eripNumber: null });
    const [url1, init1] = fakeFetch.mock.calls[0];
    expect(url1).toBe('https://api.x/v1/cardinvoices?token=T');
    const body = new URLSearchParams(init1.body);
    expect(body.get('AccountNo')).toBe('don-1');
    expect(body.get('Amount')).toBe('25,00');
    expect(body.get('Currency')).toBe('933');
    expect(body.get('Expiration')).toBe('20261112');
    expect(body.get('ReturnUrl')).toBe('https://s/ok');
    expect(fakeFetch.mock.calls[1][0]).toBe('https://api.x/v1/cardinvoices/555/payment?token=T');
  });

  it('ЕРИП: invoice number + payment page, payer enters AccountNo in ЕРИП', async () => {
    const fakeFetch = vi.fn().mockResolvedValueOnce(json({ InvoiceNo: 777, InvoiceUrl: 'https://inv/777' }));
    const r = await createInvoice({ amount: 10, accountNo: 'don-2', info: 'Донат', now: NOW }, { ...cfg, useCard: false }, fakeFetch);
    expect(r).toEqual({ invoiceId: '777', paymentUrl: 'https://inv/777', eripNumber: 'don-2' });
    expect(fakeFetch.mock.calls[0][0]).toBe('https://api.x/v1/invoices?token=T');
    expect(new URLSearchParams(fakeFetch.mock.calls[0][1].body).get('Amount')).toBe('10,00');
    expect(new URLSearchParams(fakeFetch.mock.calls[0][1].body).get('Expiration')).toBe('20261118'); // неделя
  });

  it('signs requests in documented field order when secret is set', async () => {
    const fakeFetch = vi.fn().mockResolvedValueOnce(json({ InvoiceNo: 1 }));
    await createInvoice({ amount: 10, accountNo: 'don-3', info: 'Донат', now: NOW }, { ...cfg, useCard: false, secret: 'S' }, fakeFetch);
    // token, accountno, amount, currency, expiration, info, затем пустые необязательные поля
    const expected = computeSignature(['T', 'don-3', '10,00', '933', '20261118', 'Донат'], 'S');
    expect(fakeFetch.mock.calls[0][0]).toBe(`https://api.x/v1/invoices?token=T&signature=${expected}`);
  });

  it('status: card uses CardInvoiceStatus, ЕРИП uses Status', async () => {
    const card = vi.fn().mockResolvedValueOnce(json({ CardInvoiceStatus: 2 }));
    expect(await getInvoiceStatus('555', cfg, card)).toBe('paid');
    expect(card.mock.calls[0][0]).toBe('https://api.x/v1/cardinvoices/555/status?token=T');
    const erip = vi.fn().mockResolvedValueOnce(json({ Status: 3 }));
    expect(await getInvoiceStatus('777', { ...cfg, useCard: false }, erip)).toBe('paid');
    expect(erip.mock.calls[0][0]).toBe('https://api.x/v1/invoices/777/status?token=T');
  });

  it('status: explicit invoice kind wins over config', async () => {
    const erip = vi.fn().mockResolvedValueOnce(json({ Status: 3 }));
    expect(await getInvoiceStatus('9', cfg, erip, 'erip')).toBe('paid'); // cfg.useCard=true, но счёт был ЕРИП
    expect(erip.mock.calls[0][0]).toBe('https://api.x/v1/invoices/9/status?token=T');
  });

  it('throws on non-2xx and on provider error payloads', async () => {
    await expect(createInvoice({ amount: 1, accountNo: 'x', info: 'y' }, cfg, vi.fn().mockResolvedValueOnce(new Response('err', { status: 500 })))).rejects.toThrow(/500/);
    await expect(createInvoice({ amount: 1, accountNo: 'x', info: 'y' }, cfg, vi.fn().mockResolvedValueOnce(json({ ErrorCode: 1, ErrorMessage: 'bad' })))).rejects.toThrow(/bad/);
    await expect(createInvoice({ amount: 1, accountNo: 'x', info: 'y' }, { ...cfg, useCard: false }, vi.fn().mockResolvedValueOnce(json({ Error: { Code: 3, Msg: 'no token' } })))).rejects.toThrow(/no token/);
  });
});
