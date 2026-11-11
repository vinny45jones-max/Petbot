import { parseAmount } from './amounts.ts';
import { buildAccountNo } from './donation.ts';
import type { CreateInvoiceInput, CreatedInvoice } from './expresspay.ts';
import { formatAnimalTitle } from '../format.ts';

export interface StartDonationInput {
  amount: string;
  targetType: string;
  targetSlug?: string | null;
  purpose?: string;
  donorEmail?: string;
  donorPhone?: string;
  donorName?: string;
  donorUserId?: string | number | null;
}

export interface StartDonationDeps {
  enabled: boolean;
  baseUrl: string;
  findAnimal: (slug: string) => Promise<{ id: string | number; name?: string | null; petNumber?: number | null; status?: string } | null>;
  findOrganization: (slug: string) => Promise<{ id: string | number; name: string; isPublished?: boolean | null } | null>;
  createDonation: (data: Record<string, unknown>) => Promise<{ id: string | number }>;
  updateDonation: (id: string | number, data: Record<string, unknown>) => Promise<unknown>;
  createInvoice: (input: CreateInvoiceInput) => Promise<CreatedInvoice>;
}

export type StartDonationResult = { status: number; body: Record<string, unknown> };

const fail = (status: number, error: string): StartDonationResult => ({ status, body: { error } });
const TARGETS = ['organization', 'animal', 'general_fund'];

/** Донат → запись pending → счёт в ExpressPay. Номер заказа строится из id записи, поэтому создаём её первой. */
export async function startDonation(input: StartDonationInput, deps: StartDonationDeps): Promise<StartDonationResult> {
  if (!deps.enabled) return fail(503, 'Приём пожертвований скоро заработает.');

  const amount = parseAmount(input.amount ?? '');
  if (!amount.ok) return fail(422, amount.error);
  if (!TARGETS.includes(input.targetType)) return fail(422, 'Некорректная цель.');
  const slug = (input.targetSlug ?? '').trim();
  if (input.targetType !== 'general_fund' && !slug) return fail(422, 'Не указано, кому помочь.');

  let animal: string | number | undefined;
  let organization: string | number | undefined;
  let label = 'Общий фонд';
  if (input.targetType === 'animal') {
    const a = await deps.findAnimal(slug);
    if (!a || a.status !== 'published') return fail(404, 'Животное не найдено.');
    animal = a.id;
    label = formatAnimalTitle(a);
  } else if (input.targetType === 'organization') {
    const o = await deps.findOrganization(slug);
    if (!o || !o.isPublished) return fail(404, 'Организация не найдена.');
    organization = o.id;
    label = o.name;
  }

  const donation = await deps.createDonation({
    donorUser: input.donorUserId ?? undefined,
    donorEmail: input.donorEmail?.trim() || undefined,
    donorPhone: input.donorPhone?.trim() || undefined,
    donorName: input.donorName?.trim() || undefined,
    amountByn: amount.value,
    currency: 'BYN',
    targetType: input.targetType,
    organization,
    animal,
    purpose: input.purpose?.slice(0, 100) || undefined,
    paymentProvider: 'expresspay_erip',
    status: 'pending',
  });

  const accountNo = buildAccountNo(donation.id);
  try {
    const invoice = await deps.createInvoice({
      amount: amount.value,
      accountNo,
      info: `Помощь: ${label}`,
      returnUrl: `${deps.baseUrl}/help/thanks`,
      failUrl: `${deps.baseUrl}/help/failed`,
    });
    await deps.updateDonation(donation.id, { accountNo, providerInvoiceId: invoice.invoiceId });
    return { status: 200, body: { ok: true, paymentUrl: invoice.paymentUrl, eripNumber: invoice.eripNumber, donationId: donation.id } };
  } catch (e) {
    console.error('[donate] createInvoice failed', e);
    await deps.updateDonation(donation.id, { status: 'failed', accountNo });
    return fail(502, 'Платёжный сервис недоступен. Попробуйте позже.');
  }
}
