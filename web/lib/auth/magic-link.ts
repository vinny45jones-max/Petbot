import crypto from 'node:crypto';

const TTL_MS = 15 * 60 * 1000;

export function generateMagicToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function isTokenExpired(createdAt: Date, now = Date.now()): boolean {
  return now - createdAt.getTime() > TTL_MS;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
