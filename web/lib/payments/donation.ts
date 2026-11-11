import { formatByn } from './amounts.ts';

export type DonationStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type InvoiceKind = 'erip' | 'card';

/** Номер заказа (AccountNo, до 30 символов) из id доната. */
export function buildAccountNo(donationId: string | number): string {
  return `don-${donationId}`;
}

export function isAccountNo(v: string): boolean {
  return /^don-\d{1,20}$/.test(v);
}

/** Страница с инструкцией оплаты в ЕРИП (режим EXPRESSPAY_USE_CARD=false). */
export function eripHelpPath(accountNo: string): string {
  return `/help/erip/${encodeURIComponent(accountNo)}`;
}

// ЕРИП Status: 1 ждёт, 2 просрочен, 3 оплачен, 4 частично, 5 отменён, 6 оплачен картой, 7 возврат, 8 частичный возврат
const ERIP: Record<number, DonationStatus> = { 1: 'pending', 2: 'failed', 3: 'paid', 4: 'pending', 5: 'failed', 6: 'paid', 7: 'refunded', 8: 'refunded' };
// Карта CardInvoiceStatus: 0 зарегистрирован, 1 холд, 2 оплачен, 3 отмена, 4 возврат, 5 3-D Secure, 6 отклонён
const CARD: Record<number, DonationStatus> = { 0: 'pending', 1: 'pending', 2: 'paid', 3: 'failed', 4: 'refunded', 5: 'pending', 6: 'failed' };

/** Статус ExpressPay → наш. Неизвестный код — pending: не трогаем донат. */
export function mapProviderStatus(code: number | string | undefined | null, kind: InvoiceKind): DonationStatus {
  if (code === null || code === undefined || code === '') return 'pending';
  return (kind === 'card' ? CARD : ERIP)[Number(code)] ?? 'pending';
}

export interface ReceiptInput {
  amountByn: number;
  targetType: 'organization' | 'animal' | 'general_fund';
  targetLabel?: string | null;
}
export interface ReceiptData {
  amountText: string;
  targetText: string;
}

const TARGET_RU: Record<ReceiptInput['targetType'], string> = {
  organization: 'организации',
  animal: 'животному',
  general_fund: 'в общий фонд',
};

export function receiptData(i: ReceiptInput): ReceiptData {
  const tail = i.targetLabel ? ` (${i.targetLabel})` : '';
  return {
    amountText: formatByn(i.amountByn),
    targetText: i.targetType === 'general_fund' ? TARGET_RU.general_fund : `${TARGET_RU[i.targetType]}${tail}`,
  };
}
