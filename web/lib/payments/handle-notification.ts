import { verifySignature } from './expresspay-signature.ts';
import type { DonationStatus, InvoiceKind } from './donation.ts';
import { kindFromProvider } from './expresspay.ts';

export interface NotificationDeps {
  secret: string;
  findByAccountNo: (accountNo: string) => Promise<{ id: string | number; status: string; providerInvoiceId?: string | null; paymentProvider?: string | null } | null>;
  confirmStatus: (providerInvoiceId: string, kind: InvoiceKind) => Promise<DonationStatus>;
  finalizePaid: (id: string | number) => Promise<void>;
  setStatus: (id: string | number, status: DonationStatus) => Promise<void>;
}

type Result = { status: number; body: string };

// всё, кроме «поступил новый платёж» (CmdType 1): отмена 2, смена статуса 3, онлайн-возврат 11 и будущие —
// повод перепроверить уже оплаченный донат
const mayReverse = (n: Record<string, any>) => Number(n.CmdType) !== 1;

/**
 * Уведомление ExpressPay: POST-поля Data (JSON-строка) и Signature = HMAC-SHA1(сырой Data, секрет).
 * Телу не доверяем: статус всегда подтверждаем запросом к ExpressPay по номеру счёта из нашей БД.
 * Ответ 200 — принято; иначе ExpressPay повторит (30 с, 3 мин, 30 мин, 3 ч).
 */
export async function handleNotification(input: { data: string; signature: string }, deps: NotificationDeps): Promise<Result> {
  if (!verifySignature([input.data], deps.secret, input.signature)) return { status: 403, body: 'FAILED | Incorrect digital signature' };

  let n: Record<string, any>;
  try {
    n = JSON.parse(input.data);
  } catch {
    return { status: 400, body: 'FAILED | Bad Data' };
  }

  const donation = n?.AccountNo ? await deps.findByAccountNo(String(n.AccountNo)) : null;
  if (!donation || !donation.providerInvoiceId) return { status: 200, body: 'SUCCESS' };
  if ((donation.status === 'paid' && !mayReverse(n)) || donation.status === 'refunded') return { status: 200, body: 'SUCCESS' };

  let confirmed: DonationStatus;
  try {
    confirmed = await deps.confirmStatus(donation.providerInvoiceId, kindFromProvider(donation.paymentProvider));
  } catch (e) {
    console.error('[webhook] status check failed', donation.id, e);
    return { status: 503, body: 'FAILED | retry later' };
  }

  if (confirmed === 'paid') await deps.finalizePaid(donation.id);
  else if (confirmed !== 'pending' && confirmed !== donation.status) await deps.setStatus(donation.id, confirmed);
  return { status: 200, body: 'SUCCESS' };
}
