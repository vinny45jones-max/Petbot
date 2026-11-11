export const PRESET_AMOUNTS = [10, 25, 50, 100] as const;
export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 100_000;

export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

/** Сумма из поля формы (запятая или точка), до копеек, в допустимом диапазоне. */
export function parseAmount(raw: string): ParseResult {
  const normalized = (raw ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return { ok: false, error: 'Введите сумму числом (до 2 знаков после запятой)' };
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: 'Сумма должна быть больше нуля' };
  if (n < MIN_AMOUNT) return { ok: false, error: 'Минимальная сумма — 1 BYN' };
  if (n > MAX_AMOUNT) return { ok: false, error: 'Слишком большая сумма' };
  return { ok: true, value: Math.round(n * 100) / 100 };
}

const num = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** «1 234,50 BYN». Не currency-стиль Intl: тот даёт «Br» и зависит от ICU (сервер и браузер расходятся). */
export function formatByn(value: number): string {
  return `${num.format(value)} BYN`;
}

/** Формат суммы для ExpressPay: копейки через запятую («25,00»). */
export function toProviderAmount(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/** Сумма из уведомления ExpressPay (Decimal с запятой) → число; NaN, если не разобрать. */
export function parseProviderAmount(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  const s = String(raw ?? '').trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}
