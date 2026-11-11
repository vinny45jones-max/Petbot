// 2FA TOTP для moderator/superadmin (§16.2): otplib 13 + одноразовые recovery-коды.
import crypto from 'node:crypto';
import { generateSecret, generateURI, verify } from 'otplib';

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildOtpauthUrl(account: string, secret: string, issuer = process.env.TWOFA_ISSUER || 'PetAggregator'): string {
  return generateURI({ issuer, label: account, secret });
}

/**
 * ±30с на рассинхрон часов телефона. Возвращает шаг времени принятого кода (его сохраняют, чтобы код нельзя было
 * ввести повторно) или null. afterTimeStep — последний использованный шаг: он и более ранние отклоняются.
 */
export async function verifyTotp(secret: string, token: string, afterTimeStep?: number | null): Promise<number | null> {
  const t = token.trim();
  if (!/^\d{6}$/.test(t)) return null;
  try {
    const r = await verify({ secret, token: t, epochTolerance: 30, ...(afterTimeStep != null ? { afterTimeStep } : {}) });
    return r.valid && 'timeStep' in r ? r.timeStep : null;
  } catch {
    return null;
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
