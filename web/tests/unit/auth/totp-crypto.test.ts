import { describe, it, expect, beforeAll } from 'vitest';
import { encryptSecret, decryptSecret } from '@/lib/auth/totp-crypto';

beforeAll(() => { process.env.PAYLOAD_SECRET = 'unit-test-secret-key'; });

describe('totp-crypto (AES-256-GCM)', () => {
  it('roundtrip шифрования, каждый раз новый IV', () => {
    const plain = 'JBSWY3DPEHPK3PXP';
    const blob = encryptSecret(plain);
    expect(blob).not.toContain(plain);
    expect(blob.split('.')).toHaveLength(3);
    expect(encryptSecret(plain)).not.toBe(blob);
    expect(decryptSecret(blob)).toBe(plain);
  });
  it('подделанный blob → throw', () => {
    const parts = encryptSecret('SECRET').split('.');
    parts[2] = Buffer.from('tampered').toString('base64');
    expect(() => decryptSecret(parts.join('.'))).toThrow();
    expect(() => decryptSecret('garbage')).toThrow();
  });
  it('другой PAYLOAD_SECRET → не расшифровать', () => {
    const blob = encryptSecret('SECRET');
    process.env.PAYLOAD_SECRET = 'other';
    expect(() => decryptSecret(blob)).toThrow();
    process.env.PAYLOAD_SECRET = 'unit-test-secret-key';
  });
});
