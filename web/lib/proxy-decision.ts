// Что делать proxy.ts с запросом: техработы (§16.2) и 2FA-гейт админки/REST для модераторов.
import type { TokenClaims } from './auth/payload-token.ts';

export type ProxyDecision = { type: 'next' } | { type: 'maintenance' } | { type: 'twofa'; next: string } | { type: 'forbidden' };

const STAFF = new Set(['moderator', 'superadmin']);
const MAINTENANCE_ALLOW = ['/api/health', '/status', '/maintenance', '/_next', '/favicon.ico', '/admin', '/api/users/', '/api/auth/2fa/', '/2fa'];
const ADMIN_NO_2FA = ['/admin/logout', '/admin/login'];
const API_NO_2FA = ['/api/users/login', '/api/users/logout', '/api/users/me', '/api/users/refresh-token', '/api/auth/2fa/', '/api/health'];

// '/x' — сам путь и всё под ним; '/x/' — только под ним.
const under = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));

export function proxyDecision(input: {
  pathname: string; maintenance: boolean; claims: TokenClaims | null; twofaUid: string | null;
}): ProxyDecision {
  const { pathname, claims } = input;
  const isStaff = Boolean(claims?.role && STAFF.has(claims.role));
  const twofaOk = isStaff && input.twofaUid === String(claims!.id);

  if (input.maintenance && !isStaff && !under(pathname, MAINTENANCE_ALLOW)) {
    return { type: 'maintenance' };
  }
  if (isStaff && !twofaOk) {
    if (under(pathname, ['/admin']) && !under(pathname, ADMIN_NO_2FA)) return { type: 'twofa', next: pathname };
    if (under(pathname, ['/api']) && !under(pathname, API_NO_2FA)) return { type: 'forbidden' };
  }
  return { type: 'next' };
}
