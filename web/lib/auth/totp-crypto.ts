// Шифрование TOTP-секрета в БД (AES-256-GCM). Ключ выводится из PAYLOAD_SECRET с отдельной меткой.
import crypto from 'node:crypto';

function key(): Buffer {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error('PAYLOAD_SECRET is required for 2FA secret encryption');
  return crypto.createHash('sha256').update(`totp-secret:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}

export function decryptSecret(blob: string): string {
  const [iv, tag, data] = blob.split('.');
  if (!iv || !tag || !data) throw new Error('Malformed 2FA secret blob');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}
