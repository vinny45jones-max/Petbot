import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { generate } from 'otplib';
import { enrollTwofa, activateTwofa, disableTwofa, passTwofaGate, resetTwofa, type TwofaClaims } from '@/lib/auth/twofa';
import { decryptSecret } from '@/lib/auth/totp-crypto';

beforeAll(() => { process.env.PAYLOAD_SECRET = 'unit-test-secret-key'; });

type Row = Record<string, any>;
function fakePayload(users: Row[]) {
  const db = new Map(users.map((u) => [u.id, { ...u }]));
  const audit: Row[] = [];
  return {
    db, audit,
    // Как Payload: hidden-поля (секрет, хеши) отдаются только с showHiddenFields
    findByID: async ({ id, showHiddenFields }: any) => {
      const { totpSecretEnc, totpRecoveryHashes, ...rest } = db.get(id) as Row;
      return showHiddenFields ? { ...rest, totpSecretEnc, totpRecoveryHashes } : rest;
    },
    update: async ({ id, data }: any) => { db.set(id, { ...db.get(id), ...data }); return db.get(id); },
    create: async ({ data }: any) => { audit.push(data); return data; },
    // как sqlClaims: сравнение и запись одной операцией
    claims: {
      totpStep: async (id, step) => {
        const row = db.get(id) as Row;
        if (row.totpLastStep != null && row.totpLastStep >= step) return false;
        row.totpLastStep = step;
        return true;
      },
      recoveryCode: async (id, hash) => {
        const row = db.get(id) as Row;
        if (!row.totpRecoveryHashes?.includes(hash)) return false;
        row.totpRecoveryHashes = row.totpRecoveryHashes.filter((h: string) => h !== hash);
        return true;
      },
    } satisfies TwofaClaims,
  } as any;
}
const allowAll = () => true;
// код следующего 30-секундного шага: текущий уже потрачен на activate
const nextCode = (secret: string) => generate({ secret, epoch: Date.now() / 1000 + 30 });
const user = { id: 7, email: 'mod@pet.by', role: 'moderator' };

async function enrolled(p: any) {
  const r = await enrollTwofa(p, user);
  if (!r.ok) throw new Error('enroll failed');
  return r.secret;
}

describe('2FA: enroll → activate', () => {
  let p: any;
  beforeEach(() => { p = fakePayload([{ ...user, totpEnabled: false }]); });

  it('enroll сохраняет зашифрованный секрет, 2FA ещё выключена', async () => {
    const r = await enrollTwofa(p, user);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.otpauth).toContain('otpauth://totp/');
    const row = p.db.get(7);
    expect(row.totpEnabled).toBe(false);
    expect(decryptSecret(row.totpSecretEnc)).toBe(r.secret);
  });

  it('activate с верным кодом: включает, выдаёт 10 кодов, хранит только хеши, пишет аудит', async () => {
    const secret = await enrolled(p);
    const r = await activateTwofa(p, user, await generate({ secret }), allowAll, p.claims);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recoveryCodes).toHaveLength(10);
    const row = p.db.get(7);
    expect(row.totpEnabled).toBe(true);
    expect(row.totpRecoveryHashes).toHaveLength(10);
    expect(row.totpRecoveryHashes).not.toContain(r.recoveryCodes[0]);
    expect(p.audit.map((a: Row) => a.action)).toContain('2fa.enabled');
  });

  it('activate с неверным кодом → invalid_code, 2FA выключена', async () => {
    await enrolled(p);
    expect(await activateTwofa(p, user, '000000', allowAll, p.claims)).toEqual({ ok: false, error: 'invalid_code' });
    expect(p.db.get(7).totpEnabled).toBe(false);
  });

  it('activate без enroll → not_enrolled', async () => {
    expect(await activateTwofa(p, user, '123456', allowAll, p.claims)).toEqual({ ok: false, error: 'not_enrolled' });
  });

  it('повторный enroll при включённой 2FA запрещён (захват сессии не перепривяжет телефон)', async () => {
    const secret = await enrolled(p);
    await activateTwofa(p, user, await generate({ secret }), allowAll, p.claims);
    expect(await enrollTwofa(p, user)).toEqual({ ok: false, error: 'already_enabled' });
    expect(decryptSecret(p.db.get(7).totpSecretEnc)).toBe(secret);
  });

  it('enroll для обычного пользователя запрещён — роль берётся из БД', async () => {
    const q = fakePayload([{ id: 8, email: 'c@pet.by', role: 'citizen', totpEnabled: false }]);
    expect(await enrollTwofa(q, { id: 8, email: 'c@pet.by' })).toEqual({ ok: false, error: 'not_staff' });
  });

  it('rate limit → rate_limited до проверки кода', async () => {
    const secret = await enrolled(p);
    expect(await activateTwofa(p, user, await generate({ secret }), () => false, p.claims)).toEqual({ ok: false, error: 'rate_limited' });
  });
});

