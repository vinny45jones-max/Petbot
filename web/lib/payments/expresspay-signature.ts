import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Подпись ExpressPay: HMAC-SHA1 (hex, upper-case) над конкатенацией значений.
 * Запрос — значения параметров в порядке метода; уведомление — сырая строка Data целиком.
 */
export function computeSignature(parts: Array<string | number>, secret: string): string {
  return createHmac('sha1', secret).update(parts.map((p) => String(p)).join('')).digest('hex').toUpperCase();
}

/** Сверка за постоянное время. Пустой секрет = подпись выключена в ЛК ExpressPay. */
export function verifySignature(parts: Array<string | number>, secret: string, provided: string): boolean {
  if (!secret) return true;
  const a = Buffer.from(computeSignature(parts, secret), 'utf8');
  const b = Buffer.from((provided ?? '').toUpperCase(), 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
