import { NextResponse, type NextRequest } from 'next/server';
import { verifyPayloadToken } from '@/lib/auth/payload-token';
import { TWOFA_COOKIE_NAME, verifyTwofaCookie } from '@/lib/auth/twofa-cookie';
import { proxyDecision } from '@/lib/proxy-decision';

export async function proxy(req: NextRequest) {
  const claims = await verifyPayloadToken(req.cookies.get('payload-token')?.value, process.env.PAYLOAD_SECRET ?? '');
  const pass = claims ? verifyTwofaCookie(req.cookies.get(TWOFA_COOKIE_NAME)?.value) : null;
  const decision = proxyDecision({
    pathname: req.nextUrl.pathname,
    search: req.nextUrl.search,
    maintenance: process.env.MAINTENANCE_MODE === 'true',
    claims,
    twofaOk: Boolean(claims && pass && pass.uid === String(claims.id) && pass.sid === claims.sid),
  });
  switch (decision.type) {
    case 'maintenance':
      return NextResponse.rewrite(new URL('/maintenance', req.url), { status: 503 });
    case 'twofa': {
      const url = new URL('/2fa', req.url);
      url.searchParams.set('next', decision.next);
      return NextResponse.redirect(url);
    }
    default:
      return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap).*)'],
};