describe('2FA: gate и disable', () => {
  let p: any; let secret: string; let codes: string[];
  beforeEach(async () => {
    p = fakePayload([{ ...user, totpEnabled: false }]);
    secret = await enrolled(p);
    const r = await activateTwofa(p, user, await generate({ secret }), allowAll, p.claims);
    if (!r.ok) throw new Error('activate failed');
    codes = r.recoveryCodes;
  });

  it('gate: верный TOTP → ok', async () => {
    expect(await passTwofaGate(p, user, await nextCode(secret), allowAll, p.claims)).toEqual({ ok: true });
    expect(p.audit.map((a: Row) => a.action)).toContain('2fa.passed');
  });

  it('gate: тот же TOTP-код второй раз не принимается (и код, которым включали 2FA)', async () => {
    expect(await passTwofaGate(p, user, await generate({ secret }), allowAll, p.claims)).toEqual({ ok: false, error: 'invalid_code' });
    const code = await nextCode(secret);
    expect(await passTwofaGate(p, user, code, allowAll, p.claims)).toEqual({ ok: true });
    expect(await passTwofaGate(p, user, code, allowAll, p.claims)).toEqual({ ok: false, error: 'invalid_code' });
  });

  it('gate: recovery-код, уже списанный параллельным запросом, не проходит', async () => {
    const [a, b] = await Promise.all([
      passTwofaGate(p, user, codes[1], allowAll, p.claims),
      passTwofaGate(p, user, codes[1], allowAll, p.claims),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
  });

  it('gate: recovery-код одноразовый', async () => {
    expect(await passTwofaGate(p, user, codes[0].toLowerCase(), allowAll, p.claims)).toEqual({ ok: true });
    expect(p.db.get(7).totpRecoveryHashes).toHaveLength(9);
    expect(await passTwofaGate(p, user, codes[0], allowAll, p.claims)).toEqual({ ok: false, error: 'invalid_code' });
  });

  it('gate: неверный код и rate limit', async () => {
    expect(await passTwofaGate(p, user, '000000', allowAll, p.claims)).toEqual({ ok: false, error: 'invalid_code' });
    expect(await passTwofaGate(p, user, await nextCode(secret), () => false, p.claims)).toEqual({ ok: false, error: 'rate_limited' });
  });

  it('gate без включённой 2FA → not_enrolled', async () => {
    const q = fakePayload([{ ...user, totpEnabled: false }]);
    expect(await passTwofaGate(q, user, '123456', allowAll, q.claims)).toEqual({ ok: false, error: 'not_enrolled' });
  });

  it('disable требует кода; после — секрет и коды стёрты', async () => {
    expect(await disableTwofa(p, user, '000000', allowAll, p.claims)).toEqual({ ok: false, error: 'invalid_code' });
    expect(await disableTwofa(p, user, await nextCode(secret), allowAll, p.claims)).toEqual({ ok: true });
    const row = p.db.get(7);
    expect(row.totpEnabled).toBe(false);
    expect(row.totpSecretEnc).toBeNull();
    expect(row.totpRecoveryHashes).toBeNull();
    expect(p.audit.map((a: Row) => a.action)).toContain('2fa.disabled');
  });

  it('disable по recovery-коду (потерян телефон)', async () => {
    expect(await disableTwofa(p, user, codes[3], allowAll, p.claims)).toEqual({ ok: true });
  });

  it('reset владельцем: 2FA выключена, секрет, коды и шаг стёрты, аудит 2fa.reset', async () => {
    await passTwofaGate(p, user, await nextCode(secret), allowAll, p.claims);
    await resetTwofa(p, 7);
    const row = p.db.get(7);
    expect(row).toMatchObject({ totpEnabled: false, totpSecretEnc: null, totpRecoveryHashes: null, totpLastStep: null });
    expect(p.audit.map((a: Row) => a.action)).toContain('2fa.reset');
  });
});
