import crypto from 'node:crypto';

export interface TelegramAuthPayload {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const MAX_AGE_SECONDS = 300;

export function verifyTelegramAuth(payload: TelegramAuthPayload, botToken: string): boolean {
  if (!payload?.hash) return false;
  if (!botToken) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - payload.auth_date > MAX_AGE_SECONDS) return false;

  const { hash, ...rest } = payload;
  const dataCheckString = Object.keys(rest)
    .filter((k) => rest[k as keyof typeof rest] !== undefined)
    .sort()
    .map((k) => `${k}=${rest[k as keyof typeof rest]}`)
    .join('\n');

  const secret = crypto.createHash('sha256').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}
