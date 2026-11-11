import { toProviderAmount } from './amounts.ts';
import { mapProviderStatus, type DonationStatus } from './donation.ts';
import { computeSignature } from './expresspay-signature.ts';

// API: https://express-pay.by/docs/api/v1 (сверено 11.11.2026)
export interface ExpressPayConfig {
  base: string;
  token: string;
  secret: string; // секретное слово для подписи запросов; пусто — подпись выключена в ЛК
  useCard: boolean; // true — оплата картой (cardinvoices), false — счёт в ЕРИП (invoices)
}
export interface CreateInvoiceInput {
  amount: number;
  accountNo: string;
  info: string;
  returnUrl?: string;
  failUrl?: string;
  now?: Date;
}
export interface CreatedInvoice {
  invoiceId: string;
  paymentUrl: string | null; // форма оплаты картой или страница счёта ЕРИП
  eripNumber: string | null; // что плательщик вводит в ЕРИП (наш AccountNo)
}

type FetchFn = (url: string, init?: any) => Promise<Response>;

const BYN = '933';

export function configFromEnv(): ExpressPayConfig {
  return {
    base: process.env.EXPRESSPAY_API_BASE ?? 'https://api.express-pay.by/v1',
    token: process.env.EXPRESSPAY_TOKEN ?? '',
    secret: process.env.EXPRESSPAY_SECRET ?? '',
    useCard: (process.env.EXPRESSPAY_USE_CARD ?? 'true') === 'true',
  };
}

/** Приём донатов включён, только когда задан токен ExpressPay. */
export function isDonationsEnabled(cfg: ExpressPayConfig = configFromEnv()): boolean {
  return Boolean(cfg.token);
}

function url(cfg: ExpressPayConfig, path: string, signParts: Array<string | number>): string {
  const sig = cfg.secret ? `&signature=${computeSignature(signParts, cfg.secret)}` : '';
  return `${cfg.base}/${path}?token=${encodeURIComponent(cfg.token)}${sig}`;
}

async function call(doFetch: FetchFn, u: string, init?: any): Promise<Record<string, any>> {
  const res = await doFetch(u, init);
  if (!res.ok) throw new Error(`ExpressPay ${res.status}`);
  const data = (await res.json()) as Record<string, any>;
  // ЕРИП-методы отдают ошибку как { Error: { Code, Msg } }, карточные — { ErrorCode, ErrorMessage }
  if (data?.Error) throw new Error(`ExpressPay error ${data.Error.Code}: ${data.Error.Msg}`);
  if (data?.ErrorCode) throw new Error(`ExpressPay error ${data.ErrorCode}: ${data.ErrorMessage}`);
  return data;
}

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

const form = (fields: Record<string, string>) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(Object.entries(fields).filter(([, v]) => v !== '')).toString(),
});

export async function createInvoice(input: CreateInvoiceInput, cfg: ExpressPayConfig, doFetch: FetchFn = fetch): Promise<CreatedInvoice> {
  const amount = toProviderAmount(input.amount);
  const info = input.info;

  if (!cfg.useCard) {
    // подпись: token, accountno, amount, currency, expiration, info, …(не передаём)
    const data = await call(doFetch, url(cfg, 'invoices', [cfg.token, input.accountNo, amount, BYN, '', info]),
      form({ AccountNo: input.accountNo, Amount: amount, Currency: BYN, Info: info }));
    const invoiceId = String(data.InvoiceNo ?? '');
    if (!invoiceId) throw new Error('ExpressPay: no InvoiceNo in response');
    return { invoiceId, paymentUrl: data.InvoiceUrl ?? null, eripNumber: input.accountNo };
  }

  // карта: счёт живёт сутки
  const expiration = yyyymmdd(new Date((input.now ?? new Date()).getTime() + 24 * 3600 * 1000));
  const returnUrl = input.returnUrl ?? '';
  const failUrl = input.failUrl ?? '';
  // подпись: token, accountno, expiration, amount, currency, info, returnurl, failurl, language, …
  const created = await call(doFetch, url(cfg, 'cardinvoices', [cfg.token, input.accountNo, expiration, amount, BYN, info, returnUrl, failUrl, 'ru']),
    form({ AccountNo: input.accountNo, Expiration: expiration, Amount: amount, Currency: BYN, Info: info, ReturnUrl: returnUrl, FailUrl: failUrl, Language: 'ru' }));
  const invoiceId = String(created.CardInvoiceNo ?? '');
  if (!invoiceId) throw new Error('ExpressPay: no CardInvoiceNo in response');

  const payment = await call(doFetch, url(cfg, `cardinvoices/${encodeURIComponent(invoiceId)}/payment`, [cfg.token, invoiceId]), { method: 'GET' });
  if (!payment.FormUrl) throw new Error('ExpressPay: no FormUrl for card invoice');
  return { invoiceId, paymentUrl: payment.FormUrl, eripNumber: null };
}

export async function getInvoiceStatus(invoiceId: string, cfg: ExpressPayConfig, doFetch: FetchFn = fetch): Promise<DonationStatus> {
  const id = encodeURIComponent(invoiceId);
  if (cfg.useCard) {
    const data = await call(doFetch, url(cfg, `cardinvoices/${id}/status`, [cfg.token, invoiceId, '']), { method: 'GET' });
    return mapProviderStatus(data.CardInvoiceStatus, 'card');
  }
  const data = await call(doFetch, url(cfg, `invoices/${id}/status`, [cfg.token, invoiceId]), { method: 'GET' });
  return mapProviderStatus(data.Status, 'erip');
}
