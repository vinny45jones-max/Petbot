import { describe, it, expect } from 'vitest';
import { generate } from 'otplib';
import {
  generateTotpSecret, buildOtpauthUrl, verifyTotp, generateRecoveryCodes, hashRecoveryCode,
} from '@/lib/auth/totp';

describe('totp', () => {
  it('генерирует base32-секрет', () => {
    const s = generateTotpSecret();
    expect(s).toMatch(/^[A-Z2-7]+$/);
    expect(s.length).toBeGreaterThanOrEqual(16);
  });
  it('verifyTotp принимает валидный код и отклоняет мусор', async () => {
    const secret = generateTotpSecret();
    const token = await generate({ secret });
    expect(await verifyTotp(secret, token)).toBe(Math.floor(Date.now() / 30_000));
    expect(await verifyTotp(secret, ` ${token} `)).not.toBeNull();
    expect(await verifyTotp(secret, 'abc')).toBeNull();
    expect(await verifyTotp(secret, '')).toBeNull();
  });
  it('verifyTotp: код с уже использованным шагом отклоняется (повтор)', async () => {
    const secret = generateTotpSecret();
    const step = await verifyTotp(secret, await generate({ secret }));
    expect(step).not.toBeNull();
    expect(await verifyTotp(secret, await generate({ secret }), step)).toBeNull();
    expect(await verifyTotp(secret, await generate({ secret, epoch: Date.now() / 1000 + 30 }), step)).toBe(step! + 1);
  });
  it('verifyTotp: допуск ±30с, но не код из прошлого часа', async () => {
    const secret = generateTotpSecret();
    const now = Date.now() / 1000;
    expect(await verifyTotp(secret, await generate({ secret, epoch: now - 30 }))).not.toBeNull();
    expect(await verifyTotp(secret, await generate({ secret, epoch: now - 3600 }))).toBeNull();
  });
  it('verifyTotp на битом секрете → false, без исключения', async () => {
    expect(await verifyTotp('!!!', '123456')).toBeNull();
  });
  it('buildOtpauthUrl содержит issuer и аккаунт', () => {
    const url = buildOtpauthUrl('mod@pet.by', 'JBSWY3DPEHPK3PXP', 'PetAggregator');
    expect(url.startsWith('otpauth://totp/')).toBe(true);
    expect(url).toContain('PetAggregator');
    expect(decodeURIComponent(url)).toContain('mod@pet.by');
  });
  it('recovery-коды: 10 уникальных XXXX-XXXX, хеш детерминирован и нечувствителен к регистру', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(hashRecoveryCode('ABCD-EFGH')).toBe(hashRecoveryCode(' abcd-efgh '));
    expect(hashRecoveryCode('ABCD-EFGH')).not.toBe(hashRecoveryCode('XXXX-YYYY'));
  });
});
