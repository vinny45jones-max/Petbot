import { timingSafeEqual } from 'node:crypto';

/** Проверка `Authorization: Bearer <CRON_SECRET>`; без настроенного секрета — всегда отказ. */
export function isCronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const got = Buffer.from(header.slice('Bearer '.length));
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}
