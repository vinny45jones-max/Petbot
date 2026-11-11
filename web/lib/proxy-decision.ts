// Что делать proxy.ts с запросом: техработы (§16.2) и редирект staff без 2FA с /admin на /2fa.
// Права не проверяет: staff без 2FA Payload сам понижает до citizen (lib/auth/twofa-session.ts).
import type { TokenClaims } from './auth/payload-token.ts';

export type ProxyDecision = { type: 'next' } | { type: 'maintenance' } | { type: 'twofa'; next: string };

const STAFF = new Set(['moderator', 'superadmin']);
const MAINTENANCE_ALLOW = [
  '/api/health', '/status', '/maintenance', '/_next', '/favicon.ico', '/admin', '/api/users/', '/api/auth/2fa/', '/2fa',
  '/api/donations/expresspay/webhook', '/api/cron/',
];
const ADMIN_NO_2FA = ['/admin/logout', '/admin/login'];

// '/x' — сам путь и всё под ним; '/x/' — только под ним.
const under = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));

export function proxyDecision(input: {
  pathname: string; search?: string; maintenance: boolean; claims: TokenClaims | null; twofaOk: boolean;
}): ProxyDecision {
  const { pathname, claims } = input;
  const isStaff = Boolean(claims?.role && STAFF.has(claims.role));

  if (input.maintenance && !isStaff && !under(pathname, MAINTENANCE_ALLOW)) return { type: 'maintenance' };
  if (isStaff && !input.twofaOk && under(pathname, ['/admin']) && !under(pathname, ADMIN_NO_2FA)) {
    return { type: 'twofa', next: pathname + (input.search ?? '') };
  }
  return { type: 'next' };
}
