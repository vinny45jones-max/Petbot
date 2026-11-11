// 2FA TOTP для moderator/superadmin (§16.2): otplib 13 + одноразовые recovery-коды.
import crypto from 'node:crypto';
import { generateSecret, generateURI, verify } from 'otplib';

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildOtpauthUrl(account: string, secret: string, issuer = process.env.TWOFA_ISSUER || 'PetAggregator'): string {
  return generateURI({ issuer, label: account, secret });
}

/** ±30с на рассинхрон часов телефона. */
export async function verifyTotp(secret: string, token: string): Promise<boolean> {
  const t = token.trim();
  if (!/^\d{6}$/.test(t)) return false;
  try {
    return (await verify({ secret, token: t, epochTolerance: 30 })).valid;
  } catch {
    return false;
  }
}

const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRecoveryCodes(count = 10): string[] {
  const pick = (n: number) => Array.from({ length: n }, () => RECOVERY_ALPHABET[crypto.randomInt(RECOVERY_ALPHABET.length)]).join('');
  const set = new Set<string>();
  while (set.size < count) set.add(`${pick(4)}-${pick(4)}`);
  return [...set];
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}
