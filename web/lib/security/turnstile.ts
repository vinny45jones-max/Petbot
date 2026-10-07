/**
 * Серверная верификация Cloudflare Turnstile.
 * Если TURNSTILE_SECRET_KEY не задан (локалка/CI) — пропускает (возвращает true),
 * чтобы не блокировать разработку. В проде ключ обязателен.
 */
export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY not set, skipping verification');
    return true;
  }
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.append('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (e) {
    console.error('[turnstile] verify error', e);
    return false;
  }
}
