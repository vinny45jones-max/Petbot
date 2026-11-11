// Проверка payload-token тем же секретом, что у Payload 3 (sha256(PAYLOAD_SECRET) hex[0..32]).
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export interface TokenClaims { id: number | string; role?: string; email?: string; sid?: string }

export function payloadJwtSecret(payloadSecret: string): string {
  return crypto.createHash('sha256').update(payloadSecret).digest('hex').slice(0, 32);
}

export function readPayloadToken(token: string | undefined, payloadSecret = process.env.PAYLOAD_SECRET ?? ''): TokenClaims | null {
  if (!token || !payloadSecret) return null;
  try {
    const c = jwt.verify(token, payloadJwtSecret(payloadSecret), { algorithms: ['HS256'] });
    return typeof c === 'object' && c && 'id' in c ? (c as TokenClaims) : null;
  } catch {
    return null;
  }
}

export async function verifyPayloadToken(token: string | undefined, payloadSecret: string): Promise<TokenClaims | null> {
  return readPayloadToken(token, payloadSecret);
}
