// Сценарии 2FA (§16.2): enroll → activate, гейт админки, выключение. Роуты — тонкие обёртки.
import type { Payload } from 'payload';
import { buildOtpauthUrl, generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, verifyTotp } from './totp.ts';
import { decryptSecret, encryptSecret } from './totp-crypto.ts';
import { checkRateLimit } from '../security/rate-limit.ts';
import { recordAuditLog } from '../audit/log.ts';

type Db = Pick<Payload, 'findByID' | 'update' | 'create'>;
type UserRef = { id: number | string; email: string };
type Fail<E extends string> = { ok: false; error: E };
export type Allow = (key: string) => boolean;

// 5 попыток ввода кода за 15 минут на пользователя — перебор 6 цифр бессмыслен.
const defaultAllow: Allow = (key) => checkRateLimit(key, 5, 15 * 60 * 1000);

interface TwofaRow { totpEnabled?: boolean | null; totpSecretEnc?: string | null; totpRecoveryHashes?: string[] | null }

async function load(payload: Db, user: UserRef): Promise<TwofaRow> {
  return (await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true, showHiddenFields: true, depth: 0 })) as TwofaRow;
}

async function save(payload: Db, user: UserRef, data: TwofaRow): Promise<void> {
  await payload.update({ collection: 'users', id: user.id, data: data as never, overrideAccess: true, depth: 0 });
}

async function audit(payload: Db, user: UserRef, action: string): Promise<void> {
  await recordAuditLog(payload as Payload, { actorId: Number(user.id), action, targetType: 'users', targetId: String(user.id) });
}

async function totpMatches(row: TwofaRow, code: string): Promise<boolean> {
  if (!row.totpSecretEnc) return false;
  try {
    return await verifyTotp(decryptSecret(row.totpSecretEnc), code);
  } catch {
    return false;
  }
}

export async function enrollTwofa(payload: Db, user: UserRef): Promise<{ ok: true; secret: string; otpauth: string } | Fail<'already_enabled'>> {
  const row = await load(payload, user);
  if (row.totpEnabled) return { ok: false, error: 'already_enabled' };
  const secret = generateTotpSecret();
  await save(payload, user, { totpSecretEnc: encryptSecret(secret) });
  return { ok: true, secret, otpauth: buildOtpauthUrl(user.email, secret) };
}

export async function activateTwofa(
  payload: Db, user: UserRef, code: string, allow: Allow = defaultAllow,
): Promise<{ ok: true; recoveryCodes: string[] } | Fail<'rate_limited' | 'already_enabled' | 'not_enrolled' | 'invalid_code'>> {
  if (!allow(`2fa:${user.id}`)) return { ok: false, error: 'rate_limited' };
  const row = await load(payload, user);
  if (row.totpEnabled) return { ok: false, error: 'already_enabled' };
  if (!row.totpSecretEnc) return { ok: false, error: 'not_enrolled' };
  if (!(await totpMatches(row, code))) return { ok: false, error: 'invalid_code' };
  const recoveryCodes = generateRecoveryCodes();
  await save(payload, user, { totpEnabled: true, totpRecoveryHashes: recoveryCodes.map(hashRecoveryCode) });
  await audit(payload, user, '2fa.enabled');
  return { ok: true, recoveryCodes };
}

/** Проверяет TOTP или одноразовый recovery-код (использованный код удаляется). */
async function checkSecondFactor(payload: Db, user: UserRef, row: TwofaRow, code: string): Promise<boolean> {
  if (await totpMatches(row, code)) return true;
  const hashes = row.totpRecoveryHashes ?? [];
  const h = hashRecoveryCode(code);
  if (!hashes.includes(h)) return false;
  await save(payload, user, { totpRecoveryHashes: hashes.filter((x) => x !== h) });
  return true;
}

export async function passTwofaGate(
  payload: Db, user: UserRef, code: string, allow: Allow = defaultAllow,
): Promise<{ ok: true } | Fail<'rate_limited' | 'not_enrolled' | 'invalid_code'>> {
  if (!allow(`2fa:${user.id}`)) return { ok: false, error: 'rate_limited' };
  const row = await load(payload, user);
  if (!row.totpEnabled || !row.totpSecretEnc) return { ok: false, error: 'not_enrolled' };
  if (!(await checkSecondFactor(payload, user, row, code))) return { ok: false, error: 'invalid_code' };
  await audit(payload, user, '2fa.passed');
  return { ok: true };
}

export async function disableTwofa(
  payload: Db, user: UserRef, code: string, allow: Allow = defaultAllow,
): Promise<{ ok: true } | Fail<'rate_limited' | 'not_enrolled' | 'invalid_code'>> {
  if (!allow(`2fa:${user.id}`)) return { ok: false, error: 'rate_limited' };
  const row = await load(payload, user);
  if (!row.totpEnabled) return { ok: false, error: 'not_enrolled' };
  if (!(await checkSecondFactor(payload, user, row, code))) return { ok: false, error: 'invalid_code' };
  await save(payload, user, { totpEnabled: false, totpSecretEnc: null, totpRecoveryHashes: null });
  await audit(payload, user, '2fa.disabled');
  return { ok: true };
}
